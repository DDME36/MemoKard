import { communityStore } from './communityStore';
import { pocketbaseStore } from './pocketbaseStore';
import { useFlashcardStore } from './store';
import { syncQueue } from './syncQueue';

const PULL_INTERVAL_MS = 5 * 60 * 1000;
let pulling: Promise<void> | null = null;

/** ดึงเฉพาะที่เปลี่ยนตั้งแต่ครั้งล่าสุดแล้วรวมเข้า store */
export function pullChanges(): Promise<void> {
  if (pulling) return pulling;
  pulling = (async () => {
    const state = useFlashcardStore.getState();
    if (state.isDemo || !state.userId || state.ownerId !== state.userId) return;
    const pending = await syncQueue.pendingEntityIds();
    for (const id of state.pendingDeleteDecks.keys()) pending.add(id);
    for (const id of state.pendingDeleteCards.keys()) pending.add(id);
    const changes = await pocketbaseStore.fetchChanges(state.userId, state.lastPulledAt);
    useFlashcardStore.getState().applyServerChanges(changes, pending);
    await refreshLinkedDecks();
  })().finally(() => {
    pulling = null;
  });
  return pulling;
}

/** ชุดที่ติดตามจากชุมชน: เพิ่ม/แก้/ลบการ์ดตามชุดต้นทาง โดยเก็บความคืบหน้า FSRS ไว้ */
export async function refreshLinkedDecks(): Promise<void> {
  const store = useFlashcardStore.getState();
  for (const deck of store.decks.filter((d) => d.linkedPublicDeckId)) {
    let remoteCards;
    try {
      remoteCards = await communityStore.getPublicDeckCards(deck.linkedPublicDeckId!);
    } catch {
      continue; // ชุดต้นทางถูกซ่อนหรือลบ — เก็บของเดิมไว้
    }
    const local = useFlashcardStore.getState().cards.filter((c) => c.deckId === deck.id);
    const bySource = new Map(local.filter((c) => c.sourceCardId).map((c) => [c.sourceCardId!, c]));
    const remoteIds = new Set(remoteCards.map((c) => c.id));

    for (const remote of remoteCards) {
      const existing = bySource.get(remote.id);
      if (!existing) {
        await store.addCard(deck.id, remote.question, remote.answer, remote.questionImage, remote.answerImage, {
          skipAchievementCheck: true,
          sourceCardId: remote.id,
        });
      } else if (existing.question !== remote.question || existing.answer !== remote.answer) {
        await store.editCard(existing.id, remote.question, remote.answer, remote.questionImage, remote.answerImage);
      }
    }
    for (const card of local) {
      if (card.sourceCardId && !remoteIds.has(card.sourceCardId)) await store.deleteCard(card.id, true);
    }
  }
}

/** ดึงอัตโนมัติ: ตอนกลับมาออนไลน์ ตอนสลับกลับมาที่แท็บ และทุก 5 นาที */
export function startAutoPull(): () => void {
  const run = () => {
    void pullChanges().catch((err) => console.warn('[sync] pull failed', err));
    void syncQueue.processQueue();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(run, PULL_INTERVAL_MS);
  return () => {
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}
