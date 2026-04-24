import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, DECK_COLORS, type DeckColor } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { importDeckFromText, importDeck } from '../utils/deckIO';
import { haptics } from '../utils/haptics';

interface AddDeckProps {
  onClose: () => void;
  onCreated: (deckId: string) => void;
  dayColor: { gradient: string; shadow: string };
}

const COLOR_MAP: Record<DeckColor, { bg: string; ring: string; label: string }> = {
  violet: { bg: 'bg-violet-400', ring: 'ring-violet-400', label: 'ม่วง' },
  sky:    { bg: 'bg-sky-400',    ring: 'ring-sky-400',    label: 'ฟ้า' },
  teal:   { bg: 'bg-teal-400',   ring: 'ring-teal-400',   label: 'เขียว' },
  rose:   { bg: 'bg-rose-400',   ring: 'ring-rose-400',   label: 'ชมพู' },
  amber:  { bg: 'bg-amber-400',  ring: 'ring-amber-400',  label: 'เหลือง' },
  emerald:{ bg: 'bg-emerald-400',ring: 'ring-emerald-400',label: 'มรกต' },
  pink:   { bg: 'bg-pink-400',   ring: 'ring-pink-400',   label: 'ชมพูอ่อน' },
  indigo: { bg: 'bg-indigo-400', ring: 'ring-indigo-400', label: 'คราม' },
};

