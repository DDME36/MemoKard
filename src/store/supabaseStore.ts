import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Deck, Flashcard } from './store';
import { createInitialFSRSState } from '../utils/fsrs';

// ============================================
// Supabase Operations
// ============================================

export const supabaseStore = {
  // ── Decks ──
  async fetchDecks(userId: string): Promise<Deck[]> {
    if (!isSupabaseConfigured()) return [];
    
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching decks:', error);
      return [];
    }

    return (data || []).map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      createdAt: new Date(d.created_at),
    }));
  },

  async createDeck(userId: string, name: string, color: string): Promise<Deck | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('decks')
      .insert({
        user_id: userId,
        name,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deck:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      createdAt: new Date(data.created_at),
    };
  },

  async updateDeck(deckId: string, updates: { name?: string; color?: string }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('decks')
      .update(updates)
      .eq('id', deckId);

    if (error) {
      console.error('Error updating deck:', error);
      return false;
    }

    return true;
  },

  async deleteDeck(deckId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId);

    if (error) {
      console.error('Error deleting deck:', error);
      return false;
    }

    return true;
  },

  // ── Cards ──
  async fetchCards(userId: string, deckId?: string): Promise<Flashcard[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId);

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      deckId: c.deck_id,
      question: c.question,
      answer: c.answer,
      interval: c.interval,
      repetition: c.repetition,
      easeFactor: c.ease_factor,
      nextReviewDate: new Date(c.next_review),
      createdAt: new Date(c.created_at),
      lastReviewDate: new Date(c.updated_at),
      // ✅ Restore fsrsState from DB if stored, otherwise create initial state.
      // The migration in store.ts onRehydrateStorage also handles old cards.
      fsrsState: c.fsrs_state ?? createInitialFSRSState(),
    }));
  },

  async createCard(
    userId: string,
    deckId: string,
    question: string,
    answer: string,
    sm2Data: { interval: number; repetition: number; easeFactor: number }
  ): Promise<Flashcard | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('cards')
      .insert({
        user_id: userId,
        deck_id: deckId,
        question,
        answer,
        interval: sm2Data.interval,
        repetition: sm2Data.repetition,
        ease_factor: sm2Data.easeFactor,
        next_review: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      return null;
    }

    return {
      id: data.id,
      deckId: data.deck_id,
      question: data.question,
      answer: data.answer,
      interval: data.interval,
      repetition: data.repetition,
      easeFactor: data.ease_factor,
      nextReviewDate: new Date(data.next_review),
      createdAt: new Date(data.created_at),
      lastReviewDate: new Date(data.updated_at),
      fsrsState: createInitialFSRSState(),
    };
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
      fsrsState?: any;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const dbUpdates: any = {};
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

    const { error } = await supabase
      .from('cards')
      .update(dbUpdates)
      .eq('id', cardId);

    if (error) {
      console.error('Error updating card:', error);
      return false;
    }

    return true;
  },

  async deleteCard(cardId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('Error deleting card:', error);
      return false;
    }

    return true;
  },

  // ── User Stats ──
  async fetchUserStats(userId: string): Promise<{ streak: number; lastStudyDate: string | null }> {
    if (!isSupabaseConfigured()) return { streak: 0, lastStudyDate: null };

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { streak: 0, lastStudyDate: null };
    }

    return {
      streak: data.streak,
      lastStudyDate: data.last_review_date,
    };
  },

  async updateUserStats(userId: string, streak: number, lastStudyDate: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: userId,
        streak,
        last_review_date: lastStudyDate,
      });

    if (error) {
      console.error('Error updating user stats:', error);
      return false;
    }

    return true;
  },

  // ── Review Logs (for analytics) ──
  async logReview(userId: string, cardId: string, quality: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('review_logs')
      .insert({
        user_id: userId,
        card_id: cardId,
        quality,
      });

    if (error) {
      console.error('Error logging review:', error);
      return false;
    }

    return true;
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
    if (!isSupabaseConfigured()) {
      return {
        unlockedAchievements: [],
        perfectReviews: 0,
        totalStudyTime: 0,
        decksShared: 0,
        decksImported: 0,
        maxStreak: 0,
      };
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Create initial record if not exists
      await supabase.from('user_achievements').insert({
        user_id: userId,
        unlocked_achievements: [],
        perfect_reviews: 0,
        total_study_time: 0,
        decks_shared: 0,
        decks_imported: 0,
        max_streak: 0,
      });

      return {
        unlockedAchievements: [],
        perfectReviews: 0,
        totalStudyTime: 0,
        decksShared: 0,
        decksImported: 0,
        maxStreak: 0,
      };
    }

    return {
      unlockedAchievements: data.unlocked_achievements || [],
      perfectReviews: data.perfect_reviews || 0,
      totalStudyTime: data.total_study_time || 0,
      decksShared: data.decks_shared || 0,
      decksImported: data.decks_imported || 0,
      maxStreak: data.max_streak || 0,
    };
  },

  async updateUserAchievements(
    userId: string,
    updates: {
      unlockedAchievements?: string[];
      perfectReviews?: number;
      totalStudyTime?: number;
      maxStreak?: number;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const dbUpdates: any = {};
    if (updates.unlockedAchievements !== undefined) {
      dbUpdates.unlocked_achievements = updates.unlockedAchievements;
    }
    if (updates.perfectReviews !== undefined) {
      dbUpdates.perfect_reviews = updates.perfectReviews;
    }
    if (updates.totalStudyTime !== undefined) {
      dbUpdates.total_study_time = updates.totalStudyTime;
    }
    if (updates.maxStreak !== undefined) {
      dbUpdates.max_streak = updates.maxStreak;
    }

    const { error } = await supabase
      .from('user_achievements')
      .upsert({
        user_id: userId,
        ...dbUpdates,
      });

    if (error) {
      console.error('Error updating user achievements:', error);
      return false;
    }

    return true;
  },

  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Fetch current achievements
    const { data } = await supabase
      .from('user_achievements')
      .select('unlocked_achievements')
      .eq('user_id', userId)
      .single();

    const currentAchievements = data?.unlocked_achievements || [];
    
    // Don't add if already unlocked
    if (currentAchievements.includes(achievementId)) {
      return true;
    }

    const newAchievements = [...currentAchievements, achievementId];

    const { error } = await supabase
      .from('user_achievements')
      .upsert({
        user_id: userId,
        unlocked_achievements: newAchievements,
      });

    if (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }

    return true;
  },

  async incrementPerfectReviews(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data } = await supabase
      .from('user_achievements')
      .select('perfect_reviews')
      .eq('user_id', userId)
      .single();

    const currentCount = data?.perfect_reviews || 0;

    return await this.updateUserAchievements(userId, {
      perfectReviews: currentCount + 1,
    });
  },

  // ✅ Fix: Use atomic increment to avoid race condition
  async addStudyTime(userId: string, minutes: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    
    // Use PostgreSQL increment to avoid race condition
    const { error } = await supabase.rpc('increment_study_time', {
      user_id_param: userId,
      minutes_param: minutes
    });

    if (error) {
      console.error('Error incrementing study time:', error);
      // Fallback to old method if RPC doesn't exist
      const { data } = await supabase
        .from('user_achievements')
        .select('total_study_time')
        .eq('user_id', userId)
        .single();

      const currentTime = data?.total_study_time ?? 0;
      return await this.updateUserAchievements(userId, {
        totalStudyTime: currentTime + minutes,
      });
    }

    return true;
  },

  // ✅ Fix: Use conditional update to avoid race condition
  async updateMaxStreak(userId: string, streak: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Use PostgreSQL conditional update (only update if new value is greater)
    const { error } = await supabase
      .from('user_achievements')
      .update({ max_streak: streak })
      .eq('user_id', userId)
      .or(`max_streak.is.null,max_streak.lt.${streak}`);

    if (error) {
      console.error('Error updating max streak:', error);
      return false;
    }

    return true;
  },

  // ── Realtime Subscriptions ──
  subscribeToDecks(userId: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('decks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decks',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToCards(userId: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
