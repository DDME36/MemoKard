import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateFSRS, createInitialFSRSState, type FSRSState } from '../utils/fsrs';
import { supabaseStore } from './supabaseStore';

export interface Deck {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  linkedPublicDeckId?: string | null;
  isSynced?: boolean;
  originalCreatorUsername?: string | null;
}

export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
  // Keep these for Supabase compatibility (mapped from FSRS values)
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewDate: Date;
  createdAt: Date;
  lastReviewDate: Date;
  // FSRS state (source of truth for scheduling)
  fsrsState: FSRSState;
}

export const DECK_COLORS = ['violet', 'sky', 'teal', 'rose', 'amber', 'emerald', 'pink', 'indigo'] as const;
export type DeckColor = typeof DECK_COLORS[number];

interface FlashcardStore {
  cards: Flashcard[];
  decks: Deck[];
  streak: number;
  lastStudyDate: string | null;
  reviewHistory: Record<string, number>;

  // Auth state
  userId: string | null;
  isDemo: boolean;

  // Sync actions
  setAuthState: (userId: string | null, isDemo: boolean) => void;
  syncFromSupabase: () => Promise<void>;
  clearStore: () => void;

  // Deck actions
  addDeck: (name: string, color: string) => Promise<Deck>;
  deleteDeck: (id: string) => Promise<void>;

