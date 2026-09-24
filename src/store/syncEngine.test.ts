import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPublicDeckById = vi.fn();
const getPublicDeckCards = vi.fn();
vi.mock('./communityStore', () => ({ communityStore: { getPublicDeckById, getPublicDeckCards } }));
vi.mock('./syncQueue', () => ({
  syncQueue: { enqueue: vi.fn(), processQueue: vi.fn(), pendingEntityIds: vi.fn().mockResolvedValue(new Set()) },
}));

const { useFlashcardStore } = await import('./store');
const { refreshLinkedDecks } = await import('./syncEngine');

async function subscribedDeck() {
  const store = useFlashcardStore.getState();
  const deck = await store.addDeck('Linked', 'violet', { linkedPublicDeckId: 'publicdeck00001' });
  await store.addCard(deck.id, 'cat', 'แมว', undefined, undefined, { sourceCardId: 'publiccard00001' });
  return deck;
}

beforeEach(() => {
  useFlashcardStore.getState().clearStore();
  getPublicDeckById.mockReset();
  getPublicDeckCards.mockReset();
});

describe('refreshLinkedDecks', () => {
  it('keeps cards and progress when the source deck is hidden or removed', async () => {
    const deck = await subscribedDeck();
    getPublicDeckById.mockResolvedValue(null);
    getPublicDeckCards.mockResolvedValue([]);
    await refreshLinkedDecks();
    expect(useFlashcardStore.getState().cards.filter((c) => c.deckId === deck.id)).toHaveLength(1);
  });

  it('removes a card the owner deleted from a still-visible source deck', async () => {
    const deck = await subscribedDeck();
    getPublicDeckById.mockResolvedValue({ id: 'publicdeck00001', isActive: true });
    getPublicDeckCards.mockResolvedValue([
      { id: 'publiccard00002', question: 'dog', answer: 'หมา', publicDeckId: 'publicdeck00001', sourceCardId: null, createdAt: new Date() },
    ]);
    await refreshLinkedDecks();
    const cards = useFlashcardStore.getState().cards.filter((c) => c.deckId === deck.id);
    expect(cards.map((c) => c.question)).toEqual(['dog']);
  });
});
