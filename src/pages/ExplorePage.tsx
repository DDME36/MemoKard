import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { communityStore, DECK_CATEGORIES, type PublicDeck, type DeckCategory } from '../store/communityStore';
import CustomSelect from '../components/CustomSelect';

interface ExplorePageProps {
  onOpenDeck: (publicDeckId: string) => void;
}

export default function ExplorePage({ onOpenDeck }: ExplorePageProps) {
  const { isDark } = useTheme();
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DeckCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'import_count' | 'rating' | 'newest'>('import_count');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 50;

  useEffect(() => {
    loadDecks();
  }, [page, sortBy, selectedCategory, searchQuery]);

  const loadDecks = async () => {
    setLoading(true);
    try {
      let result;
      if (searchQuery || selectedCategory !== 'all') {
        result = await communityStore.searchPublicDecks(
          searchQuery,
          selectedCategory !== 'all' ? selectedCategory : undefined,
          undefined,
          page,
          limit
        );
      } else {
        result = await communityStore.getPublicDecks(page, limit, sortBy);
      }
      setDecks(result.decks);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleCategoryChange = (category: DeckCategory | 'all') => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSortChange = (sort: 'import_count' | 'rating' | 'newest') => {
    setSortBy(sort);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สำรวจชุดการ์ด
        </h1>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ค้นหาและติดตามชุดการ์ดจากชุมชน
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ค้นหาชุดการ์ด..."
            className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
            } focus:outline-none focus:ring-2 focus:ring-violet-500/20`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <CustomSelect
            value={selectedCategory}
            onChange={(value) => handleCategoryChange(value as DeckCategory | 'all')}
            options={[
              { value: 'all', label: 'ทุกหมวดหมู่' },
              ...DECK_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            ]}
            placeholder="ทุกหมวดหมู่"
            className="w-48"
          />

          {/* Sort */}
          <CustomSelect
            value={sortBy}
            onChange={(value) => handleSortChange(value as any)}
            options={[
              { value: 'import_count', label: 'ยอดนิยม' },
              { value: 'rating', label: 'คะแนนสูงสุด' },
              { value: 'newest', label: 'ใหม่ล่าสุด' },
            ]}
            placeholder="เรียงตาม"
            className="w-40"
          />

          {/* Results Count */}
          <div
            className={`ml-auto px-4 py-2 rounded-xl text-sm font-medium ${
              isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {total} ชุดการ์ด
          </div>
        </div>
      </div>

      {/* Deck Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-48 rounded-2xl animate-pulse ${
                isDark ? 'bg-slate-900' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div
          className={`text-center py-16 rounded-2xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <svg
            className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ไม่พบชุดการ์ดที่ตรงกับการค้นหา
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onClick={() => onOpenDeck(deck.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              isDark
                ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'
            } disabled:cursor-not-allowed`}
          >
            ก่อนหน้า
          </button>

          <span className={`px-4 py-2 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            หน้า {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              isDark
                ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'
            } disabled:cursor-not-allowed`}
          >
            ถัดไป
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Deck Card Component ──
function DeckCard({ deck, onClick }: { deck: PublicDeck; onClick: () => void }) {
  const { isDark } = useTheme();

  const truncateDescription = (text: string | null, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-5 rounded-2xl border text-left transition-all cursor-pointer ${
        isDark
          ? 'bg-slate-900 border-slate-800 hover:border-violet-700'
          : 'bg-white border-slate-200 hover:border-violet-300 hover:shadow-lg'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {deck.name}
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            โดย {deck.creatorUsername}
          </p>
        </div>

        {/* Category Badge */}
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
            isDark
              ? 'bg-violet-900/30 text-violet-300 border border-violet-800/50'
              : 'bg-violet-50 text-violet-700 border border-violet-200'
          }`}
        >
          {deck.category}
        </span>
      </div>

      {/* Description */}
      {deck.description && (
        <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {truncateDescription(deck.description, 100)}
        </p>
      )}

      {/* Tags */}
      {deck.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {deck.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}
            >
              #{tag}
            </span>
          ))}
          {deck.tags.length > 3 && (
            <span className={`px-2 py-0.5 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              +{deck.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4">
          {/* Followers count */}
          <div className="flex items-center gap-1.5">
            <svg className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {deck.importCount}
            </span>
          </div>

          {/* Card count */}
          <div className="flex items-center gap-1.5">
            <svg className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {deck.cardCount}
            </span>
          </div>
        </div>

        {/* Rating - readonly display only, no interactive buttons */}
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {deck.avgRating > 0 ? deck.avgRating.toFixed(1) : '—'}
            {deck.ratingCount > 0 && (
              <span className={`ml-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                ({deck.ratingCount})
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
