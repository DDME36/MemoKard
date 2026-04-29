import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getAllAchievements, getAchievementProgress, type UserProgress } from '../utils/achievements';
import { useFlashcardStore } from '../store/store';
import { useMemo } from 'react';

const rarityConfig: Record<string, { light: string; dark: string; badge: string; badgeDark: string; iconBg: string; iconBgDark: string; iconColor: string; iconColorDark: string; completedGradient: string }> = {
  common: {
    light: 'bg-white border-slate-200', dark: 'bg-slate-800/50 border-slate-700',
    badge: 'bg-slate-100 text-slate-600 border border-slate-300', badgeDark: 'bg-slate-700 text-slate-400',
    iconBg: 'bg-slate-100', iconBgDark: 'bg-slate-700/50', iconColor: 'text-slate-500', iconColorDark: 'text-slate-400',
    completedGradient: 'from-slate-500 to-slate-600',
  },
  rare: {
    light: 'bg-white border-blue-200', dark: 'bg-slate-800/50 border-blue-900/30',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200', badgeDark: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
    iconBg: 'bg-blue-50', iconBgDark: 'bg-blue-900/20', iconColor: 'text-blue-500', iconColorDark: 'text-blue-400',
    completedGradient: 'from-blue-500 to-blue-600',
  },
  epic: {
    light: 'bg-white border-purple-200', dark: 'bg-slate-800/50 border-purple-900/30',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200', badgeDark: 'bg-purple-900/30 text-purple-400 border border-purple-800/50',
    iconBg: 'bg-purple-50', iconBgDark: 'bg-purple-900/20', iconColor: 'text-purple-500', iconColorDark: 'text-purple-400',
    completedGradient: 'from-purple-500 to-purple-600',
  },
  legendary: {
    light: 'bg-white border-amber-200', dark: 'bg-slate-800/50 border-amber-900/30',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200', badgeDark: 'bg-amber-900/30 text-amber-400 border border-amber-800/50',
    iconBg: 'bg-amber-50', iconBgDark: 'bg-amber-900/20', iconColor: 'text-amber-500', iconColorDark: 'text-amber-400',
    completedGradient: 'from-amber-500 to-orange-500',
  },
};

