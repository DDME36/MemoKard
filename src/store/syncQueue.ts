import { get as idbGet, set as idbSet } from 'idb-keyval';
import { newId } from '../lib/ids';
import { safeLocalStorage } from '../utils/safeStorage';

const QUEUE_KEY = 'offline-sync-queue-v2';
const DEAD_KEY = 'offline-sync-dead-v2';
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type SyncActionType =
  | 'UPSERT_DECK'
  | 'DELETE_DECK'
  | 'UPSERT_CARD'
  | 'DELETE_CARD'
  | 'LOG_REVIEW'
  | 'UPSERT_PROGRESS';

export interface ReviewLogPayload {
  id: string;
  cardId: string;
  rating: number;
  reviewedAt: string;
  device: string;
}

export interface SyncAction {
  id: string;
  type: SyncActionType;
  entityId: string;
  ownerId: string;
  log?: ReviewLogPayload;
  enqueuedAt: number;
  attempts: number;
  lastError?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'retrying' | 'auth';

/** 400/403/404 — ส่งซ้ำก็ไม่มีวันสำเร็จ */
export class PermanentSyncError extends Error {}
/** 401 — ต้องล็อกอินใหม่ */
export class AuthSyncError extends Error {}

export function classifyError(err: unknown): Error {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401) return new AuthSyncError(message);
  if (status === 400 || status === 403 || status === 404) return new PermanentSyncError(message);
  return err instanceof Error ? err : new Error(message);
}

const entityKind = (type: SyncActionType): string => {
  if (type.endsWith('_DECK')) return 'deck';
  if (type.endsWith('_CARD')) return 'card';
  if (type === 'UPSERT_PROGRESS') return 'progress';
  return 'log';
};

const entityKey = (a: Pick<SyncAction, 'type' | 'entityId' | 'ownerId'>) =>
  `${a.ownerId}:${entityKind(a.type)}:${a.entityId}`;

/**
 * รวม action ซ้ำของ entity เดียวกัน (ข้อมูลจริงอ่านจาก store ตอนส่ง จึงไม่ต้องเก็บหลายอัน)
 * - UPSERT ซ้ำ UPSERT → คงอันเดิมไว้ที่ตำแหน่งเดิม (ชุดต้องขึ้นก่อนการ์ด)
 * - DELETE ↔ UPSERT → ตัดอันเก่า แล้วต่อท้ายอันใหม่
 * - LOG_REVIEW เก็บทุกอัน
 */
export function coalesce(queue: SyncAction[], incoming: SyncAction): SyncAction[] {
  if (incoming.type === 'LOG_REVIEW') return [...queue, incoming];
  const key = entityKey(incoming);
  const existing = queue.find((a) => entityKey(a) === key);
  if (existing && existing.type === incoming.type && incoming.type.startsWith('UPSERT')) return queue;
  return [...queue.filter((a) => entityKey(a) !== key), incoming];
}

export interface QueueDeps {
  load(key: string): Promise<SyncAction[]>;
  save(key: string, actions: SyncAction[]): Promise<void>;
  send(action: SyncAction): Promise<void>;
  currentOwner(): string | null;
  isOnline(): boolean;
  now(): number;
  schedule(fn: () => void, ms: number): void;
}

