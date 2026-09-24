/**
 * Deck Import/Export Utilities
 * Allows users to share flashcard decks as JSON files
 */

import type { Deck, Flashcard, FlashcardStore } from '../store/store';
import type { UserProgress } from './achievements';
import { calendarKey } from './studyDay';

export interface ExportedDeck {
  version: string;
  exportedAt: string;
  deck: {
    name: string;
    color: string;
    description?: string;
  };
  cards: Array<{
    question: string;
    answer: string;
  }>;
}

export interface FullBackupData {
  type: 'memokard_full_backup';
  version: string;
  exportedAt: string;
  decks: Deck[];
  cards: Flashcard[];
  streak: number;
  lastStudyDate: string | null;
  reviewHistory: Record<string, number>;
  userProgress: UserProgress | null;
  unlockedAchievements: string[];
  [key: string]: unknown;
}

/**
 * Export full MemoKard system backup to JSON file
 */
export const exportFullBackup = (store: FlashcardStore) => {
  const backupData: FullBackupData = {
    type: 'memokard_full_backup',
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    decks: store.decks,
    cards: store.cards,
    streak: store.streak,
    lastStudyDate: store.lastStudyDate,
    reviewHistory: store.reviewHistory,
    userProgress: store.userProgress,
    unlockedAchievements: store.unlockedAchievements,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const dateStr = calendarKey(new Date());
  link.download = `MemoKard_Backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import and parse full MemoKard backup file
 */
export const importFullBackup = (file: File): Promise<FullBackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as FullBackupData;
        if (!data || data.type !== 'memokard_full_backup' || !Array.isArray(data.decks) || !Array.isArray(data.cards)) {
          throw new Error('ไฟล์สำรองไม่ถูกต้องหรือโครงสร้างข้อมูลไม่สมบูรณ์');
        }
        resolve(data);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('ไม่สามารถอ่านไฟล์สำรองได้'));
      }
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsText(file);
  });
};

/**
 * Export a deck to JSON file
 */
export const exportDeck = (deck: Deck, cards: Array<{ question: string; answer: string }>) => {
  const exportData: ExportedDeck = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      color: deck.color,
      description: `Exported from MemoKard`
    },
    cards: cards.map(card => ({
      question: card.question,
      answer: card.answer
    }))
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${deck.name.replace(/[\\/:*?"<>|]/g, '_')}_deck.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import a deck from JSON file
 */
export const importDeck = (file: File): Promise<ExportedDeck> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportedDeck;
        
        // Validate structure
        if (!data.deck || !data.cards || !Array.isArray(data.cards)) {
          throw new Error('Invalid deck file format');
        }
        
        if (data.cards.length === 0) {
          throw new Error('Deck contains no cards');
        }
        
        // Validate each card
        for (const card of data.cards) {
          if (!card.question || !card.answer) {
            throw new Error('Invalid card format: missing question or answer');
          }
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/** ดึงเฉพาะก้อน JSON จากคำตอบของ AI (ตัด ```json และข้อความเกริ่นนำ/สรุปออก) */
function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  if (fenced && /^\s*\{\s*"/.test(fenced[1])) return fenced[1].trim();
  const start = text.search(/\{\s*"/);
  if (start === -1) return text;
  const end = text.lastIndexOf('}');
  // ถ้าไม่มีวงเล็บปิด (AI ตอบไม่จบ) ก็ส่งไปทั้งก้อน ให้ parser แจ้งว่าไม่สมบูรณ์
  return (end > start ? text.slice(start, end + 1) : text.slice(start)).trim();
}

/**
 * AI มักลืม escape backslash ใน LaTeX เช่น "$\frac{a}{b}$"
 * ซึ่ง \f \t \n \b \r เป็น escape ที่ถูกต้องใน JSON จึงเพี้ยนเงียบ ๆ
 * แก้เฉพาะในช่วงสูตร $...$ / $$...$$ เท่านั้น เพื่อไม่ให้ \n (ขึ้นบรรทัด) นอกสูตรพัง
 */
function escapeMathBackslashes(json: string): string {
  return json.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g, (span) => span.replace(/(?<!\\)\\(?!\\)/g, '\\\\'));
}

/** backslash นอกสูตรที่ไม่ใช่ escape ของ JSON (เช่น \s \d) — แปลงเป็นตัวอักษร backslash */
function repairInvalidEscapes(json: string): string {
  return json.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
}

/** AI บางตัวขึ้นบรรทัดจริงภายใน string ซึ่ง JSON ไม่ยอมรับ — แปลงเป็น \n เฉพาะที่อยู่ใน string */
function escapeRawControlChars(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      } else if (ch === '\n') {
        out += '\\n';
        continue;
      } else if (ch === '\r') {
        continue;
      } else if (ch === '\t') {
        out += '\\t';
        continue;
      }
    } else if (ch === '"') {
      inString = true;
    }
    out += ch;
  }
  return out;
}

