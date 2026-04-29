import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  onUndo?: () => void;
}

export default function Toast({
  isOpen,
  message,
  type = 'info',
  duration = 3000,
  onClose,
  onUndo,
}: ToastProps) {
  const { isDark } = useTheme();

  useEffect(() => {
    if (isOpen && duration > 0 && !onUndo) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
    // If onUndo exists, auto-close after duration
    if (isOpen && duration > 0 && onUndo) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose, onUndo]);

  const typeStyles = {
    success: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: isDark
        ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-300'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700',
      iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    error: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: isDark
        ? 'bg-rose-900/30 border-rose-800/50 text-rose-300'
        : 'bg-rose-50 border-rose-200 text-rose-700',
      iconColor: isDark ? 'text-rose-400' : 'text-rose-600',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: isDark
        ? 'bg-amber-900/30 border-amber-800/50 text-amber-300'
        : 'bg-amber-50 border-amber-200 text-amber-700',
      iconColor: isDark ? 'text-amber-400' : 'text-amber-600',
    },
    info: {
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: isDark
        ? 'bg-violet-900/30 border-violet-800/50 text-violet-300'
        : 'bg-violet-50 border-violet-200 text-violet-700',
      iconColor: isDark ? 'text-violet-400' : 'text-violet-600',
    },
  };

  const style = typeStyles[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full mx-4"
        >
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${style.color}`}
          >
            <div className={style.iconColor}>{style.icon}</div>
            <p className="flex-1 font-medium text-sm">{message}</p>
            {onUndo && (
              <button
                onClick={onUndo}
                className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${
                  isDark
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-black/10 hover:bg-black/20 text-slate-800'
                }`}
              >
                เลิกทำ
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
