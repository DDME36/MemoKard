import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { imageToBlob } from './pocketbaseStore';

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
  sourceCardId: string | null;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
  createdAt: Date;
}

export interface ShareCard {
  id: string;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
}

export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'other';

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
// Helpers
// ============================================

const status = (err: unknown) => (err as { status?: number })?.status;
const asDate = (value: string) => new Date(value.replace(' ', 'T'));

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (status(err) === 404) return null;
    throw err;
  }
}

const toPublicDeck = (r: RecordModel): PublicDeck => ({
  id: r.id,
  creatorId: r.owner,
  creatorUsername: r.owner_name || 'ไม่ทราบชื่อ',
  sourceDeckId: r.source_deck || null,
  name: r.name,
  description: r.description || null,
  color: r.color || 'violet',
  category: r.category || 'ทั่วไป',
  tags: Array.isArray(r.tags) ? r.tags : [],
  importCount: r.import_count || 0,
  isActive: !r.hidden,
  cardCount: r.card_count || 0,
  avgRating: r.rating_avg || 0,
  ratingCount: r.rating_count || 0,
  createdAt: asDate(r.created),
  updatedAt: asDate(r.updated),
});

const toPublicCard = (r: RecordModel): PublicDeckCard => ({
  id: r.id,
  publicDeckId: r.public_deck,
  sourceCardId: r.source_card || null,
  question: r.question,
  answer: r.answer,
  questionImage: r.question_image ? pb.files.getURL(r, r.question_image) : undefined,
  answerImage: r.answer_image ? pb.files.getURL(r, r.answer_image) : undefined,
  createdAt: asDate(r.created),
});

async function publicCardForm(publicDeckId: string, card: ShareCard, position: number): Promise<FormData> {
  const form = new FormData();
  form.set('public_deck', publicDeckId);
  form.set('source_card', card.id);
  form.set('position', String(position));
  form.set('question', card.question);
  form.set('answer', card.answer);
  for (const [field, value] of [['question_image', card.questionImage], ['answer_image', card.answerImage]] as const) {
    const blob = await imageToBlob(value);
    if (blob) form.set(field, blob, `${field}.${blob.type.split('/')[1] || 'png'}`);
  }
  return form;
}

const BATCH_SIZE = 50;

// ============================================
// Community Store Operations
// ============================================

