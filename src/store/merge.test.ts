import { describe, expect, it } from 'vitest';
import { addReviewCounts, mergeById, mergeProgress, type SyncedProgress } from './merge';

type Item = { id: string; v: string };

describe('mergeById', () => {
  const local: Item[] = [{ id: 'a', v: 'local-a' }, { id: 'b', v: 'local-b' }];

  it('takes the remote version when nothing is pending', () => {
    const out = mergeById(local, [{ record: { id: 'a', v: 'remote-a' }, deleted: false }], new Set());
    expect(out).toEqual([{ id: 'a', v: 'remote-a' }, { id: 'b', v: 'local-b' }]);
  });

  it('keeps the local version while it is pending in the queue', () => {
    const out = mergeById(local, [{ record: { id: 'a', v: 'remote-a' }, deleted: false }], new Set(['a']));
    expect(out[0].v).toBe('local-a');
  });

  it('removes records deleted remotely', () => {
    const out = mergeById(local, [{ record: { id: 'b', v: '' }, deleted: true }], new Set());
    expect(out.map((i) => i.id)).toEqual(['a']);
  });

  it('adds new remote records', () => {
    const out = mergeById(local, [{ record: { id: 'c', v: 'remote-c' }, deleted: false }], new Set());
    expect(out.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('addReviewCounts (Thai time)', () => {
  it('files a 06:30 Thai-time review under that Thai day, not the previous UTC day', () => {
    const out = addReviewCounts({}, [{ id: '1', reviewedAt: '2026-09-23T23:30:00.000Z', device: 'other' }], 'me');
    expect(out).toEqual({ '2026-09-24': 1 });
  });
});

describe('addReviewCounts', () => {
  it('counts logs from other devices by study day and ignores this device', () => {
    const out = addReviewCounts({ '2026-09-20': 2 }, [
      { id: '1', reviewedAt: '2026-09-20T10:00:00.000Z', device: 'other' },
      { id: '2', reviewedAt: '2026-09-21 01:00:00.000Z', device: 'other' },
      { id: '3', reviewedAt: '2026-09-21T02:00:00.000Z', device: 'me' },
    ], 'me');
    expect(out).toEqual({ '2026-09-20': 3, '2026-09-21': 1 });
  });
});

describe('mergeProgress', () => {
  const base = (n: number): SyncedProgress => ({
    counters: {
      cardsCreated: n, decksCreated: n, reviewsCompleted: n, currentStreak: n, maxStreak: n,
      perfectReviews: n, totalStudyTime: n, decksShared: n, decksImported: n,
    },
    unlockedAchievements: [],
  });

  it('takes the max of each counter and the union of achievements', () => {
    const local = { ...base(1), unlockedAchievements: ['first_deck'] };
    const remote = { ...base(5), unlockedAchievements: ['first_card', 'first_deck'] };
    remote.counters.decksCreated = 0;
    const out = mergeProgress(local, remote);
    expect(out.counters.cardsCreated).toBe(5);
    expect(out.counters.decksCreated).toBe(1);
    expect(out.unlockedAchievements.sort()).toEqual(['first_card', 'first_deck']);
  });
});
