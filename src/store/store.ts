import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage, subscribeWithSelector } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { calculateFSRS, createInitialFSRSState, type FSRSState } from '../utils/fsrs';
import { checkAchievements, type UserProgress } from '../utils/achievements';
import type { Achievement } from '../components/AchievementToast';
import type { Deck, Flashcard } from './types';
import { safeLocalStorage } from '../utils/safeStorage';
import { newId } from '../lib/ids';
import { addDays, daysBetween, isCardDue, keyToDate, studyDayKey } from '../utils/studyDay';
import { addReviewCounts, mergeById, mergeProgress } from './merge';
import { migrateLegacyIds } from './legacyMigration';
import type { ServerChanges } from './pocketbaseStore';
import { syncQueue, type ReviewLogPayload, type SyncActionType } from './syncQueue';
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
        // Guarantee dual backup in localStorage
        safeLocalStorage.set(name, indexedValue);
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

    // Fallback/Recovery from localStorage (e.g. when Brave Shields clears IndexedDB on close)
    const legacyValue = safeLocalStorage.get(name);
    if (!legacyValue) return null;
    try {
      JSON.parse(legacyValue);
      try {
        // Re-populate IndexedDB from safeLocalStorage backup
        await idbSet(name, legacyValue);
      } catch {
        // Continue using valid localStorage value when IndexedDB is blocked
      }
      return legacyValue;
    } catch {
      safeLocalStorage.set(`${name}-corrupt-backup`, legacyValue);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // ALWAYS write to localStorage as dual-storage backup for Brave Shields & ephemeral IDB
    safeLocalStorage.set(name, value);
    try {
      await idbSet(name, value);
    } catch (error) {
      console.debug('[storage] IndexedDB write unavailable, saved to localStorage:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    safeLocalStorage.remove(name);
    try {
      await idbDel(name);
    } catch (error) {
      console.debug('[storage] IndexedDB delete unavailable:', error);
    }
  },
};

export function calculateDynamicStreak(
  reviewHistory: Record<string, number>,
  now: Date = new Date(),
): { currentStreak: number; maxStreak: number } {
  const days = Object.keys(reviewHistory)
    .filter((day) => reviewHistory[day] > 0)
    .sort();
  if (days.length === 0) return { currentStreak: 0, maxStreak: 0 };

  let maxStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev !== null && daysBetween(prev, day) === 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prev = day;
  }

  // streak ยังไม่ขาดถ้าทบทวนวันนี้ หรือเมื่อวาน (วันนี้อาจยังไม่ได้เริ่ม)
  const reviewed = new Set(days);
  const today = studyDayKey(now);
  let cursor = reviewed.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (reviewed.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
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

  // เจ้าของข้อมูลในเครื่อง (null = โหมดทดลอง), เคอร์เซอร์ pull และ ID เครื่องนี้
  ownerId: string | null;
  lastPulledAt: string | null;
  deviceId: string;
  pendingAdoption: boolean;
  // log ที่อยู่พอดีขอบเคอร์เซอร์ pull ครั้งก่อน (กันนับซ้ำ)
  pullBoundaryLogIds: string[];

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
}

export interface FlashcardActions {
  setAuthState: (userId: string | null, isDemo: boolean) => void;
  syncFromServer: () => Promise<void>;
  applyServerChanges: (changes: ServerChanges, pendingIds: ReadonlySet<string>) => void;
  resetForAccount: (userId: string) => void;
  adoptLocalData: () => Promise<void>;
  declineAdoption: () => Promise<void>;
  clearStore: () => void;
  importFullBackupData: (backupData: Record<string, unknown> | null | undefined) => void;

  // Deck actions
  addDeck: (name: string, color: string, opts?: { linkedPublicDeckId?: string }) => Promise<Deck>;
  editDeck: (id: string, name: string, color: string) => Promise<void>;
  deleteDeck: (id: string, immediate?: boolean) => Promise<void>;
  undoDeleteDeck: (id: string) => void;

  // Card actions
  addCard: (
    deckId: string, question: string, answer: string, questionImage?: string, answerImage?: string,
    opts?: { skipAchievementCheck?: boolean; sourceCardId?: string },
  ) => Promise<string>;
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
    learning_steps: Math.max(0, asFiniteNumber(raw.learning_steps, 0)),
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
    userId: typeof raw.userId === 'string' ? raw.userId : null,
    isDemo: typeof raw.isDemo === 'boolean' ? raw.isDemo : true,
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : null,
    lastPulledAt: typeof raw.lastPulledAt === 'string' ? raw.lastPulledAt : null,
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : currentState.deviceId,
    pullBoundaryLogIds: Array.isArray(raw.pullBoundaryLogIds)
      ? raw.pullBoundaryLogIds.filter((id): id is string => typeof id === 'string')
      : [],
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

/** ส่งเข้าคิวเฉพาะเมื่อข้อมูลในเครื่องเป็นของผู้ใช้ที่ล็อกอินอยู่ */
function queueSync(
  state: Pick<FlashcardState, 'userId' | 'isDemo' | 'ownerId'>,
  type: SyncActionType,
  entityId: string,
  log?: ReviewLogPayload,
): void {
  const { userId, isDemo, ownerId } = state;
  if (isDemo || !userId || ownerId !== userId) return;
  // import แบบ static เพื่อให้ลำดับ enqueue ตรงกับลำดับการกระทำเสมอ (ชุดก่อนการ์ด)
  void syncQueue.enqueue(type, entityId, userId, log);
}

export const useFlashcardStore = create<FlashcardStore>()(
  subscribeWithSelector(
    persist(
    (set, get) => ({
      cards: [],
      decks: [],
      streak: 0,
      lastStudyDate: null,
      reviewHistory: {},
      userId: null,
      isDemo: true,
      ownerId: null,
      lastPulledAt: null,
      deviceId: newId(),
      pendingAdoption: false,
      pullBoundaryLogIds: [],
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
        if (!userId || isDemo) return;
        const { ownerId, decks, cards } = get();
        if (ownerId === userId) {
          void get().syncFromServer();
          return;
        }
        if (ownerId === null && (decks.length > 0 || cards.length > 0)) {
          set({ pendingAdoption: true });
          return;
        }
        get().resetForAccount(userId);
        void get().syncFromServer();
      },

      syncFromServer: async () => {
        const { userId, isDemo, ownerId } = get();
        if (isDemo || !userId || ownerId !== userId) return;
        try {
          const { pullChanges } = await import('./syncEngine');
          await pullChanges();
        } catch (error) {
          console.warn('[store] pull failed, keeping local data:', error);
        }
        void syncQueue.processQueue();
      },

      applyServerChanges: (changes, pendingIds) => {
        set((state) => {
          const decks = mergeById(state.decks, changes.decks, pendingIds);
          const deckIds = new Set(decks.map((d) => d.id));
          const cards = mergeById(state.cards, changes.cards, pendingIds).filter((c) => deckIds.has(c.deckId));
          const seen = new Set(state.pullBoundaryLogIds);
          const reviewHistory = addReviewCounts(
            state.reviewHistory, changes.logs.filter((l) => !seen.has(l.id)), state.deviceId);
          const merged = changes.progress
            ? mergeProgress({ counters: state.userProgress, unlockedAchievements: state.unlockedAchievements }, changes.progress)
            : { counters: state.userProgress, unlockedAchievements: state.unlockedAchievements };
          const { currentStreak, maxStreak } = calculateDynamicStreak(reviewHistory);
          return {
            decks,
            cards,
            reviewHistory,
            streak: currentStreak,
            maxStreak,
            unlockedAchievements: merged.unlockedAchievements,
            userProgress: { ...merged.counters, currentStreak, maxStreak },
            lastPulledAt: changes.maxUpdated ?? state.lastPulledAt,
            pullBoundaryLogIds: changes.maxUpdated === state.lastPulledAt
              ? [...new Set([...state.pullBoundaryLogIds, ...changes.boundaryLogIds])]
              : changes.boundaryLogIds,
          };
        });
      },

      resetForAccount: (userId) => {
        get().clearStore();
        set({ ownerId: userId, userId, isDemo: false, pendingAdoption: false });
      },

      adoptLocalData: async () => {
        const { userId, decks, cards, reviewHistory, deviceId } = get();
        if (!userId) return;
        set({ ownerId: userId, pendingAdoption: false, lastPulledAt: null });
        const state = get();
        decks.forEach((d) => queueSync(state, 'UPSERT_DECK', d.id));
        cards.forEach((c) => queueSync(state, 'UPSERT_CARD', c.id));
        // ประวัติรายวันมีแค่จำนวน จึงสร้าง log แทนวันละ n รายการ (เที่ยงวันตามเวลาท้องถิ่น)
        Object.entries(reviewHistory).forEach(([day, count]) => {
          for (let i = 0; i < count; i++) {
            const id = newId();
            queueSync(state, 'LOG_REVIEW', id, { id, cardId: '', rating: 3, reviewedAt: keyToDate(day).toISOString(), device: deviceId, mode: 'import' });
          }
        });
        queueSync(state, 'UPSERT_PROGRESS', userId);
        await get().syncFromServer();
      },

      declineAdoption: async () => {
        const { userId } = get();
        if (!userId) return;
        get().resetForAccount(userId);
        await get().syncFromServer();
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
          ownerId: null,
          lastPulledAt: null,
          pendingAdoption: false,
          pullBoundaryLogIds: [],
          // ล้างข้อมูลในเครื่องแล้ว = ยังไม่มี log ไหนถูกนับ จึงต้องเปลี่ยน ID เครื่องใหม่
          // ไม่งั้นตอน pull จะข้าม log ที่เครื่องนี้เคยทำไว้ และประวัติ/heatmap จะหาย
          deviceId: newId(),
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
          previousProgress: null,
        });
      },

      importFullBackupData: (backupData: Record<string, unknown> | null | undefined) => {
        if (!backupData) return;
        const rawDecks = Array.isArray(backupData.decks) ? (backupData.decks as Record<string, unknown>[]) : [];
        const validDecks = rawDecks.map((d) => ({
          ...d,
          createdAt: asValidDate(d.createdAt),
        })) as Deck[];

        const rawCards = Array.isArray(backupData.cards) ? (backupData.cards as Record<string, unknown>[]) : [];
        const validCards = rawCards.map((c) => ({
          ...c,
          createdAt: asValidDate(c.createdAt),
          nextReviewDate: asValidDate(c.nextReviewDate),
          lastReviewDate: asValidDate(c.lastReviewDate),
          fsrsState: sanitizeFSRSState(c.fsrsState),
        })) as Flashcard[];

        set((state) => ({
          decks: validDecks,
          cards: validCards,
          streak: asFiniteNumber(backupData.streak, state.streak),
          lastStudyDate: typeof backupData.lastStudyDate === 'string' ? backupData.lastStudyDate : state.lastStudyDate,
          reviewHistory: typeof backupData.reviewHistory === 'object' && backupData.reviewHistory !== null ? (backupData.reviewHistory as Record<string, number>) : state.reviewHistory,
          userProgress: sanitizeProgress(backupData.userProgress, state.userProgress),
          unlockedAchievements: Array.isArray(backupData.unlockedAchievements) ? (backupData.unlockedAchievements as string[]) : state.unlockedAchievements,
        }));
      },

      // ── Deck Actions ──
      addDeck: async (name, color, opts) => {
        const newDeck: Deck = {
          id: newId(),
          name,
          color,
          createdAt: new Date(),
          linkedPublicDeckId: opts?.linkedPublicDeckId ?? null,
        };
        set((state) => ({
          decks: [...state.decks, newDeck],
          userProgress: { ...state.userProgress, decksCreated: state.userProgress.decksCreated + 1 },
        }));
        get().checkAndUnlockAchievements();
        queueSync(get(), 'UPSERT_DECK', newDeck.id);
        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
        return newDeck;
      },

      editDeck: async (id, name, color) => {
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === id ? { ...d, name, color } : d
          ),
        }));
        queueSync(get(), 'UPSERT_DECK', id);
      },

      deleteDeck: async (id, immediate = false) => {
        const deck = get().decks.find((d) => d.id === id);
        if (!deck) return;
        const deckCards = get().cards.filter((c) => c.deckId === id);

        const commitDelete = () => {
          const state = get();
          queueSync(state, 'DELETE_DECK', id);
          deckCards.forEach((c) => queueSync(state, 'DELETE_CARD', c.id));
        };

        set((state) => ({
          decks: state.decks.filter((d) => d.id !== id),
          cards: state.cards.filter((c) => c.deckId !== id),
          pendingDeleteDecks: immediate
            ? state.pendingDeleteDecks
            : new Map(state.pendingDeleteDecks).set(id, { deck, cards: deckCards }),
        }));

        if (immediate) {
          commitDelete();
          return;
        }

        setTimeout(() => {
          if (!get().pendingDeleteDecks.has(id)) return; // ผู้ใช้กดเลิกทำแล้ว
          set((state) => {
            const pending = new Map(state.pendingDeleteDecks);
            pending.delete(id);
            return { pendingDeleteDecks: pending };
          });
          commitDelete();
        }, 5000);
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
          queueSync(get(), 'UPSERT_DECK', id);
          pending.cards.forEach((c) => queueSync(get(), 'UPSERT_CARD', c.id));
        }
      },

      // ── Card Actions ──
      addCard: async (deckId, question, answer, questionImage, answerImage, opts) => {
        const fsrsState = createInitialFSRSState();
        const now = new Date();
        const newCard: Flashcard = {
          id: newId(),
          deckId,
          question,
          answer,
          questionImage,
          answerImage,
          sourceCardId: opts?.sourceCardId,
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
          userProgress: { ...state.userProgress, cardsCreated: state.userProgress.cardsCreated + 1 },
        }));
        if (!opts?.skipAchievementCheck) get().checkAndUnlockAchievements();
        queueSync(get(), 'UPSERT_CARD', newCard.id);
        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
        return newCard.id;
      },

      editCard: async (id, question, answer, questionImage, answerImage) => {
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, question, answer, questionImage, answerImage } : c
          ),
        }));
        queueSync(get(), 'UPSERT_CARD', id);
      },

      deleteCard: async (id, immediate = false) => {
        const card = get().cards.find((c) => c.id === id);
        if (!card) return;
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          pendingDeleteCards: immediate ? state.pendingDeleteCards : new Map(state.pendingDeleteCards).set(id, card),
        }));
        if (immediate) {
          queueSync(get(), 'DELETE_CARD', id);
          return;
        }
        setTimeout(() => {
          if (!get().pendingDeleteCards.has(id)) return;
          set((state) => {
            const pending = new Map(state.pendingDeleteCards);
            pending.delete(id);
            return { pendingDeleteCards: pending };
          });
          queueSync(get(), 'DELETE_CARD', id);
        }, 5000);
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
          queueSync(get(), 'UPSERT_CARD', id);
        }
      },

      reviewCard: async (id, quality, isCramMode) => {
        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (!card) return state;

          const today = studyDayKey();
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
          const { newState, nextReviewDate, interval } = calculateFSRS(prevFsrs, quality);

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

        const state = get();
        if (!isCramMode) queueSync(state, 'UPSERT_CARD', id);
        const logId = newId();
        queueSync(state, 'LOG_REVIEW', logId, {
          id: logId,
          cardId: id,
          rating: quality,
          reviewedAt: new Date().toISOString(),
          device: state.deviceId,
          mode: isCramMode ? 'cram' : 'normal',
        });

        await get().updateStreak();
      },

      // ── Getters ──
      getDueCards: (deckId) => {
        const now = new Date();
        const cards = get().cards.filter((c) => (!deckId || c.deckId === deckId) && isCardDue(c, now));
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
        const { reviewHistory } = get();
        const today = studyDayKey();

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

        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
      },

      // ── Achievement Actions ──
      checkAndUnlockAchievements: async () => {
        const { userProgress, unlockedAchievements, perfectReviewStreak, previousProgress } = get();
        
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

            queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
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
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            totalStudyTime: state.userProgress.totalStudyTime + minutes,
          },
          totalStudyTime: state.totalStudyTime + minutes,
        }));
        
        get().checkAndUnlockAchievements();

        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
      },
    }),
    {
      name: 'daily-memory-storage',
      version: 1,
      migrate: (persisted, version) => {
        const raw = asRecord(persisted);
        if (!raw || version >= 1) return persisted as FlashcardStore;
        const { decks, cards } = migrateLegacyIds({
          decks: Array.isArray(raw.decks) ? (raw.decks as Deck[]) : [],
          cards: Array.isArray(raw.cards) ? (raw.cards as Flashcard[]) : [],
        });
        // ข้อมูลเดิมไม่เคยขึ้น PocketBase จริง จึงถือเป็นข้อมูลโหมดทดลองแล้วให้ผู้ใช้เลือกย้ายขึ้นบัญชี
        return { ...raw, decks, cards, ownerId: null, lastPulledAt: null } as unknown as FlashcardStore;
      },
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
        userId: state.userId,
        isDemo: state.isDemo,
        ownerId: state.ownerId,
        lastPulledAt: state.lastPulledAt,
        deviceId: state.deviceId,
        pullBoundaryLogIds: state.pullBoundaryLogIds,
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

// ให้ syncQueue อ่าน userId ได้โดยไม่ import store (ตัด circular import)
(globalThis as { __memokardStore?: typeof useFlashcardStore }).__memokardStore = useFlashcardStore;
