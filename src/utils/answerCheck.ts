/**
 * ตรวจคำตอบที่พิมพ์ในโหมด "พิมพ์ตอบ" แบบออฟไลน์ (Dice coefficient บน bigram)
 *
 * แนะนำคะแนนได้สูงสุดแค่ "พอได้" (3): ใน FSRS ปุ่ม "ง่าย" หมายถึงนึกออกทันทีโดยไม่ต้องคิด
 * ซึ่งการพิมพ์ถูกไม่ได้บอกอย่างนั้น ถ้าแนะนำ "ง่าย" บ่อย ระยะทบทวนจะยืดเกินจริงจนลืม
 */

export type SuggestedRating = 1 | 2 | 3;

export interface AnswerCheck {
  /** เปอร์เซ็นต์ที่ตรงกับเฉลย หรือ null ถ้าเฉลยยาวเกินจะเทียบได้อย่างมีความหมาย */
  percent: number | null;
  suggestion: SuggestedRating | null;
}

/** เฉลยที่ยาวกว่านี้ (หลังตัดช่องว่าง/เครื่องหมาย) หรือหลายบรรทัด ให้ผู้เรียนตัดสินเอง */
export const MAX_COMPARABLE_LENGTH = 40;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/\{\{(.*?)\}\}/g, '$1')
    .replace(/[*_#`+\-.,/!$%^&;:{}=~()?'"“”]/g, '')
    .replace(/\s+/g, '');

const bigrams = (text: string) => {
  const set = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) set.add(text.slice(i, i + 2));
  return set;
};

export function similarity(typed: string, answer: string): number {
  const a = normalize(typed);
  const b = normalize(answer);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  A.forEach((gram) => {
    if (B.has(gram)) shared++;
  });
  return (2 * shared) / (A.size + B.size);
}

export function checkTypedAnswer(typed: string, answer: string): AnswerCheck {
  if (!typed.trim()) return { percent: null, suggestion: null };
  if (answer.includes('\n') || normalize(answer).length > MAX_COMPARABLE_LENGTH) {
    return { percent: null, suggestion: null };
  }
  const percent = Math.round(similarity(typed, answer) * 100);
  const suggestion: SuggestedRating = percent >= 85 ? 3 : percent >= 50 ? 2 : 1;
  return { percent, suggestion };
}
