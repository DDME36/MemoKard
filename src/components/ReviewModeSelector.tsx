import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import { useFlashcardStore } from '../store/store';

export type ReviewMode = 'normal' | 'focus' | 'quick' | 'exam' | 'weak' | 'preview';

interface ReviewModeSelectorProps {
  selectedMode: ReviewMode;
  onSelectMode: (mode: ReviewMode) => void;
  dayColor: { gradient: string; shadow: string };
  deckId?: string; // Optional deck ID to filter cards by deck
}

const MODES = [
  {
    id: 'normal' as ReviewMode,
    name: 'ปกติ',
    description: 'ทบทวนการ์ดที่ถึงเวลาตามปกติ',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'focus' as ReviewMode,
    name: 'โฟกัส',
    description: 'การ์ดที่ยาก (Ease < 2.5)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'from-rose-500 to-rose-600',
  },
  {
    id: 'quick' as ReviewMode,
    name: 'ด่วน',
    description: 'ทบทวนสูงสุด 10 การ์ด',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'from-amber-500 to-amber-600',
  },
  {
    id: 'exam' as ReviewMode,
    name: 'สอบ',
    description: 'ทบทวนทุกการ์ดในชุด',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'weak' as ReviewMode,
    name: 'จุดอ่อน',
    description: 'การ์ดที่ยากมาก (Ease < 2.0)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'preview' as ReviewMode,
    name: 'ดูการ์ด',
    description: 'ดูการ์ดทั้งหมดก่อนทบทวน',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'from-slate-500 to-slate-600',
  },
];

export default function ReviewModeSelector({ selectedMode, onSelectMode, dayColor, deckId }: ReviewModeSelectorProps) {
  const { isDark } = useTheme();
  const store = useFlashcardStore();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const isCustomGradient = dayColor.gradient.includes('gradient(');
  const dayShadowClass = isCustomGradient ? '' : dayColor.shadow;
  const dayShadowStyle = (isCustomGradient && !isDark && dayColor.shadow) ? { boxShadow: dayColor.shadow } : {};

  // Check card availability for each mode
  const checkModeAvailability = (mode: ReviewMode): { available: boolean; reason: string } => {
    // Filter cards by deck if deckId is provided
    const allCards = deckId ? store.getCardsByDeck(deckId) : store.cards;
    const dueCards = deckId 
      ? allCards.filter(card => new Date(card.nextReviewDate) <= new Date())
      : store.getDueCards();

    switch (mode) {
      case 'normal':
        return {
          available: dueCards.length > 0,
          reason: dueCards.length === 0 ? 'ไม่มีการ์ดที่ต้องทบทวน' : ''
        };
      case 'focus':
        const difficultCards = allCards.filter(c => c.easeFactor < 2.5);
        return {
          available: difficultCards.length > 0,
          reason: difficultCards.length === 0 ? 'ไม่มีการ์ดที่ยาก' : ''
        };
      case 'quick':
        return {
          available: dueCards.length > 0,
          reason: dueCards.length === 0 ? 'ไม่มีการ์ดที่ต้องทบทวน' : ''
        };
      case 'exam':
        return {
          available: allCards.length > 0,
          reason: allCards.length === 0 ? 'ไม่มีการ์ดในชุดนี้' : ''
        };
      case 'weak':
        const weakCards = allCards.filter(c => c.easeFactor < 2.0);
        return {
          available: weakCards.length > 0,
          reason: weakCards.length === 0 ? 'ไม่มีการ์ดจุดอ่อน' : ''
        };
      case 'preview':
        return {
          available: allCards.length > 0,
          reason: allCards.length === 0 ? 'ไม่มีการ์ดในชุดนี้' : ''
        };
      default:
        return { available: true, reason: '' };
    }
  };

  const handleModeClick = (modeId: ReviewMode) => {
    const { available } = checkModeAvailability(modeId);
    
    if (!available) {
      // Show tooltip for 2 seconds
      setShowTooltip(modeId);
      setTimeout(() => setShowTooltip(null), 2000);
      return;
    }

    onSelectMode(modeId);
  };

  return (
    <div className="mb-8">
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        เลือกโหมดทบทวน
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {MODES
          .map((mode) => ({
            mode,
            ...checkModeAvailability(mode.id)
          }))
          .sort((a, b) => {
            // Sort: available modes first, then unavailable
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            return 0;
          })
          .map(({ mode, available, reason }) => {
          const isSelected = selectedMode === mode.id;
          const isShowingTooltip = showTooltip === mode.id;

          return (
            <div key={mode.id} className="relative">
              <motion.button
                whileHover={available ? { scale: 1.03, y: -2 } : {}}
                whileTap={available ? { scale: 0.97 } : {}}
                onClick={() => handleModeClick(mode.id)}
                disabled={!available}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  !available
                    ? isDark
                      ? 'bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-slate-100/50 border-slate-200/50 text-slate-400 cursor-not-allowed opacity-50'
                    : isSelected
                    ? `bg-gradient-to-br ${mode.color} border-transparent text-white ${
                        isDark ? '' : `shadow-lg ${dayShadowClass}`
                      }`
                    : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                }`}
                style={isSelected ? dayShadowStyle : {}}
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={`${
                    !available
                      ? 'opacity-50'
                      : isSelected
                      ? 'text-white'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}>
                    {mode.icon}
                  </div>
                  <div className={`font-bold text-sm ${
                    !available
                      ? ''
                      : isSelected
                      ? 'text-white'
                      : isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}>
                    {mode.name}
                  </div>
                  <div className={`text-xs text-center ${
                    !available
                      ? ''
                      : isSelected
                      ? 'text-white/80'
                      : isDark
                      ? 'text-slate-500'
                      : 'text-slate-500'
                  }`}>
                    {mode.description}
                  </div>
                </div>
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {isShowingTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap z-50 ${
                      isDark
                        ? 'bg-slate-700 text-slate-200 border border-slate-600'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {reason}
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 ${
                      isDark ? 'bg-slate-700 border-r border-b border-slate-600' : 'bg-slate-800'
                    }`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