export const communityStore = {
  // ── Share ──

  async shareDeckToCommunity(
    userId: string,
    deckId: string,
    name: string,
    description: string,
    category: DeckCategory,
    tags: string[],
    color: string,
    cards: ShareCard[],
  ): Promise<PublicDeck | null> {
    if (await this.getPublicDeckBySourceDeckId(deckId, userId)) return null;

    const record = await pb.collection('public_decks').create({
      owner: userId,
      source_deck: deckId,
      name,
      description: description || `ชุดการ์ด ${name}`,
      color,
      category,
      tags,
      card_count: cards.length,
    });
    try {
      for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = pb.createBatch();
        const chunk = cards.slice(i, i + BATCH_SIZE);
        for (const [offset, card] of chunk.entries()) {
          batch.collection('public_deck_cards').create(await publicCardForm(record.id, card, i + offset));
        }
        await batch.send();
      }
    } catch (err) {
      await pb.collection('public_decks').delete(record.id); // cascade ลบการ์ดที่ขึ้นไปแล้ว
      throw err;
    }
    return this.getPublicDeckById(record.id);
  },

  async unshareDecktoCommunity(publicDeckId: string): Promise<boolean> {
    await pb.collection('public_decks').delete(publicDeckId);
    return true;
  },

  async updatePublicDeck(
    publicDeckId: string,
    updates: { name?: string; description?: string; category?: DeckCategory; tags?: string[] },
  ): Promise<boolean> {
    await pb.collection('public_decks').update(publicDeckId, updates);
    return true;
  },

  /** อัปเดตแบบ diff ตาม source_card เพื่อให้ ID การ์ดสาธารณะคงเดิม (ผู้ติดตามจับคู่ได้) */
  async updatePublicDeckCards(publicDeckId: string, cards: ShareCard[]): Promise<boolean> {
    const existing = await pb.collection('public_deck_cards').getFullList({
      filter: pb.filter('public_deck = {:id}', { id: publicDeckId }),
    });
    const bySource = new Map(existing.map((r) => [r.source_card as string, r]));
    const keep = new Set(cards.map((c) => c.id));

    const ops: ((batch: ReturnType<typeof pb.createBatch>) => Promise<void>)[] = [];
    cards.forEach((card, position) => {
      const current = bySource.get(card.id);
      if (!current) {
        ops.push(async (b) => { b.collection('public_deck_cards').create(await publicCardForm(publicDeckId, card, position)); });
      } else if (current.question !== card.question || current.answer !== card.answer || current.position !== position) {
        ops.push(async (b) => {
          b.collection('public_deck_cards').update(current.id, { question: card.question, answer: card.answer, position });
        });
      }
    });
    existing.filter((r) => !keep.has(r.source_card)).forEach((r) => {
      ops.push(async (b) => { b.collection('public_deck_cards').delete(r.id); });
    });

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = pb.createBatch();
      for (const op of ops.slice(i, i + BATCH_SIZE)) await op(batch);
      await batch.send();
    }
    await pb.collection('public_decks').update(publicDeckId, { card_count: cards.length });
    return true;
  },

  // ── Read ──

  async getPublicDeckById(publicDeckId: string): Promise<PublicDeck | null> {
    const record = await orNull(pb.collection('public_decks').getOne(publicDeckId));
    return record ? toPublicDeck(record) : null;
  },

  async getPublicDeckBySourceDeckId(sourceDeckId: string, userId: string): Promise<PublicDeck | null> {
    const record = await orNull(pb.collection('public_decks').getFirstListItem(
      pb.filter('owner = {:uid} && source_deck = {:src}', { uid: userId, src: sourceDeckId }),
    ));
    return record ? toPublicDeck(record) : null;
  },

  async getPublicDeckCards(publicDeckId: string): Promise<PublicDeckCard[]> {
    const records = await pb.collection('public_deck_cards').getFullList({
      filter: pb.filter('public_deck = {:id}', { id: publicDeckId }),
      sort: 'position,created',
    });
    return records.map(toPublicCard);
  },

  // ── Subscribe / duplicate (สร้างในเครื่องผ่าน store แล้วซิงก์ผ่านคิว) ──

  async copyIntoLocalStore(publicDeckId: string, deckName: string, color: string, linked: boolean): Promise<string> {
    const { useFlashcardStore } = await import('./store');
    const cards = await this.getPublicDeckCards(publicDeckId);
    const store = useFlashcardStore.getState();
    const deck = await store.addDeck(deckName, color, linked ? { linkedPublicDeckId: publicDeckId } : undefined);
    for (const card of cards) {
      await store.addCard(deck.id, card.question, card.answer, card.questionImage, card.answerImage, {
        skipAchievementCheck: true,
        sourceCardId: linked ? card.id : undefined,
      });
    }
    return deck.id;
  },

  async recordImport(publicDeckId: string, userId: string): Promise<void> {
    try {
      await pb.collection('deck_imports').create({ user: userId, public_deck: publicDeckId });
    } catch (err) {
      if (status(err) !== 400) throw err; // 400 = เคยนำเข้าแล้ว
    }
  },

  async subscribePublicDeck(publicDeckId: string, userId: string, deckName: string, deckColor: string): Promise<string | null> {
    if (await this.hasUserImportedDeck(publicDeckId, userId)) return null;
    const localDeckId = await this.copyIntoLocalStore(publicDeckId, deckName, deckColor, true);
    await this.recordImport(publicDeckId, userId);
    return localDeckId;
  },

  async duplicatePublicDeck(publicDeckId: string, userId: string, newDeckName: string): Promise<string | null> {
    const publicDeck = await this.getPublicDeckById(publicDeckId);
    if (!publicDeck) return null;
    const localDeckId = await this.copyIntoLocalStore(publicDeckId, newDeckName, publicDeck.color, false);
    await this.recordImport(publicDeckId, userId);
    return localDeckId;
  },

  async unsubscribePublicDeck(localDeckId: string): Promise<boolean> {
    const { useFlashcardStore } = await import('./store');
    await useFlashcardStore.getState().deleteDeck(localDeckId, true);
    return true;
  },

  async hasUserImportedDeck(publicDeckId: string, userId: string): Promise<boolean> {
    const record = await orNull(pb.collection('deck_imports').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record !== null;
  },

  async getImportedDecks(userId: string): Promise<string[]> {
    const records = await pb.collection('deck_imports').getFullList({ filter: pb.filter('user = {:uid}', { uid: userId }) });
    return records.map((r) => r.public_deck);
  },

  // ── Explore ──

  async getPublicDecks(
    page = 1,
    limit = 50,
    sortBy: 'import_count' | 'rating' | 'newest' = 'import_count',
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    const sort = { import_count: '-import_count', rating: '-rating_avg', newest: '-created' }[sortBy];
    const result = await pb.collection('public_decks').getList(page, limit, { filter: 'hidden = false', sort });
    return { decks: result.items.map(toPublicDeck), total: result.totalItems };
  },

  async searchPublicDecks(
    query: string,
    category?: DeckCategory,
    tags?: string[],
    page = 1,
    limit = 50,
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    const parts = ['hidden = false'];
    const params: Record<string, string> = {};
    if (query.trim()) {
      parts.push('(name ~ {:q} || description ~ {:q})');
      params.q = query.trim();
    }
    if (category) {
      parts.push('category = {:c}');
      params.c = category;
    }
    (tags ?? []).forEach((tag, i) => {
      parts.push(`tags ~ {:t${i}}`);
      params[`t${i}`] = tag;
    });
    const result = await pb.collection('public_decks').getList(page, limit, {
      filter: pb.filter(parts.join(' && '), params),
      sort: '-import_count',
    });
    return { decks: result.items.map(toPublicDeck), total: result.totalItems };
  },

  async getPublicDecksByCategory(category: DeckCategory, page = 1, limit = 50) {
    return this.searchPublicDecks('', category, undefined, page, limit);
  },

  // ── Rating ──

  async ratePublicDeck(publicDeckId: string, userId: string, rating: number): Promise<boolean> {
    const existing = await orNull(pb.collection('deck_ratings').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    if (existing) await pb.collection('deck_ratings').update(existing.id, { stars: rating });
    else await pb.collection('deck_ratings').create({ user: userId, public_deck: publicDeckId, stars: rating });
    return true;
  },

  async getUserRating(publicDeckId: string, userId: string): Promise<number | null> {
    const record = await orNull(pb.collection('deck_ratings').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record ? record.stars : null;
  },

  async getAverageRating(publicDeckId: string): Promise<{ avg: number; count: number }> {
    const deck = await this.getPublicDeckById(publicDeckId);
    return { avg: deck?.avgRating ?? 0, count: deck?.ratingCount ?? 0 };
  },

  // ── Moderation ──

  async reportPublicDeck(publicDeckId: string, userId: string, reason: ReportReason, details?: string): Promise<boolean> {
    try {
      await pb.collection('deck_reports').create({
        user: userId,
        public_deck: publicDeckId,
        reason,
        detail: (details ?? '').slice(0, 500),
      });
    } catch (err) {
      if (status(err) !== 400 || !(await this.getUserReportStatus(publicDeckId, userId))) throw err;
    }
    return true;
  },

  async getUserReportStatus(publicDeckId: string, userId: string): Promise<boolean> {
    const record = await orNull(pb.collection('deck_reports').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record !== null;
  },
};