export function createSyncQueue(deps: QueueDeps) {
  let lock: Promise<unknown> = Promise.resolve();
  let inFlight: Promise<void> | null = null;
  let rerun = false;
  // entity ที่ถูกแก้อีกครั้งระหว่างกำลังส่ง → ต้องส่งซ้ำหลังส่งรอบนี้เสร็จ
  const touchedWhileSending = new Set<string>();
  let sendingKey: string | null = null;
  let status: SyncStatus = 'idle';
  let lastSyncedAt: number | null = null;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setStatus = (next: SyncStatus) => {
    status = next;
    notify();
  };

  /** ทุกการอ่าน-แก้-เขียนคิวต้องผ่าน lock เพื่อไม่ให้ enqueue ระหว่างส่งหาย */
  const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const result = lock.then(fn, fn);
    lock = result.catch(() => undefined);
    return result;
  };

  const removeFromQueue = (id: string) =>
    withLock(async () => deps.save(QUEUE_KEY, (await deps.load(QUEUE_KEY)).filter((a) => a.id !== id)));

  async function run(): Promise<void> {
    if (!deps.isOnline()) {
      setStatus('offline');
      return;
    }
    const owner = deps.currentOwner();
    if (!owner) return;

    setStatus('syncing');
    do {
      rerun = false;
      for (;;) {
        const next = (await deps.load(QUEUE_KEY)).find((a) => a.ownerId === owner);
        if (!next) break;

        sendingKey = entityKey(next);
        touchedWhileSending.delete(sendingKey);
        try {
          await deps.send(next);
          const resend = touchedWhileSending.has(sendingKey);
          sendingKey = null;
          if (!resend) await removeFromQueue(next.id);
        } catch (err) {
          sendingKey = null;
          if (err instanceof PermanentSyncError) {
            await removeFromQueue(next.id);
            await withLock(async () =>
              deps.save(DEAD_KEY, [...(await deps.load(DEAD_KEY)), { ...next, lastError: err.message }]));
            continue;
          }
          if (err instanceof AuthSyncError) {
            setStatus('auth');
            return;
          }
          const attempts = next.attempts + 1;
          const lastError = err instanceof Error ? err.message : String(err);
          await withLock(async () => deps.save(QUEUE_KEY, (await deps.load(QUEUE_KEY)).map((a) =>
            a.id === next.id ? { ...a, attempts, lastError } : a)));
          deps.schedule(() => void api.processQueue(), Math.min(2000 * 2 ** (attempts - 1), MAX_BACKOFF_MS));
          setStatus('retrying');
          return;
        }
      }
    } while (rerun);
    lastSyncedAt = deps.now();
    setStatus('idle');
  }

  const api = {
    getQueue: () => deps.load(QUEUE_KEY),
    getDeadLetters: () => deps.load(DEAD_KEY),
    getStatus: () => ({ status, lastSyncedAt }),

    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    async enqueue(type: SyncActionType, entityId: string, ownerId: string, log?: ReviewLogPayload): Promise<void> {
      const incoming: SyncAction = { id: newId(), type, entityId, ownerId, log, enqueuedAt: deps.now(), attempts: 0 };
      if (sendingKey === entityKey(incoming)) touchedWhileSending.add(sendingKey);
      await withLock(async () => deps.save(QUEUE_KEY, coalesce(await deps.load(QUEUE_KEY), incoming)));
      notify();
      void api.processQueue();
    },

    async pendingEntityIds(): Promise<Set<string>> {
      const queue = await deps.load(QUEUE_KEY);
      return new Set(queue.map((a) => a.entityId));
    },

    /** ถ้ากำลังส่งอยู่ คืน promise เดิม และตั้ง rerun ให้วนอีกรอบเพื่อเก็บ action ที่เพิ่งเข้ามา */
    processQueue(): Promise<void> {
      if (inFlight) {
        rerun = true;
        return inFlight;
      }
      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    async retryDeadLetters(): Promise<void> {
      await withLock(async () => {
        const dead = await deps.load(DEAD_KEY);
        const revived = dead.map((a) => ({ ...a, attempts: 0, lastError: undefined }));
        await deps.save(QUEUE_KEY, [...(await deps.load(QUEUE_KEY)), ...revived]);
        await deps.save(DEAD_KEY, []);
      });
      notify();
      void api.processQueue();
    },

    async discardDeadLetters(): Promise<void> {
      await withLock(() => deps.save(DEAD_KEY, []));
      notify();
    },
  };

  return api;
}

// ── instance ที่ใช้จริงในแอป ──

async function loadPersisted(key: string): Promise<SyncAction[]> {
  try {
    const value = await idbGet<SyncAction[]>(key);
    if (Array.isArray(value)) return value;
  } catch {
    // IndexedDB ถูกบล็อก ใช้ localStorage แทน
  }
  try {
    const raw = safeLocalStorage.get(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePersisted(key: string, actions: SyncAction[]): Promise<void> {
  safeLocalStorage.set(key, JSON.stringify(actions));
  try {
    await idbSet(key, actions);
  } catch {
    // มีสำรองใน localStorage แล้ว
  }
}

export const syncQueue = createSyncQueue({
  load: loadPersisted,
  save: savePersisted,
  send: async (action) => {
    const { sendAction } = await import('./syncTransport');
    await sendAction(action);
  },
  currentOwner: () => {
    // lazy เพื่อตัด circular import กับ store.ts
    const state = (globalThis as { __memokardStore?: { getState(): { userId: string | null; isDemo: boolean; ownerId: string | null } } })
      .__memokardStore?.getState();
    return state && !state.isDemo && state.ownerId === state.userId ? state.userId : null;
  },
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  now: () => Date.now(),
  schedule: (fn, ms) => setTimeout(fn, ms),
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncQueue.processQueue());
}
