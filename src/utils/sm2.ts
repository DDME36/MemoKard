/**
 * SM-2 (SuperMemo-2) Algorithm Implementation
 * Used for calculating optimal review intervals based on user performance
 */

export interface SM2Result {
  interval: number; // Days until next review
  repetition: number; // Number of consecutive correct reviews
  easeFactor: number; // Difficulty multiplier (1.3 - 2.5)
  nextReviewDate: Date;
}

export interface CardReviewData {
  interval: number;
  repetition: number;
  easeFactor: number;
  lastReviewDate: Date;
}

/**
 * Calculate next review parameters using SM-2 algorithm
 * @param quality - User's performance rating (0-5)
 *   0: Complete blackout (จำไม่ได้เลย)
 *   1-2: Incorrect response (จำไม่ได้)
 *   3: Correct with difficulty (นึกออกช้า)
 *   4-5: Perfect response (นึกออกทันที)
 * @param prevData - Previous review data
 * @returns New SM-2 parameters
 */
export function calculateSM2(
  quality: number,
  prevData: CardReviewData
): SM2Result {
  let { interval, repetition, easeFactor } = prevData;

  // Update ease factor based on quality
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // If quality < 3, reset repetition and interval
  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    // Increment repetition count
    repetition += 1;

    // Calculate new interval
    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  nextReviewDate.setHours(0, 0, 0, 0); // Reset to start of day

  return {
    interval,
    repetition,
    easeFactor,
    nextReviewDate,
  };
}

/**
 * Initialize default SM-2 parameters for a new card
 */
export function initializeSM2(): CardReviewData {
  return {
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    lastReviewDate: new Date(),
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(nextReviewDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reviewDate = new Date(nextReviewDate);
  reviewDate.setHours(0, 0, 0, 0);
  return reviewDate <= today;
}
