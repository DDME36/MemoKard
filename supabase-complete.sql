-- ============================================
-- MemoKard - Complete Supabase Database Schema
-- Version: 2.1.0
-- ============================================
-- รันไฟล์นี้ใน Supabase SQL Editor เพื่อสร้าง database ทั้งหมด
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Decks Table
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'violet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cards Table
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- FSRS Algorithm fields
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  repetition INTEGER NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Stats Table
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_review_date DATE,
  streak INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review Logs Table (for analytics)
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles Table (for username support)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMMUNITY SHARING TABLES
-- ============================================

-- Public Decks Table
CREATE TABLE IF NOT EXISTS public.public_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'violet',
  category TEXT NOT NULL CHECK (category IN ('ภาษา', 'วิทยาศาสตร์', 'คณิตศาสตร์', 'ประวัติศาสตร์', 'ทั่วไป', 'อื่นๆ')),
  tags TEXT[] DEFAULT '{}',
  import_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public Deck Cards Table
CREATE TABLE IF NOT EXISTS public.public_deck_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deck Ratings Table
CREATE TABLE IF NOT EXISTS public.deck_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(public_deck_id, user_id)
);

-- Deck Reports Table
CREATE TABLE IF NOT EXISTS public.deck_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'copyright', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(public_deck_id, reporter_id)
);

