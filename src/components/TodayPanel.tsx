import { motion } from 'framer-motion';
import { Flame, Play, Plus, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { haptics } from '../utils/haptics';
import { estimateMinutes } from '../utils/todaySummary';

interface TodayPanelProps {
  due: number;
  totalCards: number;
  mastered: number;
  streak: number;
  hasDecks: boolean;
  nextBatch: { label: string; count: number } | null;
  dayColor: { gradient: string; shadow: string };
  onStartReview: () => void;
  onCreateDeck: () => void;
  onCreateWithAI: () => void;
}

/**
 * แผง "วันนี้" บนหน้าแรก — ตอบคำถามเดียว: วันนี้ต้องทำอะไร แล้วให้เริ่มได้ในแตะเดียว
 * สีประจำวันใช้ที่ปุ่มหลักจุดเดียว ส่วนอื่นเป็นสีกลาง
 */
export default function TodayPanel({
  due, totalCards, mastered, streak, hasDecks, nextBatch, dayColor,
  onStartReview, onCreateDeck, onCreateWithAI,
}: TodayPanelProps) {
  const { isDark } = useTheme();
  const ink = isDark ? 'text-slate-100' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const primary = `bg-gradient-to-r ${dayColor.gradient} text-white ${isDark ? '' : `shadow-lg ${dayColor.shadow}`}`;
  const secondary = isDark
    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300';

  let headline: string;
  let detail: string;
  if (!hasDecks) {
    headline = 'เริ่มจากชุดการ์ดชุดแรก';
    detail = 'เขียนการ์ดเอง หรือให้ AI ช่วยร่างจากหัวข้อที่อยากจำ แล้วแอปจะนัดวันทบทวนให้';
  } else if (due > 0) {
    headline = `วันนี้มี ${due.toLocaleString('th-TH')} ใบรอทบทวน`;
    detail = `ใช้เวลาราว ${estimateMinutes(due)} นาที`;
  } else if (totalCards === 0) {
    headline = 'ชุดการ์ดยังว่างอยู่';
    detail = 'เปิดชุดการ์ดแล้วเพิ่มการ์ดใบแรก การ์ดใหม่จะขึ้นให้ทบทวนทันที';
  } else {
    headline = 'วันนี้ทบทวนครบแล้ว';
    detail = nextBatch ? `รอบถัดไป${nextBatch.label} ${nextBatch.count.toLocaleString('th-TH')} ใบ` : 'ยังไม่มีการ์ดที่นัดไว้';
  }

  return (
    <section aria-labelledby="today-heading" className="premium-card rounded-3xl border p-5 sm:p-7 mb-6">
      <h1 id="today-heading" className={`text-2xl sm:text-3xl font-bold leading-snug display-font ${ink}`} style={{ textWrap: 'balance' }}>
        {headline}
      </h1>
      <p className={`mt-1.5 text-sm sm:text-base ${muted}`}>{detail}</p>

      {!hasDecks ? (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); onCreateDeck(); }}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold transition ${primary}`}
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            สร้างชุดการ์ด
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptics.light(); onCreateWithAI(); }}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold transition ${secondary}`}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            ให้ AI ช่วยสร้าง
          </motion.button>
        </div>
      ) : due > 0 ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => { haptics.medium(); onStartReview(); }}
          className={`mt-5 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold transition display-font ${primary}`}
        >
          <Play className="w-5 h-5 fill-current" aria-hidden="true" />
          เริ่มทบทวน
        </motion.button>
      ) : null}

      {hasDecks && totalCards > 0 && (
        <dl className={`mt-5 pt-4 border-t grid grid-cols-3 gap-2 text-center ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
          <div>
            <dt className={`text-xs ${muted}`}>การ์ดทั้งหมด</dt>
            <dd className={`text-lg font-bold display-font tabular-nums ${ink}`}>{totalCards.toLocaleString('th-TH')}</dd>
          </div>
          <div>
            <dt className={`text-xs ${muted}`}>จำแม่นแล้ว</dt>
            <dd className={`text-lg font-bold display-font tabular-nums ${ink}`}>{mastered.toLocaleString('th-TH')}</dd>
          </div>
          <div>
            <dt className={`text-xs ${muted}`}>ทบทวนต่อเนื่อง</dt>
            <dd className={`text-lg font-bold display-font tabular-nums flex items-center justify-center gap-1 ${streak > 0 ? 'text-orange-500' : ink}`}>
              {streak > 0 && <Flame className="w-4 h-4" aria-hidden="true" />}
              {streak} วัน
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
