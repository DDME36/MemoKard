import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueue = vi.fn().mockResolvedValue(undefined);
vi.mock('./syncQueue', () => ({
  syncQueue: {
    enqueue,
    processQueue: vi.fn().mockResolvedValue(undefined),
    pendingEntityIds: vi.fn().mockResolvedValue(new Set()),
  },
}));
vi.mock('./syncEngine', () => ({ pullChanges: vi.fn().mockResolvedValue(undefined) }));

const { useFlashcardStore } = await import('./store');
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  enqueue.mockClear();
  useFlashcardStore.getState().clearStore();
});

describe('store → queue', () => {
  it('does not enqueue anything in guest mode', async () => {
    await useFlashcardStore.getState().addDeck('D', 'violet');
    await flush();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues upserts for the signed-in owner', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    const cardId = await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    await flush();
    expect(enqueue).toHaveBeenCalledWith('UPSERT_DECK', deck.id, 'user1', undefined);
    expect(enqueue).toHaveBeenCalledWith('UPSERT_CARD', cardId, 'user1', undefined);
  });

  it('logs a review with this device id', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    const cardId = await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    enqueue.mockClear();
    await useFlashcardStore.getState().reviewCard(cardId, 3);
    await flush();
    const logCall = enqueue.mock.calls.find((c) => c[0] === 'LOG_REVIEW')!;
    expect(logCall[3]).toMatchObject({ cardId, rating: 3, device: useFlashcardStore.getState().deviceId, mode: 'normal' });
  });

  it('marks cram reviews so they never train the scheduler', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    const cardId = await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    enqueue.mockClear();
    await useFlashcardStore.getState().reviewCard(cardId, 4, true);
    await flush();
    const logCall = enqueue.mock.calls.find((c) => c[0] === 'LOG_REVIEW')!;
    expect(logCall[3]).toMatchObject({ mode: 'cram' });
  });
});

describe('account switching', () => {
  it('asks before adopting guest data', async () => {
    await useFlashcardStore.getState().addDeck('guest deck', 'violet');
    useFlashcardStore.getState().setAuthState('user1', false);
    expect(useFlashcardStore.getState().pendingAdoption).toBe(true);
    expect(useFlashcardStore.getState().decks).toHaveLength(1);
  });

  it('adopting enqueues every local deck and card', async () => {
    const deck = await useFlashcardStore.getState().addDeck('guest deck', 'violet');
    await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    useFlashcardStore.getState().setAuthState('user1', false);
    await useFlashcardStore.getState().adoptLocalData();
    await flush();
    expect(useFlashcardStore.getState().ownerId).toBe('user1');
    expect(enqueue.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['UPSERT_DECK', 'UPSERT_CARD', 'UPSERT_PROGRESS']));
  });

  it('clears another account data instead of mixing it', async () => {
    useFlashcardStore.getState().resetForAccount('userA');
    useFlashcardStore.getState().setAuthState('userA', false);
    await useFlashcardStore.getState().addDeck('A deck', 'violet');
    useFlashcardStore.getState().setAuthState('userB', false);
    expect(useFlashcardStore.getState().decks).toHaveLength(0);
    expect(useFlashcardStore.getState().ownerId).toBe('userB');
  });
});

describe('applyServerChanges', () => {
  it('does not resurrect a deck that is waiting in the undo window', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    await useFlashcardStore.getState().deleteDeck(deck.id);
    useFlashcardStore.getState().applyServerChanges(
      { decks: [{ record: deck, deleted: false }], cards: [], logs: [], progress: null, maxUpdated: '2026-09-24 00:00:00.000Z', boundaryLogIds: [] },
      new Set([deck.id]),
    );
    expect(useFlashcardStore.getState().decks).toHaveLength(0);
    expect(useFlashcardStore.getState().lastPulledAt).toBe('2026-09-24 00:00:00.000Z');
  });

  it('counts reviews made earlier on this browser after signing out and back in', () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const oldDevice = useFlashcardStore.getState().deviceId;
    useFlashcardStore.getState().clearStore(); // ออกจากระบบ ล้างข้อมูลในเครื่อง
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const log = { id: 'log000000000009', reviewedAt: '2026-09-21T10:00:00.000Z', device: oldDevice };
    useFlashcardStore.getState().applyServerChanges(
      { decks: [], cards: [], logs: [log], progress: null, maxUpdated: '2026-09-24 00:00:00.000Z', boundaryLogIds: [] },
      new Set(),
    );
    expect(useFlashcardStore.getState().reviewHistory['2026-09-21']).toBe(1);
  });

  it('counts a boundary review log only once across two pulls', () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const log = { id: 'log000000000001', reviewedAt: '2026-09-20T10:00:00.000Z', device: 'other' };
    const changes = { decks: [], cards: [], logs: [log], progress: null, maxUpdated: '2026-09-24 00:00:00.000Z', boundaryLogIds: [log.id] };
    useFlashcardStore.getState().applyServerChanges(changes, new Set());
    useFlashcardStore.getState().applyServerChanges(changes, new Set());
    expect(useFlashcardStore.getState().reviewHistory['2026-09-20']).toBe(1);
  });
});
