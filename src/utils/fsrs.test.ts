import { describe, expect, it } from 'vitest';
import { generatorParameters } from 'ts-fsrs';
import { calculateFSRS, createInitialFSRSState, scheduler, type FSRSState } from './fsrs';

describe('FSRS scheduler', () => {
  it('uses the library’s current FSRS-6 default parameters, not the old 17-weight set', () => {
    expect(scheduler.parameters.w).toEqual(generatorParameters().w);
    expect(scheduler.parameters.w).toHaveLength(21);
  });

  it('spreads out due dates (fuzz) so cards added together do not all come due the same day', () => {
    const matureCard: FSRSState = {
      ...createInitialFSRSState(),
      due: '2026-09-01T00:00:00.000Z',
      last_review: '2026-08-02T00:00:00.000Z',
      stability: 30,
      difficulty: 5,
      reps: 5,
      scheduled_days: 30,
      state: 2,
    };
    const intervals = new Set(
      Array.from({ length: 40 }, (_, i) =>
        calculateFSRS(matureCard, 3, new Date(Date.UTC(2026, 8, 1, 0, 0, i))).interval),
    );
    expect(intervals.size).toBeGreaterThan(1);
  });

  it('schedules a new card rated "Good" inside today (learning step), not days away', () => {
    const now = new Date('2026-09-24T02:00:00.000Z');
    const { nextReviewDate } = calculateFSRS(createInitialFSRSState(), 3, now);
    expect(nextReviewDate.getTime() - now.getTime()).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it('graduates a new card to review after two "Good" answers instead of looping every 10 minutes', () => {
    let state = createInitialFSRSState();
    let now = new Date('2026-09-24T02:00:00.000Z');
    for (let i = 0; i < 2; i++) {
      const result = calculateFSRS(state, 3, now);
      state = result.newState;
      now = result.nextReviewDate;
    }
    expect(state.state).toBe(2);
    expect(state.scheduled_days).toBeGreaterThanOrEqual(1);
  });

  it('schedules sooner when the learner asks for higher retention', () => {
    const mature: FSRSState = {
      ...createInitialFSRSState(),
      due: '2026-09-01T00:00:00.000Z',
      last_review: '2026-08-02T00:00:00.000Z',
      stability: 30,
      difficulty: 5,
      reps: 5,
      scheduled_days: 30,
      state: 2,
    };
    const at = new Date('2026-09-01T00:00:00.000Z');
    const relaxed = calculateFSRS(mature, 3, at, 0.85).interval;
    const exam = calculateFSRS(mature, 3, at, 0.95).interval;
    expect(exam).toBeLessThan(relaxed);
  });
});
