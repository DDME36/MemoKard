import type { UserProgress } from '../utils/achievements';

export interface RemoteChange<T> {
  record: T;
  deleted: boolean;
}

/**
 * รวมข้อมูลจากเซิร์ฟเวอร์เข้ากับข้อมูลในเครื่อง
 * - record ที่ยังค้างในคิว (pendingIds) ใช้ของในเครื่องเสมอ
 * - นอกนั้นใช้ของเซิร์ฟเวอร์ (เพราะของในเครื่องที่ไม่ค้างย่อมเก่ากว่าหรือเท่ากับเซิร์ฟเวอร์)
 */
export function mergeById<T extends { id: string }>(
  local: T[],
  remote: RemoteChange<T>[],
  pendingIds: ReadonlySet<string>,
): T[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const change of remote) {
    const id = change.record.id;
    if (pendingIds.has(id)) continue;
    if (change.deleted) byId.delete(id);
    else byId.set(id, change.record);
  }
  return [...byId.values()];
}

export interface RemoteReviewLog {
  id: string;
  reviewedAt: string;
  device: string;
}

/** นับประวัติการทบทวนจากเครื่องอื่นเพิ่มเข้าไป (log ของเครื่องนี้ถูกนับไปแล้วตอนทบทวน) */
export function addReviewCounts(
  history: Record<string, number>,
  logs: RemoteReviewLog[],
  thisDevice: string,
): Record<string, number> {
  const next = { ...history };
  for (const log of logs) {
    if (log.device === thisDevice) continue;
    const day = new Date(log.reviewedAt.replace(' ', 'T')).toISOString().slice(0, 10);
    next[day] = (next[day] ?? 0) + 1;
  }
  return next;
}

export interface SyncedProgress {
  counters: UserProgress;
  unlockedAchievements: string[];
}

export function mergeProgress(local: SyncedProgress, remote: SyncedProgress): SyncedProgress {
  const counters = { ...local.counters };
  for (const key of Object.keys(counters) as (keyof UserProgress)[]) {
    counters[key] = Math.max(local.counters[key] ?? 0, remote.counters[key] ?? 0);
  }
  return {
    counters,
    unlockedAchievements: [...new Set([...local.unlockedAchievements, ...remote.unlockedAchievements])],
  };
}
