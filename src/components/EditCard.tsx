import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, type Flashcard } from '../store/store';
import { compressImage } from '../utils/imageCompression';
import { useTheme } from '../contexts/ThemeContext';

interface EditCardProps {
  card: Flashcard;
  onClose: () => void;
}

export default function EditCard({ card, onClose }: EditCardProps) {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [questionImage, setQuestionImage] = useState<string | undefined>(card.questionImage);
  const [answerImage, setAnswerImage] = useState<string | undefined>(card.answerImage);
  const questionImageRef = useRef<HTMLInputElement>(null);
  const answerImageRef = useRef<HTMLInputElement>(null);
  const { editCard, deleteCard } = useFlashcardStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { isDark } = useTheme();
  const mouseDownOnBackdrop = useRef(false);

  const handleImageUpload = async (file: File, type: 'question' | 'answer') => {
    try {
      const compressed = await compressImage(file);
      if (type === 'question') setQuestionImage(compressed);
      else setAnswerImage(compressed);
    } catch (error) {
      console.error('Failed to compress image:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      await editCard(card.id, question.trim(), answer.trim(), questionImage, answerImage);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await deleteCard(card.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (mouseDownOnBackdrop.current) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-lg border max-h-[95dvh] flex flex-col overflow-hidden ${
          isDark
            ? 'bg-slate-900/98 border-slate-800'
            : 'bg-white/95 border-purple-100 shadow-2xl'
        }`}
      >
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-purple-200'}`} />
        </div>
        <div className="p-7 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">แก้ไขการ์ด</h2>
            <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-purple-400' : 'bg-purple-50 hover:bg-purple-100 text-purple-500'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Question */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>คำถาม</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="พิมพ์คำถามที่นี่..."
                className={`w-full px-4 py-4 border-2 rounded-2xl placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/20 transition-all resize-none text-sm font-medium select-text ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                rows={3}
                required
              />
              <div className="flex items-center gap-2 mt-2">
                <input ref={questionImageRef} type="file" accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'question')}
                  className="hidden" />
                <button type="button" onClick={() => questionImageRef.current?.click()}
                  className="text-xs font-semibold text-purple-500 hover:text-purple-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {questionImage ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
                </button>
                {questionImage && (
                  <button type="button" onClick={() => setQuestionImage(undefined)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-400">ลบรูป</button>
                )}
              </div>
              {questionImage && <img src={questionImage} alt="Question" className="mt-2 rounded-xl max-h-32 object-contain" />}
              <p className={`text-[10px] mt-2 font-medium flex gap-1 items-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                รองรับการพิมพ์แบบ Markdown (ตัวหนา, ลิสต์, โค้ด)
              </p>
            </div>

            {/* Answer */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>คำตอบ</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className={`w-full px-4 py-4 border-2 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/20 transition-all resize-none text-sm font-medium select-text ${
                  isDark
                    ? 'bg-purple-900/20 border-purple-800/50 text-slate-200'
                    : 'bg-purple-50 border-purple-200 text-slate-800'
                }`}
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                rows={3}
                required
              />
              <div className="flex items-center gap-2 mt-2">
                <input ref={answerImageRef} type="file" accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'answer')}
                  className="hidden" />
                <button type="button" onClick={() => answerImageRef.current?.click()}
                  className="text-xs font-semibold text-purple-500 hover:text-purple-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {answerImage ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
                </button>
                {answerImage && (
                  <button type="button" onClick={() => setAnswerImage(undefined)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-400">ลบรูป</button>
                )}
              </div>
              {answerImage && <img src={answerImage} alt="Answer" className="mt-2 rounded-xl max-h-32 object-contain" />}
            </div>

            <div className="flex gap-3 pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className={`py-3.5 px-5 rounded-xl font-bold text-sm transition-all ${
                  confirmDelete
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
                    : isDark ? 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                {confirmDelete ? 'ยืนยันลบ?' : 'ลบ'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}>
                ยกเลิก
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all">
                บันทึก
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
