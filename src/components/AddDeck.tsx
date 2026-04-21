import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, DECK_COLORS, type DeckColor } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';

interface AddDeckProps {
  onClose: () => void;
  onCreated: (deckId: string) => void;
  dayColor: { gradient: string; shadow: string };
}

const COLOR_MAP: Record<DeckColor, { bg: string; ring: string; label: string }> = {
  violet: { bg: 'bg-violet-400', ring: 'ring-violet-400', label: 'ม่วง' },
  sky:    { bg: 'bg-sky-400',    ring: 'ring-sky-400',    label: 'ฟ้า' },
  teal:   { bg: 'bg-teal-400',   ring: 'ring-teal-400',   label: 'เขียว' },
  rose:   { bg: 'bg-rose-400',   ring: 'ring-rose-400',   label: 'ชมพู' },
  amber:  { bg: 'bg-amber-400',  ring: 'ring-amber-400',  label: 'เหลือง' },
  emerald:{ bg: 'bg-emerald-400',ring: 'ring-emerald-400',label: 'มรกต' },
  pink:   { bg: 'bg-pink-400',   ring: 'ring-pink-400',   label: 'ชมพูอ่อน' },
  indigo: { bg: 'bg-indigo-400', ring: 'ring-indigo-400', label: 'คราม' },
};

export default function AddDeck({ onClose, onCreated, dayColor }: AddDeckProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>('violet');
  const addDeck = useFlashcardStore((s) => s.addDeck);
  const { isDark } = useTheme();

  // Extract color values from gradient for styling
  const getColorValues = () => {
    const colorMap: Record<string, { border: string; bg: string; bgHover: string; text: string; light: string }> = {
      red: { border: '#f87171', bg: '#fef2f2', bgHover: '#fee2e2', text: '#ef4444', light: '#fecaca' },
      yellow: { border: '#fbbf24', bg: '#fefce8', bgHover: '#fef3c7', text: '#f59e0b', light: '#fde68a' },
      pink: { border: '#f472b6', bg: '#fdf2f8', bgHover: '#fce7f3', text: '#ec4899', light: '#fbcfe8' },
      green: { border: '#4ade80', bg: '#f0fdf4', bgHover: '#dcfce7', text: '#22c55e', light: '#bbf7d0' },
      orange: { border: '#fb923c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#f97316', light: '#fed7aa' },
      sky: { border: '#38bdf8', bg: '#f0f9ff', bgHover: '#e0f2fe', text: '#0ea5e9', light: '#bae6fd' },
      purple: { border: '#a78bfa', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#a855f7', light: '#e9d5ff' },
    };
    
    const match = dayColor.gradient.match(/from-(\w+)-/);
    const colorName = match ? match[1] : 'purple';
    return colorMap[colorName] || colorMap.purple;
  };

  const colors = getColorValues();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const deck = await addDeck(name.trim(), color);
    onCreated(deck.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md border max-h-[90dvh] flex flex-col overflow-hidden ${
          isDark
            ? 'bg-slate-900/98 border-slate-800'
            : 'bg-white/95'
        }`}
        style={!isDark ? { borderColor: colors.light } : undefined}
      >
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div 
            className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : ''}`}
            style={!isDark ? { backgroundColor: colors.light } : undefined}
          />
        </div>
        <div className="p-7 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>สร้างชุดการ์ดใหม่</h2>
            <button 
              onClick={onClose} 
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700' 
                  : ''
              }`}
              style={!isDark ? { 
                backgroundColor: colors.bg, 
                color: colors.text 
              } : { color: colors.text }}
              onMouseEnter={(e) => !isDark && (e.currentTarget.style.backgroundColor = colors.bgHover)}
              onMouseLeave={(e) => !isDark && (e.currentTarget.style.backgroundColor = colors.bg)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ชื่อชุดการ์ด</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ภาษาอังกฤษ, คณิตศาสตร์..."
                className={`w-full px-4 py-4 border-2 rounded-2xl placeholder-slate-400 focus:outline-none transition-all text-sm font-medium ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.border;
                  e.target.style.boxShadow = `0 0 0 4px ${colors.border}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>เลือกสี</label>
              <div className="grid grid-cols-4 gap-3">
                {DECK_COLORS.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-xl ${COLOR_MAP[c].bg} transition-all shadow-md flex items-center justify-center ${color === c ? `ring-4 ring-offset-2 ${COLOR_MAP[c].ring} ${isDark ? 'ring-offset-slate-900' : ''} scale-110` : 'opacity-70 hover:opacity-100'}`}
                    title={COLOR_MAP[c].label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button 
                type="button" 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }} 
                onClick={onClose}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}>
                ยกเลิก
              </motion.button>
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-3.5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg transition-all ${
                  isDark ? 'shadow-purple-900/50' : dayColor.shadow
                }`}>
                สร้างชุดการ์ด
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
