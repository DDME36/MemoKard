export const translateAuthError = (message: string): string => {
  if (!message) return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
  
  const msg = message.toLowerCase();
  
  if (msg.includes('invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (msg.includes('user already registered')) return 'อีเมลนี้มีผู้ใช้งานแล้ว';
  if (msg.includes('password should be at least')) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (msg.includes('invalid email')) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (msg.includes('email not confirmed')) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
  if (msg.includes('user not found')) return 'ไม่พบผู้ใช้งานนี้ในระบบ';
  if (msg.includes('rate limit exceeded') || msg.includes('too many requests')) return 'ทำรายการบ่อยเกินไป กรุณารอสักครู่';
  if (msg.includes('weak password')) return 'รหัสผ่านคาดเดาง่ายเกินไป';
  if (msg.includes('network error') || msg.includes('fetch failed')) return 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
  if (msg.includes('database error saving new user')) return 'เกิดข้อผิดพลาดในฐานข้อมูล ไม่สามารถสร้างบัญชีผู้ใช้ได้';
  if (msg.includes('invalid format')) return 'รูปแบบข้อมูลไม่ถูกต้อง';
  
  return `เกิดข้อผิดพลาด: ${message}`;
};
