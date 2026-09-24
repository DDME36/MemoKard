import { describe, expect, it } from 'vitest';
import { averageRecall, cardBuckets, recallAt } from './memoryStats';
import { createInitialFSRSState, type FSRSState } from './fsrs';

const state = (over: Partial<FSRSState>): { fsrsState: FSRSState } => ({
  fsrsState: { ...createInitialFSRSState(), ...over },
});
const now = new Date('2026-09-25T12:00:00.000Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

describe('cardBuckets (FSRS, not SM-2 repetition counts)', () => {
  it('splits new / learning / young / mature the way Anki users expect', () => {
    const cards = [
      state({ state: 0 }),
      state({ state: 1 }),
      state({ state: 3 }),
      state({ state: 2, scheduled_days: 5 }),
      state({ state: 2, scheduled_days: 21 }),
      state({ state: 2, scheduled_days: 90 }),
    ];
    expect(cardBuckets(cards)).toEqual({ newCards: 1, learning: 2, young: 1, mature: 2 });
  });
});

describe('recallAt / averageRecall', () => {
  it('is ~90% right when a card reaches its stability in days', () => {
    const card = state({ state: 2, stability: 10, last_review: daysAgo(10) });
    expect(recallAt(card.fsrsState, now)).toBeCloseTo(0.9, 2);
  });

  it('is 100% right after a review and falls as time passes', () => {
    const fresh = state({ state: 2, stability: 10, last_review: now.toISOString() });
    const old = state({ state: 2, stability: 10, last_review: daysAgo(60) });
    expect(recallAt(fresh.fsrsState, now)).toBeCloseTo(1, 5);
    expect(recallAt(old.fsrsState, now)).toBeLessThan(0.8);
  });

  it('averages only cards that have been reviewed, as a whole percent', () => {
    const cards = [
      state({ state: 0 }),
      state({ state: 2, stability: 10, last_review: daysAgo(10) }),
      state({ state: 2, stability: 10, last_review: now.toISOString() }),
    ];
    expect(averageRecall(cards, now)).toBe(95);
    expect(averageRecall([state({ state: 0 })], now)).toBeNull();
  });
});
