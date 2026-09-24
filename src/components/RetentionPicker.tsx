import { useFlashcardStore } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';

const PRESETS = [
  { value: 0.85, label: '85%', title: 'ผ่อนคลาย', hint: 'ทบทวนน้อยลง เหมาะกับการเรียนระยะยาวแบบสบาย ๆ' },
  { value: 0.9, label: '90%', title: 'แนะนำ', hint: 'สมดุลระหว่างจำแม่นกับจำนวนการ์ดต่อวัน' },
  { value: 0.95, label: '95%', title: 'เตรียมสอบ', hint: 'จำแม่นมาก แต่ต้องทบทวนถี่ขึ้นเกือบเท่าตัว' },
] as const;

/** ตั้ง "เป้าความจำ" ของ FSRS — โอกาสจำได้ที่ต้องการตอนถึงวันทบทวน */
export default function RetentionPicker() {
  const { isDark } = useTheme();
  const retention = useFlashcardStore((s) => s.desiredRetention);
  const setRetention = useFlashcardStore((s) => s.setDesiredRetention);
  const active = PRESETS.find((p) => p.value === retention);

  return (
    <fieldset className="relative z-10 mb-6">
      <legend className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        เป้าความจำ
      </legend>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="เป้าความจำ">
        {PRESETS.map((preset) => {
          const selected = preset.value === retention;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setRetention(preset.value)}
              className={`rounded-xl px-3 py-3 text-center border transition ${
                selected
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
              }`}
            >
              <span className="block text-lg font-bold display-font tabular-nums">{preset.label}</span>
              <span className="block text-xs font-medium">{preset.title}</span>
            </button>
          );
        })}
      </div>
      <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} aria-live="polite">
        {active ? active.hint : `ตั้งไว้ที่ ${Math.round(retention * 100)}%`} · มีผลกับการทบทวนครั้งถัดไป
      </p>
    </fieldset>
  );
}
