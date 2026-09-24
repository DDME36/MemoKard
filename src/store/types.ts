// ============================================
// Shared Types for Store
// ============================================
// This file breaks circular dependencies between
// store.ts, pocketbaseStore.ts, and syncQueue.ts

import type { FSRSState } from '../utils/fsrs';

export interface Deck {
  id: string;
  name: string;
  color: string; // Can be a DeckColor name or hex code (e.g., '#8b5cf6')
  createdAt: Date;
  linkedPublicDeckId?: string | null;
}

export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
  // ID ของการ์ดในชุดสาธารณะ (เฉพาะชุดที่ติดตาม) ใช้จับคู่ตอนอัปเดตจากชุดต้นทาง
  sourceCardId?: string;
  // ค่าแบบ SM-2 เดิม (คำนวณจาก FSRS) ใช้แสดงผลเท่านั้น ไม่ได้ส่งขึ้นเซิร์ฟเวอร์
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewDate: Date;
  createdAt: Date;
  lastReviewDate: Date;
  // FSRS state (source of truth for scheduling)
  fsrsState: FSRSState;
}

export const DECK_COLORS = ['violet', 'sky', 'teal', 'rose', 'amber', 'emerald', 'pink', 'indigo'] as const;
export type DeckColor = typeof DECK_COLORS[number];
