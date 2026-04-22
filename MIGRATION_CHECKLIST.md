# 📋 Migration Checklist - Community Deck Sharing

Use this checklist to ensure a smooth deployment of the Community Deck Sharing feature.

## Pre-Migration

- [ ] Backup your current database
- [ ] Review the migration SQL file: `supabase-community-sharing.sql`
- [ ] Ensure you have admin access to Supabase
- [ ] Verify `.env` file has correct Supabase credentials
- [ ] Install dependencies: `npm install`

## Database Migration

- [ ] Open Supabase SQL Editor
- [ ] Copy entire content of `supabase-community-sharing.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" button
- [ ] Verify success message (no errors)
- [ ] Check all 5 tables were created:
  - [ ] `public_decks`
  - [ ] `public_deck_cards`
  - [ ] `deck_ratings`
  - [ ] `deck_reports`
  - [ ] `deck_imports`
- [ ] Check view was created:
  - [ ] `public_decks_with_stats`

## Verification

- [ ] Run test script: `npm run migration:test`
- [ ] All 5 tests passed
- [ ] No error messages in console

## Testing

### Test 1: Share a Deck
- [ ] Login to the app
- [ ] Create a deck with at least 1 card
- [ ] Click "แชร์" button
- [ ] Fill in description (optional)
- [ ] Select category
- [ ] Add tags (optional)
- [ ] Click "แชร์เลย"
- [ ] Verify success message
- [ ] Verify stats panel appears
- [ ] Verify share link is displayed

### Test 2: Explore Page
- [ ] Click "สำรวจ" button in header
- [ ] Verify deck appears in list
- [ ] Test search functionality
- [ ] Test category filter
- [ ] Test sort options (popularity, rating, newest)
- [ ] Verify deck card shows correct info:
  - [ ] Name
  - [ ] Creator username
  - [ ] Category badge
  - [ ] Description (truncated)
  - [ ] Tags
  - [ ] Import count
  - [ ] Card count
  - [ ] Rating

### Test 3: Import a Deck
- [ ] Click on a public deck in explore page
- [ ] Verify preview modal opens
- [ ] Verify all deck info is displayed
- [ ] Click "Import ชุดการ์ด"
- [ ] Verify success message
- [ ] Verify deck is copied to your account
- [ ] Verify import count incremented
- [ ] Verify navigated to imported deck

### Test 4: Rate a Deck
- [ ] Import a deck first (if not already)
- [ ] Open the public deck preview again
- [ ] Verify rating stars are clickable
- [ ] Click on a star (1-5)
- [ ] Verify rating is saved
- [ ] Refresh page
- [ ] Verify rating persists
- [ ] Change rating
- [ ] Verify rating updates (not creates new)

### Test 5: Report a Deck
- [ ] Open a public deck preview
- [ ] Click "รายงาน" button
- [ ] Select a reason
- [ ] Add details (optional)
- [ ] Click "ส่งรายงาน"
- [ ] Verify success message
- [ ] Verify button changes to "รายงานแล้ว"
- [ ] Try reporting again
- [ ] Verify cannot report twice

### Test 6: Deck Statistics
- [ ] Open a shared deck in DeckDetail
- [ ] Verify stats panel is displayed
- [ ] Verify shows:
  - [ ] Import count
  - [ ] Average rating
  - [ ] Rating count
  - [ ] Share link
  - [ ] Copy button
  - [ ] Share button
  - [ ] Update button
  - [ ] Unshare button

### Test 7: Copy Share Link
- [ ] Click "คัดลอก" button
- [ ] Verify toast notification appears
- [ ] Paste link in new tab
- [ ] Verify link works
- [ ] Click "แชร์ผ่าน" button (if supported)
- [ ] Verify native share dialog opens

### Test 8: Update Public Deck
- [ ] Add a new card to shared deck
- [ ] Click "อัปเดต" button in stats panel
- [ ] Verify success message
- [ ] Open public deck preview
- [ ] Verify new card appears

### Test 9: Unshare Deck
- [ ] Click "ยกเลิกการแชร์" button
- [ ] Verify confirmation modal
- [ ] Click confirm
- [ ] Verify success message
- [ ] Verify stats panel disappears
- [ ] Go to explore page
- [ ] Verify deck is hidden
- [ ] Open share link directly
- [ ] Verify shows "ยกเลิกการแชร์แล้ว" message

### Test 10: Demo Mode Restrictions
- [ ] Logout (or use demo mode)
- [ ] Go to explore page
- [ ] Verify can browse decks
- [ ] Click on a deck
- [ ] Try to import
- [ ] Verify shows "ต้องเข้าสู่ระบบ" message
- [ ] Try to rate
- [ ] Verify rating interface not shown
- [ ] Try to report
- [ ] Verify report button not shown

### Test 11: Auto-Hide After 5 Reports
- [ ] Create 5 different user accounts
- [ ] Report the same deck from each account
- [ ] After 5th report, verify deck is hidden
- [ ] Go to explore page
- [ ] Verify deck no longer appears
- [ ] Open share link directly
- [ ] Verify deck still accessible but marked inactive

### Test 12: Search and Filters
- [ ] Test search by deck name
- [ ] Test search by description
- [ ] Test search by tags
- [ ] Test category filter
- [ ] Test sort by popularity
- [ ] Test sort by rating
- [ ] Test sort by newest
- [ ] Test pagination (if >50 decks)

## Performance Testing

- [ ] Test with 100+ public decks
- [ ] Verify pagination works smoothly
- [ ] Verify search is fast (<1s)
- [ ] Verify no memory leaks
- [ ] Test on mobile device
- [ ] Test on slow network

## Security Testing

- [ ] Verify demo users cannot share
- [ ] Verify demo users cannot import
- [ ] Verify demo users cannot rate
- [ ] Verify demo users cannot report
- [ ] Verify users can only update their own decks
- [ ] Verify users can only delete their own decks
- [ ] Verify RLS policies are working

## Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Post-Migration

- [ ] Monitor database performance
- [ ] Check for any errors in logs
- [ ] Monitor user feedback
- [ ] Update documentation if needed
- [ ] Announce new feature to users

## Rollback Plan (If Needed)

If something goes wrong:

1. **Disable feature in UI:**
   ```typescript
   // In App.tsx, comment out explore routes
   ```

2. **Drop tables (CAREFUL!):**
   ```sql
   DROP TABLE IF EXISTS public.deck_imports CASCADE;
   DROP TABLE IF EXISTS public.deck_reports CASCADE;
   DROP TABLE IF EXISTS public.deck_ratings CASCADE;
   DROP TABLE IF EXISTS public.public_deck_cards CASCADE;
   DROP TABLE IF EXISTS public.public_decks CASCADE;
   DROP VIEW IF EXISTS public.public_decks_with_stats;
   ```

3. **Restore from backup**

## Success Criteria

- [ ] All tests passed
- [ ] No errors in console
- [ ] No errors in Supabase logs
- [ ] Users can share decks
- [ ] Users can import decks
- [ ] Users can rate decks
- [ ] Users can report decks
- [ ] Auto-hide works after 5 reports
- [ ] Performance is acceptable
- [ ] Mobile experience is smooth

## Notes

- Migration is **non-destructive** (doesn't modify existing tables)
- Can be rolled back safely
- No downtime required
- Existing data is not affected

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Date:** _______________

**Performed By:** _______________

**Issues Encountered:** _______________

**Resolution:** _______________
