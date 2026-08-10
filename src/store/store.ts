import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage, subscribeWithSelector } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { calculateFSRS, createInitialFSRSState, type FSRSState } from '../utils/fsrs';
import { checkAchievements, type UserProgress } from '../utils/achievements';
import type { Achievement } from '../components/AchievementToast';
import type { Deck, Flashcard } from './types';
import { safeLocalStorage } from '../utils/safeStorage';
export { DECK_COLORS, type Deck, type Flashcard, type DeckColor } from './types';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    let indexedValue: unknown = null;
    try {
      indexedValue = await idbGet(name);
    } catch (error) {
      console.debug('[storage] IndexedDB read unavailable, trying localStorage:', error);
    }
    if (typeof indexedValue === 'string') {
      try {
        JSON.parse(indexedValue);
        return indexedValue;
      } catch {
        try {
          await idbSet(`${name}-corrupt-backup-${Date.now()}`, indexedValue);
          await idbDel(name);
        } catch {
          safeLocalStorage.set(`${name}-corrupt-backup`, indexedValue);
        }
      }
    }

    // Migrate data from versions that used Zustand's default localStorage.
    const legacyValue = safeLocalStorage.get(name);
    if (!legacyValue) return null;
    try {
      JSON.parse(legacyValue);
      try {
        await idbSet(name, legacyValue);
      } catch {
        // Continue using the valid localStorage value when IndexedDB is blocked.
      }
      return legacyValue;
    } catch {
      safeLocalStorage.set(`${name}-corrupt-backup`, legacyValue);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await idbSet(name, value);
    } catch (error) {
      console.debug('[storage] IndexedDB write unavailable, trying localStorage:', error);
      safeLocalStorage.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await idbDel(name);
    } catch (error) {
      console.debug('[storage] IndexedDB delete unavailable:', error);
    }
    safeLocalStorage.remove(name);
  },
};

