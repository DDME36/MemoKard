import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { communityStore } from '../../src/store/communityStore';
import { useFlashcardStore } from '../../src/store/store';
import { createUser, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let alice: PocketBase;
let bob: PocketBase;
const uid = (pb: PocketBase) => pb.authStore.record!.id;
const cards = [
  { id: 'aaaaaaaaaaaaaa1', question: 'cat', answer: 'แมว' },
  { id: 'aaaaaaaaaaaaaa2', question: 'dog', answer: 'หมา' },
];

beforeAll(async () => {
  h = await startPocketBase();
  alice = await createUser(h.url, 'alice');
  bob = await createUser(h.url, 'bob');
});
afterAll(async () => h?.stop());

describe('community flow', () => {
  let publicId: string;

  it('shares a deck once', async () => {
    setPocketBaseClient(alice);
    const pd = await communityStore.shareDeckToCommunity(uid(alice), 'alicedeck000001', 'Animals', 'desc', 'ภาษา', ['en'], 'violet', cards);
    expect(pd).toMatchObject({ name: 'Animals', cardCount: 2, creatorUsername: 'alice', isActive: true });
    publicId = pd!.id;
    expect(await communityStore.shareDeckToCommunity(uid(alice), 'alicedeck000001', 'Animals', '', 'ภาษา', [], 'violet', cards)).toBeNull();
  });

  it('finds it by search and category without logging in', async () => {
    setPocketBaseClient(new PocketBase(h.url));
    const found = await communityStore.searchPublicDecks('Anim', 'ภาษา', ['en']);
    expect(found.decks.map((d) => d.id)).toContain(publicId);
  });

  it('subscribes into the local store with source links', async () => {
    setPocketBaseClient(bob);
    useFlashcardStore.getState().resetForAccount(uid(bob));
    useFlashcardStore.getState().setAuthState(uid(bob), false);
    const localDeckId = await communityStore.subscribePublicDeck(publicId, uid(bob), 'Animals', 'violet');
    const state = useFlashcardStore.getState();
    expect(state.decks.find((d) => d.id === localDeckId)?.linkedPublicDeckId).toBe(publicId);
    expect(state.cards.filter((c) => c.deckId === localDeckId && c.sourceCardId)).toHaveLength(2);
    expect(await communityStore.hasUserImportedDeck(publicId, uid(bob))).toBe(true);
  });

  it('updates public cards by diff keeping ids stable', async () => {
    setPocketBaseClient(alice);
    const before = await communityStore.getPublicDeckCards(publicId);
    await communityStore.updatePublicDeckCards(publicId, [
      { ...cards[0], answer: 'แมว (cat)' },
      { id: 'aaaaaaaaaaaaaa3', question: 'bird', answer: 'นก' },
    ]);
    const after = await communityStore.getPublicDeckCards(publicId);
    expect(after.map((c) => c.answer)).toEqual(['แมว (cat)', 'นก']);
    expect(after[0].id).toBe(before[0].id);
    expect((await communityStore.getPublicDeckById(publicId))?.cardCount).toBe(2);
  });

  it('rates and reports', async () => {
    setPocketBaseClient(bob);
    await communityStore.ratePublicDeck(publicId, uid(bob), 4);
    await communityStore.ratePublicDeck(publicId, uid(bob), 5);
    expect(await communityStore.getUserRating(publicId, uid(bob))).toBe(5);
    expect((await communityStore.getPublicDeckById(publicId))?.avgRating).toBe(5);
    expect(await communityStore.reportPublicDeck(publicId, uid(bob), 'spam', 'test')).toBe(true);
    expect(await communityStore.reportPublicDeck(publicId, uid(bob), 'spam')).toBe(true);
    expect(await communityStore.getUserReportStatus(publicId, uid(bob))).toBe(true);
  });

  it('unshares by deleting the public deck', async () => {
    setPocketBaseClient(alice);
    await communityStore.unshareDecktoCommunity(publicId);
    expect(await communityStore.getPublicDeckById(publicId)).toBeNull();
  });
});
