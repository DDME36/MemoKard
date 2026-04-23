import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateSM2, initializeSM2, isCardDue } from '../utils/sm2';
import { supabaseStore } from './supabaseStore';

export interface Deck {
  id: string;
  name: string;
  color: string; // tailwind color key e.g. 'violet', 'sky', 'teal'
  createdAt: Date;
  // Sync model fields
  linkedPublicDeckId?: string | null; // Reference to public_decks.id
  isSynced?: boolean; // True if synced with public deck (read-only)
  originalCreatorUsername?: string | null; // Original creator for synced decks
}

export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  questionImage?: string; // base64 encoded image
  answerImage?: string; // base64 encoded image
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewDate: Date;
  createdAt: Date;
  lastReviewDate: Date;
}

export const DECK_COLORS = ['violet', 'sky', 'teal', 'rose', 'amber', 'emerald', 'pink', 'indigo'] as const;
export type DeckColor = typeof DECK_COLORS[number];

interface FlashcardStore {
  cards: Flashcard[];
  decks: Deck[];
  streak: number;
  lastStudyDate: string | null;
  reviewHistory: Record<string, number>; // { "2026-04-21": 5 } // ISO date string YYYY-MM-DD
  
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
  reviewCard: (id: string, quality: number) => Promise<void>;

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
        // Auto-sync when user logs in
        if (userId && !isDemo) {
          get().syncFromSupabase();
        }
      },

      syncFromSupabase: async () => {
        const { userId, isDemo } = get();
        if (isDemo || !userId) return;

        try {
          // Fetch all data from Supabase
          const [decks, cards, stats] = await Promise.all([
            supabaseStore.fetchDecks(userId),
            supabaseStore.fetchCards(userId),
            supabaseStore.fetchUserStats(userId),
          ]);

          set({
            decks,
            cards,
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
        
        // Create deck locally first
        const newDeck: Deck = {
          id: crypto.randomUUID(),
          name,
          color,
          createdAt: new Date(),
        };

        set((state) => ({ decks: [...state.decks, newDeck] }));

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
          const supabaseDeck = await supabaseStore.createDeck(userId, name, color);
          if (supabaseDeck) {
            // Update with Supabase-generated ID
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

        // Delete locally
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== id),
          cards: state.cards.filter((c) => c.deckId !== id),
        }));

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
          await supabaseStore.deleteDeck(id);
        }
      },

      // ── Card Actions ──
      addCard: async (deckId, question, answer, questionImage, answerImage) => {
        const { userId, isDemo } = get();
        const sm2Data = initializeSM2();
        const now = new Date();

        // Create card locally first
        const newCard: Flashcard = {
          id: crypto.randomUUID(),
          deckId,
          question,
          answer,
          questionImage,
          answerImage,
          interval: sm2Data.interval,
          repetition: sm2Data.repetition,
          easeFactor: sm2Data.easeFactor,
          nextReviewDate: now,
          createdAt: now,
          lastReviewDate: now,
        };

        set((state) => ({ cards: [...state.cards, newCard] }));

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
          const supabaseCard = await supabaseStore.createCard(
            userId,
            deckId,
            question,
            answer,
            sm2Data
          );
          if (supabaseCard) {
            // Update with Supabase-generated ID
            set((state) => ({
              cards: state.cards.map((c) => c.id === newCard.id ? supabaseCard : c),
            }));
          }
        }
      },

      editCard: async (id, question, answer, questionImage, answerImage) => {
        const { userId, isDemo } = get();

        // Update locally
        set((state) => ({
          cards: state.cards.map((c) => c.id === id ? { ...c, question, answer, questionImage, answerImage } : c),
        }));

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
          await supabaseStore.updateCard(id, { question, answer });
        }
      },

      deleteCard: async (id) => {
        const { userId, isDemo } = get();

        // Delete locally
        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
          await supabaseStore.deleteCard(id);
        }
      },

      reviewCard: async (id, quality) => {
        const { userId, isDemo } = get();

        // Update locally
        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (!card) return state;
          
          const sm2Result = calculateSM2(quality, {
            interval: card.interval,
            repetition: card.repetition,
            easeFactor: card.easeFactor,
            lastReviewDate: card.lastReviewDate,
          });

          // Update review history
          const today = new Date().toISOString().slice(0, 10);
          const currentCount = state.reviewHistory[today] ?? 0;

          return {
            cards: state.cards.map((c) =>
              c.id === id
                ? { ...c, ...sm2Result, lastReviewDate: new Date() }
                : c
            ),
            reviewHistory: {
              ...state.reviewHistory,
              [today]: currentCount + 1,
            },
          };
        });

        // Sync to Supabase if authenticated
        if (!isDemo && userId) {
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
        const cards = get().cards.filter((c) => {
          const due = isCardDue(new Date(c.nextReviewDate));
          return deckId ? due && c.deckId === deckId : due;
        });
        return cards.sort(
          (a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
        );
      },

      getCardsByDeck: (deckId) => {
        return get().cards.filter((c) => c.deckId === deckId);
      },

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

        set({
          streak: newStreak,
          lastStudyDate: today,
        });

        // Sync to Supabase if authenticated
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
        }));
      },
    }
  )
);
