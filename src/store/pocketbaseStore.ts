import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { createInitialFSRSState } from '../utils/fsrs';
import type { UserProgress } from '../utils/achievements';
import type { RemoteChange, RemoteReviewLog, SyncedProgress } from './merge';
import type { ReviewLogPayload } from './syncQueue';
import type { Deck, Flashcard } from './types';

export interface ServerChanges {
  decks: RemoteChange<Deck>[];
  cards: RemoteChange<Flashcard>[];
  logs: RemoteReviewLog[];
  progress: SyncedProgress | null;
  maxUpdated: string | null;
  boundaryLogIds: string[];
}

const status = (err: unknown) => (err as { status?: number })?.status;

/** แปลงรูป (data URL หรือ URL ไฟล์) เป็น Blob สำหรับอัปโหลด; ไม่มีรูปคืน null */
export async function imageToBlob(value: string | undefined): Promise<Blob | null> {
  if (!value) return null;
  const res = await fetch(value);
  if (!res.ok) throw new Error(`Cannot read image (${res.status})`);
  return res.blob();
}

/**
 * ตัดสินว่าจะส่งรูปอย่างไร
 * - ไม่มีรูป → null (ลบรูปบนเซิร์ฟเวอร์)
 * - URL ไฟล์ของ record นี้เอง → 'unchanged'
 * - data URL หรือ URL จากที่อื่น (เช่นชุดสาธารณะ) → Blob
 */
async function resolveImage(value: string | undefined, recordId: string): Promise<Blob | null | 'unchanged'> {
  if (!value) return null;
  if (/^https?:/.test(value) && value.includes(`/${recordId}/`)) return 'unchanged';
  return imageToBlob(value);
}

async function upsert(collection: string, id: string, body: Record<string, unknown> | FormData): Promise<void> {
  try {
    await pb.collection(collection).update(id, body);
  } catch (err) {
    if (status(err) !== 404) throw err;
    if (body instanceof FormData) body.set('id', id);
    else body = { ...body, id };
    await pb.collection(collection).create(body);
  }
}

async function softDelete(collection: string, id: string): Promise<void> {
  try {
    await pb.collection(collection).update(id, { deleted: true });
  } catch (err) {
    if (status(err) !== 404) throw err; // ไม่เคยขึ้นเซิร์ฟเวอร์ = ถือว่าลบแล้ว
  }
}

const fileUrl = (record: RecordModel, field: string): string | undefined =>
  record[field] ? pb.files.getURL(record, record[field]) : undefined;

const toDeck = (r: RecordModel): RemoteChange<Deck> => ({
  deleted: Boolean(r.deleted),
  record: {
    id: r.id,
    name: r.name,
    color: r.color || 'violet',
    createdAt: new Date(r.created.replace(' ', 'T')),
    linkedPublicDeckId: r.linked_public_deck || null,
  },
});

const toCard = (r: RecordModel): RemoteChange<Flashcard> => {
  const fsrsState = r.fsrs_state ?? createInitialFSRSState();
  const nextReview = new Date((r.next_review || fsrsState.due).replace(' ', 'T'));
  return {
    deleted: Boolean(r.deleted),
    record: {
      id: r.id,
      deckId: r.deck,
      question: r.question,
      answer: r.answer,
      questionImage: fileUrl(r, 'question_image'),
      answerImage: fileUrl(r, 'answer_image'),
      sourceCardId: r.source_card || undefined,
      interval: fsrsState.scheduled_days ?? 0,
      repetition: fsrsState.reps ?? 0,
      easeFactor: 2.5,
      nextReviewDate: nextReview,
      createdAt: new Date(r.created.replace(' ', 'T')),
      lastReviewDate: new Date((fsrsState.last_review ?? r.updated).replace(' ', 'T')),
      fsrsState,
    },
  };
};

const maxOf = (current: string | null, records: RecordModel[]): string | null =>
  records.reduce<string | null>((max, r) => (!max || r.updated > max ? r.updated : max), current);

export const pocketbaseStore = {
  async upsertDeck(userId: string, deck: Deck): Promise<void> {
    await upsert('decks', deck.id, {
      user: userId,
      name: deck.name,
      color: deck.color,
      linked_public_deck: deck.linkedPublicDeckId || '',
      deleted: false,
    });
  },

  softDeleteDeck: (id: string) => softDelete('decks', id),

  async upsertCard(userId: string, card: Flashcard): Promise<void> {
    const form = new FormData();
    form.set('user', userId);
    form.set('deck', card.deckId);
    form.set('question', card.question);
    form.set('answer', card.answer);
    form.set('fsrs_state', JSON.stringify(card.fsrsState));
    form.set('next_review', new Date(card.nextReviewDate).toISOString());
    form.set('source_card', card.sourceCardId ?? '');
    form.set('deleted', 'false');
    for (const [field, value] of [['question_image', card.questionImage], ['answer_image', card.answerImage]] as const) {
      const image = await resolveImage(value, card.id);
      if (image === 'unchanged') continue;
      if (image) form.set(field, image, `${field}.${image.type.split('/')[1] || 'png'}`);
      else form.set(field, '');
    }
    await upsert('cards', card.id, form);
  },

  softDeleteCard: (id: string) => softDelete('cards', id),

  async createReviewLog(userId: string, log: ReviewLogPayload): Promise<void> {
    try {
      await pb.collection('review_logs').create({
        id: log.id,
        user: userId,
        card_id: log.cardId,
        rating: log.rating,
        reviewed_at: log.reviewedAt,
        device: log.device,
        mode: log.mode,
      });
    } catch (err) {
      if (status(err) !== 400) throw err;
      // สร้างสำเร็จไปแล้วรอบก่อนแต่คำตอบหาย → ถือว่าสำเร็จ
      await pb.collection('review_logs').getOne(log.id);
    }
  },

  async upsertProgress(userId: string, progress: SyncedProgress): Promise<void> {
    await upsert('user_progress', userId, { user: userId, progress });
  },

  async fetchChanges(userId: string, since: string | null): Promise<ServerChanges> {
    const filter = since
      ? pb.filter('user = {:uid} && updated >= {:since}', { uid: userId, since })
      : pb.filter('user = {:uid}', { uid: userId });
    const options = { filter, sort: 'updated' };
    const [decks, cards, logs, progress] = await Promise.all([
      pb.collection('decks').getFullList(options),
      pb.collection('cards').getFullList(options),
      pb.collection('review_logs').getFullList(options),
      pb.collection('user_progress').getFullList(options),
    ]);
    const p = progress[0]?.progress as { counters?: UserProgress; unlockedAchievements?: string[] } | undefined;
    const maxUpdated = maxOf(maxOf(maxOf(maxOf(since, decks), cards), logs), progress);
    return {
      decks: decks.map(toDeck),
      cards: cards.map(toCard),
      logs: logs.map((r) => ({ id: r.id, reviewedAt: r.reviewed_at, device: r.device })),
      progress: p?.counters ? { counters: p.counters, unlockedAchievements: p.unlockedAchievements ?? [] } : null,
      maxUpdated,
      boundaryLogIds: logs.filter((r) => r.updated === maxUpdated).map((r) => r.id),
    };
  },
};
