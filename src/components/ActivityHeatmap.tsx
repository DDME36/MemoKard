import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface ActivityHeatmapProps {
  reviewHistory: Record<string, number>;
  dayColor: { gradient: string; shadow: string };
}

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function generateGrid(weeks = 13) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days: Date[] = [];
  
  // นับย้อนหลังจากวันนี้ไป (weeks * 7 - 1) วัน
  // -1 เพราะเราจะเอาวันนี้ด้วย
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  
  return days;
}

const OPACITY_LEVELS = [0, 0.3, 0.55, 0.75, 1] as const;

// Absolute thresholds — เหมาะกับ flashcard app ที่ทบทวนวันละ 5-20 ใบ
function getLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3)  return 1; // 1-3 ใบ
  if (count <= 8)  return 2; // 4-8 ใบ
  if (count <= 15) return 3; // 9-15 ใบ
  return 4;                  // 16+ ใบ
  // max ยังคงใช้ใน legend เพื่อ reference
  void max;
}

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function formatDateThai(key: string) {
  const [y, , d] = key.split('-');
  const month = new Date(key).toLocaleString('th-TH', { month: 'short' });
  return `${parseInt(d)} ${month} ${parseInt(y) + 543}`;
}

interface TooltipState {
  key: string;
  count: number;
  x: number;
  y: number;
}

export default function ActivityHeatmap({ reviewHistory, dayColor }: ActivityHeatmapProps) {
  const { isDark } = useTheme();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const days = useMemo(() => generateGrid(13), []);

  const maxCount = useMemo(() => {
    const vals = Object.values(reviewHistory);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [reviewHistory]);

  const totalThisYear = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return Object.entries(reviewHistory)
      .filter(([k]) => k.startsWith(year))
      .reduce((sum, [, v]) => sum + v, 0);
  }, [reviewHistory]);

  const firstDayOfWeek = days[0].getDay();
  const paddedDays: (Date | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...days,
  ];
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const monthLabels: { label: string; colIndex: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d !== null) as Date | undefined;
    if (!firstReal) return;
    const prev = wi > 0 ? (weeks[wi - 1].find(d => d !== null) as Date | undefined) : undefined;
    if (!prev || prev.getMonth() !== firstReal.getMonth()) {
      monthLabels.push({
        label: firstReal.toLocaleString('th-TH', { month: 'short' }),
        colIndex: wi,
      });
    }
  });

  const today = toKey(new Date());

  return (
    <div className={`rounded-2xl p-5 border ${
      isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          กิจกรรมการทบทวน
        </h3>
        <span className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {totalThisYear} ครั้งปีนี้
        </span>
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1 pt-5 flex-shrink-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className={`h-3 sm:h-3.5 flex items-center text-[8px] font-medium ${
              isDark ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>

        {/* CSS Grid — แบ่งคอลัมน์เท่ากันอัตโนมัติ ไม่ยืด ไม่หด */}
        <div
          className="flex-1 grid items-start"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
        >
          {weeks.map((week, wi) => {
            const monthLabel = monthLabels.find(m => m.colIndex === wi);
            return (
              <div key={wi} className="flex flex-col items-center gap-1">
                {/* Month label */}
                <div className={`h-4 text-[9px] font-semibold truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {monthLabel?.label ?? ''}
                </div>
                {/* Day cells */}
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={di} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
                  }
                  const key = toKey(day);
                  const count = reviewHistory[key] ?? 0;
                  const level = getLevel(count, maxCount);
                  const opacity = OPACITY_LEVELS[level];
                  const isToday = key === today;

                  return (
                    <div key={di} className="relative group">
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({ key, count, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm cursor-default relative overflow-hidden ${
                          level === 0
                            ? isDark ? 'bg-slate-700/60' : 'bg-slate-100'
                            : ''
                        } ${isToday
                            ? `outline outline-1 outline-offset-1 ${isDark ? 'outline-slate-400' : 'outline-slate-500'}`
                            : ''
                        }`}
                      >
                        {level > 0 && (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${dayColor.gradient}`}
                            style={{ opacity }}
                          />
                        )}
                      </motion.div>

                      {/* ไม่มี tooltip ใน cell แล้ว — ย้ายไป fixed portal ด้านล่าง */}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className={`text-[10px] mr-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>น้อย</span>
        {OPACITY_LEVELS.map((op, i) => (
          <div
            key={i}
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm relative overflow-hidden flex-shrink-0 ${
              op === 0 ? (isDark ? 'bg-slate-700/60' : 'bg-slate-100') : ''
            }`}
          >
            {op > 0 && (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${dayColor.gradient}`}
                style={{ opacity: op }}
              />
            )}
          </div>
        ))}
        <span className={`text-[10px] ml-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>มาก</span>
      </div>

      {/* Tooltip — fixed position ไม่ดัน layout เลย */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 2, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`fixed z-[9999] pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isDark
                ? 'bg-slate-700 text-slate-200 border border-slate-600'
                : 'bg-slate-800 text-white'
            }`}
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {formatDateThai(tooltip.key)}
            {tooltip.count > 0 ? ` · ${tooltip.count} ครั้ง` : ' · ยังไม่ได้ทบทวน'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}