-- Deck Imports Table
CREATE TABLE IF NOT EXISTS public.deck_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_deck_id UUID NOT NULL REFERENCES public.public_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  is_synced BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Core tables indexes
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON public.cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON public.cards(next_review);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_id ON public.review_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON public.review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON public.review_logs(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Community sharing indexes
CREATE INDEX IF NOT EXISTS idx_public_decks_creator_id ON public.public_decks(creator_id);
CREATE INDEX IF NOT EXISTS idx_public_decks_category ON public.public_decks(category);
CREATE INDEX IF NOT EXISTS idx_public_decks_is_active ON public.public_decks(is_active);
CREATE INDEX IF NOT EXISTS idx_public_decks_import_count ON public.public_decks(import_count DESC);
CREATE INDEX IF NOT EXISTS idx_public_decks_created_at ON public.public_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_deck_cards_public_deck_id ON public.public_deck_cards(public_deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_ratings_public_deck_id ON public.deck_ratings(public_deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_ratings_user_id ON public.deck_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_deck_reports_public_deck_id ON public.deck_reports(public_deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_imports_public_deck_id ON public.deck_imports(public_deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_imports_user_id ON public.deck_imports(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_deck_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_imports ENABLE ROW LEVEL SECURITY;

-- Core tables policies
CREATE POLICY "Users can view their own decks" ON public.decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own decks" ON public.decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own decks" ON public.decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own decks" ON public.decks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own cards" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cards" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cards" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cards" ON public.cards FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own review logs" ON public.review_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own review logs" ON public.review_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Community sharing policies
CREATE POLICY "Anyone can view active public decks" ON public.public_decks FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can view their own inactive decks" ON public.public_decks FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "Authenticated users can create public decks" ON public.public_decks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own public decks" ON public.public_decks FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own public decks" ON public.public_decks FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view cards from active public decks" ON public.public_deck_cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.public_decks WHERE id = public_deck_cards.public_deck_id AND is_active = true));
CREATE POLICY "Creators can view cards from their own decks" ON public.public_deck_cards FOR SELECT USING (EXISTS (SELECT 1 FROM public.public_decks WHERE id = public_deck_cards.public_deck_id AND creator_id = auth.uid()));
CREATE POLICY "Authenticated users can insert cards to public decks" ON public.public_deck_cards FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.public_decks WHERE id = public_deck_cards.public_deck_id AND creator_id = auth.uid()));
CREATE POLICY "Creators can update cards in their own decks" ON public.public_deck_cards FOR UPDATE USING (EXISTS (SELECT 1 FROM public.public_decks WHERE id = public_deck_cards.public_deck_id AND creator_id = auth.uid()));
CREATE POLICY "Creators can delete cards from their own decks" ON public.public_deck_cards FOR DELETE USING (EXISTS (SELECT 1 FROM public.public_decks WHERE id = public_deck_cards.public_deck_id AND creator_id = auth.uid()));

CREATE POLICY "Anyone can view ratings" ON public.deck_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their own ratings" ON public.deck_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON public.deck_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings" ON public.deck_ratings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" ON public.deck_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Authenticated users can insert their own reports" ON public.deck_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own imports" ON public.deck_imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert their own imports" ON public.deck_imports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON public.decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_public_decks_updated_at BEFORE UPDATE ON public.public_decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deck_ratings_updated_at BEFORE UPDATE ON public.deck_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize user stats and profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.user_stats (user_id, streak, total_reviews) VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    INSERT INTO public.profiles (id, username) VALUES (NEW.id, NEW.raw_user_meta_data->>'username') ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Lookup email by username
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT) RETURNS TEXT AS $
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email FROM public.profiles p JOIN auth.users au ON au.id = p.id WHERE LOWER(p.username) = LOWER(p_username) LIMIT 1;
  RETURN v_email;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment import count
CREATE OR REPLACE FUNCTION increment_import_count() RETURNS TRIGGER AS $
BEGIN
  UPDATE public.public_decks SET import_count = import_count + 1 WHERE id = NEW.public_deck_id;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_deck_imported AFTER INSERT ON public.deck_imports FOR EACH ROW EXECUTE FUNCTION increment_import_count();

-- Auto-hide deck after 5 reports
CREATE OR REPLACE FUNCTION check_report_threshold() RETURNS TRIGGER AS $
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count FROM public.deck_reports WHERE public_deck_id = NEW.public_deck_id;
  IF report_count >= 5 THEN
    UPDATE public.public_decks SET is_active = false WHERE id = NEW.public_deck_id;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_deck_reported AFTER INSERT ON public.deck_reports FOR EACH ROW EXECUTE FUNCTION check_report_threshold();

-- ============================================
-- VIEWS
-- ============================================

-- Public decks with stats
CREATE OR REPLACE VIEW public.public_decks_with_stats AS
SELECT 
  pd.*,
  COALESCE(AVG(dr.rating), 0)::NUMERIC(3,1) as avg_rating,
  COUNT(DISTINCT dr.id) as rating_count,
  COUNT(DISTINCT pdc.id) as card_count,
  u.raw_user_meta_data->>'username' as creator_username
FROM public.public_decks pd
LEFT JOIN public.deck_ratings dr ON pd.id = dr.public_deck_id
LEFT JOIN public.public_deck_cards pdc ON pd.id = pdc.public_deck_id
LEFT JOIN auth.users u ON pd.creator_id = u.id
WHERE pd.is_active = true
GROUP BY pd.id, u.raw_user_meta_data;

-- Synced decks view
CREATE OR REPLACE VIEW synced_decks AS
SELECT 
  di.id as subscription_id,
  di.user_id,
  di.public_deck_id,
  di.imported_deck_id,
  di.is_synced,
  di.created_at as subscribed_at,
  pd.name,
  pd.description,
  pd.color,
  pd.category,
  pd.tags,
  pd.creator_id,
  pd.creator_username,
  pd.import_count,
  pd.card_count,
  pd.avg_rating,
  pd.rating_count,
  pd.is_active,
  pd.created_at as deck_created_at,
  pd.updated_at as deck_updated_at
FROM deck_imports di
JOIN public_decks_with_stats pd ON di.public_deck_id = pd.id
WHERE di.is_synced = true AND pd.is_active = true;

-- ============================================
-- STORAGE (for card images)
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own images" ON storage.objects FOR SELECT USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.decks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_decks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_ratings;

-- ============================================
-- ADMIN POLICIES (Optional)
-- แทนที่ 'YOUR_ADMIN_USER_ID' ด้วย user ID ของคุณ
-- ============================================

-- CREATE POLICY "Admin can delete any public deck" ON public_decks FOR DELETE TO authenticated USING (auth.uid()::text = 'YOUR_ADMIN_USER_ID');
-- CREATE POLICY "Admin can update any public deck" ON public_decks FOR UPDATE TO authenticated USING (auth.uid()::text = 'YOUR_ADMIN_USER_ID') WITH CHECK (auth.uid()::text = 'YOUR_ADMIN_USER_ID');
-- CREATE POLICY "Admin can delete any deck report" ON deck_reports FOR DELETE TO authenticated USING (auth.uid()::text = 'YOUR_ADMIN_USER_ID');

-- ============================================
-- COMPLETE! 🎉
-- ============================================
