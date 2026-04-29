# 🏆 Achievements System Setup Guide

## ภาพรวม

ระบบ Achievements ใน MemoKard ติดตามความก้าวหน้าของผู้ใช้และปลดล็อค achievements ตามเงื่อนไขต่างๆ ข้อมูลจะถูกเก็บทั้งใน **localStorage** (สำหรับ demo mode) และ **Supabase** (สำหรับ authenticated users)

## 📊 ข้อมูลที่ Track

### 1. **Unlocked Achievements** (`unlocked_achievements`)
- รายการ achievement IDs ที่ปลดล็อคแล้ว
- เก็บเป็น array: `['first_card', 'first_deck', 'streak_7']`

### 2. **Perfect Reviews** (`perfect_reviews`)
- จำนวนการทบทวนที่ได้คะแนนเต็ม (quality = 4) ติดต่อกัน
- Auto-increment เมื่อทบทวนได้คะแนนเต็ม
- Reset เป็น 0 เมื่อได้คะแนนไม่เต็ม

### 3. **Total Study Time** (`total_study_time`)
- เวลาเรียนรวมทั้งหมด (หน่วย: นาที)
- Track ผ่าน `trackStudyTime(minutes)` function

### 4. **Decks Shared** (`decks_shared`)
- จำนวนชุดการ์ดที่แชร์สู่ชุมชน
- **Auto-increment** ผ่าน database trigger เมื่อสร้าง public deck

### 5. **Decks Imported** (`decks_imported`)
- จำนวนชุดการ์ดที่ import จากชุมชน
- **Auto-increment** ผ่าน database trigger เมื่อ import deck

### 6. **Max Streak** (`max_streak`)
- Streak สูงสุดที่เคยทำได้
- Auto-update เมื่อ current streak สูงกว่า

## 🚀 การติดตั้ง

### ขั้นตอนที่ 1: รัน SQL Migration

1. เปิด **Supabase Dashboard** → **SQL Editor**
2. รันไฟล์ `supabase-achievements-migration.sql`
3. ตรวจสอบว่าตาราง `user_achievements` ถูกสร้างสำเร็จ

```sql
-- ตรวจสอบตาราง
SELECT * FROM public.user_achievements LIMIT 5;
```

### ขั้นตอนที่ 2: Verify Triggers

ตรวจสอบว่า triggers ทำงานถูกต้อง:

```sql
-- ตรวจสอบ trigger สำหรับ new users
SELECT * FROM pg_trigger WHERE tgname LIKE '%achievement%';

-- ตรวจสอบ trigger สำหรับ deck sharing
SELECT * FROM pg_trigger WHERE tgname = 'on_public_deck_created';

-- ตรวจสอบ trigger สำหรับ deck importing
SELECT * FROM pg_trigger WHERE tgname = 'on_deck_imported_achievements';
```

### ขั้นตอนที่ 3: Test การทำงาน

1. **สร้าง user ใหม่** → ตรวจสอบว่า `user_achievements` record ถูกสร้างอัตโนมัติ
2. **แชร์ deck** → ตรวจสอบว่า `decks_shared` เพิ่มขึ้น
3. **Import deck** → ตรวจสอบว่า `decks_imported` เพิ่มขึ้น
4. **ทบทวนการ์ด** → ตรวจสอบว่า `perfect_reviews` อัปเดต

## 📝 Achievement List

### Common (ธรรมดา)
- `first_card` - สร้างการ์ดแรก
- `first_deck` - สร้างชุดการ์ดแรก
- `first_review` - ทบทวนการ์ดครั้งแรก

### Rare (หายาก)
- `streak_7` - ทบทวน 7 วันติดต่อกัน
- `cards_100` - สร้าง 100 การ์ด
- `reviews_50` - ทบทวน 50 การ์ดในวันเดียว
- `perfect_10` - ทบทวนได้คะแนนเต็ม 10 การ์ดติดต่อกัน

### Epic (มหากาพย์)
- `streak_30` - ทบทวน 30 วันติดต่อกัน
- `cards_500` - สร้าง 500 การ์ด
- `study_time_10h` - ทบทวนรวม 10 ชั่วโมง
- `share_first` - แชร์ชุดการ์ดแรกสู่ชุมชน

### Legendary (ตำนาน)
- `streak_100` - ทบทวน 100 วันติดต่อกัน
- `reviews_10000` - ทบทวนครบ 10,000 การ์ด
- `cards_1000` - สร้าง 1,000 การ์ด
- `perfect_100` - ทบทวนได้คะแนนเต็ม 100 การ์ดติดต่อกัน