// Unique SVG icons for each achievement
function AchievementIcon({ icon, className }: { icon?: string; className?: string }) {
  const cn = className || 'w-7 h-7';
  const props = { className: cn, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8 };
  const fp = { className: cn, fill: 'currentColor', viewBox: '0 0 24 24' };

  switch (icon) {
    case 'seedling': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V13M12 13C12 9 16 5 20 5C20 9 16 13 12 13ZM12 13C12 9 8 5 4 5C4 9 8 13 12 13Z" /></svg>;
    case 'stack': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
    case 'eye': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
    case 'layers': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
    case 'lightbulb': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
    case 'calendar': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    case 'shield': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    case 'bookmark': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
    case 'trophy': return <svg {...fp}><path d="M5 3h14v2h-1v2a5 5 0 01-3.05 4.61A4 4 0 0113 15.84V18h2v2H9v-2h2v-2.16a4 4 0 01-1.95-3.23A5 5 0 016 7V5H5V3zm3 4a3 3 0 003 3 3 3 0 003-3V5H8v2zM3 5h2v3a1 1 0 01-2 0V5zm16 0h2v3a1 1 0 11-2 0V5z" /></svg>;
    case 'bolt': return <svg {...fp}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    case 'target': return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    case 'grid': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
    case 'flame': return <svg {...fp}><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>;
    case 'vault': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
    case 'clock': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'heart': return <svg {...fp}><path d="M3.172 5.172a4 4 0 015.656 0L12 8.344l3.172-3.172a4 4 0 115.656 5.656L12 19.656l-8.828-8.828a4 4 0 010-5.656z" /></svg>;
    case 'compass': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></svg>;
    case 'crosshair': return <svg {...props}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M22 12h-4M6 12H2M12 6V2M12 22v-4" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'diamond': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 9.5L12 2l9.5 7.5L12 22 2.5 9.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 9.5h19" /></svg>;
    case 'crown': return <svg {...fp}><path d="M12 2l3 6 7-2-3 8H5L2 6l7 2 3-6zM5 16h14v2H5v-2z" /></svg>;
    case 'brain': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-1.5-2-4-2.5-5.5-1S4.5 7 6 9c-2 .5-3 2.5-2.5 4.5S6 17 8 16.5c-.5 2 1 4 3 4.5s4-1 4-3c1.5 1 3.5.5 4.5-1s.5-3.5-1-4.5c2-.5 3-2.5 2.5-4.5S17.5 5 16 6c.5-2-1-4-3-4.5" /></svg>;
    case 'book': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    case 'sparkles': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
    case 'infinity': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.413 0-4.413 8 0 8 5.606 0 7.644-8 12.74-8z" /></svg>;
    case 'moon': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
    default: return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

export default function AchievementsPage({ dayColor }: { dayColor: { gradient: string; shadow: string } }) {
  const { isDark } = useTheme();
  const store = useFlashcardStore();
  
  const progress: UserProgress = useMemo(() => ({
    cardsCreated: store.cards.length,
    decksCreated: store.decks.length,
    reviewsCompleted: Object.values(store.reviewHistory || {}).reduce((sum, count) => sum + count, 0),
    currentStreak: store.streak,
    maxStreak: store.streak, // TODO: track max streak separately
    perfectReviews: 0, // TODO: track perfect reviews
    totalStudyTime: 0, // TODO: track study time
    decksShared: 0, // TODO: track shared decks
    decksImported: 0 // TODO: track imported decks
  }), [store]);

  const achievements = getAllAchievements();
  const completed = getAchievementProgress(progress);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const sortedAchievements = useMemo(() => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return [...achievements].sort((a, b) => {
      const aC = completed[a.id], bC = completed[b.id];
      if (aC !== bC) return aC ? -1 : 1;
      if (aC && bC) return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });
  }, [achievements, completed]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Achievements</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ปลดล็อก achievements ด้วยการเรียนรู้และทบทวน</p>
      </div>

      {/* Progress Overview */}
      <div className={`rounded-3xl p-6 mb-8 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{completedCount} / {totalCount}</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Achievements Unlocked</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>{completionPercentage}%</div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Complete</p>
          </div>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${completionPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full bg-gradient-to-r ${dayColor.gradient}`} />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedAchievements.map((achievement, index) => {
          const isCompleted = completed[achievement.id];
          const cfg = rarityConfig[achievement.rarity];

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`rounded-2xl p-5 border-2 transition-all ${
                isCompleted
                  ? `bg-gradient-to-br ${cfg.completedGradient} border-transparent shadow-xl`
                  : isDark ? `${cfg.dark}` : `${cfg.light} shadow-sm`
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Unique Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? 'bg-white/20'
                    : isDark ? cfg.iconBgDark : cfg.iconBg
                }`}>
                  <div className={isCompleted ? 'text-white' : isDark ? cfg.iconColorDark : cfg.iconColor}>
                    <AchievementIcon icon={achievement.icon} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`font-bold text-base ${
                      isCompleted ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>{achievement.title}</h3>
                    {isCompleted && (
                      <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm mb-3 ${isCompleted ? 'text-white/90' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>{achievement.description}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isCompleted ? 'bg-white/20 text-white' : isDark ? cfg.badgeDark : cfg.badge
                  }`}>{achievement.rarity}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className={`mt-8 rounded-3xl p-6 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ความคืบหน้าของคุณ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{progress.cardsCreated}</div>
            <div className={`text-xs ${isDark ? 'text-purple-400/70' : 'text-purple-600/70'}`}>การ์ดที่สร้าง</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{progress.decksCreated}</div>
            <div className={`text-xs ${isDark ? 'text-sky-400/70' : 'text-sky-600/70'}`}>ชุดการ์ดที่สร้าง</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{progress.reviewsCompleted}</div>
            <div className={`text-xs ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>ทบทวนแล้ว</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{progress.currentStreak}</div>
            <div className={`text-xs ${isDark ? 'text-orange-400/70' : 'text-orange-600/70'}`}>วันติดต่อกัน</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
