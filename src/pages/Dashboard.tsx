import { useMemo, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import ReviewForecast from '../components/ReviewForecast';
import CustomSelect from '../components/CustomSelect';
import { getDailyQuote } from '../utils/quotes';
import { getDeckColorStyles } from '../utils/colorUtils';
import { haptics } from '../utils/haptics';

interface DashboardProps {
  onOpenDeck: (deck: Deck) => void;
  onStartReview: () => void;
  onShowAddDeck: () => void;
  dayColor: { gradient: string; shadow: string };
}

const Dashboard = memo(function Dashboard({ onOpenDeck, onStartReview, onShowAddDeck, dayColor }: DashboardProps) {
  const store = useFlashcardStore();
  const { decks, getTotalCards, getDueCount } = store;
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [deckFilter, setDeckFilter] = useState<'all' | 'due'>('all');
  const [sortMode, setSortMode] = useState<'due' | 'recent' | 'name'>('due');

  // ✅ Fix: read store.cards directly instead of getDueCards (unstable reference)
  const allDueCards = useMemo(() => {
    const now = new Date();
    return store.cards.filter(c => new Date(c.nextReviewDate) <= now);
  }, [store.cards]);
  const totalDue = allDueCards.length;
  const totalCards = store.cards.length;
  // ✅ Fix: pull mastered count out of JSX into a proper useMemo at component level
  const masteredCount = useMemo(
    () => store.cards.filter(c => c.interval >= 21).length,
    [store.cards]
  );
  const deckSummaries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return decks
      .map((deck) => ({
        deck,
        due: getDueCount(deck.id),
        total: getTotalCards(deck.id),
      }))
      .filter(({ deck, due }) => {
        const matchesSearch = normalizedQuery.length === 0 || deck.name.toLowerCase().includes(normalizedQuery);
        const matchesFilter = deckFilter === 'all' || due > 0;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortMode === 'name') {
          return a.deck.name.localeCompare(b.deck.name, 'th');
        }
        if (sortMode === 'recent') {
          return new Date(b.deck.createdAt).getTime() - new Date(a.deck.createdAt).getTime();
        }
        return b.due - a.due || new Date(b.deck.createdAt).getTime() - new Date(a.deck.createdAt).getTime();
      });
  }, [decks, deckFilter, getDueCount, getTotalCards, searchQuery, sortMode]);

  const hasActiveDeckControls = searchQuery.trim().length > 0 || deckFilter !== 'all' || sortMode !== 'due';

  return (
    <div>
      {/* Daily Quote */}
      <div className="mb-6 px-2">
        <p className={`text-sm font-medium italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          "{getDailyQuote()}"
        </p>
      </div>

      {/* Stat Cards - 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 max-w-5xl mx-auto">
        {/* Stat 1: การ์ดทั้งหมด */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="premium-card accent-glow rounded-3xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all"
          onClick={() => haptics.light()}
        >
          <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-3xl font-black text-purple-500 tracking-tight mb-1 relative z-10 display-font">{totalCards}</span>
          <span className={`text-xs font-semibold text-center relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>การ์ดทั้งหมด</span>
        </motion.div>

        {/* Stat 2: ต้องทบทวนวันนี้ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="premium-card accent-glow rounded-3xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all"
          onClick={() => haptics.light()}
        >
          <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-rose-500 tracking-tight mb-1 relative z-10 display-font">{totalDue}</span>
          <span className={`text-xs font-semibold text-center relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>ต้องทบทวนวันนี้</span>
        </motion.div>

        {/* Stat 3: Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="premium-card accent-glow rounded-3xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all"
          onClick={() => haptics.light()}
        >
          {store.streak > 0 && (
             <motion.div 
               animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.2, 0.9] }} 
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-orange-500/30 blur-2xl rounded-full pointer-events-none z-0" 
             />
          )}
          <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 relative z-10">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-3xl font-black text-orange-500 tracking-tight mb-1 relative z-10 display-font">{store.streak} วัน</span>
          <span className={`text-xs font-semibold text-center relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>เรียนรู้ต่อเนื่อง (Streak)</span>
        </motion.div>

        {/* Stat 4: การ์ดที่เชี่ยวชาญ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="premium-card accent-glow rounded-3xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all"
          onClick={() => haptics.light()}
        >
          <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-emerald-500 tracking-tight mb-1 relative z-10 display-font">
            {masteredCount}
          </span>
          <span className={`text-xs font-semibold text-center relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>การ์ดที่เชี่ยวชาญ</span>
        </motion.div>
      </div>

      {/* Review All Button */}
      {totalDue > 0 && (
        <motion.button 
          whileHover={{ scale: 1.01, y: -1 }} 
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            haptics.medium();
            onStartReview();
          }}
          className={`w-full mb-6 py-5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white font-bold text-base rounded-3xl transition-all flex items-center justify-center gap-3 display-font shadow-lg ${
            isDark ? 'shadow-purple-950/20' : `${dayColor.shadow} hover:shadow-xl`
          }`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ทบทวนทั้งหมด ({totalDue} การ์ด)
        </motion.button>
      )}

      {/* Review Forecast */}
      <div className="mb-8">
        <ReviewForecast dayColor={dayColor} />
      </div>

      {/* Empty State or Deck List */}
      {decks.length === 0 ? (
        <div className="text-center py-20">
          <h3 className={`text-xl font-bold mb-2 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>เริ่มต้นการเรียนรู้</h3>
          <p className={`text-sm mb-6 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>สร้างชุดการ์ดแรกของคุณเพื่อเริ่มจดจำ</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }} 
            onClick={onShowAddDeck}
            className={`inline-flex items-center gap-2 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างชุดการ์ดแรก
          </motion.button>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3 px-2">
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-widest ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>ชุดการ์ดของฉัน</h2>
              <p className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                แสดง {deckSummaries.length} จาก {decks.length} ชุด
              </p>
            </div>
            {hasActiveDeckControls && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDeckFilter('all');
                  setSortMode('due');
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                }`}
              >
                <X className="h-3.5 w-3.5" />
                ล้าง
              </button>
            )}
          </div>

          <div className={`mb-4 rounded-2xl border p-3 ${
            isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-white/80 shadow-sm'
          }`}>
            <label className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-700'
            }`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชุดการ์ด"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <CustomSelect
                value={deckFilter}
                onChange={(val) => setDeckFilter(val as 'all' | 'due')}
                options={[
                  { value: 'all', label: 'ทุกชุด' },
                  { value: 'due', label: 'รอทบทวน' }
                ]}
                variant="flat"
                icon={<Filter className="h-4 w-4 shrink-0 text-slate-400" />}
                className="w-full"
              />

              <CustomSelect
                value={sortMode}
                onChange={(val) => setSortMode(val as 'due' | 'recent' | 'name')}
                options={[
                  { value: 'due', label: 'ค้างมากก่อน' },
                  { value: 'recent', label: 'ล่าสุดก่อน' },
                  { value: 'name', label: 'ชื่อ A-Z' }
                ]}
                variant="flat"
                icon={<SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />}
                className="w-full"
              />
            </div>
          </div>

          {deckSummaries.length === 0 ? (
            <div className={`rounded-2xl border px-5 py-10 text-center ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-white/80 shadow-sm'
            }`}>
              <Search className={`mx-auto mb-3 h-8 w-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                ไม่พบชุดการ์ดที่ตรงเงื่อนไข
              </h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                ลองเปลี่ยนคำค้น หรือกลับไปดูทุกชุด
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
            {deckSummaries.map(({ deck, due, total }) => {
              const colorStyles = getDeckColorStyles(deck.color);
              return (
                <motion.div 
                  key={deck.id} 
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="premium-card accent-glow rounded-3xl p-4 flex items-center gap-4 border cursor-pointer transition-all group"
                  onClick={() => {
                    haptics.light();
                    onOpenDeck(deck);
                  }}>
                  {/* Icon Box - Dynamic color */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{ 
                      background: colorStyles.gradient,
                      opacity: 0.9
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  {/* Text Area - Bolder title */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-bold mb-0.5 truncate display-font ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>{deck.name}</h3>
                    <div className={`flex items-center gap-2 text-sm font-medium ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span>{total} การ์ด</span>
                      {due > 0 && (
                        <>
                          <span className={`w-1 h-1 rounded-full ${
                            isDark ? 'bg-slate-600' : 'bg-slate-300'
                          }`}></span>
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            รอทบทวน {due}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Arrow - Animated */}
                  <div className={`group-hover:translate-x-1 transition-all pr-2 ${
                    isDark ? 'text-slate-600 group-hover:text-slate-500' : 'text-slate-300 group-hover:text-slate-400'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default Dashboard;
