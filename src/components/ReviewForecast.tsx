import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { daysBetween, isCardDue, studyDayKey } from '../utils/studyDay';

interface ReviewForecastProps {
  dayColor: { gradient: string; shadow: string };
}

const ReviewForecast = memo(function ReviewForecast({ dayColor }: ReviewForecastProps) {
  const { cards } = useFlashcardStore();
  const { isDark } = useTheme();

  const forecastData = useMemo(() => {
    const data = Array(7).fill(0);
    const now = new Date();
    const today = studyDayKey(now);

    cards.forEach(card => {
      // การ์ดที่เลยกำหนดมาแล้วนับรวมในวันนี้
      const diffDays = isCardDue(card, now) ? 0 : daysBetween(today, studyDayKey(new Date(card.nextReviewDate)));
      if (diffDays >= 0 && diffDays < 7) {
        data[diffDays]++;
      }
    });

    return data;
  }, [cards]);

  const maxVal = Math.max(...forecastData, 1);
  const days = ['วันนี้', 'พรุ่งนี้', 'มะรืน', '3 วัน', '4 วัน', '5 วัน', '6 วัน'];

  return (
    <div className={`backdrop-blur-md rounded-3xl p-6 border ${
      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-purple-100 shadow-sm'
    }`}>
      <div className="mb-6">
        <h2 className={`text-lg font-bold display-font ${
          isDark ? 'text-slate-200' : 'text-slate-800'
        }`}>การ์ดที่ต้องทบทวน 7 วันข้างหน้า</h2>
      </div>

      <ol className="flex items-stretch justify-between gap-2 h-36" aria-label="จำนวนการ์ดที่ต้องทบทวนในแต่ละวัน">
        {forecastData.map((count, i) => {
          const height = count === 0 ? 0 : Math.max(8, (count / maxVal) * 100);
          return (
            <li key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1.5" aria-label={`${days[i]} ${count} ใบ`}>
              <span className={`text-xs font-bold tabular-nums display-font ${
                count === 0 ? (isDark ? 'text-slate-600' : 'text-slate-300') : isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                {count}
              </span>
              {/* พื้นที่แท่งมีความสูงแน่นอน ความสูงแบบ % ของแท่งจึงคำนวณได้ถูก */}
              <div className="relative flex-1 w-full flex items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  className={`w-full max-w-[32px] rounded-t-lg ${
                    count === 0 ? '' : `bg-gradient-to-b ${dayColor.gradient} ${i === 0 ? '' : 'opacity-60'}`
                  }`}
                />
                <div className={`absolute bottom-0 w-full max-w-[32px] h-[3px] rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              </div>
              <span className={`text-[11px] truncate w-full text-center ${
                i === 0 ? `font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}` : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {days[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
});

export default ReviewForecast;
