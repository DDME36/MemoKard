# คู่มือแก้ไข Circular Dependencies

## วิธีแก้ไขแบบ Manual (แนะนำ)

### ขั้นตอนที่ 1: แก้ไข src/store/store.ts

ค้นหาและแทนที่ทุกจุดที่ใช้ `supabaseStore` และ `syncQueue` โดยตรง:

#### 1.1 ฟังก์ชัน `editDeck` (บรรทัด ~235)
```typescript
// เดิม
if (!isDemo && userId) {
  await supabaseStore.updateDeck(id, { name, color });
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.updateDeck(id, { name, color });
}
```

#### 1.2 ฟังก์ชัน `deleteDeck` (บรรทัด ~255, ~270)
```typescript
// เดิม (บรรทัด ~257)
if (!isDemo && userId) {
  await supabaseStore.deleteDeck(id);
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.deleteDeck(id);
}

// เดิม (บรรทัด ~271)
if (stillPending && !isDemo && userId) {
  await supabaseStore.deleteDeck(id);
  ...
}

// ใหม่
if (stillPending && !isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.deleteDeck(id);
  ...
}
```

#### 1.3 ฟังก์ชัน `addCard` (บรรทัด ~330)
```typescript
// เดิม
if (!isDemo && userId) {
  const supabaseCard = await supabaseStore.createCard(
    userId,
    deckId,
    question,
    answer,
    { interval: 0, repetition: 0, easeFactor: 2.5 }
  );
  ...
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  const supabaseCard = await supabaseStore.createCard(
    userId,
    deckId,
    question,
    answer,
    { interval: 0, repetition: 0, easeFactor: 2.5 }
  );
  ...
}
```

#### 1.4 ฟังก์ชัน `editCard` (บรรทัด ~358)
```typescript
// เดิม
if (!isDemo && userId) {
  await supabaseStore.updateCard(id, { question, answer });
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.updateCard(id, { question, answer });
}
```

#### 1.5 ฟังก์ชัน `deleteCard` (บรรทัด ~375, ~390)
```typescript
// เดิม (บรรทัด ~377)
if (!isDemo && userId) {
  await supabaseStore.deleteCard(id);
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.deleteCard(id);
}

// เดิม (บรรทัด ~390)
if (stillPending && !isDemo && userId) {
  await supabaseStore.deleteCard(id);
  ...
}

// ใหม่
if (stillPending && !isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.deleteCard(id);
  ...
}
```

#### 1.6 ฟังก์ชัน `reviewCard` (บรรทัด ~465-520)
```typescript
// เดิม
if (!isDemo && userId) {
  const updatedCard = get().cards.find((c) => c.id === id);
  const { perfectReviewStreak, userProgress } = get();

  try {
    const promises: Promise<any>[] = [];

    if (!isCramMode && updatedCard) {
      promises.push(
        supabaseStore.updateCard(id, { ... }),
        supabaseStore.logReview(userId, id, quality)
      );
    }

    if (quality === 4) {
      promises.push(
        supabaseStore.updateUserAchievements(userId, { ... })
      );
    } else if (perfectReviewStreak === 0 && quality !== 4) {
      promises.push(
        supabaseStore.updateUserAchievements(userId, { ... })
      );
    }

    promises.push(supabaseStore.updateMaxStreak(userId, userProgress.currentStreak));

    await Promise.all(promises);
  } catch (err) {
    console.warn('[store] Supabase sync failed, queuing for retry:', err);
    if (!isCramMode && !isDemo) {
      const updatedCard2 = get().cards.find((c) => c.id === id);
      if (updatedCard2) {
        await syncQueue.enqueue('REVIEW_CARD', { ... });
      }
    }
  }
}

// ใหม่
if (!isDemo && userId) {
  const updatedCard = get().cards.find((c) => c.id === id);
  const { perfectReviewStreak, userProgress } = get();

  try {
    const { supabaseStore } = await import('./supabaseStore');
    const promises: Promise<any>[] = [];

    if (!isCramMode && updatedCard) {
      promises.push(
        supabaseStore.updateCard(id, {
          interval: updatedCard.interval,
          repetition: updatedCard.repetition,
          easeFactor: updatedCard.easeFactor,
          nextReviewDate: updatedCard.nextReviewDate,
          fsrsState: updatedCard.fsrsState,
        }),
        supabaseStore.logReview(userId, id, quality)
      );
    }

    if (quality === 4) {
      promises.push(
        supabaseStore.updateUserAchievements(userId, {
          perfectReviews: userProgress.perfectReviews,
        })
      );
    } else if (perfectReviewStreak === 0 && quality !== 4) {
      promises.push(
        supabaseStore.updateUserAchievements(userId, {
          perfectReviews: userProgress.perfectReviews,
        })
      );
    }

    promises.push(supabaseStore.updateMaxStreak(userId, userProgress.currentStreak));

    await Promise.all(promises);
  } catch (err) {
    console.warn('[store] Supabase sync failed, queuing for retry:', err);
    if (!isCramMode && !isDemo) {
      const updatedCard2 = get().cards.find((c) => c.id === id);
      if (updatedCard2) {
        const { syncQueue } = await import('./syncQueue');
        await syncQueue.enqueue('REVIEW_CARD', {
          id,
          nextReviewDate: updatedCard2.nextReviewDate,
        });
      }
    }
  }
}
```

