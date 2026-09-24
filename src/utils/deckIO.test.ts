import { describe, expect, it } from 'vitest';
import { importDeckFromText } from './deckIO';

// String.raw = ข้อความตรงตามที่ AI ส่งมา (backslash ไม่ถูกตีความโดย JavaScript)

describe('importDeckFromText — AI JSON', () => {
  it('keeps line breaks the AI writes as \\n (bullet answers)', () => {
    const ai = String.raw`{"deck":{"name":"A","color":"#8b5cf6"},"cards":[{"question":"Q","answer":"- ข้อแรก\n- ข้อสอง"}]}`;
    expect(importDeckFromText(ai).cards[0].answer).toBe('- ข้อแรก\n- ข้อสอง');
  });

  it('accepts real line breaks the AI typed inside a JSON string', () => {
    // มีตัวขึ้นบรรทัดจริง (ไม่ใช่ \n) อยู่ใน string ซึ่ง JSON มาตรฐานไม่ยอมรับ
    const ai = '{"deck":{"name":"A","color":"violet"},"cards":[{"question":"Q","answer":"- ข้อแรก\n- ข้อสอง"}]}';
    expect(importDeckFromText(ai).cards[0].answer).toBe('- ข้อแรก\n- ข้อสอง');
  });

  it('skips empty cards instead of failing the whole deck', () => {
    const ai = String.raw`{"deck":{"name":"A"},"cards":[{"question":"cat","answer":"แมว"},{"question":"","answer":"x"},{"answer":"y"}]}`;
    expect(importDeckFromText(ai).cards).toEqual([{ question: 'cat', answer: 'แมว' }]);
  });

  it('keeps correctly escaped LaTeX', () => {
    const ai = String.raw`{"deck":{"name":"A","color":"violet"},"cards":[{"question":"$\\frac{1}{2}$","answer":"$$\\sqrt{x}$$"}]}`;
    const [card] = importDeckFromText(ai).cards;
    expect(card.question).toBe(String.raw`$\frac{1}{2}$`);
    expect(card.answer).toBe(String.raw`$$\sqrt{x}$$`);
  });

  it('repairs LaTeX the AI forgot to escape, even commands that look like JSON escapes (\\frac, \\theta, \\neq)', () => {
    const ai = String.raw`{"deck":{"name":"A","color":"violet"},"cards":[{"question":"$\frac{a}{b}$ และ $\theta \neq 0$","answer":"บรรทัด1\nบรรทัด2"}]}`;
    const [card] = importDeckFromText(ai).cards;
    expect(card.question).toBe(String.raw`$\frac{a}{b}$ และ $\theta \neq 0$`);
    expect(card.answer).toBe('บรรทัด1\nบรรทัด2');
  });

  it('accepts JSON wrapped in a markdown code block with chatter around it', () => {
    const ai = 'นี่คือการ์ดครับ\n```json\n{"deck":{"name":"A","color":"violet"},"cards":[{"question":"cat","answer":"แมว"}]}\n```\nขอให้สนุก';
    expect(importDeckFromText(ai).cards).toEqual([{ question: 'cat', answer: 'แมว' }]);
  });

  it('refuses a cut-off AI answer with a clear message instead of creating junk cards', () => {
    const cut = String.raw`{"deck":{"name":"C","color":"violet"},"cards":[{"question":"cat","answer":"แมว"},{"question":"dog", "answer":"ห`;
    expect(() => importDeckFromText(cut)).toThrow(/ไม่สมบูรณ์/);
  });
});

describe('importDeckFromText — tables', () => {
  it('still reads tab-separated rows pasted from a spreadsheet', () => {
    expect(importDeckFromText('cat\tแมว\ndog\tหมา').cards).toEqual([
      { question: 'cat', answer: 'แมว' },
      { question: 'dog', answer: 'หมา' },
    ]);
  });
});
