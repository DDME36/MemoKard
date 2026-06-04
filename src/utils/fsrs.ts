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

import { fsrs, createEmptyCard, Rating, State, type Card as FSRSCard, type RecordLog } from 'ts-fsrs';

export { Rating };

// FSRS scheduler instance (ใช้ default parameters)
export const scheduler = fsrs();

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
export const DEFAULT_FSRS_WEIGHTS = [
  0.4025, 0.9304, 2.5026, 7.8229, 4.9372, 0.9411, 0.8295, 0.0867, 1.4886, 
  0.1348, 1.0118, 2.0526, 0.1264, 0.4485, 1.4954, 0.254, 2.9466
];

/**
 * คำนวณ FSRS ครั้งถัดไปจาก state เดิม + quality + custom weights (ถ้ามี)
 * Returns: FSRSState ใหม่ + nextReviewDate
 */
export function calculateFSRS(
  prevState: FSRSState,
  quality: number,
  weights?: number[]
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
    state: prevState.state as State,
    last_review: prevState.last_review ? new Date(prevState.last_review) : undefined,
  };

  const now = new Date();
  
  // Recreate FSRS scheduler dynamically if custom weights are provided
  const customScheduler = weights && weights.length === 17 
    ? fsrs({ w: weights as unknown as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] }) 
    : scheduler;
    
  const result: RecordLog = customScheduler.repeat(card, now);

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

/**
 * ปรับแต่ง FSRS Parameters (17 Weights) ออฟไลน์บนตัวเครื่องฝั่ง Client
 * โดยใช้สถิติและพฤติกรรมการลืมจริงของผู้ใช้จากประวัติการทบทวน (Review Logs)
 * ช่วยเพิ่มประสิทธิภาพการทบทวนไพ่ให้แม่นยำขึ้นสูงสุดตามทฤษฎีสมองผู้ใช้
 */
export function calibrateFSRSWeights(
  reviewLogs: { quality: number; elapsed_days?: number }[]
): number[] {
  // ต้องการประวัติทบทวนขั้นต่ำ 100 ครั้งเพื่อความแม่นยำในการวิเคราะห์
  if (reviewLogs.length < 100) {
    return [...DEFAULT_FSRS_WEIGHTS];
  }

  // คำนวณอัตราความจำจริงของผู้ใช้ (Actual Retention) -> เปอร์เซ็นต์การตอบถูก (Good + Easy)
  const successfulReviews = reviewLogs.filter(log => log.quality >= 3).length;
  const totalReviews = reviewLogs.length;
  const actualRetention = successfulReviews / totalReviews;

  // เป้าหมายเปอร์เซ็นต์จำได้ที่เหมาะสมตามหลักประสาทวิทยาคือ 90% (0.90)
  const targetRetention = 0.90;
  const error = actualRetention - targetRetention;

  // ปรับสเกลช่วงเวลา (Scale Factor): 
  // - ถ้าจำแม่นเกินไป (Actual > 90%): สมองยังไหว ขยายเวลาก่อนทบทวนออกไปได้ (Factor > 1.0)
  // - ถ้าลืมบ่อยเกินไป (Actual < 90%): หดช่วงเวลาให้ทบทวนบ่อยขึ้น (Factor < 1.0)
  // จำกัดขอบเขตสเกลเพื่อความปลอดภัยของสมองอยู่ที่ [0.65 - 1.50]
  const factor = Math.max(0.65, Math.min(1.50, 1.0 + error * 2.5));

  const calibratedWeights = [...DEFAULT_FSRS_WEIGHTS];
  
  // ปรับจูนค่า Initial Stability สำหรับปุ่ม Again, Hard, Good, Easy (w[0..3])
  calibratedWeights[0] *= factor;
  calibratedWeights[1] *= factor;
  calibratedWeights[2] *= factor;
  calibratedWeights[3] *= factor;

  // ปรับจูนค่า Stability adjustments (w[5], w[6], w[8], w[10]) เพื่อรักษาระดับการลืม
  calibratedWeights[5] *= factor;
  calibratedWeights[6] *= factor;
  calibratedWeights[8] *= factor;
  calibratedWeights[10] *= factor;

  return calibratedWeights;
}
