import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================
// Types
// ============================================

export interface PublicDeck {
  id: string;
  creatorId: string;
  creatorUsername: string;
  sourceDeckId: string | null;
  name: string;
  description: string | null;
  color: string;
  category: string;
  tags: string[];
  importCount: number;
  isActive: boolean;
  cardCount: number;
  avgRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDeckCard {
  id: string;
  publicDeckId: string;
  question: string;
  answer: string;
  createdAt: Date;
}

export interface DeckRating {
  id: string;
  publicDeckId: string;
  userId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckReport {
  id: string;
  publicDeckId: string;
  reporterId: string;
  reason: 'spam' | 'inappropriate' | 'copyright' | 'other';
  details: string | null;
  createdAt: Date;
}

export const DECK_CATEGORIES = [
  'ภาษา',
  'วิทยาศาสตร์',
  'คณิตศาสตร์',
  'ประวัติศาสตร์',
  'ทั่วไป',
  'อื่นๆ',
] as const;

export type DeckCategory = typeof DECK_CATEGORIES[number];

export const REPORT_REASONS = [
  { value: 'spam', label: 'สแปม' },
  { value: 'inappropriate', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'copyright', label: 'ละเมิดลิขสิทธิ์' },
  { value: 'other', label: 'อื่นๆ' },
] as const;

// ============================================
// Community Store Operations
// ============================================

export const communityStore = {
  // ── Share Functions ──
  
  async shareDeckToCommunity(
    userId: string,
    deckId: string,
    name: string,
    description: string,
    category: DeckCategory,
    tags: string[],
    color: string,
    cards: { question: string; answer: string }[]
  ): Promise<PublicDeck | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      // Check if deck already shared
      const { data: existing } = await supabase
        .from('public_decks')
        .select('id')
        .eq('source_deck_id', deckId)
        .eq('creator_id', userId)
        .eq('is_active', true)
        .single();

      if (existing) {
        console.log('Deck already shared');
        return null;
      }

      // Create public deck
      const { data: publicDeck, error: deckError } = await supabase
        .from('public_decks')
        .insert({
          creator_id: userId,
          source_deck_id: deckId,
          name,
          description: description || `ชุดการ์ด ${name}`,
          color,
          category,
          tags,
          import_count: 0,
          is_active: true,
        })
        .select()
        .single();

      if (deckError || !publicDeck) {
        console.error('Error creating public deck:', deckError);
        return null;
      }

      // Insert cards
      const cardsToInsert = cards.map((card) => ({
        public_deck_id: publicDeck.id,
        question: card.question,
        answer: card.answer,
      }));

      const { error: cardsError } = await supabase
        .from('public_deck_cards')
        .insert(cardsToInsert);

      if (cardsError) {
        console.error('Error inserting cards:', cardsError);
        // Rollback: delete public deck
        await supabase.from('public_decks').delete().eq('id', publicDeck.id);
        return null;
      }

      // Fetch complete deck with stats
      return await this.getPublicDeckById(publicDeck.id);
    } catch (error) {
      console.error('Error sharing deck:', error);
      return null;
    }
  },

  async unshareDecktoCommunity(publicDeckId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('public_decks')
      .update({ is_active: false })
      .eq('id', publicDeckId);

    if (error) {
      console.error('Error unsharing deck:', error);
      return false;
    }

    return true;
  },

