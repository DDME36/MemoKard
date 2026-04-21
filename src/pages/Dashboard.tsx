import { motion } from 'framer-motion';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { getDailyQuote } from '../utils/quotes';

const COLOR: Record<string, { 
  bg: string; 
  gradient: string;
  text: string; 
  border: string; 
  light: string;
  shadow: string;
}> = {
  violet:  { 
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600', 
    gradient: 'from-purple-500 to-purple-600',
    text: 'text-purple-700', 
    border: 'border-purple-200', 
    light: 'bg-gradient-to-br from-purple-50 to-purple-100',
    shadow: 'shadow-purple-200'
  },
  sky:     { 
    bg: 'bg-gradient-to-br from-sky-500 to-blue-600', 
    gradient: 'from-sky-500 to-blue-600',
    text: 'text-sky-700', 
    border: 'border-sky-200', 
    light: 'bg-gradient-to-br from-sky-50 to-blue-100',
    shadow: 'shadow-sky-200'
  },
  teal:    { 
    bg: 'bg-gradient-to-br from-teal-500 to-emerald-600', 
    gradient: 'from-teal-500 to-emerald-600',
    text: 'text-teal-700', 
    border: 'border-teal-200', 
    light: 'bg-gradient-to-br from-teal-50 to-emerald-100',
    shadow: 'shadow-teal-200'
  },
  rose:    { 
    bg: 'bg-gradient-to-br from-rose-500 to-pink-600', 
    gradient: 'from-rose-500 to-pink-600',
    text: 'text-rose-700', 
    border: 'border-rose-200', 
    light: 'bg-gradient-to-br from-rose-50 to-pink-100',
    shadow: 'shadow-rose-200'
  },
  amber:   { 
    bg: 'bg-gradient-to-br from-amber-500 to-orange-600', 
    gradient: 'from-amber-500 to-orange-600',
    text: 'text-amber-700', 
    border: 'border-amber-200', 
    light: 'bg-gradient-to-br from-amber-50 to-orange-100',
    shadow: 'shadow-amber-200'
  },
  emerald: { 
    bg: 'bg-gradient-to-br from-emerald-500 to-green-600', 
    gradient: 'from-emerald-500 to-green-600',
    text: 'text-emerald-700', 
    border: 'border-emerald-200', 
    light: 'bg-gradient-to-br from-emerald-50 to-green-100',
    shadow: 'shadow-emerald-200'
  },
  pink:    { 
    bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', 
    gradient: 'from-pink-500 to-fuchsia-600',
    text: 'text-pink-700', 
    border: 'border-pink-200', 
    light: 'bg-gradient-to-br from-pink-50 to-fuchsia-100',
    shadow: 'shadow-pink-200'
  },
  indigo:  { 
    bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', 
    gradient: 'from-indigo-500 to-blue-600',
    text: 'text-indigo-700', 
    border: 'border-indigo-200', 
    light: 'bg-gradient-to-br from-indigo-50 to-blue-100',
    shadow: 'shadow-indigo-200'
  },
};
const c = (color: string) => COLOR[color] ?? COLOR['violet'];

interface DashboardProps {
  onOpenDeck: (deck: Deck) => void;
  onStartReview: () => void;
  onShowAddDeck: () => void;
  dayColor: { gradient: string; shadow: string };
}

export default function Dashboard({ onOpenDeck, onStartReview, onShowAddDeck, dayColor }: DashboardProps) {
  const store = useFlashcardStore();
  const { decks, getDueCards, getTotalCards, getDueCount, reviewHistory } = store;
  const { isDark } = useTheme();

  const allDueCards = getDueCards();
  const totalDue = allDueCards.length;
  const totalCards = getTotalCards();

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

      {/* Stat Cards - Clean Glassmorphism Design */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {/* Stat 1: ทบทวนวันนี้ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className={`backdrop-blur-md rounded-3xl p-6 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-rose-900/30 hover:bg-slate-800 hover:border-rose-800/50' 
              : 'bg-white/80 border-rose-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${
            isDark ? 'text-rose-400' : 'text-rose-500'
          }`}>
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-5xl font-black text-rose-500 tracking-tight mb-2 relative z-10">{totalDue}</span>
          <span className={`text-xs font-bold uppercase tracking-wide relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>ต้องทบทวนวันนี้</span>
        </motion.div>

        {/* Stat 2: การ์ดทั้งหมด */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className={`backdrop-blur-md rounded-3xl p-6 border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
            isDark 
              ? 'bg-slate-800/90 border-sky-900/30 hover:bg-slate-800 hover:border-sky-800/50' 
              : 'bg-white/80 border-sky-100 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${
            isDark ? 'text-sky-400' : 'text-sky-500'
          }`}>
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <span className="text-5xl font-black text-sky-500 tracking-tight mb-2 relative z-10">{totalCards}</span>
          <span className={`text-xs font-bold uppercase tracking-wide relative z-10 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>การ์ดทั้งหมด</span>
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

      {/* Activity Heatmap */}
      <div className="mb-6">
        <ActivityHeatmap reviewHistory={reviewHistory ?? {}} dayColor={dayColor} />
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
              const col = c(deck.color);
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
                  {/* Icon Box - Softer colors */}
                  <div className={`w-14 h-14 rounded-2xl ${col.light} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <svg className={`w-7 h-7 ${col.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
}
