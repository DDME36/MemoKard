import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, DECK_COLORS, type DeckColor } from '../store/store';

interface AddDeckProps {
  onClose: () => void;
  onCreated: (deckId: string) => void;
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

export default function AddDeck({ onClose, onCreated }: AddDeckProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>('violet');
  const addDeck = useFlashcardStore((s) => s.addDeck);

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
      className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-purple-100"
      >
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-purple-200 rounded-full" />
        </div>
        <div className="p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">สร้างชุดการ์ดใหม่</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ชื่อชุดการ์ด</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ภาษาอังกฤษ, คณิตศาสตร์..."
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">เลือกสี</label>
              <div className="flex gap-3 flex-wrap">
                {DECK_COLORS.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-xl ${COLOR_MAP[c].bg} transition-all shadow-md ${color === c ? `ring-4 ring-offset-2 ${COLOR_MAP[c].ring} scale-110` : 'opacity-70 hover:opacity-100'}`}
                    title={COLOR_MAP[c].label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <motion.button 
                type="button" 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }} 
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition-colors">
                ยกเลิก
              </motion.button>
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 transition-all">
                สร้างชุดการ์ด
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
