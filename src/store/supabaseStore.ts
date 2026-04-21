import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Deck, Flashcard } from './store';

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
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const dbUpdates: any = {};
    if (updates.question !== undefined) dbUpdates.question = updates.question;
    if (updates.answer !== undefined) dbUpdates.answer = updates.answer;
    if (updates.interval !== undefined) dbUpdates.interval = updates.interval;
    if (updates.repetition !== undefined) dbUpdates.repetition = updates.repetition;
    if (updates.easeFactor !== undefined) dbUpdates.ease_factor = updates.easeFactor;
    if (updates.nextReviewDate !== undefined) dbUpdates.next_review = updates.nextReviewDate.toISOString();

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
