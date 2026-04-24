/**
 * FSRS (Free Spaced Repetition Scheduler) v5 Integration
 * ใช้ library ts-fsrs เป็น wrapper
 *
 * FSRS ให้ผลลัพธ์แม่นยำกว่า SM-2 เพราะใช้ neural network model
 * แต่ต้องการ fields เพิ่มเติมใน card: stability, difficulty, state, lapses
 *
 * Strategy: เก็บ FSRS state ใน localStorage ผ่าน Zustand
 * โดยไม่แตะ Supabase schema (backward compatible)
 */

import { fsrs, createEmptyCard, Rating, type Card as FSRSCard, type RecordLog } from 'ts-fsrs';

export { Rating };

// FSRS scheduler instance (ใช้ default parameters)
const scheduler = fsrs();

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
 * FSRS state ที่เก็บต่อการ์ด (เก็บใน Zustand/localStorage)
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
  };
}

/**
 * คำนวณ FSRS ครั้งถัดไปจาก state เดิม + quality
 * Returns: FSRSState ใหม่ + nextReviewDate
 */
export function calculateFSRS(
  prevState: FSRSState,
  quality: number
): { newState: FSRSState; nextReviewDate: Date; interval: number } {
  const rating = qualityToRating(quality);

  // Reconstruct FSRSCard from stored state
  // createEmptyCard() gives us a valid base with all required fields
  const baseCard = createEmptyCard();
  const card: FSRSCard = {
    ...baseCard,
    due: new Date(prevState.due),
    stability: prevState.stability,
    difficulty: prevState.difficulty,
    elapsed_days: prevState.elapsed_days,
    scheduled_days: prevState.scheduled_days,
    reps: prevState.reps,
    lapses: prevState.lapses,
    state: prevState.state as any,
    last_review: prevState.last_review ? new Date(prevState.last_review) : undefined,
  };

  const now = new Date();
  const result: RecordLog = scheduler.repeat(card, now);

  // Grade = Exclude<Rating, Rating.Manual> — Again/Hard/Good/Easy are all valid
  const scheduled = result[rating as keyof RecordLog];

  const newState: FSRSState = {
    due: scheduled.card.due.toISOString(),
    stability: scheduled.card.stability,
    difficulty: scheduled.card.difficulty,
    elapsed_days: scheduled.card.elapsed_days,
    scheduled_days: scheduled.card.scheduled_days,
    reps: scheduled.card.reps,
    lapses: scheduled.card.lapses,
    state: scheduled.card.state as number,
    last_review: now.toISOString(),
  };

  return {
    newState,
    nextReviewDate: scheduled.card.due,
    interval: scheduled.card.scheduled_days,
  };
}