export function calculateDynamicStreak(reviewHistory: Record<string, number>): { currentStreak: number; maxStreak: number } {
  const dates = Object.keys(reviewHistory)
    .filter((dateStr) => reviewHistory[dateStr] > 0)
    .sort();

  if (dates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let maxStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (let i = 0; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
    prevDate = currentDate;
  }

  let currentStreak = 0;
  const hasReviewedToday = dates.includes(todayStr);
  const hasReviewedYesterday = dates.includes(yesterdayStr);

  if (hasReviewedToday || hasReviewedYesterday) {
    let checkDate = hasReviewedToday ? new Date(todayStr) : new Date(yesterdayStr);
    currentStreak = 0;
    while (true) {
      const checkStr = checkDate.toISOString().slice(0, 10);
      if (dates.includes(checkStr)) {
        currentStreak += 1;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  return { currentStreak, maxStreak: Math.max(maxStreak, currentStreak) };
}

export interface FlashcardState {
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
  
  // Custom dynamic weights for FSRS offline personalized optimizer
  fsrsWeights: number[];
  
  // Previous progress snapshot for achievement checking
  previousProgress: UserProgress | null;

  // Pending deletes for undo functionality
  pendingDeleteDecks: Map<string, { deck: Deck; cards: Flashcard[] }>;
  pendingDeleteCards: Map<string, Flashcard>;
}

export interface FlashcardActions {
  recalibrateFSRS: () => Promise<void>;
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

export type FlashcardStore = FlashcardState & FlashcardActions;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asFiniteNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asValidDate = (value: unknown, fallback = new Date()): Date => {
  const date = value instanceof Date || typeof value === 'string' || typeof value === 'number'
    ? new Date(value)
    : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const sanitizeFSRSState = (value: unknown): FSRSState => {
  const fallback = createInitialFSRSState();
  const raw = asRecord(value);
  if (!raw) return fallback;
  return {
    due: asValidDate(raw.due, new Date(fallback.due)).toISOString(),
    stability: asFiniteNumber(raw.stability, fallback.stability),
    difficulty: asFiniteNumber(raw.difficulty, fallback.difficulty),
    elapsed_days: asFiniteNumber(raw.elapsed_days, fallback.elapsed_days),
    scheduled_days: asFiniteNumber(raw.scheduled_days, fallback.scheduled_days),
    reps: asFiniteNumber(raw.reps, fallback.reps),
    lapses: asFiniteNumber(raw.lapses, fallback.lapses),
    state: Math.min(3, Math.max(0, asFiniteNumber(raw.state, fallback.state))),
    last_review: raw.last_review === undefined
      ? undefined
      : asValidDate(raw.last_review).toISOString(),
  };
};

const sanitizeProgress = (value: unknown, fallback: UserProgress): UserProgress => {
  const raw = asRecord(value);
  if (!raw) return fallback;
  return {
    cardsCreated: asFiniteNumber(raw.cardsCreated, fallback.cardsCreated),
    decksCreated: asFiniteNumber(raw.decksCreated, fallback.decksCreated),
    reviewsCompleted: asFiniteNumber(raw.reviewsCompleted, fallback.reviewsCompleted),
    currentStreak: asFiniteNumber(raw.currentStreak, fallback.currentStreak),
    maxStreak: asFiniteNumber(raw.maxStreak, fallback.maxStreak),
    perfectReviews: asFiniteNumber(raw.perfectReviews, fallback.perfectReviews),
    totalStudyTime: asFiniteNumber(raw.totalStudyTime, fallback.totalStudyTime),
    decksShared: asFiniteNumber(raw.decksShared, fallback.decksShared),
    decksImported: asFiniteNumber(raw.decksImported, fallback.decksImported),
  };
};

const mergePersistedState = (persistedState: unknown, currentState: FlashcardStore): FlashcardStore => {
  const raw = asRecord(persistedState);
  if (!raw) return currentState;

  const reviewHistory = asRecord(raw.reviewHistory);
  const achievementRarities = new Set(['common', 'rare', 'epic', 'legendary']);
  const achievementQueue = Array.isArray(raw.achievementQueue)
    ? raw.achievementQueue.filter((value): value is Achievement => {
        const item = asRecord(value);
        return Boolean(
          item
          && typeof item.id === 'string'
          && typeof item.title === 'string'
          && typeof item.description === 'string'
          && typeof item.rarity === 'string'
          && achievementRarities.has(item.rarity),
        );
      })
    : [];

  return {
    ...currentState,
    cards: Array.isArray(raw.cards)
      ? raw.cards.filter(value => asRecord(value)) as Flashcard[]
      : [],
    decks: Array.isArray(raw.decks)
      ? raw.decks.filter(value => asRecord(value)) as Deck[]
      : [],
    streak: asFiniteNumber(raw.streak),
    lastStudyDate: typeof raw.lastStudyDate === 'string' ? raw.lastStudyDate : null,
    reviewHistory: reviewHistory
      ? Object.fromEntries(
          Object.entries(reviewHistory)
            .filter(([, count]) => typeof count === 'number' && Number.isFinite(count) && count >= 0),
        ) as Record<string, number>
      : {},
    fsrsWeights: Array.isArray(raw.fsrsWeights) && raw.fsrsWeights.every(Number.isFinite)
      ? raw.fsrsWeights as number[]
      : currentState.fsrsWeights,
    userId: typeof raw.userId === 'string' ? raw.userId : null,
    isDemo: typeof raw.isDemo === 'boolean' ? raw.isDemo : true,
    userProgress: sanitizeProgress(raw.userProgress, currentState.userProgress),
    unlockedAchievements: Array.isArray(raw.unlockedAchievements)
      ? raw.unlockedAchievements.filter((id): id is string => typeof id === 'string')
      : [],
    achievementQueue,
    perfectReviewStreak: asFiniteNumber(raw.perfectReviewStreak),
    totalStudyTime: asFiniteNumber(raw.totalStudyTime),
    maxStreak: asFiniteNumber(raw.maxStreak),
    previousProgress: raw.previousProgress === null || raw.previousProgress === undefined
      ? null
      : sanitizeProgress(raw.previousProgress, currentState.userProgress),
  };
};

export const useFlashcardStore = create<FlashcardStore>()(
  subscribeWithSelector(
    persist(
    (set, get) => ({
      cards: [],
      decks: [],
      streak: 0,
      lastStudyDate: null,
      reviewHistory: {},
      fsrsWeights: [
        0.4025, 0.9304, 2.5026, 7.8229, 4.9372, 0.9411, 0.8295, 0.0867, 1.4886, 
        0.1348, 1.0118, 2.0526, 0.1264, 0.4485, 1.4954, 0.254, 2.9466
      ],
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

        // Lazy import to break circular dependency
        const { supabaseStore } = await import('./supabaseStore');

        try {
          const [decks, cards, stats, achievements, reviewDates] = await Promise.all([
            supabaseStore.fetchDecks(userId),
            supabaseStore.fetchCards(userId),
            supabaseStore.fetchUserStats(userId),
            supabaseStore.fetchUserAchievements(userId),
            supabaseStore.fetchReviewDates(userId),
          ]);

          // Reconstruct reviewHistory from actual review logs
          const reconstructedHistory: Record<string, number> = {};
          (reviewDates || []).forEach((dateStr) => {
            reconstructedHistory[dateStr] = (reconstructedHistory[dateStr] || 0) + 1;
          });

          // Compute dynamic streak metrics to guarantee resilience
          const { currentStreak: dynStreak, maxStreak: dynMaxStreak } = calculateDynamicStreak(reconstructedHistory);

          // Ensure every card has fsrsState (migrate old cards that don't have it)
          const migratedCards = cards.map((c) => ({
            ...c,
            fsrsState: (c as Partial<Flashcard>).fsrsState ?? createInitialFSRSState(),
          }));

          set({
            decks,
            cards: migratedCards,
            reviewHistory: reconstructedHistory,
            streak: dynStreak,
            lastStudyDate: stats.lastStudyDate,
            maxStreak: dynMaxStreak,
            unlockedAchievements: achievements.unlockedAchievements,
            perfectReviewStreak: achievements.perfectReviews,
            totalStudyTime: achievements.totalStudyTime,
            userProgress: {
              ...get().userProgress,
              perfectReviews: achievements.perfectReviews,
              totalStudyTime: achievements.totalStudyTime,
              decksShared: achievements.decksShared,
              decksImported: achievements.decksImported,
              currentStreak: dynStreak,
              maxStreak: dynMaxStreak,
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

      recalibrateFSRS: async () => {
        const { cards } = get();
        let totalReps = 0;
        let totalLapses = 0;

        cards.forEach((c) => {
          if (c.fsrsState) {
            totalReps += c.fsrsState.reps || 0;
            totalLapses += c.fsrsState.lapses || 0;
          }
        });

        // Only recalibrate if the user has a statistically meaningful number of reviews (e.g. 80+ repetitions)
        if (totalReps >= 80) {
          const actualRetention = 1.0 - totalLapses / totalReps;
          const { calibrateFSRSWeights } = await import('../utils/fsrs');

          // Build simulated logs corresponding to the user's actual retention rate
          const simulatedLogs = Array.from({ length: 150 }, (_, i) => ({
            quality: i < 150 * actualRetention ? 3 : 1,
          }));

          const newWeights = calibrateFSRSWeights(simulatedLogs);
          set({ fsrsWeights: newWeights });
          console.log('[store] FSRS weights dynamically calibrated offline to retention:', actualRetention.toFixed(4), newWeights);
        }
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
          try {
            const { supabaseStore } = await import('./supabaseStore');
            const supabaseDeck = await supabaseStore.createDeck(userId, name, color, newDeck.id);
            if (supabaseDeck) {
              set((state) => ({
                decks: state.decks.map((d) => d.id === newDeck.id ? supabaseDeck : d),
              }));
              return supabaseDeck;
            }
          } catch (err) {
            console.warn('[store] Failed to create deck on Supabase, queuing action:', err);
            const { syncQueue } = await import('./syncQueue');
            await syncQueue.enqueue('CREATE_DECK', {
              id: newDeck.id,
              name: newDeck.name,
              color: newDeck.color,
            });
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
          try {
            const { supabaseStore } = await import('./supabaseStore');
            await supabaseStore.updateDeck(id, { name, color });
          } catch (err) {
            console.warn('[store] Failed to update deck on Supabase, queuing action:', err);
            const { syncQueue } = await import('./syncQueue');
            await syncQueue.enqueue('UPDATE_DECK', { id, name, color });
          }
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
            try {
              const { supabaseStore } = await import('./supabaseStore');
              await supabaseStore.deleteDeck(id);
            } catch (err) {
              console.warn('[store] Failed to delete deck on Supabase, queuing action:', err);
              const { syncQueue } = await import('./syncQueue');
              await syncQueue.enqueue('DELETE_DECK', { id });
            }
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
              try {
                const { supabaseStore } = await import('./supabaseStore');
                await supabaseStore.deleteDeck(id);
                set((state) => {
                  const newPending = new Map(state.pendingDeleteDecks);
                  newPending.delete(id);
                  return { pendingDeleteDecks: newPending };
                });
              } catch (err) {
                console.warn('[store] Failed to delete deck on Supabase, queuing action:', err);
                const { syncQueue } = await import('./syncQueue');
                await syncQueue.enqueue('DELETE_DECK', { id });
                set((state) => {
                  const newPending = new Map(state.pendingDeleteDecks);
                  newPending.delete(id);
                  return { pendingDeleteDecks: newPending };
                });
              }
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
          try {
            const { supabaseStore } = await import('./supabaseStore');
            const supabaseCard = await supabaseStore.createCard(
              userId,
              deckId,
              question,
              answer,
              { interval: 0, repetition: 0, easeFactor: 2.5 },
              newCard.id
            );
            if (supabaseCard) {
              set((state) => ({
                cards: state.cards.map((c) =>
                  c.id === newCard.id ? { ...supabaseCard, fsrsState } : c
                ),
              }));
            }
          } catch (err) {
            console.warn('[store] Failed to create card on Supabase, queuing action:', err);
            const { syncQueue } = await import('./syncQueue');
            await syncQueue.enqueue('CREATE_CARD', {
              id: newCard.id,
              deckId: newCard.deckId,
              question: newCard.question,
              answer: newCard.answer,
            });
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
          try {
            const { supabaseStore } = await import('./supabaseStore');
            await supabaseStore.updateCard(id, { question, answer });
          } catch (err) {
            console.warn('[store] Failed to update card on Supabase, queuing action:', err);
            const { syncQueue } = await import('./syncQueue');
            await syncQueue.enqueue('UPDATE_CARD', { id, question, answer });
          }
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
            try {
              const { supabaseStore } = await import('./supabaseStore');
              await supabaseStore.deleteCard(id);
            } catch (err) {
              console.warn('[store] Failed to delete card on Supabase, queuing action:', err);
              const { syncQueue } = await import('./syncQueue');
              await syncQueue.enqueue('DELETE_CARD', { id });
            }
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
              try {
                const { supabaseStore } = await import('./supabaseStore');
                await supabaseStore.deleteCard(id);
                set((state) => {
                  const newPending = new Map(state.pendingDeleteCards);
                  newPending.delete(id);
                  return { pendingDeleteCards: newPending };
                });
              } catch (err) {
                console.warn('[store] Failed to delete card on Supabase, queuing action:', err);
                const { syncQueue } = await import('./syncQueue');
                await syncQueue.enqueue('DELETE_CARD', { id });
                set((state) => {
                  const newPending = new Map(state.pendingDeleteCards);
                  newPending.delete(id);
                  return { pendingDeleteCards: newPending };
                });
              }
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

          // Track consecutive perfect review streak (reset on non-perfect)
          let newPerfectStreak = state.perfectReviewStreak;
          if (quality === 4) {
            newPerfectStreak += 1;
          } else {
            newPerfectStreak = 0;
          }

          if (isCramMode) {
            return {
              reviewHistory: { ...state.reviewHistory, [today]: currentCount + 1 },
              userProgress: {
                ...state.userProgress,
                reviewsCompleted: state.userProgress.reviewsCompleted + 1,
                // perfectReviews tracks the PEAK consecutive streak ever reached
                perfectReviews: Math.max(state.userProgress.perfectReviews, newPerfectStreak),
              },
              perfectReviewStreak: newPerfectStreak,
            };
          }

          const prevFsrs = card.fsrsState ?? createInitialFSRSState();
          const { newState, nextReviewDate, interval } = calculateFSRS(prevFsrs, quality, state.fsrsWeights);

          return {
            cards: state.cards.map((c) =>
              c.id === id
                ? { ...c, interval, repetition: c.repetition + 1, nextReviewDate, lastReviewDate: new Date(), fsrsState: newState }
                : c
            ),
            reviewHistory: { ...state.reviewHistory, [today]: currentCount + 1 },
            userProgress: {
              ...state.userProgress,
              reviewsCompleted: state.userProgress.reviewsCompleted + 1,
              perfectReviews: Math.max(state.userProgress.perfectReviews, newPerfectStreak),
            },
            perfectReviewStreak: newPerfectStreak,
          };
        });

        // Check for achievements (fire-and-forget is fine here)
        get().checkAndUnlockAchievements();

        // Sync to Supabase — use syncQueue for offline resilience
        if (!isDemo && userId) {
          const updatedCard = get().cards.find((c) => c.id === id);
          const { perfectReviewStreak, userProgress } = get();

          try {
            const { supabaseStore } = await import('./supabaseStore');
            const promises: Promise<unknown>[] = [];

            if (!isCramMode && updatedCard) {
              promises.push(
                supabaseStore.updateCard(id, {
                  interval: updatedCard.interval,
                  repetition: updatedCard.repetition,
                  easeFactor: updatedCard.easeFactor,
                  nextReviewDate: updatedCard.nextReviewDate,
                  fsrsState: updatedCard.fsrsState,
                }),
                supabaseStore.logReview(userId, id, quality)
              );
            }

            // Update peak perfect streak in achievements
            if (quality === 4) {
              promises.push(
                supabaseStore.updateUserAchievements(userId, {
                  perfectReviews: userProgress.perfectReviews,
                })
              );
            } else if (perfectReviewStreak === 0 && quality !== 4) {
              // streak was reset — update so DB reflects reset
              promises.push(
                supabaseStore.updateUserAchievements(userId, {
                  perfectReviews: userProgress.perfectReviews,
                })
              );
            }

            promises.push(supabaseStore.updateMaxStreak(userId, userProgress.currentStreak));

            await Promise.all(promises);
          } catch (err) {
            // Network error: queue for later retry
            console.warn('[store] Supabase sync failed, queuing for retry:', err);
            if (!isCramMode && !isDemo) {
              const updatedCard2 = get().cards.find((c) => c.id === id);
              if (updatedCard2) {
                const { syncQueue } = await import('./syncQueue');
                await syncQueue.enqueue('REVIEW_CARD', {
                  id,
                  interval: updatedCard2.interval,
                  repetition: updatedCard2.repetition,
                  easeFactor: updatedCard2.easeFactor,
                  nextReviewDate: updatedCard2.nextReviewDate,
                  fsrsState: updatedCard2.fsrsState,
                });
              }
            }
          }
        }

        await get().updateStreak();
        await get().recalibrateFSRS();
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
        const { userId, isDemo, reviewHistory } = get();
        const today = new Date().toISOString().slice(0, 10);

        // Derive active and maximum streaks dynamically from the source-of-truth reviewHistory log
        const { currentStreak: newStreak, maxStreak: newMaxStreak } = calculateDynamicStreak(reviewHistory);

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
          try {
            const { supabaseStore } = await import('./supabaseStore');
            await Promise.all([
              supabaseStore.updateUserStats(userId, newStreak, today),
              supabaseStore.updateUserAchievements(userId, { maxStreak: newMaxStreak }),
            ]);
          } catch (err) {
            console.warn('[store] Failed to update streak on Supabase:', err);
          }
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
              const { supabaseStore } = await import('./supabaseStore');
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
          const { supabaseStore } = await import('./supabaseStore');
          await supabaseStore.addStudyTime(userId, minutes);
        }
      },
    }),
    {
      name: 'daily-memory-storage',
      storage: createJSONStorage(() => idbStorage),
      merge: mergePersistedState,
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
        fsrsWeights: state.fsrsWeights,
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
        state.fsrsWeights = state.fsrsWeights ?? [
          0.4025, 0.9304, 2.5026, 7.8229, 4.9372, 0.9411, 0.8295, 0.0867, 1.4886, 
          0.1348, 1.0118, 2.0526, 0.1264, 0.4485, 1.4954, 0.254, 2.9466
        ];
        state.decks = (state.decks ?? []).map((d) => {
          const raw = d as unknown as Omit<Deck, 'createdAt'> & { createdAt: string | Date };
          return {
            ...d,
            createdAt: asValidDate(raw.createdAt),
          };
        });
        state.cards = (state.cards ?? []).map((c) => {
          const raw = c as unknown as Omit<Flashcard, 'nextReviewDate' | 'createdAt' | 'lastReviewDate' | 'fsrsState'> & {
            nextReviewDate: string | Date;
            createdAt: string | Date;
            lastReviewDate: string | Date;
            fsrsState?: FSRSState;
          };
          return {
            ...c,
            nextReviewDate: asValidDate(raw.nextReviewDate),
            createdAt: asValidDate(raw.createdAt),
            lastReviewDate: asValidDate(raw.lastReviewDate),
            // Migrate and repair old or partially corrupted FSRS state.
            fsrsState: sanitizeFSRSState(raw.fsrsState),
          };
        });
      },
    }
  ))
);
