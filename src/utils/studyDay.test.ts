import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, endOfStudyDay, isCardDue, studyDayKey } from './studyDay';

// vitest.config.ts ตั้ง TZ=Asia/Bangkok ให้ทุกเทสต์

const local = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe('studyDayKey', () => {
  it('uses the local calendar day, not UTC (06:00 in Thailand is still today)', () => {
    expect(studyDayKey(local(2026, 9, 24, 6))).toBe('2026-09-24');
  });

  it('counts reviews before 04:00 as the previous study day (night owls keep their streak)', () => {
    expect(studyDayKey(local(2026, 9, 25, 1, 30))).toBe('2026-09-24');
    expect(studyDayKey(local(2026, 9, 25, 4, 0))).toBe('2026-09-25');
  });
});

describe('day arithmetic', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-09-24', '2026-09-27')).toBe(3);
    expect(daysBetween('2026-09-24', '2026-09-24')).toBe(0);
  });
});

describe('endOfStudyDay', () => {
  it('is the next 04:00 local time', () => {
    expect(endOfStudyDay(local(2026, 9, 24, 9))).toEqual(local(2026, 9, 25, 4, 0));
    expect(endOfStudyDay(local(2026, 9, 25, 2))).toEqual(local(2026, 9, 25, 4, 0));
  });
});

describe('isCardDue', () => {
  const now = local(2026, 9, 24, 9);
  const card = (due: Date, state: number) => ({ nextReviewDate: due, fsrsState: { state } });

  it('shows review cards that fall due later today', () => {
    expect(isCardDue(card(local(2026, 9, 24, 17), 2), now)).toBe(true);
  });

  it('does not show review cards due tomorrow', () => {
    expect(isCardDue(card(local(2026, 9, 25, 9), 2), now)).toBe(false);
  });

  it('shows learning cards only when they are within 20 minutes', () => {
    expect(isCardDue(card(local(2026, 9, 24, 9, 10), 1), now)).toBe(true);
    expect(isCardDue(card(local(2026, 9, 24, 10, 0), 1), now)).toBe(false);
    expect(isCardDue(card(local(2026, 9, 24, 10, 0), 3), now)).toBe(false);
  });

  it('always shows new cards', () => {
    expect(isCardDue(card(now, 0), now)).toBe(true);
  });
});
