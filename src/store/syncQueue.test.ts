import { describe, expect, it, vi } from 'vitest';
import {
  AuthSyncError, PermanentSyncError, coalesce, createSyncQueue,
  type QueueDeps, type SyncAction,
} from './syncQueue';

function memoryDeps(overrides: Partial<QueueDeps> = {}) {
  const store: Record<string, SyncAction[]> = {};
  const sent: SyncAction[] = [];
  const scheduled: number[] = [];
  const deps: QueueDeps = {
    load: async (key) => structuredClone(store[key] ?? []),
    save: async (key, value) => { store[key] = structuredClone(value); },
    send: async (action) => { sent.push(action); },
    currentOwner: () => 'u1',
    isOnline: () => true,
    now: () => 1000,
    schedule: (_fn, ms) => { scheduled.push(ms); },
    ...overrides,
  };
  return { deps, sent, scheduled, store };
}

const action = (type: SyncAction['type'], entityId: string, extra: Partial<SyncAction> = {}): SyncAction => ({
  id: `${type}-${entityId}-${Math.random()}`, type, entityId, ownerId: 'u1', enqueuedAt: 0, attempts: 0, ...extra,
});

describe('coalesce', () => {
  it('keeps only one upsert for the same card', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1')], action('UPSERT_CARD', 'c1'));
    expect(q).toHaveLength(1);
  });

  it('keeps the position of the first upsert so a deck is sent before its cards', () => {
    const q = coalesce([action('UPSERT_DECK', 'd1'), action('UPSERT_CARD', 'c1')], action('UPSERT_DECK', 'd1'));
    expect(q.map((a) => a.entityId)).toEqual(['d1', 'c1']);
  });

  it('replaces a pending upsert with a delete', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1'), action('UPSERT_CARD', 'c2')], action('DELETE_CARD', 'c1'));
    expect(q.map((a) => `${a.type}:${a.entityId}`)).toEqual(['UPSERT_CARD:c2', 'DELETE_CARD:c1']);
  });

  it('never drops review logs', () => {
    const log = { id: 'l', cardId: 'c1', rating: 3, reviewedAt: '', device: 'd' };
    let q = coalesce([], action('LOG_REVIEW', 'l1', { log }));
    q = coalesce(q, action('LOG_REVIEW', 'l2', { log }));
    expect(q).toHaveLength(2);
  });

  it('does not merge actions from different owners', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1', { ownerId: 'other' })], action('UPSERT_CARD', 'c1'));
    expect(q).toHaveLength(2);
  });
});

describe('processQueue', () => {
  it('sends in order and empties the queue', async () => {
    const { deps, sent } = memoryDeps();
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.processQueue();
    expect(sent.map((a) => a.entityId)).toEqual(['d1', 'c1']);
    expect(await q.getQueue()).toHaveLength(0);
    expect(q.getStatus()).toEqual({ status: 'idle', lastSyncedAt: 1000 });
  });

  it('keeps the action and schedules a retry on a transient error', async () => {
    const { deps, scheduled } = memoryDeps({ send: vi.fn().mockRejectedValue(new Error('network')) });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    const [pending] = await q.getQueue();
    expect(pending.attempts).toBe(1);
    expect(scheduled).toEqual([2000]);
    expect(q.getStatus().status).toBe('retrying');
  });

  it('moves permanent failures to dead letters and continues', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new PermanentSyncError('bad'))
      .mockResolvedValue(undefined);
    const { deps } = memoryDeps({ send });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.enqueue('UPSERT_DECK', 'd2', 'u1');
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(0);
    expect((await q.getDeadLetters()).map((a) => a.entityId)).toEqual(['d1']);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('stops with auth status on 401', async () => {
    const { deps } = memoryDeps({ send: vi.fn().mockRejectedValue(new AuthSyncError('expired')) });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(1);
    expect(q.getStatus().status).toBe('auth');
  });

  it('never sends actions that belong to another account', async () => {
    const { deps, sent } = memoryDeps({ currentOwner: () => 'u2' });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    expect(sent).toHaveLength(0);
    expect(await q.getQueue()).toHaveLength(1);
  });

  it('does not lose an enqueue that happens while sending', async () => {
    const { deps } = memoryDeps({
      send: async (a) => {
        if (a.entityId === 'd1') await q.enqueue('UPSERT_CARD', 'c9', 'u1');
      },
    });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(0);
  });

  it('resends when the same entity changes while it is being sent', async () => {
    let calls = 0;
    const { deps } = memoryDeps({
      send: async () => {
        calls++;
        if (calls === 1) await q.enqueue('UPSERT_CARD', 'c1', 'u1'); // แก้การ์ดระหว่างกำลังส่ง
      },
    });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.processQueue();
    expect(calls).toBe(2);
    expect(await q.getQueue()).toHaveLength(0);
  });

  it('reports pending entity ids', async () => {
    const { deps } = memoryDeps({ isOnline: () => false });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.enqueue('DELETE_DECK', 'd1', 'u1');
    expect([...(await q.pendingEntityIds())].sort()).toEqual(['c1', 'd1']);
  });
});
