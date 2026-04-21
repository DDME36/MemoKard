-- ============================================
-- Sync Model Migration
-- เปลี่ยนจาก Copy Model เป็น Sync Model
-- ============================================

-- 1. เพิ่ม columns ใน deck_imports table
ALTER TABLE deck_imports 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. สร้าง view สำหรับ synced decks
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

-- 3. สร้าง function สำหรับดึงการ์ดของ synced deck
CREATE OR REPLACE FUNCTION get_synced_deck_cards(p_public_deck_id TEXT)
RETURNS TABLE (
  id TEXT,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pdc.id::TEXT,
    pdc.question,
    pdc.answer,
    pdc.created_at
  FROM public_deck_cards pdc
  WHERE pdc.public_deck_id = p_public_deck_id
  ORDER BY pdc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. สร้าง function สำหรับเช็คว่า deck เป็น synced deck หรือไม่
CREATE OR REPLACE FUNCTION is_synced_deck(p_deck_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_synced BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM deck_imports 
    WHERE imported_deck_id = p_deck_id 
      AND user_id = p_user_id 
      AND is_synced = true
  ) INTO v_is_synced;
  
  RETURN v_is_synced;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. สร้าง function สำหรับ unsubscribe
CREATE OR REPLACE FUNCTION unsubscribe_deck(p_subscription_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE deck_imports
  SET is_synced = false
  WHERE id = p_subscription_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comment สำหรับอธิบาย
COMMENT ON VIEW synced_decks IS 'View สำหรับดู synced decks ของ user พร้อมข้อมูลจาก public_decks';
COMMENT ON FUNCTION get_synced_deck_cards IS 'ดึงการ์ดจาก public_deck_cards โดยตรง (ไม่ copy)';
COMMENT ON FUNCTION is_synced_deck IS 'เช็คว่า deck เป็น synced deck หรือไม่';
COMMENT ON FUNCTION unsubscribe_deck IS 'ยกเลิก subscription (unsubscribe)';
