import { describe, expect, it } from 'vitest';
import { isServerId } from '../lib/ids';
import { migrateLegacyIds } from './legacyMigration';
import type { Deck, Flashcard } from './types';

const uuid = '3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b';

describe('migrateLegacyIds', () => {
  it('re-keys UUID decks and cards and keeps card→deck links', () => {
    const decks = [{ id: uuid, name: 'D' }] as Deck[];
    const cards = [
      { id: '11111111-2222-4333-8444-555555555555', deckId: uuid },
      { id: '66666666-7777-4888-9999-000000000000', deckId: uuid },
    ] as Flashcard[];
    const out = migrateLegacyIds({ decks, cards });
    expect(isServerId(out.decks[0].id)).toBe(true);
    expect(out.cards.every((c) => isServerId(c.id) && c.deckId === out.decks[0].id)).toBe(true);
    expect(new Set(out.cards.map((c) => c.id)).size).toBe(2);
  });

  it('leaves valid ids untouched', () => {
    const decks = [{ id: 'abcdefghijklmno', name: 'D' }] as Deck[];
    const cards = [{ id: 'pqrstuvwxyz0123', deckId: 'abcdefghijklmno' }] as Flashcard[];
    expect(migrateLegacyIds({ decks, cards })).toEqual({ decks, cards });
  });
});
