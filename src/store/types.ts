// ============================================
// Shared Types for Store
// ============================================
// This file breaks circular dependencies between
// store.ts, supabaseStore.ts, and syncQueue.ts

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
  // Keep these for Supabase compatibility (mapped from FSRS values)
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