  async updatePublicDeck(
    publicDeckId: string,
    updates: {
      name?: string;
      description?: string;
      category?: DeckCategory;
      tags?: string[];
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('public_decks')
      .update(updates)
      .eq('id', publicDeckId);

    if (error) {
      console.error('Error updating public deck:', error);
      return false;
    }

    return true;
  },

  async updatePublicDeckCards(
    publicDeckId: string,
    cards: { question: string; answer: string }[]
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      // Delete existing cards
      const { error: deleteError } = await supabase
        .from('public_deck_cards')
        .delete()
        .eq('public_deck_id', publicDeckId);

      if (deleteError) {
        console.error('Error deleting old cards:', deleteError);
        return false;
      }

      // Insert new cards
      const cardsToInsert = cards.map((card) => ({
        public_deck_id: publicDeckId,
        question: card.question,
        answer: card.answer,
      }));

      const { error: insertError } = await supabase
        .from('public_deck_cards')
        .insert(cardsToInsert);

      if (insertError) {
        console.error('Error inserting new cards:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating public deck cards:', error);
      return false;
    }
  },

  async getPublicDeckById(publicDeckId: string): Promise<PublicDeck | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('public_decks_with_stats')
      .select('*')
      .eq('id', publicDeckId)
      .single();

    if (error || !data) {
      console.error('Error fetching public deck:', error);
      return null;
    }

    return {
      id: data.id,
      creatorId: data.creator_id,
      creatorUsername: data.creator_username || 'Unknown',
      sourceDeckId: data.source_deck_id,
      name: data.name,
      description: data.description,
      color: data.color,
      category: data.category,
      tags: data.tags || [],
      importCount: data.import_count,
      isActive: data.is_active,
      cardCount: data.card_count || 0,
      avgRating: data.avg_rating || 0,
      ratingCount: data.rating_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },

  async getPublicDeckBySourceDeckId(sourceDeckId: string, userId: string): Promise<PublicDeck | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('public_decks_with_stats')
      .select('*')
      .eq('source_deck_id', sourceDeckId)
      .eq('creator_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      creatorId: data.creator_id,
      creatorUsername: data.creator_username || 'Unknown',
      sourceDeckId: data.source_deck_id,
      name: data.name,
      description: data.description,
      color: data.color,
      category: data.category,
      tags: data.tags || [],
      importCount: data.import_count,
      isActive: data.is_active,
      cardCount: data.card_count || 0,
      avgRating: data.avg_rating || 0,
      ratingCount: data.rating_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },

  async getPublicDeckCards(publicDeckId: string): Promise<PublicDeckCard[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('public_deck_cards')
      .select('*')
      .eq('public_deck_id', publicDeckId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Error fetching public deck cards:', error);
      return [];
    }

    return data.map((card) => ({
      id: card.id,
      publicDeckId: card.public_deck_id,
      question: card.question,
      answer: card.answer,
      createdAt: new Date(card.created_at),
    }));
  },

  // ── Import/Subscribe Functions ──

  async subscribePublicDeck(
    publicDeckId: string,
    userId: string,
    deckName: string,
    deckColor: string,
    _creatorUsername: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      // Check if already subscribed
      const existing = await this.hasUserImportedDeck(publicDeckId, userId);
      if (existing) return null;

      // Create local deck using existing columns only
      const { data: newDeck, error } = await supabase
        .from('decks')
        .insert({
          user_id: userId,
          name: deckName,
          color: deckColor,
        })
        .select()
        .single();

      if (error || !newDeck) {
        console.error('Error subscribing to deck:', error);
        return null;
      }

      // Record subscription in deck_imports
      await supabase
        .from('deck_imports')
        .insert({
          public_deck_id: publicDeckId,
          user_id: userId,
          imported_deck_id: newDeck.id,
        });

      return newDeck.id;
    } catch (error) {
      console.error('Error in subscribePublicDeck:', error);
      return null;
    }
  },

