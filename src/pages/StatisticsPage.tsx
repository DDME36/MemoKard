import { motion } from 'framer-motion';
import { useFlashcardStore } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { Brain } from 'lucide-react';

interface StatisticsPageProps {
  dayColor: { gradient: string; shadow: string };
}

export default function StatisticsPage({ dayColor }: StatisticsPageProps) {
  const { isDark } = useTheme();
  const { cards, reviewHistory, streak } = useFlashcardStore();

  const stats = useMemo(() => {
    const totalCards = cards.length;
    const now = new Date();
    const dueCards = cards.filter(c => new Date(c.nextReviewDate) <= now).length;
    const newCards = cards.filter(c => c.repetition === 0).length;
    const learningCards = cards.filter(c => c.repetition > 0 && c.repetition < 3).length;
    const matureCards = cards.filter(c => c.repetition >= 3).length;

    const reviewedCards = cards.filter(c => c.repetition > 0);
    const successfulCards = reviewedCards.filter(c => c.interval >= 1);
    const retentionRate = reviewedCards.length > 0 
      ? Math.round((successfulCards.length / reviewedCards.length) * 100) 
      : 0;

    const avgEaseFactor = reviewedCards.length > 0
      ? (reviewedCards.reduce((sum, c) => sum + c.easeFactor, 0) / reviewedCards.length).toFixed(2)
      : '2.50';

    const totalReviews = Object.values(reviewHistory).reduce((sum, count) => sum + count, 0);
    const today = new Date().toISOString().slice(0, 10);
    const reviewsToday = reviewHistory[today] || 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reviewsThisWeek = Object.entries(reviewHistory)
      .filter(([date]) => new Date(date) >= weekAgo)
      .reduce((sum, [, count]) => sum + count, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = Object.entries(reviewHistory)
      .filter(([date]) => new Date(date) >= thirtyDaysAgo);
    const avgReviewsPerDay = recentReviews.length > 0
      ? Math.round(recentReviews.reduce((sum, [, count]) => sum + count, 0) / 30)
      : 0;

    const forecast = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
      const dueCount = cards.filter(c => {
        const cardDate = new Date(c.nextReviewDate);
        return cardDate.toDateString() === date.toDateString();
      }).length;
      return { date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }), count: dueCount };
    });

    // ✅ Real FSRS metrics from card.fsrsState
    const cardsWithFSRS = cards.filter(c => c.fsrsState && c.fsrsState.reps > 0);
    const avgStability = cardsWithFSRS.length > 0
      ? (cardsWithFSRS.reduce((s, c) => s + (c.fsrsState?.stability ?? 0), 0) / cardsWithFSRS.length).toFixed(1)
      : '0.0';
    const avgDifficulty = cardsWithFSRS.length > 0
      ? (cardsWithFSRS.reduce((s, c) => s + (c.fsrsState?.difficulty ?? 5), 0) / cardsWithFSRS.length).toFixed(2)
      : '5.00';
    const avgInterval = reviewedCards.length > 0
      ? Math.round(reviewedCards.reduce((s, c) => s + c.interval, 0) / reviewedCards.length)
      : 0;
    // FSRS state distribution: 0=New, 1=Learning, 2=Review, 3=Relearning
    const fsrsStateNew      = cards.filter(c => (c.fsrsState?.state ?? 0) === 0).length;
    const fsrsStateLearning = cards.filter(c => (c.fsrsState?.state ?? 0) === 1).length;
    const fsrsStateReview   = cards.filter(c => (c.fsrsState?.state ?? 0) === 2).length;
    const fsrsStateRelearn  = cards.filter(c => (c.fsrsState?.state ?? 0) === 3).length;

    // ✅ Real FSRS Forgetting Curve — R(t,S) = (1 + FACTOR*t/S)^DECAY
    const FSRS_FACTOR = 19 / 81;
    const FSRS_DECAY = -0.5;
    const fsrsR = (t: number, s: number) => Math.pow(1 + FSRS_FACTOR * t / s, FSRS_DECAY);
    // time when retention drops to 90%: t = S * (0.9^(1/DECAY) - 1) / FACTOR
    const reviewAt = (s: number) => s * (Math.pow(0.9, 1 / FSRS_DECAY) - 1) / FSRS_FACTOR;
    // Use avgStability for real curves; fallback to 1 if no data
    const curveS2 = Math.max(parseFloat(avgStability) || 1, 1);
    const curveS1 = 1.0;              // initial stability (first encounter)
    const curveS3 = curveS2 * 2.0;   // estimated stability after 2nd review
    const ct1 = reviewAt(curveS1);
    const ct2 = reviewAt(curveS2);
    const ct3 = reviewAt(curveS3);
    const totalT = ct1 + ct2 + ct3;
    const svgX = (t: number) => 10 + (t / totalT) * 980;
    const svgY = (r: number) => 20 + (1 - r) * 160;
    const N = 60;
    const makeSeg = (len: number, offset: number, s: number) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const t = (i / N) * len;
        return `${svgX(offset + t).toFixed(1)},${svgY(fsrsR(t, s)).toFixed(1)}`;
      });
    const pts1 = makeSeg(ct1, 0,         curveS1);
    const pts2 = makeSeg(ct2, ct1,        curveS2);
    const pts3 = makeSeg(ct3, ct1 + ct2,  curveS3);
    const curvePath1 = 'M ' + pts1.join(' L ');
    const curvePath2 = 'M ' + pts2.join(' L ');
    const curvePath3 = 'M ' + pts3.join(' L ');
    const fillPath1  = curvePath1 + ` L ${svgX(ct1).toFixed(1)},180 L ${svgX(0).toFixed(1)},180 Z`;
    const fillPath2  = curvePath2 + ` L ${svgX(ct1+ct2).toFixed(1)},180 L ${svgX(ct1).toFixed(1)},180 Z`;
    const fillPath3  = curvePath3 + ` L ${svgX(totalT).toFixed(1)},180 L ${svgX(ct1+ct2).toFixed(1)},180 Z`;
    const reviewX1   = svgX(ct1);
    const reviewX2   = svgX(ct1 + ct2);
    const reviewY    = svgY(0.9);
    const dayLabel1  = `${Math.round(ct1)} วัน`;
    const dayLabel2  = `${Math.round(ct1 + ct2)} วัน`;
    const dayLabel3  = `${Math.round(totalT)} วัน`;

    return {
      totalCards, dueCards, newCards, learningCards, matureCards,
      retentionRate, avgEaseFactor, totalReviews, reviewsToday,
      reviewsThisWeek, avgReviewsPerDay, forecast,
      // FSRS metrics
      avgStability, avgDifficulty, avgInterval,
      fsrsStateNew, fsrsStateLearning, fsrsStateReview, fsrsStateRelearn,
      cardsWithFSRS: cardsWithFSRS.length,
      // FSRS Forgetting Curve paths (real math)
      curvePath1, curvePath2, curvePath3,
      fillPath1, fillPath2, fillPath3,
      reviewX1, reviewX2, reviewY,
      dayLabel1, dayLabel2, dayLabel3,
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
        <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถานะของการ์ด
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-2">
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

      {/* FSRS Memory Engine Section */}
      <div className={`p-6 rounded-2xl border mb-8 overflow-hidden relative ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Brain className="w-6 h-6 text-indigo-500" /> ระบบช่วยจำ FSRS
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              วิเคราะห์และปรับจูนความจำของคุณตาม Forgetting Curve
            </p>
          </div>
        </div>

        {/* FSRS Real Stats Grid */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
          <div className={`p-4 rounded-xl text-center ${ isDark ? 'bg-slate-700/50' : 'bg-indigo-50' }`}>
            <div className={`text-2xl font-bold ${ isDark ? 'text-indigo-400' : 'text-indigo-600' }`}>{stats.avgStability}</div>
            <div className={`text-xs font-semibold mt-1 ${ isDark ? 'text-slate-400' : 'text-slate-600' }`}>Stability (วัน)</div>
            <div className={`text-[10px] mt-0.5 ${ isDark ? 'text-slate-500' : 'text-slate-400' }`}>ค่าเฉลี่ยความคงทนของความจำ</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${ isDark ? 'bg-slate-700/50' : 'bg-rose-50' }`}>
            <div className={`text-2xl font-bold ${ isDark ? 'text-rose-400' : 'text-rose-600' }`}>{stats.avgDifficulty}</div>
            <div className={`text-xs font-semibold mt-1 ${ isDark ? 'text-slate-400' : 'text-slate-600' }`}>Difficulty</div>
            <div className={`text-[10px] mt-0.5 ${ isDark ? 'text-slate-500' : 'text-slate-400' }`}>1 = ง่ายสุด / 10 = ยากสุด</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${ isDark ? 'bg-slate-700/50' : 'bg-emerald-50' }`}>
            <div className={`text-2xl font-bold ${ isDark ? 'text-emerald-400' : 'text-emerald-600' }`}>{stats.avgInterval} วัน</div>
            <div className={`text-xs font-semibold mt-1 ${ isDark ? 'text-slate-400' : 'text-slate-600' }`}>Avg Interval</div>
            <div className={`text-[10px] mt-0.5 ${ isDark ? 'text-slate-500' : 'text-slate-400' }`}>ระยะเวลาทบทวนเฉลี่ย</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${ isDark ? 'bg-slate-700/50' : 'bg-purple-50' }`}>
            <div className={`text-2xl font-bold ${ isDark ? 'text-purple-400' : 'text-purple-600' }`}>{stats.cardsWithFSRS}</div>
            <div className={`text-xs font-semibold mt-1 ${ isDark ? 'text-slate-400' : 'text-slate-600' }`}>การ์ดใน FSRS</div>
            <div className={`text-[10px] mt-0.5 ${ isDark ? 'text-slate-500' : 'text-slate-400' }`}>มี state ของตัวเอง</div>
          </div>
        </div>

        {/* FSRS State Distribution */}
        <div className={`p-4 rounded-xl mb-6 relative z-10 ${ isDark ? 'bg-slate-700/30' : 'bg-slate-50' }`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${ isDark ? 'text-slate-400' : 'text-slate-500' }`}>Card State Distribution</div>
          <div className="flex gap-2 h-4 rounded-full overflow-hidden">
            {stats.totalCards > 0 && (
              <>
                {stats.fsrsStateNew > 0 && <div title={`New: ${stats.fsrsStateNew}`} className="bg-blue-400" style={{ width: `${(stats.fsrsStateNew / stats.totalCards) * 100}%` }} />}
                {stats.fsrsStateLearning > 0 && <div title={`Learning: ${stats.fsrsStateLearning}`} className="bg-amber-400" style={{ width: `${(stats.fsrsStateLearning / stats.totalCards) * 100}%` }} />}
                {stats.fsrsStateReview > 0 && <div title={`Review: ${stats.fsrsStateReview}`} className="bg-emerald-400" style={{ width: `${(stats.fsrsStateReview / stats.totalCards) * 100}%` }} />}
                {stats.fsrsStateRelearn > 0 && <div title={`Relearning: ${stats.fsrsStateRelearn}`} className="bg-rose-400" style={{ width: `${(stats.fsrsStateRelearn / stats.totalCards) * 100}%` }} />}
              </>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-[11px] flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />New ({stats.fsrsStateNew})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Learning ({stats.fsrsStateLearning})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Review ({stats.fsrsStateReview})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Relearning ({stats.fsrsStateRelearn})</span>
          </div>
        </div>

        {/* FSRS Forgetting Curve — Real math from R(t,S) = (1 + 19/81 * t/S)^(-0.5) */}
        <div className="w-full h-44 mt-6 select-none hidden md:block flex flex-col">
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Forgetting Curve — คำนวณจากข้อมูล Stability จริงของคุณ
          </p>
          <div className="relative w-full flex-1 min-h-[140px]">
            <svg viewBox="0 0 1000 200" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fg1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="fg2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="fg3" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="20" x2="1000" y2="20" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="100" x2="1000" y2="100" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="180" x2="1000" y2="180" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="2" />

              {/* Fill areas */}
              <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} d={stats.fillPath1} fill="url(#fg1)" />
              <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} d={stats.fillPath2} fill="url(#fg2)" />
              <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} d={stats.fillPath3} fill="url(#fg3)" />

              {/* Decay curves */}
              <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} d={stats.curvePath1} fill="none" stroke={isDark ? '#f43f5e' : '#f43f5e'} strokeWidth="2.5" strokeLinecap="round" />
              <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.4 }} d={stats.curvePath2} fill="none" stroke={isDark ? '#f59e0b' : '#f59e0b'} strokeWidth="2.5" strokeLinecap="round" />
              <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.8 }} d={stats.curvePath3} fill="none" stroke={isDark ? '#10b981' : '#10b981'} strokeWidth="2.5" strokeLinecap="round" />

              {/* Review dots (start of each new segment = 100% after review) */}
              <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0 }}   cx="10"                   cy="20" r="5" fill="#f43f5e" />
              <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} cx={stats.reviewX1}       cy="20" r="5" fill="#f59e0b" />
              <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }}   cx={stats.reviewX2}       cy="20" r="5" fill="#10b981" />

              {/* Vertical review lines */}
              <motion.line initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} x1={stats.reviewX1} y1="20" x2={stats.reviewX1} y2={stats.reviewY} stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" strokeDasharray="4,4" />
              <motion.line initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}   x1={stats.reviewX2} y1="20" x2={stats.reviewX2} y2={stats.reviewY} stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" strokeDasharray="4,4" />
            </svg>

            {/* HTML Overlay for Text (prevents font stretching from preserveAspectRatio="none") */}
            <div className="absolute inset-0 w-full h-full pointer-events-none text-xs">
              {/* Y-axis Labels */}
              <span className={`absolute left-[0.5%] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ top: 'calc(10% - 18px)' }}>100%</span>
              <span className={`absolute left-[0.5%] ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ top: 'calc(50% - 16px)' }}>50%</span>
              <span className={`absolute left-[0.5%] text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`} style={{ top: 'calc(90% - 16px)' }}>0%</span>
              
              {/* Day Labels at review points */}
              <span className={`absolute text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`} style={{ left: `calc(${((stats.reviewX1 + 6) / 1000) * 100}%)`, top: 'calc(90% - 18px)' }}>{stats.dayLabel1}</span>
              <span className={`absolute text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`} style={{ left: `calc(${((stats.reviewX2 + 6) / 1000) * 100}%)`, top: 'calc(90% - 18px)' }}>{stats.dayLabel2}</span>
              <span className={`absolute right-[2%] text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`} style={{ top: 'calc(90% - 18px)' }}>{stats.dayLabel3}</span>

              {/* Segment Labels */}
              <span className="absolute left-[2%] font-semibold text-rose-500" style={{ top: 'calc(75% - 16px)' }}>จำครั้งแรก</span>
              <span className="absolute font-semibold text-amber-500" style={{ left: `calc(${((stats.reviewX1 + 10) / 1000) * 100}%)`, top: 'calc(65% - 16px)' }}>ทบทวนครั้งที่ 1</span>
              <span className="absolute font-semibold text-emerald-500" style={{ left: `calc(${((stats.reviewX2 + 10) / 1000) * 100}%)`, top: 'calc(40% - 16px)' }}>ทบทวนครั้งที่ 2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Activity */}
      <div className={`p-6 rounded-2xl border mb-8 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          กิจกรรมการทบทวน (Activity)
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
