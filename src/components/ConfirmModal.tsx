import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  const { isDark } = useTheme();

  const colors = {
    warning: {
      gradient: 'from-amber-500 to-orange-500',
      bg: isDark ? 'bg-slate-800' : 'bg-amber-50',
      border: isDark ? 'border-slate-700' : 'border-amber-200',
      icon: (
        <svg className={`w-16 h-16 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    danger: {
      gradient: 'from-rose-500 to-red-500',
      bg: isDark ? 'bg-slate-800' : 'bg-rose-50',
      border: isDark ? 'border-slate-700' : 'border-rose-200',
      icon: (
        <svg className={`w-16 h-16 ${isDark ? 'text-rose-400' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    info: {
      gradient: 'from-sky-500 to-blue-500',
      bg: isDark ? 'bg-slate-800' : 'bg-sky-50',
      border: isDark ? 'border-slate-700' : 'border-sky-200',
      icon: (
        <svg className={`w-16 h-16 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const color = colors[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl w-full max-w-md overflow-hidden ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white shadow-2xl'
            }`}
          >
            {/* Icon Section */}
            <div className={`${color.bg} border-b ${color.border} p-8 flex justify-center`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                {color.icon}
              </motion.div>
            </div>

            {/* Content Section */}
            <div className="p-8">
              <h2 className={`text-2xl font-bold mb-3 text-center ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {title}
              </h2>
              <p className={`text-center leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {message}
              </p>
            </div>

            {/* Buttons Section */}
            <div className="px-8 pb-8 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-base transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cancelText}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className={`flex-1 py-3.5 bg-gradient-to-r ${color.gradient} hover:opacity-90 text-white rounded-xl font-bold text-base transition-all`}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
