/**
 * FSRS (Free Spaced Repetition Scheduler) ผ่าน library ts-fsrs (FSRS-6)
 *
 * การ์ดแต่ละใบมี stability (ความจำอยู่ได้กี่วันก่อนโอกาสจำได้ลดเหลือ 90%)
 * และ difficulty (การ์ดยากแค่ไหนสำหรับผู้ใช้) ทุกครั้งที่ให้คะแนน 1–4 จะคำนวณสองค่านี้ใหม่
 * แล้วนัดวันทบทวนถัดไป
 *
 * ใช้พารามิเตอร์มาตรฐานของ FSRS-6 (ฝึกจากข้อมูลทบทวนจริงหลายล้านครั้ง)
 * และเปิด fuzz เพื่อกระจายวันนัด ไม่ให้การ์ดที่เพิ่มพร้อมกันครบกำหนดวันเดียวกันเป็นกอง
 */

import { fsrs, createEmptyCard, Rating, State, type Card as FSRSCard, type RecordLog } from 'ts-fsrs';

export { Rating };

export const scheduler = fsrs({ enable_fuzz: true });

/** เป้าความจำเริ่มต้น (โอกาสจำได้ตอนถึงวันทบทวน) และช่วงที่อนุญาต */
export const DEFAULT_RETENTION = 0.9;
export const MIN_RETENTION = 0.8;
export const MAX_RETENTION = 0.97;

const schedulers = new Map<number, typeof scheduler>([[DEFAULT_RETENTION, scheduler]]);
/** scheduler ตามเป้าความจำ (สูงขึ้น = ทบทวนถี่ขึ้น จำแม่นขึ้น) */
function schedulerFor(retention: number) {
  let s = schedulers.get(retention);
  if (!s) {
    s = fsrs({ enable_fuzz: true, request_retention: retention });
    schedulers.set(retention, s);
  }
  return s;
}

/**
 * Map quality (1/2/3/4) → FSRS Rating
 * 1 = จำไม่ได้      → Again
 * 2 = ยาก นึกนาน   → Hard
 * 3 = พอได้ ปกติ    → Good
 * 4 = ง่าย ทันที     → Easy
 */
export function qualityToRating(quality: number): Rating {
  if (quality === 1) return Rating.Again;
  if (quality === 2) return Rating.Hard;
  if (quality === 3) return Rating.Good;
  return Rating.Easy; // 4 or higher
}

/**
 * FSRS state ที่เก็บต่อการ์ด (เก็บผ่าน Zustand persist)
 */
export interface FSRSState {
  due: string;        // ISO date string
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;      // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: string;
  /** ขั้นเรียนปัจจุบัน (FSRS-6) — ถ้าไม่เก็บ การ์ดใหม่จะวนขั้นแรกไม่จบเมื่อกด "พอได้" */
  learning_steps?: number;
}

/**
 * สร้าง FSRS state เริ่มต้นสำหรับการ์ดใหม่
 */
export function createInitialFSRSState(): FSRSState {
  const empty = createEmptyCard();
  return {
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state as number,
    learning_steps: empty.learning_steps,
  };
}

/**
 * คำนวณ FSRS ครั้งถัดไปจาก state เดิม + คะแนน (1–4)
 */
export function calculateFSRS(
  prevState: FSRSState,
  quality: number,
  now: Date = new Date(),
  retention: number = DEFAULT_RETENTION,
): { newState: FSRSState; nextReviewDate: Date; interval: number } {
  const rating = qualityToRating(quality);

  // สร้าง card ของ ts-fsrs กลับจาก state ที่เก็บไว้
  const card: FSRSCard = {
    ...createEmptyCard(),
    due: new Date(prevState.due),
    stability: prevState.stability,
    difficulty: prevState.difficulty,
    elapsed_days: prevState.elapsed_days,
    scheduled_days: prevState.scheduled_days,
    reps: prevState.reps,
    lapses: prevState.lapses,
    learning_steps: prevState.learning_steps ?? 0,
    state: prevState.state as State,
    last_review: prevState.last_review ? new Date(prevState.last_review) : undefined,
  };

  const result: RecordLog = schedulerFor(retention).repeat(card, now);
  const scheduled = result[rating as keyof RecordLog];

  const newState: FSRSState = {
    due: scheduled.card.due.toISOString(),
    stability: scheduled.card.stability,
    difficulty: scheduled.card.difficulty,
    elapsed_days: scheduled.card.elapsed_days,
    scheduled_days: scheduled.card.scheduled_days,
    reps: scheduled.card.reps,
    lapses: scheduled.card.lapses,
    learning_steps: scheduled.card.learning_steps,
    state: scheduled.card.state as number,
    last_review: now.toISOString(),
  };

  return {
    newState,
    nextReviewDate: scheduled.card.due,
    interval: scheduled.card.scheduled_days,
  };
}