function parseAiJson(json: string): Partial<ExportedDeck> | null {
  const mathSafe = escapeMathBackslashes(escapeRawControlChars(json));
  for (const attempt of [mathSafe, repairInvalidEscapes(mathSafe)]) {
    try {
      return JSON.parse(attempt);
    } catch {
      // ลองแบบถัดไป
    }
  }
  return null;
}

/**
 * Import a deck from raw text (JSON, CSV, TSV)
 */
export const importDeckFromText = (text: string, defaultName = 'Imported Deck', defaultColor = 'violet'): ExportedDeck => {
  const t = extractJsonCandidate(text.trim());

  // 1. JSON จาก AI
  if (t.startsWith('{')) {
    const data = parseAiJson(t);
    if (data && data.deck && Array.isArray(data.cards)) {
      if (validateDeckData(data)) return data;
      return {
        version: data.version ?? '1.0.0',
        exportedAt: data.exportedAt ?? new Date().toISOString(),
        deck: {
          name: data.deck.name || defaultName,
          color: data.deck.color || defaultColor,
          description: data.deck.description,
        },
        // AI บางครั้งส่งการ์ดที่ขาดฟิลด์หรือเป็นค่าว่าง — ข้ามใบนั้นแทนที่จะล้มทั้งชุด
        cards: data.cards
          .filter((c): c is { question: string; answer: string } =>
            !!c && typeof c.question === 'string' && typeof c.answer === 'string' && c.question.trim() !== '')
          .map((c) => ({ question: c.question, answer: c.answer })),
      };
    }
    // หน้าตาเป็น JSON แต่อ่านไม่ได้ — ส่วนใหญ่คือ AI ตอบไม่จบ อย่าเดาเป็นตารางแล้วได้การ์ดขยะ
    throw new Error(
      'ข้อมูลจาก AI ไม่สมบูรณ์หรือรูปแบบ JSON ผิด ถ้า AI ยังตอบไม่จบ ให้พิมพ์บอก AI ว่า "ต่อ" แล้วคัดลอกคำตอบทั้งหมดมาวางใหม่',
    );
  }

  // 2. Parse as Text (TSV, CSV, Pipe)
  const cards: Array<{question: string, answer: string}> = [];
  const lines = t.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // TSV (Excel/Sheets copy-paste)
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join('\t').trim() });
        continue;
      }
    }
    
    // Pipe separated
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join('|').trim() });
        continue;
      }
    }

    // CSV (basic)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        cards.push({ question: parts[0].trim(), answer: parts.slice(1).join(',').trim() });
        continue;
      }
    }
  }

  if (cards.length === 0) {
    throw new Error('ไม่พบข้อมูลการ์ด กรุณาคั่นคำถามและคำตอบด้วย Tab, | (Pipe) หรือ , (Comma)');
  }

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    deck: {
      name: defaultName,
      color: defaultColor,
      description: 'Imported from text/table'
    },
    cards
  };
};

/**
 * Validate imported deck data
 */
export const validateDeckData = (data: unknown): data is ExportedDeck => {
  const d = data as Partial<ExportedDeck>;
  return (
    !!d &&
    typeof d === 'object' &&
    !!d.deck &&
    typeof d.deck.name === 'string' &&
    typeof d.deck.color === 'string' &&
    Array.isArray(d.cards) &&
    d.cards.every((card: unknown) => {
      const c = card as Record<string, unknown> | null;
      return (
        !!c &&
        typeof c.question === 'string' &&
        typeof c.answer === 'string'
      );
    })
  );
};
