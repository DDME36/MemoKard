-- ============================================
-- Username Support — รันใน Supabase SQL Editor
-- ============================================

-- Profiles table เก็บ username
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index สำหรับ lookup username → email
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ทุกคนดู username ได้ (สำหรับ login lookup)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- เฉพาะเจ้าของแก้ได้
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function: lookup email จาก username (ใช้ SECURITY DEFINER เพื่อเข้าถึง auth.users)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE LOWER(p.username) = LOWER(p_username)
  LIMIT 1;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- อัปเดต handle_new_user ให้รับ username จาก metadata ด้วย
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- สร้าง user_stats
  INSERT INTO public.user_stats (user_id, streak, total_reviews)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- สร้าง profile ถ้ามี username ใน metadata
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
