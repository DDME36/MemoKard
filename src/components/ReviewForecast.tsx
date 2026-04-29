import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';

interface ReviewForecastProps {
  dayColor: { gradient: string; shadow: string };
}

const ReviewForecast = memo(function ReviewForecast({ dayColor }: ReviewForecastProps) {
  const { cards } = useFlashcardStore();
  const { isDark } = useTheme();

  const forecastData = useMemo(() => {
    const data = Array(7).fill(0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    cards.forEach(card => {
      const dueDate = new Date(card.nextReviewDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
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
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-sm font-bold uppercase tracking-widest ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>แผนผังการทบทวน (7 วันล่วงหน้า)</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${dayColor.gradient}`}></div>
          <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>จำนวนการ์ด</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {forecastData.map((count, i) => {
          const height = (count / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="relative w-full flex flex-col items-center group">
                {count > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: -5 }}
                    className={`absolute -top-8 px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold pointer-events-none z-10 ${
                      isDark ? 'bg-slate-700' : 'bg-slate-800'
                    }`}
                  >
                    {count}
                  </motion.div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, type: 'spring' }}
                  className={`w-full max-w-[30px] rounded-t-lg bg-gradient-to-b ${dayColor.gradient} opacity-80 group-hover:opacity-100 transition-opacity min-h-[4px]`}
                />
              </div>
              <span className={`text-[10px] font-medium truncate w-full text-center ${
                i === 0 ? 'font-bold text-rose-500' : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {days[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ReviewForecast;
