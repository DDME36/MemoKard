-- ============================================
-- MemoKard - Achievements System Migration
-- Version: 1.0.0
-- ============================================
-- เพิ่ม achievements tracking ให้กับระบบ
-- ============================================

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Achievement Progress
  unlocked_achievements TEXT[] DEFAULT '{}',
  
  -- Stats for Achievement Calculation
  perfect_reviews INTEGER NOT NULL DEFAULT 0,
  total_study_time INTEGER NOT NULL DEFAULT 0, -- in minutes
  decks_shared INTEGER NOT NULL DEFAULT 0,
  decks_imported INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements USING GIN(unlocked_achievements);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" 
  ON public.user_achievements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
  ON public.user_achievements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" 
  ON public.user_achievements FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_user_achievements_updated_at 
  BEFORE UPDATE ON public.user_achievements 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize user achievements on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_achievements() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_achievements (
    user_id, 
    perfect_reviews, 
    total_study_time, 
    decks_shared, 
    decks_imported,
    max_streak
  ) VALUES (
    NEW.id, 
    0, 
    0, 
    0, 
    0,
    0
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_achievements 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_achievements();

-- Auto-increment decks_shared when sharing a deck
CREATE OR REPLACE FUNCTION increment_decks_shared() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_achievements (user_id, decks_shared)
  VALUES (NEW.creator_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    decks_shared = user_achievements.decks_shared + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_public_deck_created 
  AFTER INSERT ON public.public_decks 
  FOR EACH ROW 
  EXECUTE FUNCTION increment_decks_shared();

-- Auto-increment decks_imported when importing a deck
CREATE OR REPLACE FUNCTION increment_decks_imported() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_achievements (user_id, decks_imported)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    decks_imported = user_achievements.decks_imported + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deck_imported_achievements 
  AFTER INSERT ON public.deck_imports 
  FOR EACH ROW 
  EXECUTE FUNCTION increment_decks_imported();

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;

-- ============================================
-- MIGRATION FOR EXISTING USERS
-- ============================================

-- สร้าง achievements record สำหรับ users ที่มีอยู่แล้ว
INSERT INTO public.user_achievements (user_id, perfect_reviews, total_study_time, decks_shared, decks_imported, max_streak)
SELECT 
  id,
  0,
  0,
  COALESCE((SELECT COUNT(*) FROM public.public_decks WHERE creator_id = auth.users.id), 0),
  COALESCE((SELECT COUNT(*) FROM public.deck_imports WHERE user_id = auth.users.id), 0),
  COALESCE((SELECT streak FROM public.user_stats WHERE user_id = auth.users.id), 0)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- COMPLETE! 🎉
-- ============================================
-- ขั้นตอนต่อไป:
-- 1. รันไฟล์นี้ใน Supabase SQL Editor
-- 2. อัปเดต TypeScript types
-- 3. อัปเดต supabaseStore.ts เพื่อ sync achievements
-- ============================================
