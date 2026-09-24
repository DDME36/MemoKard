import { describe, expect, it } from 'vitest';
import { calculateDynamicStreak } from './store';

const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h);

describe('calculateDynamicStreak (Thai time, 04:00 rollover)', () => {
  it('keeps the streak for someone reviewing at 06:00 every morning', () => {
    const history = { '2025-03-22': 5, '2025-03-23': 3, '2025-03-24': 2 };
    expect(calculateDynamicStreak(history, at(2025, 3, 24, 6))).toEqual({ currentStreak: 3, maxStreak: 3 });
  });

  it('still counts yesterday as alive before today’s first review', () => {
    const history = { '2025-03-22': 1, '2025-03-23': 1 };
    expect(calculateDynamicStreak(history, at(2025, 3, 24, 20)).currentStreak).toBe(2);
  });

  it('breaks after a missed study day and remembers the best run', () => {
    const history = { '2025-03-18': 1, '2025-03-19': 1, '2025-03-20': 1, '2025-03-23': 1 };
    expect(calculateDynamicStreak(history, at(2025, 3, 24, 20))).toEqual({ currentStreak: 1, maxStreak: 3 });
  });

  it('treats 01:30 as part of the previous study day', () => {
    const history = { '2025-03-23': 1, '2025-03-24': 1 };
    expect(calculateDynamicStreak(history, at(2025, 3, 25, 1)).currentStreak).toBe(2);
  });
});

describe('FSRS parameters in the store', () => {
  it('does not keep hand-tuned weights that override FSRS-6 defaults', async () => {
    const { useFlashcardStore } = await import('./store');
    expect('fsrsWeights' in useFlashcardStore.getState()).toBe(false);
    expect('recalibrateFSRS' in useFlashcardStore.getState()).toBe(false);
  });
});
