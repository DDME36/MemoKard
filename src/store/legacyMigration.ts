import { isServerId, newId } from '../lib/ids';
import type { Deck, Flashcard } from './types';

/** เวอร์ชันก่อนหน้าใช้ UUID ซึ่ง PocketBase ไม่รับ แปลงเป็น ID 15 ตัวพร้อมแก้ deckId ของการ์ด */
export function migrateLegacyIds(state: { decks: Deck[]; cards: Flashcard[] }): { decks: Deck[]; cards: Flashcard[] } {
  const deckIdMap = new Map<string, string>();
  const decks = state.decks.map((deck) => {
    if (isServerId(deck.id)) return deck;
    const id = newId();
    deckIdMap.set(deck.id, id);
    return { ...deck, id };
  });
  const cards = state.cards.map((card) => {
    const id = isServerId(card.id) ? card.id : newId();
    const deckId = deckIdMap.get(card.deckId) ?? card.deckId;
    return id === card.id && deckId === card.deckId ? card : { ...card, id, deckId };
  });
  return { decks, cards };
}
