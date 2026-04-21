-- ============================================
-- Admin RLS Policies
-- รัน SQL นี้ใน Supabase Dashboard > SQL Editor
-- แทนที่ 'YOUR_ADMIN_USER_ID' ด้วย user ID จริงของคุณ
-- ============================================

-- ดู user ID ของคุณได้จาก:
-- Supabase Dashboard > Authentication > Users > คัดลอก UUID

-- 1. Admin ลบ public_decks ได้
CREATE POLICY "Admin can delete any public deck"
ON public_decks FOR DELETE
TO authenticated
USING (auth.uid()::text = 'efd2b991-d769-4dcb-b4c5-017d2f4629a8');

-- 2. Admin อัปเดต public_decks ได้ (ซ่อน/คืนสถานะ)
CREATE POLICY "Admin can update any public deck"
ON public_decks FOR UPDATE
TO authenticated
USING (auth.uid()::text = 'efd2b991-d769-4dcb-b4c5-017d2f4629a8')
WITH CHECK (auth.uid()::text = 'efd2b991-d769-4dcb-b4c5-017d2f4629a8');

-- 3. Admin ลบ deck_reports ได้ (ยกเลิกรายงาน)
CREATE POLICY "Admin can delete any deck report"
ON deck_reports FOR DELETE
TO authenticated
USING (auth.uid()::text = 'efd2b991-d769-4dcb-b4c5-017d2f4629a8');

-- ตรวจสอบว่า policies ถูกสร้างแล้ว
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('public_decks', 'deck_reports')
ORDER BY tablename, policyname;
