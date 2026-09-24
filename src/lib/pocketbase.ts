import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || '';

export type BackendStatus = 'unconfigured' | 'checking' | 'available' | 'unavailable';

// ตรวจสอบว่ามีการตั้งค่า PocketBase URL หรือไม่
let configuredOverride = false;
export const isPocketBaseConfigured = () =>
  configuredOverride || Boolean(pocketbaseUrl && pocketbaseUrl.trim() !== '');

/**
 * ตรวจสอบความพร้อมของ PocketBase service
 * PocketBase มี endpoint มาตรฐาน /api/health ให้เช็คสถานะ
 */
export async function checkPocketBaseHealth(timeoutMs = 5000): Promise<boolean> {
  if (!isPocketBaseConfigured()) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const cleanUrl = pocketbaseUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data && data.code === 200;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

// สร้าง PocketBase client instance
export let pb = new PocketBase(pocketbaseUrl || 'http://127.0.0.1:8090');

// ปิด auto-cancellation ของ request ซ้ำใน PocketBase เพื่อให้ sync และ mutation ทำงานราบรื่น
pb.autoCancellation(false);

/** ใช้ในเทสต์ integration เท่านั้น */
export function setPocketBaseClient(client: PocketBase): void {
  pb = client;
  pb.autoCancellation(false);
  configuredOverride = true;
}