  async duplicatePublicDeck(
    publicDeckId: string,
    userId: string,
    newDeckName: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      // Get public deck details
      const publicDeck = await this.getPublicDeckById(publicDeckId);
      if (!publicDeck) return null;

      // Get all cards
      const cards = await this.getPublicDeckCards(publicDeckId);

      // Create new deck (not synced)
      const { data: newDeck, error: deckError } = await supabase
        .from('decks')
        .insert({
          user_id: userId,
          name: newDeckName,
          color: publicDeck.color,
          is_synced: false,
          linked_public_deck_id: null,
        })
        .select()
        .single();

      if (deckError || !newDeck) {
        console.error('Error creating duplicate deck:', deckError);
        return null;
      }

      // Copy all cards
      const cardsToInsert = cards.map((card) => ({
        deck_id: newDeck.id,
        user_id: userId,
        question: card.question,
        answer: card.answer,
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

      if (cardsError) {
        console.error('Error copying cards:', cardsError);
        // Rollback: delete deck
        await supabase.from('decks').delete().eq('id', newDeck.id);
        return null;
      }

      // Record import
      await supabase
        .from('deck_imports')
        .insert({
          public_deck_id: publicDeckId,
          user_id: userId,
          imported_deck_id: newDeck.id,
        });

      return newDeck.id;
    } catch (error) {
      console.error('Error in duplicatePublicDeck:', error);
      return null;
    }
  },

  async getSyncedDeckCards(linkedPublicDeckId: string): Promise<PublicDeckCard[]> {
    if (!isSupabaseConfigured()) return [];

    // Read cards directly from public_deck_cards
    return this.getPublicDeckCards(linkedPublicDeckId);
  },

  async unsubscribePublicDeck(localDeckId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      // Delete the local deck (this will also delete review progress)
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', localDeckId);

      if (error) {
        console.error('Error unsubscribing deck:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in unsubscribePublicDeck:', error);
      return false;
    }
  },

  // Legacy import function (deprecated - use subscribePublicDeck instead)
  async importPublicDeck(
    publicDeckId: string,
    userId: string,
    importedDeckId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase
        .from('deck_imports')
        .insert({
          public_deck_id: publicDeckId,
          user_id: userId,
          imported_deck_id: importedDeckId,
        });

      if (error) {
        console.error('Error recording import:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error importing deck:', error);
      return false;
    }
  },

  async hasUserImportedDeck(publicDeckId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data, error } = await supabase
      .from('deck_imports')
      .select('id')
      .eq('public_deck_id', publicDeckId)
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking import status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  async getImportedDecks(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('deck_imports')
      .select('public_deck_id')
      .eq('user_id', userId);

    if (error || !data) {
      console.error('Error fetching imported decks:', error);
      return [];
    }

    return data.map((item) => item.public_deck_id);
  },

  // ── Explore/Discovery Functions ──

  async getPublicDecks(
    page: number = 1,
    limit: number = 50,
    sortBy: 'import_count' | 'rating' | 'newest' = 'import_count'
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    if (!isSupabaseConfigured()) return { decks: [], total: 0 };

    const offset = (page - 1) * limit;

    let query = supabase
      .from('public_decks_with_stats')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply sorting
    if (sortBy === 'import_count') {
      query = query.order('import_count', { ascending: false });
    } else if (sortBy === 'rating') {
      query = query.order('avg_rating', { ascending: false });
    } else if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error || !data) {
      console.error('Error fetching public decks:', error);
      return { decks: [], total: 0 };
    }

    const decks = data.map((d) => ({
      id: d.id,
      creatorId: d.creator_id,
      creatorUsername: d.creator_username || 'Unknown',
      sourceDeckId: d.source_deck_id,
      name: d.name,
      description: d.description,
      color: d.color,
      category: d.category,
      tags: d.tags || [],
      importCount: d.import_count,
      isActive: d.is_active,
      cardCount: d.card_count || 0,
      avgRating: d.avg_rating || 0,
      ratingCount: d.rating_count || 0,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
    }));

    return { decks, total: count || 0 };
  },

  async searchPublicDecks(
    query: string,
    category?: DeckCategory,
    tags?: string[],
    page: number = 1,
    limit: number = 50
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    if (!isSupabaseConfigured()) return { decks: [], total: 0 };

    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('public_decks_with_stats')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Search by name or description
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Filter by category
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      dbQuery = dbQuery.contains('tags', tags);
    }

    dbQuery = dbQuery
      .order('import_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error || !data) {
      console.error('Error searching public decks:', error);
      return { decks: [], total: 0 };
    }

    const decks = data.map((d) => ({
      id: d.id,
      creatorId: d.creator_id,
      creatorUsername: d.creator_username || 'Unknown',
      sourceDeckId: d.source_deck_id,
      name: d.name,
      description: d.description,
      color: d.color,
      category: d.category,
      tags: d.tags || [],
      importCount: d.import_count,
      isActive: d.is_active,
      cardCount: d.card_count || 0,
      avgRating: d.avg_rating || 0,
      ratingCount: d.rating_count || 0,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
    }));

    return { decks, total: count || 0 };
  },

  async getPublicDecksByCategory(
    category: DeckCategory,
    page: number = 1,
    limit: number = 50
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    return this.searchPublicDecks('', category, undefined, page, limit);
  },

  // ── Rating Functions ──

  async ratePublicDeck(
    publicDeckId: string,
    userId: string,
    rating: number
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('deck_ratings')
      .upsert({
        public_deck_id: publicDeckId,
        user_id: userId,
        rating,
      });

    if (error) {
      console.error('Error rating deck:', error);
      return false;
    }

    return true;
  },

  async getUserRating(publicDeckId: string, userId: string): Promise<number | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('deck_ratings')
      .select('rating')
      .eq('public_deck_id', publicDeckId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.rating;
  },

  async getAverageRating(publicDeckId: string): Promise<{ avg: number; count: number }> {
    if (!isSupabaseConfigured()) return { avg: 0, count: 0 };

    const { data, error } = await supabase
      .from('deck_ratings')
      .select('rating')
      .eq('public_deck_id', publicDeckId);

    if (error || !data || data.length === 0) {
      return { avg: 0, count: 0 };
    }

    const sum = data.reduce((acc, item) => acc + item.rating, 0);
    const avg = Math.round((sum / data.length) * 10) / 10; // Round to 1 decimal

    return { avg, count: data.length };
  },

