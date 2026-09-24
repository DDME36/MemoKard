import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { newId } from '../../src/lib/ids';
import { pocketbaseStore } from '../../src/store/pocketbaseStore';
import { createInitialFSRSState } from '../../src/utils/fsrs';
import type { Deck, Flashcard } from '../../src/store/types';
import { createUser, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let user: PocketBase;
let userId: string;

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const deck = (): Deck => ({ id: newId(), name: 'Deck', color: 'violet', createdAt: new Date() });
const card = (deckId: string, extra: Partial<Flashcard> = {}): Flashcard => {
  const now = new Date();
  return {
    id: newId(), deckId, question: 'Q', answer: 'A', interval: 0, repetition: 0, easeFactor: 2.5,
    nextReviewDate: now, createdAt: now, lastReviewDate: now, fsrsState: createInitialFSRSState(), ...extra,
  };
};

beforeAll(async () => {
  h = await startPocketBase();
  user = await createUser(h.url, 'syncer');
  userId = user.authStore.record!.id;
  setPocketBaseClient(user);
});
afterAll(async () => h?.stop());

describe('pocketbaseStore', () => {
  it('upserts a deck and card with client ids, then pulls them back', async () => {
    const d = deck();
    const c = card(d.id);
    await pocketbaseStore.upsertDeck(userId, d);
    await pocketbaseStore.upsertCard(userId, c);
    await pocketbaseStore.upsertCard(userId, { ...c, question: 'Q2' });

    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.decks.map((x) => x.record.id)).toContain(d.id);
    const pulled = changes.cards.find((x) => x.record.id === c.id)!;
    expect(pulled.record.question).toBe('Q2');
    expect(pulled.record.deckId).toBe(d.id);
    expect(pulled.record.nextReviewDate.getTime()).not.toBeNaN();
    expect(changes.maxUpdated).toBeTruthy();
  });

  it('uploads a data-URL image and returns a file URL', async () => {
    const d = deck();
    await pocketbaseStore.upsertDeck(userId, d);
    const c = card(d.id, { questionImage: PNG_1PX });
    await pocketbaseStore.upsertCard(userId, c);
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    const pulled = changes.cards.find((x) => x.record.id === c.id)!;
    expect(pulled.record.questionImage).toMatch(new RegExp(`/api/files/.+/${c.id}/`));
  });

  it('soft-deletes and only returns changes since the cursor', async () => {
    const untouched = deck();
    await pocketbaseStore.upsertDeck(userId, untouched);
    await new Promise((r) => setTimeout(r, 20));
    const d = deck();
    await pocketbaseStore.upsertDeck(userId, d);
    const first = await pocketbaseStore.fetchChanges(userId, null);
    await new Promise((r) => setTimeout(r, 20));
    await pocketbaseStore.softDeleteDeck(d.id);
    const second = await pocketbaseStore.fetchChanges(userId, first.maxUpdated);
    expect(second.decks.find((x) => x.record.id === d.id)?.deleted).toBe(true);
    expect(second.decks.map((x) => x.record.id)).not.toContain(untouched.id);
  });

  it('treats deleting a record that never reached the server as done', async () => {
    await expect(pocketbaseStore.softDeleteCard(newId())).resolves.toBeUndefined();
  });

  it('accepts the same review log twice (lost response retry)', async () => {
    const log = { id: newId(), cardId: newId(), rating: 3, reviewedAt: new Date().toISOString(), device: 'dev1' };
    await pocketbaseStore.createReviewLog(userId, log);
    await expect(pocketbaseStore.createReviewLog(userId, log)).resolves.toBeUndefined();
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.logs.filter((l) => l.id === log.id)).toHaveLength(1);
  });

  it('upserts progress keyed by user id', async () => {
    const counters = {
      cardsCreated: 3, decksCreated: 1, reviewsCompleted: 0, currentStreak: 0, maxStreak: 0,
      perfectReviews: 0, totalStudyTime: 0, decksShared: 0, decksImported: 0,
    };
    await pocketbaseStore.upsertProgress(userId, { counters, unlockedAchievements: ['a'] });
    await pocketbaseStore.upsertProgress(userId, { counters: { ...counters, cardsCreated: 4 }, unlockedAchievements: ['a'] });
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.progress?.counters.cardsCreated).toBe(4);
  });
});
