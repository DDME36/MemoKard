import { daysBetween, isCardDue, studyDayKey } from './studyDay';

/** เวลาทบทวนโดยประมาณ (นาที) ที่ราว 8 วินาทีต่อใบ */
export function estimateMinutes(cardCount: number): number {
  return Math.max(1, Math.ceil((cardCount * 8) / 60));
}

type SchedulableCard = { nextReviewDate: Date | string; fsrsState?: { state: number } };

/** รอบทบทวนถัดไปหลังวันนี้: วันไหน และกี่ใบ (ไว้บอกตอนทบทวนวันนี้ครบแล้ว) */
export function nextBatch(cards: SchedulableCard[], now: Date = new Date()): { label: string; count: number } | null {
  const today = studyDayKey(now);
  const upcoming = cards
    .filter((c) => !isCardDue(c, now))
    .map((c) => studyDayKey(new Date(c.nextReviewDate)))
    .sort();
  if (upcoming.length === 0) return null;
  const day = upcoming[0];
  const count = upcoming.filter((d) => d === day).length;
  const days = daysBetween(today, day);
  return { label: days <= 1 ? 'พรุ่งนี้' : `อีก ${days} วัน`, count };
}
