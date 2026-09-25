import { describe, expect, it } from 'vitest';
import { estimateMinutes, nextBatch } from './todaySummary';

const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h);
const card = (due: Date, state = 2) => ({ nextReviewDate: due, fsrsState: { state } });

describe('estimateMinutes', () => {
  it('rounds up at about 8 seconds a card and never says 0', () => {
    expect(estimateMinutes(1)).toBe(1);
    expect(estimateMinutes(15)).toBe(2);
    expect(estimateMinutes(60)).toBe(8);
  });
});

describe('nextBatch', () => {
  const now = at(2026, 9, 25, 20);

  it('names tomorrow and counts every card due that study day', () => {
    const cards = [card(at(2026, 9, 26, 9)), card(at(2026, 9, 26, 22)), card(at(2026, 9, 29, 9))];
    expect(nextBatch(cards, now)).toEqual({ label: 'พรุ่งนี้', count: 2 });
  });

  it('uses "อีก N วัน" further out', () => {
    expect(nextBatch([card(at(2026, 9, 29, 9))], now)).toEqual({ label: 'อีก 4 วัน', count: 1 });
  });

  it('returns null when nothing is scheduled', () => {
    expect(nextBatch([], now)).toBeNull();
  });
});
