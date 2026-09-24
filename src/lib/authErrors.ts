/**
 * authRefresh ล้มเหลวเพราะเซิร์ฟเวอร์ปฏิเสธ token จริง (401/403/404) หรือแค่ติดต่อไม่ได้?
 * ถ้าแค่ออฟไลน์/เซิร์ฟล่ม ต้องคงการล็อกอินไว้ ผู้ใช้จะได้ทบทวนต่อแบบออฟไลน์ได้
 */
export function isAuthRejection(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403 || status === 404;
}
