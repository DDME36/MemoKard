import { get as idbGet, set as idbSet } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { supabaseStore } from './supabaseStore';
import { useFlashcardStore } from './store';

const SYNC_QUEUE_KEY = 'offline-sync-queue';

export type SyncActionType = 
  | 'CREATE_DECK' 
  | 'UPDATE_DECK' 
  | 'DELETE_DECK' 
  | 'CREATE_CARD' 
  | 'UPDATE_CARD' 
  | 'DELETE_CARD' 
  | 'REVIEW_CARD' 
  | 'UPDATE_STATS';

export interface SyncAction {
  id: string;
  type: SyncActionType;
  payload: any;
  timestamp: number;
}

export class SyncQueueManager {
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  async getQueue(): Promise<SyncAction[]> {
    return (await idbGet<SyncAction[]>(SYNC_QUEUE_KEY)) || [];
  }

  async saveQueue(queue: SyncAction[]): Promise<void> {
    await idbSet(SYNC_QUEUE_KEY, queue);
  }

  async enqueue(type: SyncActionType, payload: any): Promise<void> {
    const queue = await this.getQueue();
    const newAction: SyncAction = {
      id: uuidv4(),
      type,
      payload,
      timestamp: Date.now(),
    };
    
    // Simple conflict resolution for rapid updates on the same item:
    // If it's an update or review for the same ID, just overwrite the old pending action.
    const filteredQueue = queue.filter(action => {
      if ((type === 'UPDATE_CARD' || type === 'REVIEW_CARD') && action.type === type) {
        return action.payload.id !== payload.id;
      }
      if (type === 'UPDATE_DECK' && action.type === type) {
        return action.payload.id !== payload.id;
      }
      return true;
    });

    filteredQueue.push(newAction);
    await this.saveQueue(filteredQueue);
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;
    
    const store = useFlashcardStore.getState();
    const userId = store.userId;
    if (!userId || store.isDemo) return;

    this.isSyncing = true;
    let queue = await this.getQueue();

    while (queue.length > 0 && navigator.onLine) {
      const action = queue[0];
      let success = true;

      try {
        switch (action.type) {
          case 'CREATE_DECK':
            // Supabase API does not currently allow forcing an ID from client via this store wrapper,
            // but for offline sync we ideally should. Assuming supabaseStore is modified or we just let it create a new ID and map it (complex).
            // For now, we pass the payload to the existing API which might generate a new ID on server.
            await supabaseStore.createDeck(userId, action.payload.name, action.payload.color);
            break;
          case 'UPDATE_DECK':
            await supabaseStore.updateDeck(action.payload.id, { name: action.payload.name, color: action.payload.color });
            break;
          case 'DELETE_DECK':
            await supabaseStore.deleteDeck(action.payload.id);
            break;
          case 'CREATE_CARD':
            await supabaseStore.createCard(
              userId, 
              action.payload.deckId, 
              action.payload.question, 
              action.payload.answer, 
              { interval: 0, repetition: 0, easeFactor: 2.5 }
            );
            break;
          case 'UPDATE_CARD':
            await supabaseStore.updateCard(action.payload.id, {
              question: action.payload.question,
              answer: action.payload.answer
            });
            break;
          case 'DELETE_CARD':
            await supabaseStore.deleteCard(action.payload.id);
            break;
          case 'REVIEW_CARD':
            await supabaseStore.updateCard(action.payload.id, {
              nextReviewDate: new Date(action.payload.nextReviewDate)
              // FSRS state should theoretically be added to Supabase schema if we want full sync
            });
            break;
          case 'UPDATE_STATS':
            // Custom payload for batch stats update
            break;
          default:
            console.warn('Unknown sync action type:', action.type);
        }
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        // If it's a critical error (like unauthenticated), we might want to pause syncing.
        // For network errors, we break and retry later.
        success = false;
        break;
      }

      if (success) {
        queue.shift(); // Remove processed action
        await this.saveQueue(queue); // Save new state
      }
    }

    this.isSyncing = false;
  }
}

export const syncQueue = new SyncQueueManager();
