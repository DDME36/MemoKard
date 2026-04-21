-- ============================================
-- Community Deck Sharing & Marketplace Schema
-- ============================================

-- ============================================
-- NEW TABLES
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

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
ALTER TABLE public.public_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_deck_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_imports ENABLE ROW LEVEL SECURITY;

-- Public Decks Policies
CREATE POLICY "Anyone can view active public decks"
  ON public.public_decks FOR SELECT
  USING (is_active = true);

CREATE POLICY "Creators can view their own inactive decks"
  ON public.public_decks FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Authenticated users can create public decks"
  ON public.public_decks FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own public decks"
  ON public.public_decks FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own public decks"
  ON public.public_decks FOR DELETE
  USING (auth.uid() = creator_id);

-- Public Deck Cards Policies
CREATE POLICY "Anyone can view cards from active public decks"
  ON public.public_deck_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.public_decks
      WHERE id = public_deck_cards.public_deck_id
      AND is_active = true
    )
  );

CREATE POLICY "Creators can view cards from their own decks"
  ON public.public_deck_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.public_decks
      WHERE id = public_deck_cards.public_deck_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert cards to public decks"
  ON public.public_deck_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.public_decks
      WHERE id = public_deck_cards.public_deck_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update cards in their own decks"
  ON public.public_deck_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.public_decks
      WHERE id = public_deck_cards.public_deck_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete cards from their own decks"
  ON public.public_deck_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.public_decks
      WHERE id = public_deck_cards.public_deck_id
      AND creator_id = auth.uid()
    )
  );

-- Deck Ratings Policies
CREATE POLICY "Anyone can view ratings"
  ON public.deck_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own ratings"
  ON public.deck_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.deck_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.deck_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Deck Reports Policies
CREATE POLICY "Users can view their own reports"
  ON public.deck_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Authenticated users can insert their own reports"
  ON public.deck_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Deck Imports Policies
CREATE POLICY "Users can view their own imports"
  ON public.deck_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own imports"
  ON public.deck_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp for public_decks
CREATE OR REPLACE FUNCTION update_public_decks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_public_decks_updated_at
  BEFORE UPDATE ON public.public_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_public_decks_updated_at();

-- Function to update updated_at timestamp for deck_ratings
CREATE OR REPLACE FUNCTION update_deck_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deck_ratings_updated_at
  BEFORE UPDATE ON public.deck_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_deck_ratings_updated_at();

-- Function to increment import_count when a deck is imported
CREATE OR REPLACE FUNCTION increment_import_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.public_decks
  SET import_count = import_count + 1
  WHERE id = NEW.public_deck_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deck_imported
  AFTER INSERT ON public.deck_imports
  FOR EACH ROW
  EXECUTE FUNCTION increment_import_count();

-- Function to auto-hide deck after 5 reports
CREATE OR REPLACE FUNCTION check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.deck_reports
  WHERE public_deck_id = NEW.public_deck_id;

  IF report_count >= 5 THEN
    UPDATE public.public_decks
    SET is_active = false
    WHERE id = NEW.public_deck_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deck_reported
  AFTER INSERT ON public.deck_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_threshold();

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_decks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_ratings;

-- ============================================
-- VIEWS (for easier querying)
-- ============================================

-- View for public decks with stats
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

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data
-- INSERT INTO public.public_decks (creator_id, name, description, color, category, tags) VALUES
--   (auth.uid(), 'ภาษาอังกฤษพื้นฐาน', 'คำศัพท์ภาษาอังกฤษสำหรับผู้เริ่มต้น', 'violet', 'ภาษา', ARRAY['english', 'beginner']),
--   (auth.uid(), 'สูตรคณิตศาสตร์', 'สูตรคณิตศาสตร์ที่ใช้บ่อย', 'sky', 'คณิตศาสตร์', ARRAY['math', 'formula']);