export default function AddDeck({ onClose, onCreated, dayColor }: AddDeckProps) {
  const [mode, setMode] = useState<'create' | 'import'>('create');
  
  // Create state
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>('violet');
  
  // Import state
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const addDeck = useFlashcardStore((s) => s.addDeck);
  const addCard = useFlashcardStore((s) => s.addCard);
  const { isDark } = useTheme();

  // Extract color values from gradient for styling
  const getColorValues = () => {
    const colorMap: Record<string, { border: string; bg: string; bgHover: string; text: string; light: string }> = {
      red: { border: '#f87171', bg: '#fef2f2', bgHover: '#fee2e2', text: '#ef4444', light: '#fecaca' },
      yellow: { border: '#fbbf24', bg: '#fefce8', bgHover: '#fef3c7', text: '#f59e0b', light: '#fde68a' },
      pink: { border: '#f472b6', bg: '#fdf2f8', bgHover: '#fce7f3', text: '#ec4899', light: '#fbcfe8' },
      green: { border: '#4ade80', bg: '#f0fdf4', bgHover: '#dcfce7', text: '#22c55e', light: '#bbf7d0' },
      orange: { border: '#fb923c', bg: '#fff7ed', bgHover: '#ffedd5', text: '#f97316', light: '#fed7aa' },
      sky: { border: '#38bdf8', bg: '#f0f9ff', bgHover: '#e0f2fe', text: '#0ea5e9', light: '#bae6fd' },
      purple: { border: '#a78bfa', bg: '#faf5ff', bgHover: '#f3e8ff', text: '#a855f7', light: '#e9d5ff' },
    };
    
    const match = dayColor.gradient.match(/from-(\w+)-/);
    const colorName = match ? match[1] : 'purple';
    return colorMap[colorName] || colorMap.purple;
  };

  const colors = getColorValues();

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    const deck = await addDeck(name.trim(), color);
    onCreated(deck.id);
    onClose();
  };

  const handleImportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!importText.trim()) return;
    
    setIsImporting(true);
    setImportError('');
    
    try {
      const parsedData = importDeckFromText(importText);
      const colorToUse = DECK_COLORS.includes(parsedData.deck.color as DeckColor) ? (parsedData.deck.color as DeckColor) : 'violet';
      
      const deck = await addDeck(parsedData.deck.name, colorToUse);
      
      // Add cards sequentially
      for (const card of parsedData.cards) {
        await addCard(deck.id, card.question, card.answer);
      }
      
      onCreated(deck.id);
      haptics.success();
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');

    try {
      const parsedData = await importDeck(file);
      const colorToUse = DECK_COLORS.includes(parsedData.deck.color as DeckColor) ? (parsedData.deck.color as DeckColor) : 'violet';
      
      const deck = await addDeck(parsedData.deck.name, colorToUse);
      
      for (const card of parsedData.cards) {
        await addCard(deck.id, card.question, card.answer);
      }
      
      onCreated(deck.id);
      haptics.success();
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'ไม่สามารถอ่านไฟล์ได้');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const AI_PROMPT = `สร้าง Flashcard เรื่อง [ใส่หัวข้อที่ต้องการ] จำนวน [ใส่ตัวเลข หรือเว้นว่างไว้] ข้อ

*เงื่อนไขพิเศษเกี่ยวกับจำนวนการ์ด: หากฉันไม่ได้ระบุตัวเลข หรือพิมพ์ข้อความว่า "ทั้งหมด" ให้คุณวิเคราะห์และสกัดเนื้อหา สร้างการ์ดออกมาให้ครอบคลุมทฤษฎี นิยาม และสูตรสำคัญของเรื่องนี้มาให้ครบถ้วนที่สุดเท่าที่ทำได้

ให้แสดงผลลัพธ์เป็น Code Block JSON format ตามโครงสร้างด้านล่างเท่านั้น ห้ามมีข้อความอื่นหรือคำเกริ่นนำใดๆ

กฎการสร้างเนื้อหา (บังคับใช้เคร่งครัด):
1. คำถาม (question): ต้องเป็น "ประโยคคำถาม" ที่อ่านแล้วรู้ทันทีว่าต้องการอะไร ห้ามพิมพ์มาแค่คำโดดๆ หรือคีย์เวิร์ด
   (ตัวอย่าง: ❌ "Impedance" ✅ "จงอธิบายความหมายของ Impedance" หรือ ✅ "สูตรคำนวณหาค่า Impedance ในวงจร RLC คืออะไร?")
2. คำตอบ (answer): ต้องให้คำตอบที่ตรงประเด็นและเข้าใจง่าย หากคำตอบมี "สูตรคณิตศาสตร์" ต้องอธิบายความหมายของตัวแปรแต่ละตัวสั้นๆ ต่อท้ายสูตรด้วยเสมอ
3. ชื่อชุดการ์ด (name): สั้นกระชับ ไม่เกิน 40 ตัวอักษร สี (color) ให้เลือกจาก: violet, sky, teal, rose, amber, emerald, pink, indigo
4. รูปแบบสมการคณิตศาสตร์และฟิสิกส์ (บังคับขั้นเด็ดขาด):
   - ห้ามใช้ตัวอักษรพิเศษ (Unicode Math) เช่น ∑, ², ³, α, β, Δ เด็ดขาด!
   - ห้ามจัดรูปแบบเศษส่วนแบบตัวหนังสือ เช่น 1/2 หรือ ½ ให้ใช้ \\frac{1}{2} เท่านั้น
   - ต้องเขียนเป็น "Raw LaTeX Code" ล้วนๆ เท่านั้น เช่น \\sum, ^2, \\alpha, \\Delta
   - ต้องครอบสมการและตัวแปรทุกตัวด้วยเครื่องหมาย $...$ (สำหรับบรรทัดเดียวกัน) หรือ $$...$$ (สำหรับแยกบรรทัด) เสมอ
5. การเขียน Backslash ใน JSON (สำคัญมาก):
   - เนื่องจากผลลัพธ์เป็น JSON string เครื่องหมาย Backslash ทุกตัวในคำสั่ง LaTeX จะต้องถูก "Double Escape" (พิมพ์เบิ้ล 2 ตัว) เสมอ เพื่อไม่ให้ JSON พัง
   - ตัวอย่างที่ถูก ✅: "\\\\sum", "\\\\frac{1}{2}", "\\\\vec{F}", "\\\\pi"
   - ตัวอย่างที่ผิด ❌: "\\sum", "\\frac{1}{2}", "\\vec{F}", "\\pi"
6. การทำช่องว่างให้ทาย (Cloze Deletion): หากต้องการสร้างคำถามแบบ "เติมคำในช่องว่าง" ให้ใช้ {{...}} ครอบ "คำตอบ" ลงไปในฟิลด์ "question" ได้เลย (ห้ามใส่ใน answer)
   - ⚠️ คำเตือนสุดสำคัญ: ประโยคที่อยู่นอก {{...}} ต้องมีบริบทชัดเจนเพียงพอให้ตอบได้ ห้ามซ่อนคีย์เวิร์ดที่เป็นประธานหรือบริบทหลักจนคำถามกำกวมเด็ดขาด!
   - 📝 ช่อง "answer" ของโหมดนี้ ให้ใช้สำหรับอธิบายความรู้เพิ่มเติม (Extra Info) หรือขยายความเท่านั้น
   - ✅ ตัวอย่างที่ถูก: {"question": "พื้นที่รับผิดชอบของ การไฟฟ้านครหลวง (MEA) ครอบคลุม 3 จังหวัด ได้แก่ {{กรุงเทพฯ นนทบุรี และสมุทรปราการ}}", "answer": "MEA ดูแลแค่ 3 จังหวัดนี้ ส่วนที่เหลือเป็นของ PEA"}
   - ❌ ตัวอย่างที่ผิด (กำกวม): {"question": "พื้นที่รับผิดชอบของ {{MEA}} ครอบคลุมจังหวัดใดบ้าง?", "answer": "กรุงเทพ นนทบุรี สมุทรปราการ"} (ผิดเพราะผู้ใช้จะไม่รู้ว่าถามถึงหน่วยงานไหน)

รูปแบบ JSON ที่ต้องการ:
{
  "deck": {
    "name": "ชื่อชุดการ์ด",
    "color": "violet"
  },
  "cards": [
    {
      "question": "คำถามที่ระบุความต้องการชัดเจน...",
      "answer": "คำตอบที่ถูกต้อง พร้อมคำอธิบายตัวแปรหรือขยายความสั้นๆ..."
    }
  ]
}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isImporting) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md border max-h-[90dvh] flex flex-col overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white'
        }`}
        style={!isDark ? { borderColor: colors.light } : undefined}
      >
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div 
            className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : ''}`}
            style={!isDark ? { backgroundColor: colors.light } : undefined}
          />
        </div>
        <div className="p-7 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>
              ชุดการ์ดใหม่
            </h2>
            <button 
              onClick={onClose} 
              disabled={isImporting}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700' 
                  : ''
              } ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={!isDark ? { 
                backgroundColor: colors.bg, 
                color: colors.text 
              } : { color: colors.text }}
              onMouseEnter={(e) => !isDark && !isImporting && (e.currentTarget.style.backgroundColor = colors.bgHover)}
              onMouseLeave={(e) => !isDark && !isImporting && (e.currentTarget.style.backgroundColor = colors.bg)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === 'create' 
                  ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              สร้างใหม่
            </button>
            <button
              type="button"
              onClick={() => setMode('import')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === 'import' 
                  ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              นำเข้า (AI)
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ชื่อชุดการ์ด</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ภาษาอังกฤษ, คณิตศาสตร์..."
                  className={`w-full px-4 py-4 border-2 rounded-2xl placeholder-slate-400 focus:outline-none transition-all text-sm font-medium ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.border;
                    e.target.style.boxShadow = `0 0 0 4px ${colors.border}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>เลือกสี</label>
                <div className="grid grid-cols-4 gap-3">
                  {DECK_COLORS.map((c) => (
                    <motion.button
                      key={c}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setColor(c)}
                      className={`w-full aspect-square rounded-xl ${COLOR_MAP[c].bg} transition-all shadow-md flex items-center justify-center ${color === c ? `ring-4 ring-offset-2 ${COLOR_MAP[c].ring} ${isDark ? 'ring-offset-slate-900' : ''} scale-110` : 'opacity-70 hover:opacity-100'}`}
                      title={COLOR_MAP[c].label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }} 
                  onClick={onClose}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}>
                  ยกเลิก
                </motion.button>
                <motion.button 
                  type="submit" 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 py-3.5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg transition-all ${
                    isDark ? 'shadow-purple-900/50' : dayColor.shadow
                  }`}>
                  สร้างชุดการ์ด
                </motion.button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-sky-50 border-sky-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                    1. คัดลอกคำสั่งไปให้ AI (ChatGPT, Gemini)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(AI_PROMPT);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                      isCopied 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-sky-200 text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    {isCopied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
                <div className={`text-[11px] p-3 rounded-lg break-all leading-relaxed border max-h-40 overflow-y-auto ${
                  isDark ? 'bg-slate-900/80 border-slate-700/50 text-slate-400' : 'bg-white border-sky-100/50 text-slate-600'
                }`}>
                  <span className={isDark ? "text-emerald-400" : "text-emerald-600"}>สร้าง Flashcard เรื่อง [ใส่หัวข้อที่ต้องการ] จำนวน [ใส่ตัวเลข หรือเว้นว่างไว้] ข้อ</span>
                  <br/><br/>
                  <span className={isDark ? "text-amber-400" : "text-amber-600"}>*เงื่อนไขพิเศษเกี่ยวกับจำนวนการ์ด: หากฉันไม่ได้ระบุตัวเลข หรือพิมพ์ข้อความว่า "ทั้งหมด" ให้คุณวิเคราะห์และสกัดเนื้อหา สร้างการ์ดออกมาให้ครอบคลุมทฤษฎี นิยาม และสูตรสำคัญของเรื่องนี้มาให้ครบถ้วนที่สุดเท่าที่ทำได้</span>
                  <br/><br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>ให้แสดงผลลัพธ์เป็น JSON format ตามโครงสร้างด้านล่างเท่านั้น ห้ามมีข้อความอื่นหรือคำเกริ่นนำใดๆ</span>
                  <br/><br/>
                  <span className={isDark ? "text-sky-400" : "text-sky-600"}>กฎการสร้างเนื้อหา (บังคับใช้เคร่งครัด):</span>
                  <br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>1. คำถาม (question): ต้องเป็น "ประโยคคำถาม" ที่อ่านแล้วรู้ทันทีว่าต้องการอะไร ห้ามพิมพ์มาแค่คำโดดๆ หรือคีย์เวิร์ด</span>
                  <br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>&nbsp;&nbsp;&nbsp;(ตัวอย่าง: ❌ "Impedance" ✅ "จงอธิบายความหมายของ Impedance")</span>
                  <br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>2. คำตอบ (answer): ต้องให้คำตอบที่ตรงประเด็นและเข้าใจง่าย หากคำตอบมี "สูตรคณิตศาสตร์" ต้องอธิบายความหมายของตัวแปรแต่ละตัวสั้นๆ ต่อท้ายสูตรด้วยเสมอ</span>
                  <br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>3. ชื่อชุดการ์ด (name): สั้นกระชับ ไม่เกิน 40 ตัวอักษร</span>
                  <br/>
                  <span className={isDark ? "text-slate-300" : "text-slate-700"}>4. รูปแบบสมการ: ห้ามใช้สัญลักษณ์พิเศษ ให้ใช้ Raw LaTeX เท่านั้น (เช่น \\sum, \\frac)</span>
                  <br/>
                  <span className={isDark ? "text-purple-400" : "text-purple-600"}>5. การเขียน Backslash: ต้องพิมพ์เบิ้ล 2 ตัวเสมอเพื่อไม่ให้ JSON พัง (เช่น \\\\sum)</span>
                  <br/>
                  <span className={isDark ? "text-purple-400" : "text-purple-600"}>6. Cloze Deletion: ใช้ {'{{'} ... {'}}'}  ครอบคำตอบสำคัญใน "question" เท่านั้น (ห้ามใส่ใน answer)</span>
                  <br/>
                  <span className={isDark ? "text-amber-500" : "text-amber-600"}>&nbsp;&nbsp;&nbsp;⚠️ ห้ามซ่อนคีย์เวิร์ด/ประธานหลักจนคำถามกำกวม! (เช่น ไม่รู้ว่าถามถึงบริษัทไหน)</span>
                  <br/>
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>&nbsp;&nbsp;&nbsp;✅ {`{"question": "พื้นที่ของ MEA คือ {{กทม. นนทบุรี}}", "answer": "..."}`}</span>
                  <br/>
                  <span className={isDark ? "text-rose-400" : "text-rose-600"}>&nbsp;&nbsp;&nbsp;❌ {`{"question": "พื้นที่ของ {{MEA}} คือจังหวัดใด?", "answer": "กทม. นนทบุรี"}`}</span>
                  <br/><br/>
                  <span className={isDark ? "text-sky-400" : "text-sky-600"}>รูปแบบ JSON:</span>
                  <br/>
                  <span className={isDark ? "text-amber-400" : "text-amber-600"}>{`{"deck": {"name": "ชื่อชุดการ์ด","color": "violet"},"cards": [{"question": "คำถามที่ระบุความต้องการชัดเจน...","answer": "คำตอบที่ถูกต้อง พร้อมคำอธิบายตัวแปรหรือขยายความสั้นๆ..."}]}`}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 mt-4">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    2. วางผลลัพธ์ (JSON) ที่ได้จาก AI
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setImportText(text);
                      } catch (err) {
                        console.error('Failed to read clipboard: ', err);
                        alert('ไม่สามารถดึงข้อมูลจาก Clipboard ได้ โปรดกดวาง (Ctrl+V) ด้วยตนเอง');
                      }
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
                      isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    วาง (Paste)
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`{\n  "deck": { "name": "...", "color": "violet" },\n  "cards": [\n    { "question": "...", "answer": "..." }\n  ]\n}`}
                  rows={6}
                  className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none transition-all text-xs font-mono resize-none ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.border;
                    e.target.style.boxShadow = `0 0 0 4px ${colors.border}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>หรืออัปโหลดเป็นไฟล์ .json</span>
                <label className={`cursor-pointer text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors`}>
                  เลือกไฟล์...
                  <input type="file" accept=".json,.txt,.csv,.tsv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                  {importError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }} 
                  onClick={onClose}
                  disabled={isImporting}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  } ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  ยกเลิก
                </motion.button>
                <motion.button 
                  type="submit" 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isImporting}
                  className={`flex-1 py-3.5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg transition-all ${
                    isDark ? 'shadow-purple-900/50' : dayColor.shadow
                  } ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isImporting ? 'กำลังนำเข้า...' : 'ตรวจสอบและสร้าง'}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