  // Card actions
  addCard: (deckId: string, question: string, answer: string, questionImage?: string, answerImage?: string) => Promise<void>;
  editCard: (id: string, question: string, answer: string, questionImage?: string, answerImage?: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reviewCard: (id: string, quality: number, isCramMode?: boolean) => Promise<void>;

  // Getters
  getDueCards: (deckId?: string) => Flashcard[];
  getCardsByDeck: (deckId: string) => Flashcard[];
  getDeckById: (id: string) => Deck | undefined;
  getTotalCards: (deckId?: string) => number;
  getDueCount: (deckId?: string) => number;

  // Streak
  updateStreak: () => Promise<void>;
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      cards: [],
      decks: [],
      streak: 0,
      lastStudyDate: null,
      reviewHistory: {},
      userId: null,
      isDemo: true,

      // ── Auth State Management ──
      setAuthState: (userId, isDemo) => {
        set({ userId, isDemo });
        if (userId && !isDemo) {
          get().syncFromSupabase();
        }
      },

      syncFromSupabase: async () => {
        const { userId, isDemo } = get();
        if (isDemo || !userId) return;

        try {
          const [decks, cards, stats] = await Promise.all([
            supabaseStore.fetchDecks(userId),
            supabaseStore.fetchCards(userId),
            supabaseStore.fetchUserStats(userId),
          ]);

          // Ensure every card has fsrsState (migrate old cards that don't have it)
          const migratedCards = cards.map((c) => ({
            ...c,
            fsrsState: (c as any).fsrsState ?? createInitialFSRSState(),
          }));

          set({
            decks,
            cards: migratedCards,
            streak: stats.streak,
            lastStudyDate: stats.lastStudyDate,
          });
        } catch (error) {
          console.error('Error syncing from Supabase:', error);
        }
      },

      clearStore: () => {
        set({
          cards: [],
          decks: [],
          streak: 0,
          lastStudyDate: null,
          reviewHistory: {},
          userId: null,
          isDemo: true,
        });
      },

      // ── Deck Actions ──
      addDeck: async (name, color) => {
        const { userId, isDemo } = get();

        const newDeck: Deck = {
          id: crypto.randomUUID(),
          name,
          color,
          createdAt: new Date(),
        };

        set((state) => ({ decks: [...state.decks, newDeck] }));

        if (!isDemo && userId) {
          const supabaseDeck = await supabaseStore.createDeck(userId, name, color);
          if (supabaseDeck) {
            set((state) => ({
              decks: state.decks.map((d) => d.id === newDeck.id ? supabaseDeck : d),
            }));
            return supabaseDeck;
          }
        }

        return newDeck;
      },

      deleteDeck: async (id) => {
        const { userId, isDemo } = get();

        set((state) => ({
          decks: state.decks.filter((d) => d.id !== id),
          cards: state.cards.filter((c) => c.deckId !== id),
        }));

        if (!isDemo && userId) {
          await supabaseStore.deleteDeck(id);
        }
      },

      // ── Card Actions ──
      addCard: async (deckId, question, answer, questionImage, answerImage) => {
        const { userId, isDemo } = get();
        const fsrsState = createInitialFSRSState();
        const now = new Date();

        const newCard: Flashcard = {
          id: crypto.randomUUID(),
          deckId,
          question,
          answer,
          questionImage,
          answerImage,
          interval: 0,
          repetition: 0,
          easeFactor: 2.5,
          nextReviewDate: now,
          createdAt: now,
          lastReviewDate: now,
          fsrsState,
        };

        set((state) => ({ cards: [...state.cards, newCard] }));

        if (!isDemo && userId) {
          const supabaseCard = await supabaseStore.createCard(
            userId,
            deckId,
            question,
            answer,
            { interval: 0, repetition: 0, easeFactor: 2.5 }
          );
          if (supabaseCard) {
            set((state) => ({
              cards: state.cards.map((c) =>
                c.id === newCard.id ? { ...supabaseCard, fsrsState } : c
              ),
            }));
          }
        }
      },

      editCard: async (id, question, answer, questionImage, answerImage) => {
        const { userId, isDemo } = get();

        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, question, answer, questionImage, answerImage } : c
          ),
        }));

        if (!isDemo && userId) {
          await supabaseStore.updateCard(id, { question, answer });
        }
      },

      deleteCard: async (id) => {
        const { userId, isDemo } = get();

        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));

        if (!isDemo && userId) {
          await supabaseStore.deleteCard(id);
        }
      },

      reviewCard: async (id, quality, isCramMode) => {
        const { userId, isDemo } = get();

        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (!card) return state;

          const today = new Date().toISOString().slice(0, 10);
          const currentCount = state.reviewHistory[today] ?? 0;

          if (isCramMode) {
            // Skip FSRS state update in Cram Mode, only update history
            return {
              reviewHistory: {
                ...state.reviewHistory,
                [today]: currentCount + 1,
              },
            };
          }

          const prevFsrs = card.fsrsState ?? createInitialFSRSState();
          const { newState, nextReviewDate, interval } = calculateFSRS(prevFsrs, quality);

          return {
            cards: state.cards.map((c) =>
              c.id === id
                ? {
                    ...c,
                    interval,
                    repetition: c.repetition + 1,
                    nextReviewDate,
                    lastReviewDate: new Date(),
                    fsrsState: newState,
                  }
                : c
            ),
            reviewHistory: {
              ...state.reviewHistory,
              [today]: currentCount + 1,
            },
          };
        });

        // Skip Supabase sync for Cram Mode because card state wasn't changed
        if (!isCramMode && !isDemo && userId) {
          const card = get().cards.find((c) => c.id === id);
          if (card) {
            await Promise.all([
              supabaseStore.updateCard(id, {
                interval: card.interval,
                repetition: card.repetition,
                easeFactor: card.easeFactor,
                nextReviewDate: card.nextReviewDate,
              }),
              supabaseStore.logReview(userId, id, quality),
            ]);
          }
        }

        await get().updateStreak();
      },

      // ── Getters ──
      getDueCards: (deckId) => {
        const now = new Date();
        const cards = get().cards.filter((c) => {
          const due = new Date(c.nextReviewDate) <= now;
          return deckId ? due && c.deckId === deckId : due;
        });
        return cards.sort(
          (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
        );
      },

      getCardsByDeck: (deckId) => get().cards.filter((c) => c.deckId === deckId),

      getDeckById: (id) => get().decks.find((d) => d.id === id),

      getTotalCards: (deckId) => {
        const cards = get().cards;
        return deckId ? cards.filter((c) => c.deckId === deckId).length : cards.length;
      },

      getDueCount: (deckId) => get().getDueCards(deckId).length,

      // ── Streak ──
      updateStreak: async () => {
        const { userId, isDemo, lastStudyDate, streak } = get();
        const today = new Date().toISOString().slice(0, 10);

        if (lastStudyDate === today) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = lastStudyDate === yesterday ? streak + 1 : 1;

        set({ streak: newStreak, lastStudyDate: today });

        if (!isDemo && userId) {
          await supabaseStore.updateUserStats(userId, newStreak, today);
        }
      },
    }),
    {
      name: 'daily-memory-storage',
      partialize: (state) => ({
        decks: state.decks.map((d) => ({
          ...d,
          createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
        })),
        cards: state.cards.map((c) => ({
          ...c,
          nextReviewDate: c.nextReviewDate instanceof Date ? c.nextReviewDate.toISOString() : c.nextReviewDate,
          createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
          lastReviewDate: c.lastReviewDate instanceof Date ? c.lastReviewDate.toISOString() : c.lastReviewDate,
        })),
        streak: state.streak,
        lastStudyDate: state.lastStudyDate,
        reviewHistory: state.reviewHistory,
        userId: state.userId,
        isDemo: state.isDemo,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.decks = (state.decks ?? []).map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
        }));
        state.cards = (state.cards ?? []).map((c: any) => ({
          ...c,
          nextReviewDate: new Date(c.nextReviewDate),
          createdAt: new Date(c.createdAt),
          lastReviewDate: new Date(c.lastReviewDate),
          // Migrate old cards without fsrsState
          fsrsState: c.fsrsState ?? createInitialFSRSState(),
        }));
      },
    }
  )
);
