import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { DECK_CATEGORIES, type DeckCategory } from '../store/communityStore';
import CustomSelect from './CustomSelect';

interface ShareDeckModalProps {
  isOpen: boolean;
  deckName: string;
  cardCount: number;
  onClose: () => void;
  onShare: (description: string, category: DeckCategory, tags: string[]) => Promise<void>;
}

export default function ShareDeckModal({
  isOpen,
  deckName,
  cardCount,
  onClose,
  onShare,
}: ShareDeckModalProps) {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DeckCategory>('ทั่วไป');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardCount === 0) {
      showToast('ไม่สามารถแชร์ชุดการ์ดที่ไม่มีการ์ดได้', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await onShare(description, category, tags);
      // Reset form
      setDescription('');
      setCategory('ทั่วไป');
      setTags([]);
      setTagInput('');
      onClose();
    } catch (error) {
      console.error('Error sharing deck:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = description.length;
  const maxChars = 500;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto ${
                isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className={`sticky top-0 px-6 py-5 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} z-10`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      แชร์ชุดการ์ดสู่ชุมชน
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {deckName} · {cardCount} การ์ด
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-xl transition-colors ${
                      isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Description */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    คำอธิบาย
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, maxChars))}
                    placeholder={`อธิบายเนื้อหาในชุดการ์ด ${deckName}...`}
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-violet-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
                    } focus:outline-none focus:ring-2 focus:ring-violet-500/20`}
                  />
                  <div className={`text-xs mt-1 text-right ${charCount > maxChars * 0.9 ? 'text-amber-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {charCount}/{maxChars}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    หมวดหมู่
                  </label>
                  <CustomSelect
                    value={category}
                    onChange={(value) => setCategory(value as DeckCategory)}
                    options={DECK_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                    placeholder="เลือกหมวดหมู่"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    แท็ก (สูงสุด 5 แท็ก)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="พิมพ์แท็กแล้วกด Enter"
                      disabled={tags.length >= 5}
                      className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-violet-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
                      } focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50`}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={tags.length >= 5 || !tagInput.trim()}
                      className={`px-4 py-3 rounded-xl font-bold transition-colors ${
                        isDark
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      เพิ่ม
                    </button>
                  </div>

                  {/* Tag List */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            isDark
                              ? 'bg-violet-900/30 text-violet-300 border border-violet-800/50'
                              : 'bg-violet-50 text-violet-700 border border-violet-200'
                          }`}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-violet-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-violet-900/20 border border-violet-800/30' : 'bg-violet-50 border border-violet-200'}`}>
                  <div className="flex gap-3">
                    <svg className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className={`text-sm ${isDark ? 'text-violet-300' : 'text-violet-800'}`}>
                      <p className="font-bold mb-1">เมื่อแชร์แล้ว:</p>
                      <ul className="space-y-0.5 text-xs">
                        <li>• ผู้อื่นสามารถค้นหาและ import ชุดการ์ดของคุณได้</li>
                        <li>• คุณจะได้ลิงก์แชร์เพื่อส่งต่อ</li>
                        <li>• คุณสามารถยกเลิกการแชร์ได้ทุกเมื่อ</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-colors ${
                      isDark
                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || cardCount === 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'กำลังแชร์...' : 'แชร์เลย'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
