import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateFSRS, createInitialFSRSState, type FSRSState } from '../utils/fsrs';
import { supabaseStore } from './supabaseStore';
import { checkAchievements, type UserProgress } from '../utils/achievements';
import type { Achievement } from '../components/AchievementToast';

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

  // Achievement tracking
  userProgress: UserProgress;
  unlockedAchievements: string[];
  achievementQueue: Achievement[];
  perfectReviewStreak: number;
  totalStudyTime: number;
  maxStreak: number; // Track max streak separately
  
  // Previous progress snapshot for achievement checking
  previousProgress: UserProgress | null;

  // Pending deletes for undo functionality
  pendingDeleteDecks: Map<string, { deck: Deck; cards: Flashcard[] }>;
  pendingDeleteCards: Map<string, Flashcard>;

  // Sync actions
  setAuthState: (userId: string | null, isDemo: boolean) => void;
  syncFromSupabase: () => Promise<void>;
  clearStore: () => void;

  // Deck actions
  addDeck: (name: string, color: string) => Promise<Deck>;
  editDeck: (id: string, name: string, color: string) => Promise<void>;
  deleteDeck: (id: string, immediate?: boolean) => Promise<void>;
  undoDeleteDeck: (id: string) => void;

  // Card actions
  addCard: (deckId: string, question: string, answer: string, questionImage?: string, answerImage?: string, skipAchievementCheck?: boolean) => Promise<void>;
  editCard: (id: string, question: string, answer: string, questionImage?: string, answerImage?: string) => Promise<void>;
  deleteCard: (id: string, immediate?: boolean) => Promise<void>;
  undoDeleteCard: (id: string) => void;
  reviewCard: (id: string, quality: number, isCramMode?: boolean) => Promise<void>;

  // Getters
  getDueCards: (deckId?: string) => Flashcard[];
  getCardsByDeck: (deckId: string) => Flashcard[];
  getDeckById: (id: string) => Deck | undefined;
  getTotalCards: (deckId?: string) => number;
  getDueCount: (deckId?: string) => number;

  // Streak
  updateStreak: () => Promise<void>;

  // Achievement actions
  checkAndUnlockAchievements: () => void;
  popAchievement: () => Achievement | null;
  trackStudyTime: (minutes: number) => void;
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
      userProgress: {
        cardsCreated: 0,
        decksCreated: 0,
        reviewsCompleted: 0,
        currentStreak: 0,
        maxStreak: 0,
        perfectReviews: 0,
        totalStudyTime: 0,
        decksShared: 0,
        decksImported: 0,
      },
      unlockedAchievements: [],
      achievementQueue: [],
      perfectReviewStreak: 0,
      totalStudyTime: 0,
      maxStreak: 0,
      previousProgress: null,
      pendingDeleteDecks: new Map(),
      pendingDeleteCards: new Map(),

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
          const [decks, cards, stats, achievements] = await Promise.all([
            supabaseStore.fetchDecks(userId),
            supabaseStore.fetchCards(userId),
            supabaseStore.fetchUserStats(userId),
            supabaseStore.fetchUserAchievements(userId),
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
            unlockedAchievements: achievements.unlockedAchievements,
            perfectReviewStreak: achievements.perfectReviews,
            totalStudyTime: achievements.totalStudyTime,
            userProgress: {
              ...get().userProgress,
              perfectReviews: achievements.perfectReviews,
              totalStudyTime: achievements.totalStudyTime,
              decksShared: achievements.decksShared,
              decksImported: achievements.decksImported,
              maxStreak: achievements.maxStreak,
            },
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
          userProgress: {
            cardsCreated: 0,
            decksCreated: 0,
            reviewsCompleted: 0,
            currentStreak: 0,
            maxStreak: 0,
            perfectReviews: 0,
            totalStudyTime: 0,
            decksShared: 0,
            decksImported: 0,
          },
          unlockedAchievements: [],
          achievementQueue: [],
          perfectReviewStreak: 0,
          totalStudyTime: 0,
          maxStreak: 0,
          previousProgress: null,
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

        set((state) => ({ 
          decks: [...state.decks, newDeck],
          userProgress: {
            ...state.userProgress,
            decksCreated: state.userProgress.decksCreated + 1,
          }
        }));

        // Check for achievements
        get().checkAndUnlockAchievements();

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

      editDeck: async (id, name, color) => {
        const { userId, isDemo } = get();

        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === id ? { ...d, name, color } : d
          ),
        }));

        if (!isDemo && userId) {
          await supabaseStore.updateDeck(id, { name, color });
        }
      },

      deleteDeck: async (id, immediate = false) => {
        const { userId, isDemo } = get();
        const deck = get().decks.find((d) => d.id === id);
        const deckCards = get().cards.filter((c) => c.deckId === id);

        if (!deck) return;

        if (immediate) {
          // Immediate delete (no undo)
          set((state) => ({
            decks: state.decks.filter((d) => d.id !== id),
            cards: state.cards.filter((c) => c.deckId !== id),
          }));

          if (!isDemo && userId) {
            await supabaseStore.deleteDeck(id);
          }
        } else {
          // Soft delete (can undo)
          set((state) => ({
            decks: state.decks.filter((d) => d.id !== id),
            cards: state.cards.filter((c) => c.deckId !== id),
            pendingDeleteDecks: new Map(state.pendingDeleteDecks).set(id, { deck, cards: deckCards }),
          }));

          // Schedule permanent delete after 5 seconds
          setTimeout(async () => {
            const stillPending = get().pendingDeleteDecks.has(id);
            if (stillPending && !isDemo && userId) {
              await supabaseStore.deleteDeck(id);
              set((state) => {
                const newPending = new Map(state.pendingDeleteDecks);
                newPending.delete(id);
                return { pendingDeleteDecks: newPending };
              });
            }
          }, 5000);
        }
      },

      undoDeleteDeck: (id) => {
        const pending = get().pendingDeleteDecks.get(id);
        if (pending) {
          set((state) => {
            const newPending = new Map(state.pendingDeleteDecks);
            newPending.delete(id);
            return {
              decks: [...state.decks, pending.deck],
              cards: [...state.cards, ...pending.cards],
              pendingDeleteDecks: newPending,
            };
          });
        }
      },

      // ── Card Actions ──
      addCard: async (deckId, question, answer, questionImage, answerImage, skipAchievementCheck = false) => {
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

        set((state) => ({ 
          cards: [...state.cards, newCard],
          userProgress: {
            ...state.userProgress,
            cardsCreated: state.userProgress.cardsCreated + 1,
          }
        }));

        // Check for achievements (skip if requested to prevent spam)
        if (!skipAchievementCheck) {
          get().checkAndUnlockAchievements();
        }

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

      deleteCard: async (id, immediate = false) => {
        const { userId, isDemo } = get();
        const card = get().cards.find((c) => c.id === id);

        if (!card) return;

        if (immediate) {
          // Immediate delete (no undo)
          set((state) => ({
            cards: state.cards.filter((c) => c.id !== id),
          }));

          if (!isDemo && userId) {
            await supabaseStore.deleteCard(id);
          }
        } else {
          // Soft delete (can undo)
          set((state) => ({
            cards: state.cards.filter((c) => c.id !== id),
            pendingDeleteCards: new Map(state.pendingDeleteCards).set(id, card),
          }));

          // Schedule permanent delete after 5 seconds
          setTimeout(async () => {
            const stillPending = get().pendingDeleteCards.has(id);
            if (stillPending && !isDemo && userId) {
              await supabaseStore.deleteCard(id);
              set((state) => {
                const newPending = new Map(state.pendingDeleteCards);
                newPending.delete(id);
                return { pendingDeleteCards: newPending };
              });
            }
          }, 5000);
        }
      },

      undoDeleteCard: (id) => {
        const pending = get().pendingDeleteCards.get(id);
        if (pending) {
          set((state) => {
            const newPending = new Map(state.pendingDeleteCards);
            newPending.delete(id);
            return {
              cards: [...state.cards, pending],
              pendingDeleteCards: newPending,
            };
          });
        }
      },

      reviewCard: async (id, quality, isCramMode) => {
        const { userId, isDemo } = get();

        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (!card) return state;

          const today = new Date().toISOString().slice(0, 10);
          const currentCount = state.reviewHistory[today] ?? 0;

          // Track perfect review streak
          let newPerfectStreak = state.perfectReviewStreak;
          if (quality === 4) {
            newPerfectStreak += 1;
          } else {
            newPerfectStreak = 0;
          }

          if (isCramMode) {
            // Skip FSRS state update in Cram Mode, only update history
            return {
              reviewHistory: {
                ...state.reviewHistory,
                [today]: currentCount + 1,
              },
              userProgress: {
                ...state.userProgress,
                reviewsCompleted: state.userProgress.reviewsCompleted + 1,
              },
              perfectReviewStreak: newPerfectStreak,
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
            userProgress: {
              ...state.userProgress,
              reviewsCompleted: state.userProgress.reviewsCompleted + 1,
              perfectReviews: quality === 4 ? state.userProgress.perfectReviews + 1 : state.userProgress.perfectReviews,
            },
            perfectReviewStreak: newPerfectStreak,
          };
        });

        // Check for achievements
        get().checkAndUnlockAchievements();

        // Sync perfect reviews and max streak to Supabase
        if (!isDemo && userId) {
          const { perfectReviewStreak, userProgress } = get();
          
          // Update perfect reviews count
          if (quality === 4) {
            await supabaseStore.updateUserAchievements(userId, {
              perfectReviews: perfectReviewStreak,
            });
          }
          
          // Update max streak if needed
          await supabaseStore.updateMaxStreak(userId, userProgress.currentStreak);
        }

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
        const { userId, isDemo, lastStudyDate, streak, maxStreak } = get();
        const today = new Date().toISOString().slice(0, 10);

        if (lastStudyDate === today) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = lastStudyDate === yesterday ? streak + 1 : 1;
        const newMaxStreak = Math.max(maxStreak, newStreak);

        set((state) => ({ 
          streak: newStreak, 
          lastStudyDate: today,
          maxStreak: newMaxStreak,
          userProgress: {
            ...state.userProgress,
            currentStreak: newStreak,
            maxStreak: newMaxStreak,
          }
        }));

        // Check for achievements
        get().checkAndUnlockAchievements();

        if (!isDemo && userId) {
          await Promise.all([
            supabaseStore.updateUserStats(userId, newStreak, today),
            supabaseStore.updateUserAchievements(userId, { maxStreak: newMaxStreak }),
          ]);
        }
      },

      // ── Achievement Actions ──
      checkAndUnlockAchievements: async () => {
        const { userProgress, unlockedAchievements, perfectReviewStreak, userId, isDemo, previousProgress } = get();
        
        // Create current progress snapshot
        const currentProgress: UserProgress = {
          ...userProgress,
          perfectReviews: perfectReviewStreak,
        };

        // Use previous snapshot or assume all zeros if first time
        const prevProgress: UserProgress = previousProgress || {
          cardsCreated: 0,
          decksCreated: 0,
          reviewsCompleted: 0,
          currentStreak: 0,
          maxStreak: 0,
          perfectReviews: 0,
          totalStudyTime: 0,
          decksShared: 0,
          decksImported: 0,
        };

        const newAchievements = checkAchievements(currentProgress, prevProgress);
        
        if (newAchievements.length > 0) {
          const unlockedIds = newAchievements.map(a => a.id).filter(id => !unlockedAchievements.includes(id));
          const newUnlocked = newAchievements.filter(a => unlockedIds.includes(a.id));
          
          if (newUnlocked.length > 0) {
            set((state) => ({
              unlockedAchievements: [...state.unlockedAchievements, ...unlockedIds],
              achievementQueue: [...state.achievementQueue, ...newUnlocked],
            }));

            // Sync to Supabase
            if (!isDemo && userId) {
              const updatedUnlocked = [...unlockedAchievements, ...unlockedIds];
              await supabaseStore.updateUserAchievements(userId, {
                unlockedAchievements: updatedUnlocked,
              });
            }
          }
        }
        
        // Update previous progress snapshot for next check
        set({ previousProgress: currentProgress });
      },

      popAchievement: () => {
        const { achievementQueue } = get();
        if (achievementQueue.length === 0) return null;
        
        const [first, ...rest] = achievementQueue;
        set({ achievementQueue: rest });
        return first;
      },

      trackStudyTime: async (minutes) => {
        const { userId, isDemo } = get();
        
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            totalStudyTime: state.userProgress.totalStudyTime + minutes,
          },
          totalStudyTime: state.totalStudyTime + minutes,
        }));
        
        get().checkAndUnlockAchievements();

        // Sync to Supabase
        if (!isDemo && userId) {
          await supabaseStore.addStudyTime(userId, minutes);
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
        userProgress: state.userProgress,
        unlockedAchievements: state.unlockedAchievements,
        achievementQueue: state.achievementQueue,
        perfectReviewStreak: state.perfectReviewStreak,
        totalStudyTime: state.totalStudyTime,
        maxStreak: state.maxStreak,
        previousProgress: state.previousProgress,
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
