import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import ReviewForecast from '../components/ReviewForecast';
import { getDailyQuote } from '../utils/quotes';
import { getDeckColorStyles } from '../utils/colorUtils';

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

  // ✅ Fix: read store.cards directly instead of getDueCards (unstable reference)
  const allDueCards = useMemo(() => {
    const now = new Date();
    return store.cards.filter(c => new Date(c.nextReviewDate) <= now);
  }, [store.cards]);
  const totalDue = allDueCards.length;
  const totalCards = useMemo(() => getTotalCards(), [store.cards, getTotalCards]);
  // ✅ Fix: pull mastered count out of JSX into a proper useMemo at component level
  const masteredCount = useMemo(
    () => store.cards.filter(c => c.interval >= 21).length,
    [store.cards]
  );

  return (
    <motion.div 
      key="home" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }}
    >
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
          className={`backdrop-blur-md rounded-2xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-purple-900/30 hover:bg-slate-800 hover:border-purple-800/50' 
              : 'bg-white/80 border-purple-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg ${
            isDark ? '' : 'shadow-purple-200'
          }`}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-3xl font-black text-purple-500 tracking-tight mb-1 relative z-10">{totalCards}</span>
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
          className={`backdrop-blur-md rounded-2xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-rose-900/30 hover:bg-slate-800 hover:border-rose-800/50' 
              : 'bg-white/80 border-rose-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg ${
            isDark ? '' : 'shadow-rose-200'
          }`}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-rose-500 tracking-tight mb-1 relative z-10">{totalDue}</span>
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
          className={`backdrop-blur-md rounded-2xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-orange-900/30 hover:bg-slate-800 hover:border-orange-800/50' 
              : 'bg-white/80 border-orange-100 shadow-sm hover:shadow-md'
          }`}
        >
          {store.streak > 0 && (
             <motion.div 
               animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.2, 0.9] }} 
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-orange-500/30 blur-2xl rounded-full pointer-events-none z-0" 
             />
          )}
          <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg relative z-10 ${
            isDark ? '' : 'shadow-orange-200'
          }`}>
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-3xl font-black text-orange-500 tracking-tight mb-1 relative z-10">{store.streak} วัน</span>
          <span className={`text-xs font-semibold text-center relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>Streak</span>
        </motion.div>

        {/* Stat 4: การ์ดที่เชี่ยวชาญ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className={`backdrop-blur-md rounded-2xl p-5 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-emerald-900/30 hover:bg-slate-800 hover:border-emerald-800/50' 
              : 'bg-white/80 border-emerald-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg ${
            isDark ? '' : 'shadow-emerald-200'
          }`}>
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-emerald-500 tracking-tight mb-1 relative z-10">
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
          whileHover={{ scale: 1.02, y: -2 }} 
          whileTap={{ scale: 0.98 }}
          onClick={onStartReview}
          className={`w-full mb-6 py-5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-3 ${
            isDark ? '' : `shadow-lg ${dayColor.shadow} hover:shadow-xl`
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
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 px-2 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>ชุดการ์ดของฉัน</h2>
          <div className="flex flex-col gap-3">
            {decks.map((deck) => {
              const due = getDueCount(deck.id);
              const total = getTotalCards(deck.id);
              const colorStyles = getDeckColorStyles(deck.color);
              return (
                <motion.div 
                  key={deck.id} 
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className={`rounded-[20px] p-4 flex items-center gap-4 border cursor-pointer transition-all group ${
                    isDark 
                      ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-800 hover:border-slate-600' 
                      : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => onOpenDeck(deck)}>
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
                    <h3 className={`text-lg font-bold mb-0.5 truncate ${
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
        </div>
      )}
    </motion.div>
  );
});

export default Dashboard;
