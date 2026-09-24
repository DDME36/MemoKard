/**
 * "วันเรียน" ของผู้ใช้ — ใช้ทุกที่ที่นับวัน (streak, heatmap, สถิติ, การ์ดที่ต้องทบทวนวันนี้)
 *
 * - ใช้เวลาท้องถิ่นของเครื่อง ไม่ใช่ UTC (เดิมใช้ UTC ทำให้คนไทยที่ทบทวนตอน 00:00–06:59 ถูกนับเป็นเมื่อวาน)
 * - ตัดรอบวันตอน 04:00 แบบ Anki: ทบทวนตอนตี 1 ยังนับเป็นวันก่อนหน้า streak จึงไม่ขาดสำหรับคนนอนดึก
 */

export const DAY_ROLLOVER_HOUR = 4;
/** การ์ดที่กำลังเรียน (learning) จะขึ้นให้ทบทวนก่อนเวลาได้ไม่เกินนี้ */
export const LEARN_AHEAD_MS = 20 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
/** วันที่ตามปฏิทินท้องถิ่นของ Date นั้น (ไม่ตัดรอบ 04:00) */
export const calendarKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** วันเรียนของเวลานั้นในรูป 'YYYY-MM-DD' (เวลาท้องถิ่น ตัดรอบ 04:00) */
export function studyDayKey(date: Date = new Date()): string {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - DAY_ROLLOVER_HOUR);
  return calendarKey(shifted);
}

/** แปลง key เป็น Date เที่ยงวันท้องถิ่นของวันนั้น (ปลอดภัยต่อการเปลี่ยนเวลา DST) */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return calendarKey(date);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()) / 86400000);
}

/** เวลาสิ้นสุดวันเรียนปัจจุบัน = 04:00 ครั้งถัดไป */
export function endOfStudyDay(now: Date = new Date()): Date {
  const end = keyToDate(studyDayKey(now));
  end.setDate(end.getDate() + 1);
  end.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0);
  return end;
}

/** สถานะ FSRS: 0 = ใหม่, 1 = กำลังเรียน, 2 = ทบทวน, 3 = เรียนใหม่หลังลืม */
const LEARNING_STATES = new Set([1, 3]);

/**
 * การ์ดใบนี้ควรขึ้นให้ทบทวนตอนนี้ไหม
 * - การ์ดทบทวน: ครบกำหนดภายในวันเรียนนี้ (เปิดแอปตอนเช้าก็เห็นการ์ดที่ครบตอนบ่าย)
 * - การ์ดกำลังเรียน: ครบกำหนดภายใน 20 นาที (ต้องเว้นระยะสั้นตามขั้นเรียน ไม่ดึงมาทันที)
 */
export function isCardDue(
  card: { nextReviewDate: Date | string; fsrsState?: { state: number } },
  now: Date = new Date(),
): boolean {
  const due = new Date(card.nextReviewDate).getTime();
  if (card.fsrsState && LEARNING_STATES.has(card.fsrsState.state)) {
    return due <= now.getTime() + LEARN_AHEAD_MS;
  }
  return due < endOfStudyDay(now).getTime();
}
