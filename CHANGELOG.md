# Changelog

All notable changes to MemoKard will be documented in this file.

## [2.1.0] - 2026-04-21

### 🎉 Major Features Added

#### Community Deck Sharing & Marketplace
A complete community-driven marketplace for sharing and discovering flashcard decks.

**New Features:**
- ✨ **Share Decks** - Share your decks publicly with unique shareable links
- 🔍 **Explore Marketplace** - Browse and search community decks with filters
- ⬇️ **One-Click Import** - Import any public deck to your account instantly
- ⭐ **Rating System** - Rate decks you've imported (1-5 stars)
- 🏷️ **Categories & Tags** - Organize decks with 6 categories and custom tags
- 📊 **Deck Statistics** - View import count, ratings, and popularity metrics
- 🚨 **Content Moderation** - Report inappropriate content (auto-hide after 5 reports)
- 🔄 **Deck Management** - Update or unshare your public decks anytime
- 📋 **Copy Share Links** - Easy sharing via clipboard or native share
- 📝 **Deck Descriptions** - Add descriptions up to 500 characters

**Technical Implementation:**
- 5 new database tables with RLS policies
- Automated triggers for import counting and auto-moderation
- Materialized view for efficient stats aggregation
- Full TypeScript API layer with type safety
- Responsive UI components with dark mode support
- Comprehensive error handling and loading states

**Database Schema:**
- `public_decks` - Shared decks with metadata
- `public_deck_cards` - Cards in shared decks
- `deck_ratings` - User ratings (1-5 stars)
- `deck_reports` - Content moderation reports
- `deck_imports` - Import tracking

**New Components:**
- `ExplorePage.tsx` - Browse and search public decks
- `PublicDeckDetail.tsx` - View and import public decks
- `ShareDeckModal.tsx` - Share deck to community
- `DeckStatsPanel.tsx` - Display deck statistics
- `RatingStars.tsx` - 5-star rating interface
- `ReportModal.tsx` - Report inappropriate content

**Updated Components:**
- `DeckDetail.tsx` - Added share functionality and stats panel
- `App.tsx` - Added routing for explore and public deck views

**Documentation:**
- `QUICK_START.md` - Quick setup guide
- `COMMUNITY_SHARING_SETUP.md` - Detailed setup and testing
- `COMMUNITY_SHARING_IMPLEMENTATION.md` - Technical details
- Updated `README.md` with new features

**Scripts:**
- `npm run migration:test` - Test database migration
- `npm run migration:guide` - View migration guide

### 🔒 Security
- Row Level Security (RLS) on all new tables
- Demo users blocked from write operations
- Only creators can update/delete their decks
- Only importers can rate decks
- Automated content moderation

### 🚀 Performance
- Indexes on all foreign keys and frequently queried columns
- Materialized view for stats aggregation
- Pagination for large result sets (50 per page)
- Efficient RLS policies

### 📱 User Experience
- Smooth animations with Framer Motion
- Dark mode support for all new components
- Responsive design for mobile and desktop
- Loading states and empty states
- Toast notifications for user feedback
- Error handling with user-friendly messages

---

## [2.0.0] - 2026-04-15

### Added
- Initial release of MemoKard
- Flashcard system with SM-2 algorithm
- Cloud sync with Supabase
- Dark mode with Thai day colors
- Activity heatmap
- PWA support
- Offline functionality

---

## Version Format

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

---

## Categories

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements
