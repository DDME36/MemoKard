# 🚀 Quick Start - Community Deck Sharing

## ⚡ 3-Step Setup

### Step 1: Install Dependencies (if needed)

```bash
npm install
```

### Step 2: Run Database Migration

1. Open Supabase SQL Editor:
   ```
   https://pclnhumgsxyazznsoawq.supabase.co/project/_/sql
   ```

2. Copy the entire content of `supabase-community-sharing.sql`

3. Paste into SQL Editor and click **"Run"**

4. You should see: ✅ Success. No rows returned

### Step 3: Verify Migration

```bash
npm run migration:test
```

Expected output:
```
✅ Passed: 5
❌ Failed: 0
🎉 All tests passed! Migration successful!
```

## 🎮 Test the Feature

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the app: http://localhost:5173

3. **Test Sharing:**
   - Login (or use demo mode)
   - Create a deck with at least 1 card
   - Click "แชร์" button
   - Fill in description, category, tags
   - Click "แชร์เลย"

4. **Test Exploring:**
   - Click "สำรวจ" button in header
   - Browse public decks
   - Use search and filters
   - Click on a deck to view details

5. **Test Importing:**
   - Click on a public deck
   - Click "Import ชุดการ์ด"
   - Verify deck is copied to your account

6. **Test Rating:**
   - Import a deck first
   - Open the public deck again
   - Click on stars to rate (1-5)
   - Verify rating is saved

## 🐛 Troubleshooting

### Migration Failed?

**Check SQL Editor for errors:**
- Look for red error messages
- Common issues:
  - Tables already exist → Drop them first or use `IF NOT EXISTS`
  - Permission denied → Check you're using the right Supabase project
  - Syntax error → Make sure you copied the entire file

**Re-run migration:**
```sql
-- Drop all tables (CAREFUL: This deletes data!)
DROP TABLE IF EXISTS public.deck_imports CASCADE;
DROP TABLE IF EXISTS public.deck_reports CASCADE;
DROP TABLE IF EXISTS public.deck_ratings CASCADE;
DROP TABLE IF EXISTS public.public_deck_cards CASCADE;
DROP TABLE IF EXISTS public.public_decks CASCADE;
DROP VIEW IF EXISTS public.public_decks_with_stats;

-- Then run supabase-community-sharing.sql again
```

### Test Script Fails?

**Error: "Cannot find module 'dotenv'"**
```bash
npm install dotenv
```

**Error: "Supabase credentials not found"**
- Check `.env` file exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

**Error: "Table not found"**
- Migration didn't run successfully
- Check Supabase SQL Editor for errors
- Re-run the migration

### App Not Working?

**"แชร์" button not showing:**
- Make sure you're logged in (not demo mode)
- Make sure deck has at least 1 card

**"สำรวจ" page empty:**
- No public decks exist yet
- Share a deck first to test

**Import not working:**
- Make sure you're logged in
- Check browser console for errors
- Verify migration ran successfully

## 📚 Full Documentation

- [Setup Guide](./COMMUNITY_SHARING_SETUP.md) - Detailed setup and testing
- [Implementation Summary](./COMMUNITY_SHARING_IMPLEMENTATION.md) - Technical details
- [Requirements](../.kiro/specs/community-deck-sharing/requirements.md) - Full requirements

## ✅ Success Checklist

- [ ] Migration ran successfully
- [ ] Test script passed (5/5)
- [ ] Can share a deck
- [ ] Can see deck in explore page
- [ ] Can import a deck
- [ ] Can rate a deck (after importing)
- [ ] Can report a deck
- [ ] Stats panel shows correct data
- [ ] Share link works
- [ ] Unshare works

## 🎉 You're Done!

If all tests pass, the Community Deck Sharing feature is ready to use!

**Next Steps:**
- Share your first deck
- Explore community decks
- Rate decks you've imported
- Build a collection of useful decks

Happy sharing! 🚀
