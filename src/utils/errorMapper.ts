// แปลงข้อความ error จาก PocketBase (และเครือข่าย) เป็นภาษาไทยที่ผู้ใช้เข้าใจ
export const translateAuthError = (message: string): string => {
  if (!message) return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';

  const msg = message.toLowerCase();

  if (msg.includes('failed to authenticate') || msg.includes('invalid login credentials')) {
    return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  }
  if (msg.includes('failed to create record') || msg.includes('user already registered')) {
    return 'สมัครไม่สำเร็จ ชื่อผู้ใช้นี้อาจมีคนใช้แล้ว หรือรหัสผ่านสั้นกว่า 8 ตัว';
  }
  if (msg.includes('must be at least') || msg.includes('password should be at least')) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  }
  if (msg.includes('something went wrong') || msg.includes('network') || msg.includes('fetch failed') || msg.includes('autocancelled')) {
    return 'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  }
  if (msg.includes('user not found')) return 'ไม่พบผู้ใช้งานนี้ในระบบ';
  if (msg.includes('invalid format')) return 'รูปแบบข้อมูลไม่ถูกต้อง';

  return `เกิดข้อผิดพลาด: ${message}`;
};
