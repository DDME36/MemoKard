import { pb, isPocketBaseConfigured } from '../lib/pocketbase';
import type { Deck, Flashcard } from './types';
import { createInitialFSRSState, type FSRSState } from '../utils/fsrs';

// ============================================
// PocketBase Cloud Storage Operations
// ============================================

export const pocketbaseStore = {
  // ── Decks ──
  async fetchDecks(userId: string): Promise<Deck[]> {
    if (!isPocketBaseConfigured()) return [];

    try {
      const records = await pb.collection('decks').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
      });

      return records.map((d) => ({
        id: d.id,
        name: d.name,
        color: d.color,
        createdAt: new Date(d.created),
        linkedPublicDeckId: d.linked_public_deck_id || null,
      }));
    } catch (error) {
      console.error('Error fetching decks from PocketBase:', error);
      throw error;
    }
  },

  async createDeck(userId: string, name: string, color: string, customId?: string): Promise<Deck | null> {
    if (!isPocketBaseConfigured()) return null;

    const body: Record<string, unknown> = {
      user: userId,
      name,
      color,
    };
    if (customId) {
      body.id = customId;
    }

    try {
      const record = await pb.collection('decks').create(body);
      return {
        id: record.id,
        name: record.name,
        color: record.color,
        createdAt: new Date(record.created),
      };
    } catch (error) {
      console.error('Error creating deck in PocketBase:', error);
      throw error;
    }
  },

  async updateDeck(deckId: string, updates: { name?: string; color?: string }): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      await pb.collection('decks').update(deckId, updates);
      return true;
    } catch (error) {
      console.error('Error updating deck in PocketBase:', error);
      throw error;
    }
  },

  async deleteDeck(deckId: string): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      await pb.collection('decks').delete(deckId);
      return true;
    } catch (error) {
      console.error('Error deleting deck from PocketBase:', error);
      throw error;
    }
  },

  // ── Cards ──
  async fetchCards(userId: string, deckId?: string): Promise<Flashcard[]> {
    if (!isPocketBaseConfigured()) return [];

    let filter = `user = "${userId}"`;
    if (deckId) {
      filter += ` && deck = "${deckId}"`;
    }

    try {
      const records = await pb.collection('cards').getFullList({
        filter,
        sort: '-created',
      });

      return records.map((c) => ({
        id: c.id,
        deckId: c.deck || c.deck_id,
        question: c.question,
        answer: c.answer,
        interval: c.interval,
        repetition: c.repetition,
        easeFactor: c.ease_factor,
        nextReviewDate: new Date(c.next_review),
        createdAt: new Date(c.created),
        lastReviewDate: new Date(c.updated),
        fsrsState: c.fsrs_state ?? createInitialFSRSState(),
      }));
    } catch (error) {
      console.error('Error fetching cards from PocketBase:', error);
      throw error;
    }
  },

  async createCard(
    userId: string,
    deckId: string,
    question: string,
    answer: string,
    sm2Data: { interval: number; repetition: number; easeFactor: number },
    customId?: string,
    fsrsState?: FSRSState
  ): Promise<Flashcard | null> {
    if (!isPocketBaseConfigured()) return null;

    const body: Record<string, unknown> = {
      user: userId,
      deck: deckId,
      deck_id: deckId,
      question,
      answer,
      interval: sm2Data.interval,
      repetition: sm2Data.repetition,
      ease_factor: sm2Data.easeFactor,
      next_review: new Date().toISOString(),
      fsrs_state: fsrsState ?? createInitialFSRSState(),
    };
    if (customId) {
      body.id = customId;
    }

    try {
      const record = await pb.collection('cards').create(body);
      return {
        id: record.id,
        deckId: record.deck || record.deck_id,
        question: record.question,
        answer: record.answer,
        interval: record.interval,
        repetition: record.repetition,
        easeFactor: record.ease_factor,
        nextReviewDate: new Date(record.next_review),
        createdAt: new Date(record.created),
        lastReviewDate: new Date(record.updated),
        fsrsState: record.fsrs_state ?? createInitialFSRSState(),
      };
    } catch (error) {
      console.error('Error creating card in PocketBase:', error);
      throw error;
    }
  },

  async updateCard(
    cardId: string,
    updates: {
      question?: string;
      answer?: string;
      interval?: number;
      repetition?: number;
      easeFactor?: number;
      nextReviewDate?: Date;
      fsrsState?: FSRSState;
    }
  ): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.question !== undefined) dbUpdates.question = updates.question;
    if (updates.answer !== undefined) dbUpdates.answer = updates.answer;
    if (updates.interval !== undefined) dbUpdates.interval = updates.interval;
    if (updates.repetition !== undefined) dbUpdates.repetition = updates.repetition;
    if (updates.easeFactor !== undefined) dbUpdates.ease_factor = updates.easeFactor;
    if (updates.nextReviewDate !== undefined) {
      dbUpdates.next_review = updates.nextReviewDate instanceof Date 
        ? updates.nextReviewDate.toISOString() 
        : new Date(updates.nextReviewDate).toISOString();
    }
    if (updates.fsrsState !== undefined) dbUpdates.fsrs_state = updates.fsrsState;

    try {
      await pb.collection('cards').update(cardId, dbUpdates);
      return true;
    } catch (error) {
      console.error('Error updating card in PocketBase:', error);
      throw error;
    }
  },

  async deleteCard(cardId: string): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      await pb.collection('cards').delete(cardId);
      return true;
    } catch (error) {
      console.error('Error deleting card from PocketBase:', error);
      throw error;
    }
  },

  // ── User Stats ──
  async fetchUserStats(userId: string): Promise<{ streak: number; lastStudyDate: string | null }> {
    if (!isPocketBaseConfigured()) return { streak: 0, lastStudyDate: null };

    try {
      const record = await pb.collection('user_stats').getFirstListItem(`user = "${userId}"`);
      return {
        streak: record.streak || 0,
        lastStudyDate: record.last_review_date || null,
      };
    } catch {
      return { streak: 0, lastStudyDate: null };
    }
  },

  async updateUserStats(userId: string, streak: number, lastStudyDate: string): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      // Find existing stat or create new
      let existingId: string | null = null;
      try {
        const record = await pb.collection('user_stats').getFirstListItem(`user = "${userId}"`);
        existingId = record.id;
      } catch {
        // Not found
      }

      if (existingId) {
        await pb.collection('user_stats').update(existingId, {
          streak,
          last_review_date: lastStudyDate,
        });
      } else {
        await pb.collection('user_stats').create({
          user: userId,
          streak,
          last_review_date: lastStudyDate,
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating user stats in PocketBase:', error);
      return false;
    }
  },

  // ── Review Logs ──
  async logReview(userId: string, cardId: string, quality: number): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      await pb.collection('review_logs').create({
        user: userId,
        card_id: cardId,
        quality,
      });
      return true;
    } catch (error) {
      console.error('Error logging review in PocketBase:', error);
      return false;
    }
  },

  // ── User Achievements ──
  async fetchUserAchievements(userId: string): Promise<{
    unlockedAchievements: string[];
    perfectReviews: number;
    totalStudyTime: number;
    decksShared: number;
    decksImported: number;
    maxStreak: number;
  }> {
    const defaultData = {
      unlockedAchievements: [],
      perfectReviews: 0,
      totalStudyTime: 0,
      decksShared: 0,
      decksImported: 0,
      maxStreak: 0,
    };

    if (!isPocketBaseConfigured()) return defaultData;

    try {
      const record = await pb.collection('user_achievements').getFirstListItem(`user = "${userId}"`);
      return {
        unlockedAchievements: record.unlocked_achievements || [],
        perfectReviews: record.perfect_reviews || 0,
        totalStudyTime: record.total_study_time || 0,
        decksShared: record.decks_shared || 0,
        decksImported: record.decks_imported || 0,
        maxStreak: record.max_streak || 0,
      };
    } catch {
      return defaultData;
    }
  },

  async updateUserAchievements(
    userId: string,
    updates: {
      unlockedAchievements?: string[];
      perfectReviews?: number;
      totalStudyTime?: number;
      decksShared?: number;
      decksImported?: number;
      maxStreak?: number;
    }
  ): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      let existingId: string | null = null;
      try {
        const record = await pb.collection('user_achievements').getFirstListItem(`user = "${userId}"`);
        existingId = record.id;
      } catch {
        // Not found
      }

      const payload: Record<string, unknown> = {};
      if (updates.unlockedAchievements !== undefined) payload.unlocked_achievements = updates.unlockedAchievements;
      if (updates.perfectReviews !== undefined) payload.perfect_reviews = updates.perfectReviews;
      if (updates.totalStudyTime !== undefined) payload.total_study_time = updates.totalStudyTime;
      if (updates.decksShared !== undefined) payload.decks_shared = updates.decksShared;
      if (updates.decksImported !== undefined) payload.decks_imported = updates.decksImported;
      if (updates.maxStreak !== undefined) payload.max_streak = updates.maxStreak;

      if (existingId) {
        await pb.collection('user_achievements').update(existingId, payload);
      } else {
        await pb.collection('user_achievements').create({
          user: userId,
          ...payload,
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating achievements in PocketBase:', error);
      return false;
    }
  },

  async incrementStudyTime(userId: string, minutes: number): Promise<boolean> {
    if (!isPocketBaseConfigured()) return false;

    try {
      const current = await this.fetchUserAchievements(userId);
      return await this.updateUserAchievements(userId, {
        totalStudyTime: current.totalStudyTime + Math.max(minutes, 0),
      });
    } catch {
      return false;
    }
  },
};

// Aliases for compatibility during transition
export const supabaseStore = pocketbaseStore;