#### 1.7 ฟังก์ชัน `updateStreak` (บรรทัด ~570)
```typescript
// เดิม
if (!isDemo && userId) {
  await Promise.all([
    supabaseStore.updateUserStats(userId, newStreak, today),
    supabaseStore.updateUserAchievements(userId, { maxStreak: newMaxStreak }),
  ]);
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await Promise.all([
    supabaseStore.updateUserStats(userId, newStreak, today),
    supabaseStore.updateUserAchievements(userId, { maxStreak: newMaxStreak }),
  ]);
}
```

#### 1.8 ฟังก์ชัน `checkAndUnlockAchievements` (บรรทัด ~615)
```typescript
// เดิม
if (!isDemo && userId) {
  const updatedUnlocked = [...unlockedAchievements, ...unlockedIds];
  await supabaseStore.updateUserAchievements(userId, {
    unlockedAchievements: updatedUnlocked,
  });
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  const updatedUnlocked = [...unlockedAchievements, ...unlockedIds];
  await supabaseStore.updateUserAchievements(userId, {
    unlockedAchievements: updatedUnlocked,
  });
}
```

#### 1.9 ฟังก์ชัน `trackStudyTime` (บรรทัด ~650)
```typescript
// เดิม
if (!isDemo && userId) {
  await supabaseStore.addStudyTime(userId, minutes);
}

// ใหม่
if (!isDemo && userId) {
  const { supabaseStore } = await import('./supabaseStore');
  await supabaseStore.addStudyTime(userId, minutes);
}
```

---

### ขั้นตอนที่ 2: แก้ไข src/store/syncQueue.ts

```typescript
// เดิม (บรรทัดบนสุด)
import { useFlashcardStore } from './store';

// ใหม่ - ลบ import นี้ออก

// เดิม (ใน processQueue method)
const store = useFlashcardStore.getState();
const userId = store.userId;
if (!userId || store.isDemo) return;

// ใหม่
const { useFlashcardStore } = await import('./store');
const store = useFlashcardStore.getState();
const userId = store.userId;
if (!userId || store.isDemo) return;
```

---

### ขั้นตอนที่ 3: แก้ไข src/store/supabaseStore.ts

```typescript
// เดิม (บรรทัดบนสุด)
import type { Deck, Flashcard } from './store';

// ใหม่
import type { Deck, Flashcard } from './types';
```

---

### ขั้นตอนที่ 4: Run Migration SQL

1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. รันไฟล์ `supabase-race-condition-fix.sql`

---

### ขั้นตอนที่ 5: ทดสอบ

```bash
# Build เพื่อตรวจสอบ errors
npm run build

# ถ้าไม่มี error แสดงว่าแก้ไขสำเร็จ
```

---

## วิธีแก้ไขแบบอัตโนมัติ (ใช้ AI)

ให้ AI ช่วยแก้ไขโดยใช้คำสั่ง:

```
ช่วยแก้ไข src/store/store.ts โดยแทนที่ supabaseStore และ syncQueue ทั้งหมดด้วย lazy import ตามคู่มือใน fix-circular-deps.md
```

---

## หมายเหตุ

- ⚠️ การใช้ lazy import จะทำให้ performance ลดลงเล็กน้อย
- ✅ แต่แก้ปัญหา circular dependency ได้อย่างสมบูรณ์
- ✅ Code จะ maintainable ขึ้น