## 🔄 Data Flow

### 1. Local State (Zustand Store)
```typescript
{
  unlockedAchievements: string[],
  perfectReviewStreak: number,
  totalStudyTime: number,
  userProgress: {
    perfectReviews: number,
    totalStudyTime: number,
    decksShared: number,
    decksImported: number,
    maxStreak: number,
  }
}
```

### 2. Supabase Sync
- **On Login**: `syncFromSupabase()` ดึงข้อมูลจาก Supabase
- **On Action**: Auto-sync เมื่อมีการเปลี่ยนแปลง
  - Unlock achievement → `updateUserAchievements()`
  - Perfect review → `updateUserAchievements()`
  - Study time → `addStudyTime()`
  - Max streak → `updateMaxStreak()`

### 3. Database Triggers (Auto)
- **Share deck** → `increment_decks_shared()`
- **Import deck** → `increment_decks_imported()`
- **New user** → `handle_new_user_achievements()`

## 🛠️ API Functions

### Store Actions
```typescript
// Check and unlock achievements
checkAndUnlockAchievements(): Promise<void>

// Track study time
trackStudyTime(minutes: number): Promise<void>

// Pop achievement from queue (for toast display)
popAchievement(): Achievement | null
```

### Supabase Functions
```typescript
// Fetch user achievements
fetchUserAchievements(userId: string): Promise<UserAchievements>

// Update achievements
updateUserAchievements(userId: string, updates: Partial<UserAchievements>): Promise<boolean>

// Unlock specific achievement
unlockAchievement(userId: string, achievementId: string): Promise<boolean>

// Increment perfect reviews
incrementPerfectReviews(userId: string): Promise<boolean>

// Add study time
addStudyTime(userId: string, minutes: number): Promise<boolean>

// Update max streak
updateMaxStreak(userId: string, streak: number): Promise<boolean>
```

## 🔐 Security (RLS Policies)

```sql
-- Users can only view/update their own achievements
CREATE POLICY "Users can view their own achievements" 
  ON user_achievements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" 
  ON user_achievements FOR UPDATE 
  USING (auth.uid() = user_id);
```

## 📱 Demo Mode

ใน demo mode:
- ข้อมูลเก็บใน localStorage เท่านั้น
- ไม่มี Supabase sync
- Achievements ยังคงทำงานปกติ
- ข้อมูลจะหายเมื่อ clear browser data

## 🐛 Troubleshooting

### Achievement ไม่ปลดล็อค
1. ตรวจสอบ `userProgress` ใน store
2. ตรวจสอบ `checkAchievements()` logic
3. ดู console logs สำหรับ errors

### Supabase Sync ไม่ทำงาน
1. ตรวจสอบ `isSupabaseConfigured()`
2. ตรวจสอบ RLS policies
3. ตรวจสอบ user authentication

### Triggers ไม่ทำงาน
1. ตรวจสอบว่า trigger ถูกสร้างแล้ว
2. ตรวจสอบ function definitions
3. ดู Supabase logs

## 📊 Monitoring

### Query สำหรับ Analytics

```sql
-- Top achievers
SELECT 
  u.email,
  ua.unlocked_achievements,
  array_length(ua.unlocked_achievements, 1) as achievement_count,
  ua.max_streak,
  ua.total_study_time
FROM user_achievements ua
JOIN auth.users u ON u.id = ua.user_id
ORDER BY achievement_count DESC
LIMIT 10;

-- Achievement distribution
SELECT 
  unnest(unlocked_achievements) as achievement_id,
  COUNT(*) as unlock_count
FROM user_achievements
GROUP BY achievement_id
ORDER BY unlock_count DESC;

-- Study time leaderboard
SELECT 
  u.email,
  ua.total_study_time,
  ua.max_streak
FROM user_achievements ua
JOIN auth.users u ON u.id = ua.user_id
ORDER BY ua.total_study_time DESC
LIMIT 10;
```

## ✅ Checklist

- [ ] รัน SQL migration สำเร็จ
- [ ] Triggers ทำงานถูกต้อง
- [ ] RLS policies ถูกต้อง
- [ ] Test achievement unlock
- [ ] Test Supabase sync
- [ ] Test demo mode
- [ ] Verify data persistence

## 🎉 เสร็จสมบูรณ์!

ระบบ achievements พร้อมใช้งานแล้ว! ผู้ใช้จะได้รับ achievement toast เมื่อปลดล็อคสำเร็จ และข้อมูลจะถูก sync ข้ามอุปกรณ์อัตโนมัติ
