import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let owner: PocketBase;
const uid = (pb: PocketBase) => pb.authStore.record!.id;

beforeAll(async () => {
  h = await startPocketBase();
  owner = await createUser(h.url, 'owner');
});
afterAll(async () => h?.stop());

const newPublicDeck = (name = 'deck') => owner.collection('public_decks').create({ owner: uid(owner), name });

describe('public deck counters', () => {
  it('stamps owner_name from the authenticated user', async () => {
    const pd = await newPublicDeck();
    expect(pd.owner_name).toBe('owner');
  });

  it('recomputes rating average and count', async () => {
    const pd = await newPublicDeck();
    const u1 = await createUser(h.url, 'rater1');
    const u2 = await createUser(h.url, 'rater2');
    await u1.collection('deck_ratings').create({ user: uid(u1), public_deck: pd.id, stars: 5 });
    const r2 = await u2.collection('deck_ratings').create({ user: uid(u2), public_deck: pd.id, stars: 2 });
    let fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.rating_count).toBe(2);
    expect(fresh.rating_avg).toBe(3.5);
    await u2.collection('deck_ratings').update(r2.id, { stars: 4 });
    fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.rating_avg).toBe(4.5);
  });

  it('counts imports once per user', async () => {
    const pd = await newPublicDeck();
    const u = await createUser(h.url, 'importer');
    await u.collection('deck_imports').create({ user: uid(u), public_deck: pd.id });
    await expect(u.collection('deck_imports').create({ user: uid(u), public_deck: pd.id })).rejects.toMatchObject({ status: 400 });
    expect((await owner.collection('public_decks').getOne(pd.id)).import_count).toBe(1);
  });

  it('auto-hides a deck after 3 open reports', async () => {
    const pd = await newPublicDeck('spammy');
    for (const name of ['rep1', 'rep2', 'rep3']) {
      const u = await createUser(h.url, name);
      await u.collection('deck_reports').create({ user: uid(u), public_deck: pd.id, reason: 'spam' });
    }
    const fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.report_count).toBe(3);
    expect(fresh.hidden).toBe(true);
    const anon = new PocketBase(h.url);
    await expect(anon.collection('public_decks').getOne(pd.id)).rejects.toMatchObject({ status: 404 });
  });

  it('owner cannot unhide an auto-hidden deck', async () => {
    const pd = (await owner.collection('public_decks').getFullList({ filter: 'hidden = true' }))[0];
    await expect(owner.collection('public_decks').update(pd.id, { hidden: false })).rejects.toMatchObject({ status: 404 });
  });
});

describe('routes', () => {
  it('reports username availability case-insensitively', async () => {
    const anon = new PocketBase(h.url);
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'OWNER' } })).toEqual({ available: false });
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'freshname' } })).toEqual({ available: true });
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'x' } })).toEqual({ available: false });
  });

  it('lets only admins reset passwords', async () => {
    const victim = await createUser(h.url, 'forgetful');
    const body = { userId: uid(victim), password: 'brand-new-pass' };
    await expect(owner.send('/api/memokard/admin/reset-password', { method: 'POST', body })).rejects.toMatchObject({ status: 403 });
    const boss = await createUser(h.url, 'boss2');
    await makeAdmin(h, boss);
    expect(await boss.send('/api/memokard/admin/reset-password', { method: 'POST', body })).toEqual({ ok: true });
    const again = new PocketBase(h.url);
    await again.collection('users').authWithPassword('forgetful', 'brand-new-pass');
    expect(again.authStore.isValid).toBe(true);
  });

  it('purges soft-deleted records older than 30 days', async () => {
    const deck = await owner.collection('decks').create({ user: uid(owner), name: 'old', deleted: true });
    await h.admin.send('/api/memokard/admin/purge', { method: 'POST', body: { olderThanDays: 0 } });
    await expect(h.admin.collection('decks').getOne(deck.id)).rejects.toMatchObject({ status: 404 });
  });
});
