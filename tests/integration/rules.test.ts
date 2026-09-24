import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let alice: PocketBase;
let bob: PocketBase;

beforeAll(async () => {
  h = await startPocketBase();
  alice = await createUser(h.url, 'alice');
  bob = await createUser(h.url, 'bob');
});
afterAll(async () => h?.stop());

const uid = (pb: PocketBase) => pb.authStore.record!.id;

describe('users', () => {
  it('signs up with username only (no email) and logs in by username', async () => {
    expect(alice.authStore.isValid).toBe(true);
    expect(alice.authStore.record!.username).toBe('alice');
  });

  it('rejects a duplicate username regardless of case', async () => {
    await expect(createUser(h.url, 'ALICE')).rejects.toMatchObject({ status: 400 });
  });

  it('forbids setting role on signup or self-update', async () => {
    const pb = await createUser(h.url, 'mallory');
    await expect(pb.collection('users').update(uid(pb), { role: 'admin' })).rejects.toMatchObject({ status: 404 });
    const fresh = await h.admin.collection('users').getOne(uid(pb));
    expect(fresh.role).toBe('');
  });
});

describe('private data', () => {
  it('lets a user create and read own deck with a client id', async () => {
    const deck = await alice.collection('decks').create({ id: 'alicedeck000001', user: uid(alice), name: 'A' });
    expect(deck.id).toHaveLength(15);
    const list = await alice.collection('decks').getFullList();
    expect(list.map((d) => d.id)).toContain(deck.id);
  });

  it('hides other users decks and rejects writes to them', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'secret' });
    expect(await bob.collection('decks').getFullList()).toHaveLength(0);
    await expect(bob.collection('decks').update(deck.id, { name: 'hacked' })).rejects.toMatchObject({ status: 404 });
    await expect(bob.collection('decks').create({ user: uid(alice), name: 'spoof' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a card pointing at someone else deck', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'mine' });
    await expect(bob.collection('cards').create({ user: uid(bob), deck: deck.id, question: 'q', answer: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('never lets anyone hard-delete decks through the API', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'x' });
    await expect(alice.collection('decks').delete(deck.id)).rejects.toMatchObject({ status: 403 });
  });
});

describe('community', () => {
  it('lets anonymous visitors browse visible public decks', async () => {
    await alice.collection('public_decks').create({ owner: uid(alice), name: 'Shared' });
    const anon = new PocketBase(h.url);
    const list = await anon.collection('public_decks').getFullList();
    expect(list.map((d) => d.name)).toContain('Shared');
  });

  it('forbids owners from setting counters or hidden', async () => {
    await expect(alice.collection('public_decks').create({ owner: uid(alice), name: 'x', import_count: 999 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('keeps reports private to reporter and admins', async () => {
    const pd = await alice.collection('public_decks').create({ owner: uid(alice), name: 'rep' });
    await bob.collection('deck_reports').create({ user: uid(bob), public_deck: pd.id, reason: 'spam' });
    expect(await alice.collection('deck_reports').getFullList()).toHaveLength(0);
    expect(await bob.collection('deck_reports').getFullList()).toHaveLength(1);
    const boss = await createUser(h.url, 'boss');
    await makeAdmin(h, boss);
    expect((await boss.collection('deck_reports').getFullList()).length).toBeGreaterThan(0);
  });
});

describe('settings', () => {
  it('ships with batch enabled and rate limit rules', async () => {
    const s = await h.admin.settings.getAll();
    expect(s.batch.enabled).toBe(true);
    expect(s.rateLimits.rules.map((r: { label: string }) => r.label)).toContain('users:create');
  });
});
