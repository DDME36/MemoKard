import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, SlidersHorizontal, BookOpen, Brain, Globe } from 'lucide-react';
import { useFlashcardStore, DECK_COLORS, type DeckColor } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { importDeckFromText, importDeck } from '../utils/deckIO';
import { haptics } from '../utils/haptics';
import CustomSelect from './CustomSelect';

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

const LEVEL_OPTIONS = [
  'อัตโนมัติ',
  'มือใหม่',
  'ม.ปลาย',
  'มหาวิทยาลัย',
  'เตรียมสอบ',
  'ทำงานจริง',
] as const;

const LANGUAGE_OPTIONS = [
  'ไทย',
  'อังกฤษ',
  'ไทย+อังกฤษ',
  'อัตโนมัติตามหัวข้อ',
] as const;

const CARD_STYLE_OPTIONS = [
  { value: 'balanced', label: 'สมดุล' },
  { value: 'cloze', label: 'Cloze เยอะ' },
  { value: 'exam', label: 'แนวสอบ' },
  { value: 'vocab', label: 'คำศัพท์' },
] as const;

const DETAIL_OPTIONS = [
  { value: 'concise', label: 'กระชับ' },
  { value: 'standard', label: 'มาตรฐาน' },
  { value: 'deep', label: 'ละเอียด' },
] as const;

type CardStyle = typeof CARD_STYLE_OPTIONS[number]['value'];
type DetailLevel = typeof DETAIL_OPTIONS[number]['value'];

