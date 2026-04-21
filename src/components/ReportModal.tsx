import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { REPORT_REASONS } from '../store/communityStore';
import CustomSelect from './CustomSelect';

interface ReportModalProps {
  isOpen: boolean;
  deckName: string;
  onClose: () => void;
  onSubmit: (reason: 'spam' | 'inappropriate' | 'copyright' | 'other', details: string) => Promise<void>;
}

export default function ReportModal({ isOpen, deckName, onClose, onSubmit }: ReportModalProps) {
  const { isDark } = useTheme();
  const [reason, setReason] = useState<'spam' | 'inappropriate' | 'copyright' | 'other'>('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(reason, details);
      setDetails('');
      setReason('spam');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              className={`w-full max-w-md rounded-3xl shadow-2xl ${
                isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      รายงานเนื้อหา
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {deckName}
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
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Reason */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    เหตุผลในการรายงาน
                  </label>
                  <CustomSelect
                    value={reason}
                    onChange={(value) => setReason(value as any)}
                    options={REPORT_REASONS.map((r) => ({ value: r.value, label: r.label }))}
                    placeholder="เลือกเหตุผล"
                  />
                </div>

                {/* Details */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    รายละเอียดเพิ่มเติม (ไม่บังคับ)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="อธิบายปัญหาที่พบ..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors resize-none ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-rose-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-rose-500'
                    } focus:outline-none focus:ring-2 focus:ring-rose-500/20`}
                  />
                </div>

                {/* Warning */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex gap-3">
                    <svg className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                      การรายงานเท็จอาจส่งผลต่อบัญชีของคุณ กรุณารายงานเฉพาะเนื้อหาที่ไม่เหมาะสมจริงๆ
                    </p>
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
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
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

