/**
 * ตัวเลขความจำจาก FSRS (แทนค่าแบบ SM-2 เดิม เช่น repetition / ease factor ที่ไม่มีความหมายกับ FSRS แล้ว)
 */
import { forgetting_curve } from 'ts-fsrs';
import { scheduler, type FSRSState } from './fsrs';

/** การ์ดที่ลืมตั้งแต่ครั้งนี้ขึ้นไปถือว่า "ลืมบ่อย" (leech) ควรเขียนใหม่ */
export const LEECH_LAPSES = 8;

/** เกณฑ์ "จำได้แม่น" แบบ Anki: ระยะทบทวนตั้งแต่ 21 วันขึ้นไป */
export const MATURE_INTERVAL_DAYS = 21;

type WithFsrs = { fsrsState?: FSRSState };

export interface CardBuckets {
  newCards: number;
  /** กำลังเรียนหรือเรียนใหม่หลังลืม */
  learning: number;
  /** ผ่านขั้นเรียนแล้ว ระยะทบทวน < 21 วัน */
  young: number;
  mature: number;
}

export function cardBuckets(cards: WithFsrs[]): CardBuckets {
  const buckets: CardBuckets = { newCards: 0, learning: 0, young: 0, mature: 0 };
  for (const card of cards) {
    const s = card.fsrsState;
    if (!s || s.state === 0) buckets.newCards++;
    else if (s.state === 1 || s.state === 3) buckets.learning++;
    else if (s.scheduled_days >= MATURE_INTERVAL_DAYS) buckets.mature++;
    else buckets.young++;
  }
  return buckets;
}

/** โอกาสที่ยังจำการ์ดใบนี้ได้ ณ เวลานั้น (0–1) ตามเส้นการลืมของ FSRS-6 */
export function recallAt(state: FSRSState, now: Date = new Date()): number {
  if (state.state === 0 || !state.last_review || state.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (now.getTime() - new Date(state.last_review).getTime()) / 86400000);
  return forgetting_curve(scheduler.parameters.w, elapsedDays, state.stability);
}

/** ค่าเฉลี่ยโอกาสจำได้ตอนนี้ของการ์ดที่เคยทบทวน เป็นเปอร์เซ็นต์เต็ม หรือ null ถ้ายังไม่มี */
export function averageRecall(cards: WithFsrs[], now: Date = new Date()): number | null {
  const reviewed = cards.filter((c) => c.fsrsState && c.fsrsState.state !== 0 && c.fsrsState.last_review);
  if (reviewed.length === 0) return null;
  const sum = reviewed.reduce((total, c) => total + recallAt(c.fsrsState!, now), 0);
  return Math.round((sum / reviewed.length) * 100);
}