const RANDOM_TOPICS = [
  'คำศัพท์ภาษาอังกฤษที่จำเป็นในชีวิตประจำวัน',
  'ไวยากรณ์ภาษาอังกฤษพื้นฐานที่มักใช้ผิด',
  'คำศัพท์ IELTS ยอดนิยมพร้อมประโยคตัวอย่าง',
  'แนวคิดพื้นฐานวิชาเศรษฐศาสตร์จุลภาค',
  'สรุปเหตุการณ์สำคัญในประวัติศาสตร์โลก',
  'ความรู้รอบตัวเกี่ยวกับระบบสุริยะและดวงดาว',
  'สูตรและกฎฟิสิกส์พื้นฐาน ม.ปลาย',
  'คำศัพท์ภาษาจีนขั้นพื้นฐานสำหรับผู้เริ่มต้น',
  'หลักการออกแบบ Clean Code และ SOLID Principles',
  'ทักษะการเจรจาต่อรองและการสื่อสารเชิงจิตวิทยา',
  'ความรู้เบื้องต้นเกี่ยวกับ JavaScript และ React',
  'ประวัติศาสตร์ศิลปะยุคเรอเนสซองส์ถึงสมัยใหม่',
  'โครงสร้างสมองมนุษย์และระบบประสาทเบื้องต้น',
  'คำศัพท์ภาษาเกาหลีที่พบบ่อยในซีรีส์',
  'ทักษะการเงินส่วนบุคคลและการวางแผนภาษีง่ายๆ'
];

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
  const [promptTopic, setPromptTopic] = useState('');
  const [promptCount, setPromptCount] = useState('');
  const [promptLevel, setPromptLevel] = useState<typeof LEVEL_OPTIONS[number]>('อัตโนมัติ');
  const [promptLanguage, setPromptLanguage] = useState<typeof LANGUAGE_OPTIONS[number]>('ไทย');
  const [promptStyle, setPromptStyle] = useState<CardStyle>('balanced');
  const [promptDetail, setPromptDetail] = useState<DetailLevel>('standard');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAdvancedAnimationDone, setIsAdvancedAnimationDone] = useState(false);

  useEffect(() => {
    if (!isAdvancedOpen) {
      Promise.resolve().then(() => setIsAdvancedAnimationDone(false));
    }
  }, [isAdvancedOpen]);

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
      
      // Handle both hex color codes and color names
      const rawColor = parsedData.deck.color || 'violet';
      const colorToUse = rawColor.startsWith('#') 
        ? rawColor // Use hex code directly
        : (DECK_COLORS.includes(rawColor.toLowerCase() as DeckColor) 
            ? rawColor.toLowerCase() 
            : 'violet'); // Fallback to violet for invalid color names
      
      const deck = await addDeck(parsedData.deck.name, colorToUse);
      
      // Add cards in batch WITHOUT triggering achievements each time
      const cardPromises = parsedData.cards.map(card => 
        addCard(deck.id, card.question, card.answer, undefined, undefined, true)
      );
      await Promise.all(cardPromises);
      
      // Check achievements once after all cards are added
      useFlashcardStore.getState().checkAndUnlockAchievements();
      
      onCreated(deck.id);
      haptics.success();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้า';
      setImportError(message);
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
      
      // Handle both hex color codes and color names
      const rawColor = parsedData.deck.color || 'violet';
      const colorToUse = rawColor.startsWith('#') 
        ? rawColor // Use hex code directly
        : (DECK_COLORS.includes(rawColor.toLowerCase() as DeckColor) 
            ? rawColor.toLowerCase() 
            : 'violet'); // Fallback to violet for invalid color names
      
      const deck = await addDeck(parsedData.deck.name, colorToUse);
      
      // Add cards in batch WITHOUT triggering achievements each time
      const cardPromises = parsedData.cards.map(card => 
        addCard(deck.id, card.question, card.answer, undefined, undefined, true)
      );
      await Promise.all(cardPromises);
      
      // Check achievements once after all cards are added
      useFlashcardStore.getState().checkAndUnlockAchievements();
      
      onCreated(deck.id);
      haptics.success();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ได้';
      setImportError(message);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const getStyleInstruction = () => {
    switch (promptStyle) {
      case 'cloze':
        return 'เน้น Cloze Deletion สำหรับนิยาม สูตร คำสำคัญ และความสัมพันธ์ที่ควรจำ แต่ห้ามซ่อนบริบทหลักจนกำกวม';
      case 'exam':
        return 'เน้นคำถามแนวสอบ มีทั้งจำ เข้าใจ ประยุกต์ และข้อควรระวังที่มักออกสอบ';
      case 'vocab':
        return 'เน้นคำศัพท์ ความหมาย ตัวอย่างประโยค การใช้งานจริง และคำที่มักสับสน';
      default:
        return 'ผสมการ์ดแบบถามตอบปกติ Cloze Deletion ตัวอย่าง และจุดที่มักสับสนอย่างสมดุล';
    }
  };

  const getDetailInstruction = () => {
    switch (promptDetail) {
      case 'concise':
        return 'คำตอบต้องสั้นมาก เหมาะกับทบทวนเร็ว ไม่เกิน 1-2 ประโยคต่อการ์ด';
      case 'deep':
        return 'คำตอบละเอียดขึ้นได้ แต่ต้องยังเป็น flashcard ที่ทบทวนได้ ไม่เขียนยาวเป็นบทความ';
      default:
        return 'คำตอบกระชับและเข้าใจง่าย ไม่เกิน 2-3 ประโยคต่อการ์ด';
    }
  };

  const handleRandomTopic = () => {
    haptics.light();
    const currentIndex = RANDOM_TOPICS.indexOf(promptTopic);
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    } while (nextIndex === currentIndex && RANDOM_TOPICS.length > 1);
    
    setPromptTopic(RANDOM_TOPICS[nextIndex]);
  };

  const getCardCountType = () => {
    if (promptCount === '') return 'auto';
    if (['5', '10', '20', '30'].includes(promptCount)) return promptCount;
    return 'custom';
  };

  const handleSelectCountType = (type: string) => {
    haptics.light();
    if (type === 'auto') {
      setPromptCount('');
    } else if (type === 'custom') {
      setPromptCount('15'); // default custom count
    } else {
      setPromptCount(type);
    }
  };

  const buildAiPrompt = () => {
    const topic = promptTopic.trim() || 'สุ่มหัวข้อที่น่าสนใจ มีสาระ และเป็นประโยชน์สำหรับการทบทวนความรู้ 1 หัวข้อ';
    
    let countDesc = '';
    if (!promptCount.trim()) {
      countDesc = 'สุ่มเลือกจำนวนการ์ดที่เหมาะสมที่สุดตามความหนาแน่นของเนื้อหา (แนะนำระหว่าง 12-20 ใบ)';
    } else {
      countDesc = `สร้างอย่างแม่นยำจำนวน ${promptCount.trim()} ใบ (ห้ามขาดห้ามเกิน)`;
    }
    
    const level = promptLevel === 'อัตโนมัติ'
      ? 'ปรับความยาก-ง่ายให้เหมาะสมกับธรรมชาติของหัวข้อเนื้อหาโดยอัตโนมัติ'
      : `เหมาะสมสำหรับระดับ "${promptLevel}"`;

    return `คุณคือผู้เชี่ยวชาญด้านการออกแบบเนื้อหาการศึกษาและการสร้าง Flashcards ระดับมืออาชีพ หน้าที่ของคุณคือสร้างการ์ดคำถาม-คำตอบเพื่อใช้สำหรับระบบการจำแบบเว้นระยะ (Spaced Repetition System) ในแอปพลิเคชัน MemoKard

[รายละเอียดความต้องการ]
หัวข้อการเรียนรู้: ${topic}
จำนวนการ์ดที่ต้องสร้าง: ${countDesc}
ระดับผู้เรียนเป้าหมาย: ${level}
ภาษาที่ใช้: ${promptLanguage}
รูปแบบการ์ดหลัก: ${CARD_STYLE_OPTIONS.find(option => option.value === promptStyle)?.label}
ระดับรายละเอียดคำตอบ: ${DETAIL_OPTIONS.find(option => option.value === promptDetail)?.label}

[แนวทางเฉพาะสำหรับการสร้างชุดนี้]
1. รูปแบบการ์ด: ${getStyleInstruction()}
2. ความละเอียดของข้อมูล: ${getDetailInstruction()}

[รูปแบบผลลัพธ์ที่ต้องการ]
ตอบกลับเป็นข้อมูล JSON ที่ถูกต้อง 100% เท่านั้น ห้ามเขียนคำเกริ่นนำ คำสรุป หรืออธิบายใดๆ นอกโครงสร้าง JSON
ห้ามครอบผลลัพธ์ด้วย markdown syntax นอกเหนือจากใน string ของ JSON

[โครงสร้างข้อมูล JSON]
{
  "deck": {
    "name": "ชื่อชุดการ์ดที่สั้นกระชับและน่าเรียนรู้ (ไม่เกิน 40 ตัวอักษร)",
    "color": "รหัสสี Hex code สวยๆ ที่เข้ากับหัวข้อ เช่น #8b5cf6, #38bdf8, #22c55e, #ec4899, #f59e0b"
  },
  "cards": [
    {
      "question": "คำถามหรือโจทย์ที่ชัดเจนและมีบริบทครบถ้วน",
      "answer": "คำตอบที่ถูกต้อง กระชับ และเข้าใจได้ทันที"
    }
  ]
}

[กฎเหล็กและข้อกำหนดด้านคุณภาพ]
1. ทุกการ์ดในอาเรย์ "cards" ต้องประกอบด้วยฟิลด์ "question" และ "answer" ที่มีค่าเป็น string เสมอ
2. คำถามห้ามสั้นหรือห้วนเกินไป (เช่น "HTML คืออะไร?") ให้ใช้คำถามที่มีความท้าทาย ชัดเจน และมีบริบทช่วยให้สมองเรียกความทรงจำได้ดียิ่งขึ้น
3. คำตอบต้องเข้าใจง่าย ถูกต้องตามหลักวิชาการ และไม่เขียนยาวเกินความจำเป็น (หลีกเลี่ยงการเขียนเป็นย่อหน้ายาวๆ ให้ใช้การเคาะบรรทัดและเขียนแยกประเด็นด้วยเครื่องหมาย "-" แทนตาราง)
4. หากเนื้อหามีความซับซ้อน ให้กระจายออกเป็นหลายๆ การ์ด แทนที่จะยัดเนื้อหาทั้งหมดลงในการ์ดใบเดียว
5. หากใช้รูปแบบ "Cloze Deletion" (การเจาะช่องว่าง):
   - ให้ซ่อนคำสำคัญในเครื่องหมายปีกกาคู่ {{คำสำคัญ}} ภายในฟิลด์ "question" เท่านั้น
   - ในฟิลด์ "answer" ให้ใส่คำอธิบายเพิ่มเติมเกี่ยวกับเรื่องนั้นๆ เพื่อทบทวนบริบท
   - ตรวจสอบให้มั่นใจว่าบริบทภายนอกปีกกาเพียงพอที่จะตอบคำถามได้ ไม่เจาะคำสุ่มสี่สุ่มห้าจนเดาคำตอบไม่ได้
6. หากเนื้อหามีสูตรคณิตศาสตร์ วิทยาศาสตร์ หรือการคำนวณ ให้เขียนสูตรโดยใช้รูปแบบ KaTeX/LaTeX ครอบด้วยเครื่องหมาย $ (สำหรับสูตรในแถว) หรือ $$ (สำหรับสูตรแสดงบรรทัดใหม่)
7. ในค่าของ JSON string จะต้องทำการหนีอักขระ backslash (escape backslash) ให้ถูกต้องตามมาตรฐาน JSON เสมอ เช่น ใช้ \\\\frac{a}{b} แทน \\frac{a}{b}
8. สำหรับการ์ดภาษาต่างประเทศ ให้ระบุความหมายและการสะกดคำให้ชัดเจน เพื่อให้ระบบอ่านออกเสียง (Text-to-Speech) ทำงานได้อย่างมีประสิทธิภาพ

[ตัวอย่างโครงสร้างที่ดีสำหรับการ์ดทั่วไป]
{
  "question": "โปรโตคอล HTTP และ HTTPS ต่างกันอย่างไรในเรื่องของความปลอดภัยข้อมูล?",
  "answer": "HTTPS มีการเข้ารหัสลับข้อมูลโดยใช้ SSL/TLS เพื่อป้องกันการดักฟังข้อมูลกลางทาง ต่างจาก HTTP ที่ส่งข้อมูลเป็นข้อความดิบ (Plaintext)"
}

[ตัวอย่างโครงสร้างที่ดีสำหรับ Cloze Deletion]
{
  "question": "องค์ประกอบของคำสั่ง SQL ที่ใช้สำหรับกรองข้อมูลกลุ่มหลังจากใช้ GROUP BY คือคำสั่ง {{HAVING}}",
  "answer": "คำสั่ง WHERE ใช้กรองข้อมูลระดับแถวก่อนการจัดกลุ่ม ส่วน HAVING ใช้กรองผลลัพธ์หลังจากจัดกลุ่มแล้ว"
}

[ขั้นตอนสุดท้ายก่อนส่งคำตอบ]
- ตรวจสอบว่า JSON ของคุณเป็น Well-formed JSON และไม่มีคอมม่าส่วนเกิน (No trailing commas)
- ข้อมูลสูตรคณิตศาสตร์ทุกสูตรถูกตรวจทานและผ่านการหนีอักขระ (escape backslash) เรียบร้อยแล้ว
- ผลลัพธ์ทั้งหมดไม่มีคำอธิบายเพิ่มเติมใดๆ นอกเหนือจาก JSON บล็อกนี้`;
  };

  const AI_PROMPT = buildAiPrompt();

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setIsCopied(true);
      haptics.success();
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
      setImportError('คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความในกล่อง prompt แล้วคัดลอกเอง');
    }
  };

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
              {/* Dynamic Prompt Builder Section */}
              <div className="space-y-3.5">
                {/* 1. Topic Input with random dice */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      หัวข้อการเรียนรู้
                    </label>
                    <span className={`text-[9px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      *สุ่มหัวข้ออัตโนมัติหากปล่อยว่าง
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      value={promptTopic}
                      onChange={(e) => setPromptTopic(e.target.value)}
                      placeholder="เช่น คำศัพท์ภาษาอังกฤษพื้นฐาน, สูตรฟิสิกส์..."
                      className={`w-full pl-4 pr-12 py-3 border-2 rounded-2xl placeholder-slate-400 focus:outline-none transition-all text-xs font-semibold ${
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
                    />
                    <button
                      type="button"
                      onClick={handleRandomTopic}
                      title="สุ่มหัวข้อน่าสนใจ"
                      className={`absolute right-2.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isDark 
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                          : 'bg-white hover:bg-slate-100 shadow border border-slate-200 text-slate-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    </button>
                  </div>
                </div>

                {/* 2. Count segmented selector */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    จำนวนข้อ (ใบการ์ด)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {[
                      { value: 'auto', label: 'สุ่ม' },
                      { value: '5', label: '5' },
                      { value: '10', label: '10' },
                      { value: '20', label: '20' },
                      { value: 'custom', label: 'กำหนดเอง' }
                    ].map((item) => {
                      const isSelected = getCardCountType() === item.value || (item.value === 'custom' && getCardCountType() === 'custom');
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleSelectCountType(item.value)}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                            isSelected
                              ? `bg-gradient-to-r ${dayColor.gradient} text-white shadow`
                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  
                  {getCardCountType() === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-2"
                    >
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={promptCount}
                        onChange={(e) => setPromptCount(e.target.value)}
                        placeholder="ระบุจำนวนการ์ด (เช่น 15)"
                        className={`w-full px-4 py-2 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                        onFocus={(e) => {
                          e.target.style.borderColor = colors.border;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '';
                        }}
                      />
                      <span className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ใบการ์ด</span>
                    </motion.div>
                  )}
                </div>

                {/* 3. Collapsible Advanced Settings Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      setIsAdvancedOpen(!isAdvancedOpen);
                    }}
                    className={`flex items-center justify-between w-full py-2.5 px-3 border border-dashed rounded-xl text-xs font-bold transition-all ${
                      isDark 
                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>ตั้งค่าความยาก / ภาษา / รูปแบบเพิ่มเติม</span>
                    </div>
                    <motion.span
                      animate={{ rotate: isAdvancedOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[10px]"
                    >
                      ▼
                    </motion.span>
                  </button>

                  {isAdvancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      onAnimationComplete={() => setIsAdvancedAnimationDone(true)}
                      className={`space-y-3.5 pt-3.5 px-1 pb-1 ${
                        isAdvancedAnimationDone ? 'overflow-visible' : 'overflow-hidden'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {/* Style selection */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            รูปแบบการ์ด
                          </label>
                          <CustomSelect
                            value={promptStyle}
                            onChange={(val) => {
                              haptics.light();
                              setPromptStyle(val as CardStyle);
                            }}
                            options={CARD_STYLE_OPTIONS as unknown as { value: string; label: string }[]}
                            variant="flat"
                            icon={<BookOpen className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                            className="w-full"
                            buttonClassName={isDark ? '' : 'border border-slate-100 shadow-sm'}
                            dayColor={dayColor}
                          />
                        </div>

                        {/* Detail level */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            ระดับความละเอียด
                          </label>
                          <CustomSelect
                            value={promptDetail}
                            onChange={(val) => {
                              haptics.light();
                              setPromptDetail(val as DetailLevel);
                            }}
                            options={DETAIL_OPTIONS as unknown as { value: string; label: string }[]}
                            variant="flat"
                            icon={<SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                            className="w-full"
                            buttonClassName={isDark ? '' : 'border border-slate-100 shadow-sm'}
                            dayColor={dayColor}
                          />
                        </div>

                        {/* Difficulty Level */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            ระดับผู้เรียน
                          </label>
                          <CustomSelect
                            value={promptLevel}
                            onChange={(val) => {
                              haptics.light();
                              setPromptLevel(val as typeof LEVEL_OPTIONS[number]);
                            }}
                            options={LEVEL_OPTIONS as unknown as string[]}
                            variant="flat"
                            icon={<Brain className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                            className="w-full"
                            buttonClassName={isDark ? '' : 'border border-slate-100 shadow-sm'}
                            dayColor={dayColor}
                          />
                        </div>

                        {/* Language */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            ภาษาของการ์ด
                          </label>
                          <CustomSelect
                            value={promptLanguage}
                            onChange={(val) => {
                              haptics.light();
                              setPromptLanguage(val as typeof LANGUAGE_OPTIONS[number]);
                            }}
                            options={LANGUAGE_OPTIONS as unknown as string[]}
                            variant="flat"
                            icon={<Globe className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
                            className="w-full"
                            buttonClassName={isDark ? '' : 'border border-slate-100 shadow-sm'}
                            dayColor={dayColor}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Enhanced Copy & Launcher Experience */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isDark 
                  ? 'bg-slate-800/40 border-slate-800' 
                  : 'bg-slate-50 border-slate-200/80 shadow-sm'
              }`}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      1. คัดลอกคำสั่งที่สร้างขึ้น
                    </label>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500 shadow-sm border border-slate-100'
                    }`}>
                      พร้อมใช้ทันที
                    </span>
                  </div>

                  {/* Elegant Prompt Preview Box */}
                  <div className="relative">
                    <pre className={`text-[10px] whitespace-pre-wrap p-3.5 rounded-xl leading-relaxed border max-h-32 overflow-y-auto no-scrollbar font-mono ${
                      isDark ? 'bg-slate-900/80 border-slate-800/80 text-slate-400' : 'bg-white border-slate-100 text-slate-500 shadow-inner'
                    }`}>
                      {AI_PROMPT}
                    </pre>
                    <div className={`absolute bottom-0 inset-x-0 h-6 pointer-events-none rounded-b-xl bg-gradient-to-t ${
                      isDark ? 'from-slate-900/60 to-transparent' : 'from-white/60 to-transparent'
                    }`} />
                  </div>

                  {/* Large Animated Copy Button */}
                  <motion.button
                    type="button"
                    onClick={handleCopyPrompt}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all ${
                      isCopied
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                        : `bg-gradient-to-r ${dayColor.gradient} hover:opacity-95 text-white ${isDark ? 'shadow-purple-900/40' : dayColor.shadow}`
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>คัดลอกคำสั่งสำเร็จแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>คัดลอกคำสั่ง (Copy Prompt)</span>
                      </>
                    )}
                  </motion.button>

                  {/* Direct AI Workspace Launcher */}
                  <div className="flex flex-col gap-2 mt-1">
                    <div className={`text-[10px] font-bold text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      คลิกเพื่อเปิดคุยกับ AI และวางข้อความได้ทันที
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href="https://chatgpt.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => haptics.light()}
                        className={`py-2.5 px-1 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-all text-center ${
                          isDark 
                            ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:text-white text-slate-300' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800 shadow-sm'
                        }`}
                      >
                        <span>ChatGPT</span>
                      </a>
                      <a
                        href="https://claude.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => haptics.light()}
                        className={`py-2.5 px-1 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-all text-center ${
                          isDark 
                            ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:text-white text-slate-300' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800 shadow-sm'
                        }`}
                      >
                        <span>Claude</span>
                      </a>
                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => haptics.light()}
                        className={`py-2.5 px-1 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-all text-center ${
                          isDark 
                            ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:text-white text-slate-300' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800 shadow-sm'
                        }`}
                      >
                        <span>Gemini</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paste JSON result block */}
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
                        haptics.light();
                      } catch (err) {
                        console.error('Failed to read clipboard: ', err);
                        alert('ไม่สามารถดึงข้อมูลจาก Clipboard ได้ โปรดกดวาง (Ctrl+V) ด้วยตนเอง');
                      }
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
                      isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    วาง (Paste)
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`{\n  "deck": { "name": "...", "color": "violet" },\n  "cards": [\n    { "question": "...", "answer": "..." }\n  ]\n}`}
                  rows={4}
                  className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none transition-all text-[11px] font-mono resize-none leading-relaxed ${
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
