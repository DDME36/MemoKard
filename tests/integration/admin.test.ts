import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { adminStore } from '../../src/store/adminStore';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let boss: PocketBase;
let deckId: string;
const uid = (pb: PocketBase) => pb.authStore.record!.id;

beforeAll(async () => {
  h = await startPocketBase();
  const owner = await createUser(h.url, 'owner');
  const reporter = await createUser(h.url, 'reporter');
  boss = await createUser(h.url, 'boss');
  await makeAdmin(h, boss);
  deckId = (await owner.collection('public_decks').create({ owner: uid(owner), name: 'bad deck' })).id;
  await reporter.collection('deck_reports').create({ user: uid(reporter), public_deck: deckId, reason: 'spam', detail: 'ads' });
  setPocketBaseClient(boss);
});
afterAll(async () => h?.stop());

describe('adminStore', () => {
  it('lists decks with open reports and reporter names', async () => {
    const decks = await adminStore.loadReportedDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0]).toMatchObject({ id: deckId, name: 'bad deck', creator_username: 'owner', report_count: 1 });
    expect(decks[0].reports[0]).toMatchObject({ reporter_username: 'reporter', reason: 'spam', details: 'ads' });
    expect(await adminStore.countOpenReports()).toBe(1);
  });

  it('hides and restores', async () => {
    await adminStore.setHidden(deckId, true);
    expect((await h.admin.collection('public_decks').getOne(deckId)).hidden).toBe(true);
    await adminStore.setHidden(deckId, false);
    expect((await h.admin.collection('public_decks').getOne(deckId)).hidden).toBe(false);
  });

  it('dismisses reports so the deck leaves the list', async () => {
    await adminStore.dismissReports(deckId);
    expect(await adminStore.loadReportedDecks()).toHaveLength(0);
  });

  it('finds users and resets a password', async () => {
    const [found] = await adminStore.findUsers('repor');
    expect(found.username).toBe('reporter');
    await adminStore.resetPassword(found.id, 'new-password-1');
  });
});
