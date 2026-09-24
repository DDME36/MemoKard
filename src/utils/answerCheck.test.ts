import { describe, expect, it } from 'vitest';
import { checkTypedAnswer } from './answerCheck';

describe('checkTypedAnswer', () => {
  it('suggests "พอได้" (3), never "ง่าย", for a perfect typed answer — typing correctly is not effortless recall', () => {
    expect(checkTypedAnswer('Photosynthesis', 'photosynthesis')).toEqual({ percent: 100, suggestion: 3 });
  });

  it('ignores spacing, punctuation and cloze braces', () => {
    expect(checkTypedAnswer(' แมว ', '{{แมว}}.').percent).toBe(100);
  });

  it('suggests "ยาก" (2) for a close answer with a typo', () => {
    expect(checkTypedAnswer('recieve', 'receive')).toEqual({ percent: 50, suggestion: 2 });
  });

  it('suggests "ทำใหม่" (1) for a wrong answer', () => {
    expect(checkTypedAnswer('dog', 'แมว').suggestion).toBe(1);
  });

  it('does not score long explanations — the learner judges those themselves', () => {
    const long = 'HTTPS เข้ารหัสข้อมูลด้วย TLS เพื่อป้องกันการดักฟัง ต่างจาก HTTP ที่ส่งข้อความดิบ ทำให้ปลอดภัยกว่ามาก';
    expect(checkTypedAnswer('เข้ารหัส', long)).toEqual({ percent: null, suggestion: null });
    expect(checkTypedAnswer('a', '- ข้อ 1\n- ข้อ 2')).toEqual({ percent: null, suggestion: null });
  });

  it('returns nothing when the learner typed nothing', () => {
    expect(checkTypedAnswer('   ', 'cat')).toEqual({ percent: null, suggestion: null });
  });
});
