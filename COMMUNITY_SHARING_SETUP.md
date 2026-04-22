# Community Deck Sharing & Marketplace - Setup Guide

## 📋 Overview

This guide will help you set up the Community Deck Sharing & Marketplace feature for MemoKard.

## 🗄️ Database Setup

### Step 1: Run the Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# File: supabase-community-sharing.sql
```

This will create:
- `public_decks` - Public shared decks
- `public_deck_cards` - Cards in public decks
- `deck_ratings` - User ratings (1-5 stars)
- `deck_reports` - Content moderation reports
- `deck_imports` - Track which users imported which decks

### Step 2: Verify Tables

Check that all tables were created successfully:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%deck%';
```

You should see:
- `decks` (existing)
- `public_decks` (new)
- `public_deck_cards` (new)
- `deck_ratings` (new)
- `deck_reports` (new)
- `deck_imports` (new)

### Step 3: Verify RLS Policies

Check that Row Level Security policies are enabled:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('public_decks', 'public_deck_cards', 'deck_ratings', 'deck_reports', 'deck_imports');
```

### Step 4: Test the View

Verify the `public_decks_with_stats` view:

```sql
SELECT * FROM public_decks_with_stats LIMIT 5;
```

## 🧪 Testing

### Test 1: Share a Deck

1. Login to the app
2. Create a deck with at least 1 card
3. Click "แชร์" button
4. Fill in description, category, and tags
5. Click "แชร์เลย"
6. Verify the deck appears in the "สำรวจ" page

### Test 2: Import a Deck

1. Go to "สำรวจ" page
2. Click on a public deck
3. Click "Import ชุดการ์ด"
4. Verify the deck is copied to your account
5. Verify import count increments

### Test 3: Rate a Deck

1. Import a public deck
2. Open the public deck preview
3. Click on stars to rate (1-5)
4. Verify rating is saved
5. Verify average rating updates

### Test 4: Report a Deck

1. Open a public deck preview
2. Click "รายงาน" button
3. Select reason and submit
4. Verify report is recorded
5. Create 4 more reports from different accounts
6. Verify deck is auto-hidden after 5 reports

### Test 5: Unshare a Deck

1. Open a shared deck in DeckDetail
2. Click "ยกเลิกการแชร์"
3. Confirm the action
4. Verify deck is hidden from explore page
5. Verify share link still works but shows "ยกเลิกการแชร์แล้ว"

## 🔧 Troubleshooting

### Issue: "Permission denied" errors

**Solution:** Check RLS policies are correctly set up:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%deck%';

-- All should show rowsecurity = true
```

### Issue: View returns no data

**Solution:** Check if username is set in user metadata:

```sql
SELECT id, raw_user_meta_data->>'username' as username 
FROM auth.users 
LIMIT 5;
```

If usernames are missing, run the username setup:

```bash
# File: supabase-username.sql
```

### Issue: Import count not incrementing

**Solution:** Check if trigger is working:

```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_deck_imported';
```

### Issue: Auto-hide not working after 5 reports

**Solution:** Check if trigger is working:

```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_deck_reported';
```

## 📊 Monitoring

### Check Public Decks Stats

```sql
SELECT 
  COUNT(*) as total_decks,
  COUNT(*) FILTER (WHERE is_active = true) as active_decks,
  SUM(import_count) as total_imports,
  AVG(import_count) as avg_imports_per_deck
FROM public_decks;
```

### Check Most Popular Decks

```sql
SELECT 
  name,
  creator_username,
  import_count,
  avg_rating,
  rating_count
FROM public_decks_with_stats
WHERE is_active = true
ORDER BY import_count DESC
LIMIT 10;
```

### Check Reports

```sql
SELECT 
  pd.name,
  COUNT(*) as report_count,
  pd.is_active
FROM deck_reports dr
JOIN public_decks pd ON dr.public_deck_id = pd.id
GROUP BY pd.id, pd.name, pd.is_active
ORDER BY report_count DESC;
```

## 🚀 Deployment Checklist

- [ ] Run `supabase-community-sharing.sql` migration
- [ ] Verify all tables created
- [ ] Verify RLS policies enabled
- [ ] Verify triggers working
- [ ] Test sharing flow
- [ ] Test importing flow
- [ ] Test rating system
- [ ] Test reporting system
- [ ] Test auto-hide after 5 reports
- [ ] Test unshare functionality
- [ ] Monitor performance with indexes

## 📝 Notes

- **Demo users** can browse and preview but cannot share, import, rate, or report
- **Import creates a copy** - no sync with original deck
- **Auto-hide threshold** is 5 reports
- **Rating** is only available for users who imported the deck
- **Share links** are permanent even after unsharing (but show inactive message)

## 🔗 Related Files

- `supabase-community-sharing.sql` - Database schema
- `src/store/communityStore.ts` - API functions
- `src/pages/ExplorePage.tsx` - Browse public decks
- `src/pages/PublicDeckDetail.tsx` - View public deck
- `src/pages/DeckDetail.tsx` - Share functionality
- `src/components/ShareDeckModal.tsx` - Share modal
- `src/components/DeckStatsPanel.tsx` - Stats display
- `src/components/RatingStars.tsx` - Rating component
- `src/components/ReportModal.tsx` - Report modal

## 🎉 Success!

If all tests pass, the Community Deck Sharing & Marketplace feature is ready to use!

Users can now:
- ✅ Share their decks publicly
- ✅ Browse and search community decks
- ✅ Import decks with one click
- ✅ Rate decks they've imported
- ✅ Report inappropriate content
- ✅ Manage their shared decks

Happy sharing! 🚀
