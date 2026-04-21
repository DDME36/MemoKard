import { motion } from 'framer-motion';
import { useFlashcardStore, type Deck, type Flashcard } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';

const COLOR: Record<string, { 
  bg: string; 
  gradient: string;
  text: string; 
  border: string; 
  light: string;
  shadow: string;
}> = {
  violet:  { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', gradient: 'from-purple-500 to-purple-600', text: 'text-purple-700', border: 'border-purple-200', light: 'bg-gradient-to-br from-purple-50 to-purple-100', shadow: 'shadow-purple-200' },
  sky:     { bg: 'bg-gradient-to-br from-sky-500 to-blue-600', gradient: 'from-sky-500 to-blue-600', text: 'text-sky-700', border: 'border-sky-200', light: 'bg-gradient-to-br from-sky-50 to-blue-100', shadow: 'shadow-sky-200' },
  teal:    { bg: 'bg-gradient-to-br from-teal-500 to-emerald-600', gradient: 'from-teal-500 to-emerald-600', text: 'text-teal-700', border: 'border-teal-200', light: 'bg-gradient-to-br from-teal-50 to-emerald-100', shadow: 'shadow-teal-200' },
  rose:    { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', gradient: 'from-rose-500 to-pink-600', text: 'text-rose-700', border: 'border-rose-200', light: 'bg-gradient-to-br from-rose-50 to-pink-100', shadow: 'shadow-rose-200' },
  amber:   { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', gradient: 'from-amber-500 to-orange-600', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-gradient-to-br from-amber-50 to-orange-100', shadow: 'shadow-amber-200' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-green-600', gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-gradient-to-br from-emerald-50 to-green-100', shadow: 'shadow-emerald-200' },
  pink:    { bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', gradient: 'from-pink-500 to-fuchsia-600', text: 'text-pink-700', border: 'border-pink-200', light: 'bg-gradient-to-br from-pink-50 to-fuchsia-100', shadow: 'shadow-pink-200' },
  indigo:  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', gradient: 'from-indigo-500 to-blue-600', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-gradient-to-br from-indigo-50 to-blue-100', shadow: 'shadow-indigo-200' },
};
const c = (color: string) => COLOR[color] ?? COLOR['violet'];

interface DeckDetailProps {
  deck: Deck;
  onStartReview: (deck: Deck) => void;
  onShowAddCard: () => void;
  onEditCard: (card: Flashcard) => void;
  onDeleteDeck: (deck: Deck) => void;
}

export default function DeckDetail({ deck, onStartReview, onShowAddCard, onEditCard, onDeleteDeck }: DeckDetailProps) {
  const store = useFlashcardStore();
  const { getCardsByDeck, getDueCount } = store;
  const { isDark } = useTheme();

  const col = c(deck.color);
  const cards = getCardsByDeck(deck.id);
  const due = getDueCount(deck.id);

  return (
    <motion.div 
      key="deck" 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0 }}
    >
      {/* Deck Header */}
      <div className={`bg-gradient-to-br ${col.gradient} rounded-3xl p-6 mb-6 relative overflow-hidden ${
        isDark ? '' : `shadow-2xl ${col.shadow}`
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{deck.name}</h2>
            <p className="text-sm text-white/80 font-medium">{cards.length} การ์ด · ต้องทบทวน {due} ใบ</p>
          </div>
          <div className="flex gap-2">
            {/* เพิ่มการ์ด - แสดงเฉพาะเมื่อมีการ์ดแล้ว */}
            {cards.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }} 
                onClick={onShowAddCard}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-3 sm:px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                title="เพิ่มการ์ด">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">เพิ่มการ์ด</span>
              </motion.button>
            )}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }} 
              onClick={() => onStartReview(deck)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-3 sm:px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
              title="ทบทวนทั้งหมด">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">ทบทวนทั้งหมด</span>
            </motion.button>
            <button
              onClick={() => onDeleteDeck(deck)}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 flex items-center justify-center transition-all"
              title="ลบชุดการ์ด">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ยังไม่มีการ์ดในชุดนี้</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>เริ่มสร้างการ์ดแรกของคุณ</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }} 
            onClick={onShowAddCard}
            className={`inline-flex items-center gap-2 bg-gradient-to-r ${col.gradient} hover:opacity-90 text-white text-base font-bold px-8 py-4 rounded-xl transition-all`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มการ์ด
          </motion.button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const isDue = new Date(card.nextReviewDate) <= new Date();
            return (
              <motion.div 
                key={card.id} 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`backdrop-blur-sm rounded-2xl border p-5 flex items-start gap-4 cursor-pointer transition-all duration-300 ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-800 hover:border-purple-500/50' 
                    : 'bg-white/80 border-purple-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100'
                }`}
                onClick={() => onEditCard(card)}>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-bold truncate mb-1 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>{card.question}</p>
                  <p className={`text-sm truncate ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>{card.answer}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isDue && (
                    <span className="text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-xl">ถึงเวลา</span>
                  )}
                  <svg className={`w-5 h-5 ${
                    isDark ? 'text-purple-400' : 'text-purple-300'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
