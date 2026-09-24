import { useFlashcardStore } from './store';
import { pocketbaseStore } from './pocketbaseStore';
import { classifyError, type SyncAction } from './syncQueue';

/** อ่านสถานะล่าสุดจาก store ตอนส่ง (ไม่ใช่ตอน enqueue) จึงส่งข้อมูลล่าสุดเสมอ */
export async function sendAction(action: SyncAction): Promise<void> {
  const state = useFlashcardStore.getState();
  const userId = action.ownerId;
  try {
    switch (action.type) {
      case 'UPSERT_DECK': {
        const deck = state.decks.find((d) => d.id === action.entityId);
        if (deck) await pocketbaseStore.upsertDeck(userId, deck);
        return;
      }
      case 'DELETE_DECK':
        return await pocketbaseStore.softDeleteDeck(action.entityId);
      case 'UPSERT_CARD': {
        const card = state.cards.find((c) => c.id === action.entityId);
        if (card) await pocketbaseStore.upsertCard(userId, card);
        return;
      }
      case 'DELETE_CARD':
        return await pocketbaseStore.softDeleteCard(action.entityId);
      case 'LOG_REVIEW':
        if (action.log) await pocketbaseStore.createReviewLog(userId, action.log);
        return;
      case 'UPSERT_PROGRESS':
        return await pocketbaseStore.upsertProgress(userId, {
          counters: state.userProgress,
          unlockedAchievements: state.unlockedAchievements,
        });
    }
  } catch (err) {
    throw classifyError(err);
  }
}