  // ── Moderation Functions ──

  async reportPublicDeck(
    publicDeckId: string,
    userId: string,
    reason: 'spam' | 'inappropriate' | 'copyright' | 'other',
    details?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      // Insert report to database
      const { error } = await supabase
        .from('deck_reports')
        .insert({
          public_deck_id: publicDeckId,
          reporter_id: userId,
          reason,
          details: details || null,
        });

      if (error) {
        console.error('Error reporting deck:', error);
        return false;
      }

      // Send Discord notification
      await this.sendDiscordNotification(publicDeckId, userId, reason, details);

      return true;
    } catch (error) {
      console.error('Error in reportPublicDeck:', error);
      return false;
    }
  },

  async sendDiscordNotification(
    publicDeckId: string,
    reporterId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    try {
      // Get deck details
      const deck = await this.getPublicDeckById(publicDeckId);
      if (!deck) return;

      // Get reporter username
      const { data: reporter } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', reporterId)
        .single();

      // Get report count
      const reportCount = await this.getReportCount(publicDeckId);

      // Prepare Discord message
      const reasonMap: Record<string, string> = {
        spam: '🚫 สแปม',
        inappropriate: '⚠️ เนื้อหาไม่เหมาะสม',
        copyright: '©️ ละเมิดลิขสิทธิ์',
        other: '❓ อื่นๆ',
      };

      const isAutoHidden = deck.isActive === false && reportCount >= 5;
      const statusEmoji = isAutoHidden ? '🔒' : reportCount >= 3 ? '⚠️' : '📝';

      const embed = {
        title: `${statusEmoji} รายงานชุดการ์ด${isAutoHidden ? ' (ถูกซ่อนอัตโนมัติ)' : ''}`,
        color: isAutoHidden ? 0xff0000 : reportCount >= 3 ? 0xffa500 : 0x5865f2,
        fields: [
          {
            name: '📚 ชุดการ์ด',
            value: `**${deck.name}**`,
            inline: false,
          },
          {
            name: '👤 เจ้าของชุด',
            value: deck.creatorUsername,
            inline: true,
          },
          {
            name: '🚨 ผู้รายงาน',
            value: reporter?.username || 'Unknown',
            inline: true,
          },
          {
            name: '📊 จำนวนรายงาน',
            value: `**${reportCount}** ครั้ง`,
            inline: true,
          },
          {
            name: '⚠️ เหตุผล',
            value: reasonMap[reason] || reason,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'MemoKard - Daily Memory',
        },
      };

      // Add details if provided
      if (details && details.trim()) {
        embed.fields.push({
          name: '📝 รายละเอียด',
          value: details.substring(0, 1024),
          inline: false,
        });
      }

      // Add deck link
      const deckUrl = `${window.location.origin}/deck/${deck.id}`;
      embed.fields.push({
        name: '🔗 ลิงก์',
        value: deckUrl,
        inline: false,
      });

      // Add status message
      if (isAutoHidden) {
        embed.fields.push({
          name: '🔒 สถานะ',
          value: '**ชุดการ์ดถูกซ่อนอัตโนมัติ** (รายงาน ≥ 5 ครั้ง)',
          inline: false,
        });
      } else if (reportCount >= 3) {
        embed.fields.push({
          name: '⚠️ คำเตือน',
          value: `อีก **${5 - reportCount}** รายงานจะถูกซ่อนอัตโนมัติ`,
          inline: false,
        });
      }

      // Send to Discord
      const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1456187506960633856/FH1QsdGVNMgQaUQyqVlicvjhbcwPNoFRPdUOxbh-sUI4KrjgcOaCutbHbO6N-aia7fOA';
      
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'MemoKard Reports',
          avatar_url: `${window.location.origin}/pwa-512x512.png`,
          embeds: [embed],
        }),
      });
    } catch (error) {
      // Don't fail the report if Discord notification fails
      console.error('Error sending Discord notification:', error);
    }
  },

  async getUserReportStatus(publicDeckId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data, error } = await supabase
      .from('deck_reports')
      .select('id')
      .eq('public_deck_id', publicDeckId)
      .eq('reporter_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking report status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  async getReportCount(publicDeckId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { error, count } = await supabase
      .from('deck_reports')
      .select('id', { count: 'exact', head: true })
      .eq('public_deck_id', publicDeckId);

    if (error) {
      console.error('Error getting report count:', error);
      return 0;
    }

    return count || 0;
  },
};

