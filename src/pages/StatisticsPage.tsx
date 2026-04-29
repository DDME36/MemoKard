import { motion } from 'framer-motion';
import { useFlashcardStore } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';
import ActivityHeatmap from '../components/ActivityHeatmap';

interface StatisticsPageProps {
  dayColor: { gradient: string; shadow: string };
}

export default function StatisticsPage({ dayColor }: StatisticsPageProps) {
  const { isDark } = useTheme();
  const { cards, reviewHistory, streak } = useFlashcardStore();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCards = cards.length;
    const now = new Date();
    const dueCards = cards.filter(c => new Date(c.nextReviewDate) <= now).length;
    const newCards = cards.filter(c => c.repetition === 0).length;
    const learningCards = cards.filter(c => c.repetition > 0 && c.repetition < 3).length;
    const matureCards = cards.filter(c => c.repetition >= 3).length;

    // Calculate retention rate (cards with interval > 1 day / total reviewed cards)
    const reviewedCards = cards.filter(c => c.repetition > 0);
    const successfulCards = reviewedCards.filter(c => c.interval >= 1);
    const retentionRate = reviewedCards.length > 0 
      ? Math.round((successfulCards.length / reviewedCards.length) * 100) 
      : 0;

    // Calculate average ease factor
    const avgEaseFactor = reviewedCards.length > 0
      ? (reviewedCards.reduce((sum, c) => sum + c.easeFactor, 0) / reviewedCards.length).toFixed(2)
      : '2.50';

    // Total reviews
    const totalReviews = Object.values(reviewHistory).reduce((sum, count) => sum + count, 0);

    // Reviews today
    const today = new Date().toISOString().slice(0, 10);
    const reviewsToday = reviewHistory[today] || 0;

    // Reviews this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reviewsThisWeek = Object.entries(reviewHistory)
      .filter(([date]) => new Date(date) >= weekAgo)
      .reduce((sum, [, count]) => sum + count, 0);

    // Average reviews per day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = Object.entries(reviewHistory)
      .filter(([date]) => new Date(date) >= thirtyDaysAgo);
    const avgReviewsPerDay = recentReviews.length > 0
      ? Math.round(recentReviews.reduce((sum, [, count]) => sum + count, 0) / 30)
      : 0;

    // Forecast: cards due in next 7 days
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
      const dueCount = cards.filter(c => {
        const cardDate = new Date(c.nextReviewDate);
        return cardDate.toDateString() === date.toDateString();
      }).length;
      return { date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }), count: dueCount };
    });

    return {
      totalCards,
      dueCards,
      newCards,
      learningCards,
      matureCards,
      retentionRate,
      avgEaseFactor,
      totalReviews,
      reviewsToday,
      reviewsThisWeek,
      avgReviewsPerDay,
      forecast,
    };
  }, [cards, reviewHistory]);

  const StatCard = ({ title, value, subtitle, icon, color }: any) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${
        isDark
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}>
        {icon}
      </div>
      <h3 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </h3>
      <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {title}
      </p>
      {subtitle && (
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถิติการเรียน
        </h1>
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
          ติดตามความก้าวหน้าและวิเคราะห์การเรียนรู้ของคุณ
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="การ์ดทั้งหมด"
          value={stats.totalCards}
          icon={
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          }
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="ต้องทบทวนวันนี้"
          value={stats.dueCards}
          icon={
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          }
          color="from-rose-500 to-rose-600"
        />
        <StatCard
          title="Streak"
          value={`${streak} วัน`}
          icon={
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          }
          color="from-orange-500 to-orange-600"
        />
        <StatCard
          title="อัตราความจำ"
          value={`${stats.retentionRate}%`}
          icon={
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
          color="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Card Distribution */}
      <div className={`p-6 rounded-2xl border mb-8 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การกระจายของการ์ด
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {stats.newCards}
            </div>
            <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              การ์ดใหม่
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ยังไม่เคยทบทวน
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              {stats.learningCards}
            </div>
            <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              กำลังเรียน
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ทบทวน 1-2 ครั้ง
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {stats.matureCards}
            </div>
            <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              จำได้แล้ว
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ทบทวน 3+ ครั้ง
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>
              {stats.avgEaseFactor}
            </div>
            <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Ease Factor
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ค่าเฉลี่ยความง่าย
            </div>
          </div>
        </div>
      </div>

      {/* Review Activity */}
      <div className={`p-6 rounded-2xl border mb-8 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          กิจกรรมการทบทวน
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.totalReviews}
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ทบทวนทั้งหมด
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.reviewsToday}
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ทบทวนวันนี้
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.reviewsThisWeek}
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ทบทวนสัปดาห์นี้
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.avgReviewsPerDay}
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              เฉลี่ย/วัน (30 วัน)
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap reviewHistory={reviewHistory} dayColor={dayColor} />
      </div>

      {/* Forecast */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การ์ดที่ต้องทบทวนใน 7 วันข้างหน้า
        </h2>
        {stats.forecast.every(day => day.count === 0) ? (
          <div className="text-center py-8">
            <svg className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ยังไม่มีการ์ดที่ต้องทบทวนใน 7 วันข้างหน้า
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              ทบทวนการ์ดเพื่อให้ระบบกำหนดเวลาทบทวนครั้งถัดไป
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.forecast.map((day, index) => {
              const maxCount = Math.max(...stats.forecast.map(d => d.count), 1);
              const percentage = (day.count / maxCount) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {day.date}
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {day.count} การ์ด
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${dayColor.gradient}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
