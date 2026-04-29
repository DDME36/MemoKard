import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/haptics';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const rarityColors = {
  common: {
    gradient: 'from-slate-500 to-slate-600',
    glow: 'shadow-slate-300',
    border: 'border-slate-400'
  },
  rare: {
    gradient: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-300',
    border: 'border-blue-400'
  },
  epic: {
    gradient: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-300',
    border: 'border-purple-400'
  },
  legendary: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-300',
    border: 'border-amber-400'
  }
};

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      sounds.play('celebration');
      
      // Fire confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.3 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b']
      });

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const colors = rarityColors[achievement.rarity];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-[100] pointer-events-none"
        >
          <div className={`bg-gradient-to-r ${colors.gradient} text-white rounded-xl shadow-2xl ${colors.glow} border ${colors.border} pl-4 pr-3 py-3 flex items-center gap-3 min-w-[280px] max-w-[320px]`}>
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90 mb-0.5">
                ได้รับความสำเร็จ
              </p>
              <h3 className="text-sm font-bold truncate">{achievement.title}</h3>
            </motion.div>

            {/* Close button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="pointer-events-auto w-6 h-6 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
