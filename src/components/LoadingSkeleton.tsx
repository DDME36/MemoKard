import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSkeletonProps {
  type?: 'card' | 'deck' | 'stats' | 'list';
  count?: number;
}

export default function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const { isDark } = useTheme();
  
  const baseClass = `animate-pulse rounded-2xl ${
    isDark ? 'bg-slate-800' : 'bg-slate-200'
  }`;

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 gap-4 mb-10">
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${baseClass} h-32`}
          />
        ))}
      </div>
    );
  }

  if (type === 'deck') {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${baseClass} h-20 flex items-center gap-4 p-4`}
          >
            <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-3/4`} />
              <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-1/2`} />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${baseClass} h-24 p-4`}
          >
            <div className={`h-4 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-3/4 mb-3`} />
            <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-full`} />
            <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-5/6 mt-2`} />
          </motion.div>
        ))}
      </div>
    );
  }

  // Default: card skeleton
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${baseClass} w-full max-w-xl mx-auto h-[50dvh] min-h-[280px] max-h-[400px]`}
    >
      <div className="p-8 h-full flex flex-col justify-between">
        <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-20`} />
        <div className="space-y-4">
          <div className={`h-6 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-3/4 mx-auto`} />
          <div className={`h-6 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-2/3 mx-auto`} />
        </div>
        <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-300'} w-32 mx-auto`} />
      </div>
    </motion.div>
  );
}
