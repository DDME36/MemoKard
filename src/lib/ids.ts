const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 15;

/** รูปแบบ ID ที่ PocketBase รับได้เป็นค่าเริ่มต้น */
export const ID_PATTERN = /^[a-z0-9]{15}$/;

export function newId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

export const isServerId = (id: string): boolean => ID_PATTERN.test(id);
