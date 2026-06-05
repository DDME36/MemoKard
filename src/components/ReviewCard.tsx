import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import MathText from './MathText';
import type { Flashcard } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { haptics, sounds } from '../utils/haptics';
import Scratchpad from './Scratchpad';
import { Edit2 } from 'lucide-react';

interface ReviewCardProps {
  card: Flashcard;
  onReview: (quality: number) => void;
  onEditCard?: (card: Flashcard) => void;
  dayColor: { gradient: string; shadow: string };
  isPreviewMode?: boolean;
  isTimeAttack?: boolean;
}

const ReviewCard = memo(function ReviewCard({ card, onReview, onEditCard, dayColor, isPreviewMode = false, isTimeAttack = false }: ReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(isPreviewMode); // Auto-flip in preview mode
  const [hasBeenFlipped, setHasBeenFlipped] = useState(isPreviewMode); // Track if it has been flipped at least once
  const [isExiting, setIsExiting] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const { isDark } = useTheme();

  const isCustomGradient = dayColor.gradient.includes('gradient(');
  const gradientClass = isCustomGradient ? '' : dayColor.gradient;
  const gradientStyle = isCustomGradient ? { backgroundImage: dayColor.gradient } : {};
  const textGradientStyle = isCustomGradient 
    ? { backgroundImage: dayColor.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' } 
    : {};

  // Motion values for swipe gestures
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  
  // Opacity indicators for swipe
  const swipeRightOpacity = useTransform(x, [20, 100], [0, 1]);
  const swipeLeftOpacity = useTransform(x, [-20, -100], [0, 1]);

  // Motion values for 3D spring physical tilt (2026 sensory touch)
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPreviewMode) return;
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate coordinates relative to center
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    // Convert to rotational angles (e.g. maximum 6 degrees of rotation for subtle premium parallax)
    const rY = (mouseX / (width / 2)) * 6;
    const rX = -(mouseY / (height / 2)) * 6;
    
    rotateY.set(rY);
    rotateX.set(rX);
  }, [isPreviewMode, rotateX, rotateY]);

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  // Offline AI similarity calculation using Dice's Coefficient (Bigram-based string overlap)
  const calculateSimilarity = useCallback((s1: string, s2: string): number => {
    const clean = (str: string) => 
      str.toLowerCase()
         .replace(/\{\{(.*?)\}\}/g, '$1') // remove cloze
         .replace(/[*_#`\-+]/g, '') // remove markdown
         .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”]/g, '') // remove punctuation
         .replace(/\s+/g, '') // remove spaces
         .trim();

    const a = clean(s1);
    const b = clean(s2);

    if (!a || !b) return 0;
    if (a === b) return 1;

    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);
    
    if (bigramsA.size === 0 || bigramsB.size === 0) {
      let intersection = 0;
      const charsA = a.split('');
      const charsB = b.split('');
      charsA.forEach(c => {
        const idx = charsB.indexOf(c);
        if (idx !== -1) {
          intersection++;
          charsB.splice(idx, 1);
        }
      });
      return (2 * intersection) / (a.length + b.length);
    }

    let intersection = 0;
    bigramsA.forEach(b => {
      if (bigramsB.has(b)) intersection++;
    });

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
  }, []);

  // Cloze Deletion: แปลง {{text}} เป็น [...] สำหรับหน้าคำถาม
  const renderClozeText = (text: string, showAnswer: boolean) => {
    if (showAnswer) {
      // หน้าคำตอบ: ลบ {{ }} ออก แต่แสดงข้อความข้างใน
      return text.replace(/\{\{(.*?)\}\}/g, '$1');
    }
    // หน้าคำถาม: แทนที่ {{...}} ด้วย [...]
    return text.replace(/\{\{(.*?)\}\}/g, '[...]');
  };

  const handleFlip = useCallback(() => {
    if (showScratchpad) return; // Prevent flip when drawing
    if (!isPreviewMode) {
      setIsFlipped(prev => {
        if (!prev) setHasBeenFlipped(true);
        return !prev;
      });
      haptics.cardFlip();
      sounds.play('flip');
    }
  }, [isPreviewMode, showScratchpad]);

  const handleEdit = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEditCard) {
      onEditCard(card);
    }
  }, [card, onEditCard]);

  const handleReview = useCallback(async (quality: number) => {
    if (isExiting) return;
    haptics.reviewQuality(quality);
    sounds.play('tap');
    setSelectedQuality(quality);
    setIsExiting(true);
    setTimeout(async () => {
      await onReview(quality);
      setIsFlipped(false);
      setIsExiting(false);
      setSelectedQuality(null);
      x.set(0); // Reset drag position
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop TTS on next card
      }
    }, 300);
  }, [isExiting, onReview, x]);

  const handleSpeak = useCallback((text: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      
      // Clean up text before speaking (remove markdown, cloze syntax)
      const cleanText = text
        .replace(/\{\{(.*?)\}\}/g, '$1') // Remove cloze brackets
        .replace(/[*_#`]/g, '') // Remove basic markdown
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      // Optional: Try to guess language based on text, or default to user's browser language
      utterance.lang = /^[A-Za-z0-9\s.,!?'-]+$/.test(cleanText) ? 'en-US' : 'th-TH';
      utterance.rate = 0.9; // Slightly slower for clearer pronunciation
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // 'E' for Edit
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleEdit();
        return;
      }

      // 'S' for Speak (TTS)
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Create a synthetic event to pass to handleSpeak
        const syntheticEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent;
        handleSpeak(isFlipped ? card.answer : card.question, syntheticEvent);
        return;
      }

      // Flip card back and forth
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleFlip();
        return;
      }

      if (!isFlipped && !isPreviewMode && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleFlip();
      } else if (hasBeenFlipped && !isExiting) {
        if (isPreviewMode) {
          // In preview mode, any key goes to next
          if (e.code === 'Space' || e.code === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            handleReview(0); // 0 = next in preview mode
          }
        } else {
          if (e.key === '1') { e.preventDefault(); handleReview(1); } // Again
          else if (e.key === '2') { e.preventDefault(); handleReview(2); } // Hard
          else if (e.key === '3') { e.preventDefault(); handleReview(3); } // Good
          else if (e.key === '4') { e.preventDefault(); handleReview(4); } // Easy
          else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleReview(3); } // Default: Good
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, hasBeenFlipped, isExiting, card.id, card.answer, card.question, isPreviewMode, handleFlip, handleReview, handleEdit, handleSpeak]);

  // Time Attack Countdown Timer Effect
  useEffect(() => {
    if (!isTimeAttack || isFlipped) return;

    setTimeLeft(10);
    setIsTimeOut(false);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFlipped(true);
          setHasBeenFlipped(true);
          setIsTimeOut(true);
          haptics.error();
          sounds.play('error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [card.id, isFlipped, isTimeAttack]);

  // Reset state when card changes
  useEffect(() => {
    setIsFlipped(isPreviewMode);
    setHasBeenFlipped(isPreviewMode);
    setIsExiting(false);
    setTypedAnswer('');
    setShowScratchpad(false);
    setIsTimeOut(false);
    setTimeLeft(10);
  }, [card.id, isPreviewMode]);

  const handleDragEnd = useCallback((_e: unknown, info: PanInfo) => {
    if (!hasBeenFlipped || isExiting) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 100 || velocity > 500) {
      handleReview(4); // Easy
    } else if (offset < -100 || velocity < -500) {
      handleReview(1); // Again
    } else {
      // Return to center if not dragged far enough
      x.set(0);
    }
  }, [hasBeenFlipped, isExiting, handleReview, x]);

  const markdownComponentsFront = useMemo(() => ({
    p: ({ children }: { children?: React.ReactNode }) => <p className={`mb-3 last:mb-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{children}</p>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic opacity-90">{children}</em>,
    code: ({ children, inline, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) =>
      inline ? (
        <code className={`px-2 py-0.5 rounded-md text-sm font-mono ${isDark ? 'bg-slate-700 text-purple-300' : 'bg-slate-100 text-purple-700'}`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`block p-4 rounded-xl text-left text-sm font-mono overflow-x-hidden w-full bg-slate-800 text-emerald-400`} {...props}>
          {children}
        </code>
      ),
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className={isDark ? 'text-slate-300' : 'text-slate-700'}>{children}</li>,
    span: ({ className, children, ...props }: React.ComponentProps<'span'>) => {
      return <span className={className} {...props}>{children}</span>;
    },
  }), [isDark]);

  const markdownComponentsBack = useMemo(() => ({
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0 text-white">{children}</p>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-black text-white">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic opacity-90">{children}</em>,
    code: ({ children, inline, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) =>
      inline ? (
        <code className="px-2 py-0.5 rounded-md text-sm font-mono bg-white/20 text-white" {...props}>
          {children}
        </code>
      ) : (
        <code className="block p-4 rounded-xl text-left text-sm font-mono overflow-x-hidden w-full bg-black/30 text-emerald-300" {...props}>
          {children}
        </code>
      ),
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="text-white/90">{children}</li>,
    span: ({ className, children, ...props }: React.ComponentProps<'span'>) => {
      if (className?.includes('katex')) {
        return <span className={`${className} text-white`} {...props}>{children}</span>;
      }
      return <span className={className} {...props}>{children}</span>;
    },
  }), []);

  const getExitAnimation = () => {
    switch (selectedQuality) {
      case 1: return { 
        opacity: 0, 
        x: [0, -20, 20, -10, 10, 0], 
        y: 20,
        transition: { duration: 0.4 } 
      }; // Shake and drop
      case 4: return { 
        opacity: 0, 
        y: -100, 
        scale: 1.1, 
        filter: "brightness(1.5)",
        transition: { duration: 0.4, ease: "easeOut" as const }
      }; // Pop up and glow
      case 2: return { opacity: 0, y: 50, scale: 0.95 }; // Slide down
      case 3: return { opacity: 0, y: -50, scale: 1.05 }; // Slide up
      default: return { opacity: 0, x: -60 };
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {!isExiting && (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={getExitAnimation()}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          >
            {/* Card */}
            <motion.div
              className="relative w-full h-[50dvh] min-h-[280px] max-h-[400px] cursor-pointer perspective-1000 touch-pan-y"
              onClick={handleFlip}
              drag={hasBeenFlipped && !showScratchpad ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ x, rotate, rotateX, rotateY }}
            >
              {/* Drag Indicators */}
              {hasBeenFlipped && (
                <>
                  <motion.div 
                    style={{ opacity: swipeRightOpacity }}
                    className="absolute inset-0 bg-green-500/20 rounded-3xl z-50 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-green-500 text-white font-bold px-6 py-3 rounded-full text-xl shadow-lg border-4 border-green-400 rotate-12">
                      ง่าย (Easy)
                    </div>
                  </motion.div>
                  <motion.div 
                    style={{ opacity: swipeLeftOpacity }}
                    className="absolute inset-0 bg-rose-500/20 rounded-3xl z-50 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-rose-500 text-white font-bold px-6 py-3 rounded-full text-xl shadow-lg border-4 border-rose-400 -rotate-12">
                      ทำใหม่ (Again)
                    </div>
                  </motion.div>
                </>
              )}

              <motion.div
                className="relative w-full h-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.55, type: 'spring', stiffness: 90, damping: 14 }}
                style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}
              >
                {/* Front — Question */}
                <div className="absolute w-full h-full backface-hidden" style={{ 
                  backfaceVisibility: 'hidden', 
                  WebkitBackfaceVisibility: 'hidden',
                  zIndex: isFlipped ? 1 : 2,
                  opacity: isFlipped ? 0 : 1,
                  pointerEvents: isFlipped ? 'none' : 'auto',
                  transition: 'opacity 0.25s ease-in-out'
                }}>
                  <div className={`w-full h-full rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden premium-card transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 ${
                    isDark
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-2xl shadow-purple-100'
                  }`}>
                    {/* Time Attack Countdown Progress Line */}
                    {isTimeAttack && (
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200/30 dark:bg-slate-900/30 z-40 overflow-hidden">
                        <motion.div
                          initial={{ width: '100%' }}
                          animate={{ width: `${(timeLeft / 10) * 100}%` }}
                          transition={{ duration: 0.3 }}
                          className={`h-full shadow-[0_0_10px_currentColor] transition-colors duration-300 ${
                            timeLeft > 6
                              ? 'bg-emerald-500 text-emerald-400'
                              : timeLeft > 3
                              ? 'bg-amber-500 text-amber-400'
                              : 'bg-rose-500 text-rose-400 animate-pulse'
                          }`}
                        />
                      </div>
                    )}
                    {showScratchpad && (
                      <Scratchpad 
                        onClose={() => setShowScratchpad(false)} 
                        isDark={isDark} 
                      />
                    )}
                    {!isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30" />}
                    
                    <div className="absolute top-4 right-4 flex gap-2 z-30">
                      {/* Draw Mode Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowScratchpad(true);
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-slate-700 text-slate-500 hover:text-white' : 'hover:bg-purple-100 text-purple-300 hover:text-purple-600'
                        }`}
                        title="โหมดวาดเขียน"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      {/* TTS Button */}
                      <button
                        onClick={(e) => handleSpeak(card.question, e)}
                        className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-purple-100 text-purple-300'
                        }`}
                        title="ฟังเสียงอ่าน"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={handleEdit}
                        className={`p-2 rounded-full transition-colors ${
                          isDark ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-purple-100 text-purple-300'
                        }`}
                        title="แก้ไขการ์ด (E)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>

                    <span 
                      className={`absolute top-6 left-6 text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}
                      style={textGradientStyle}
                    >
                      คำถาม
                    </span>

                    {/* Time Attack Ticking Timer Pill */}
                    {isTimeAttack && (
                      <span className={`absolute top-5 left-[5.5rem] px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono flex items-center gap-1.5 border shadow-sm transition-all duration-300 z-30 ${
                        timeLeft > 6
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400'
                          : timeLeft > 3
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400'
                          : 'bg-rose-500/20 border-rose-500/30 text-rose-500 dark:text-rose-450 animate-pulse'
                      }`}>
                        <svg className={`w-3.5 h-3.5 ${timeLeft <= 3 ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {timeLeft} วินาที
                      </span>
                    )}

                    {/* Leech Warning Indicator */}
                    {card.fsrsState.lapses >= 8 && (
                      <div className="absolute top-6 right-16 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse z-30">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Leech</span>
                      </div>
                    )}

                    <div className="text-xl md:text-2xl font-bold text-center leading-relaxed relative z-10 w-full flex flex-col items-center max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-6 pt-4">
                      <MathText components={markdownComponentsFront}>
                        {renderClozeText(card.question, false)}
                      </MathText>
                      {card.questionImage && (
                        <img src={card.questionImage} alt="Question" className="mt-4 rounded-xl max-h-48 object-contain" />
                      )}
                    </div>

                    {/* Typed Answer Input Box (Optional) */}
                    <div className="w-full max-w-sm mt-1 mb-8 z-20" onClick={e => e.stopPropagation()}>
                      <textarea
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                        placeholder="พิมพ์คำตอบเพื่อตรวจสอบเปรียบเทียบ (ทางเลือก)..."
                        rows={2}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:ring-2 no-scrollbar ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white focus:ring-purple-500 focus:border-purple-500' 
                            : 'bg-white border-purple-200 text-slate-800 focus:ring-purple-400 focus:border-purple-400'
                        }`}
                      />
                    </div>
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`absolute bottom-6 flex flex-col items-center gap-1 text-xs font-semibold`}>
                      <span 
                        className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}
                        style={textGradientStyle}
                      >
                        แตะเพื่อดูคำตอบ
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        หรือกด Space
                      </span>
                    </motion.div>
                  </div>
                </div>

                {/* Back — Answer */}
                <div className="absolute w-full h-full backface-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    WebkitBackfaceVisibility: 'hidden', 
                    transform: 'rotateY(180deg)',
                    WebkitTransform: 'rotateY(180deg)',
                    zIndex: isFlipped ? 2 : 1,
                    opacity: isFlipped ? 1 : 0,
                    pointerEvents: isFlipped ? 'auto' : 'none',
                    transition: 'opacity 0.25s ease-in-out'
                  }}>
                  <div 
                    className={`w-full h-full bg-gradient-to-br ${gradientClass} rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden border border-white/20 shadow-2xl shadow-purple-500/20`}
                    style={gradientStyle}
                  >
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <span className="absolute top-6 left-6 text-xs font-bold text-white/80 uppercase tracking-widest">
                      {isPreviewMode ? 'โหมดเรียนรู้' : 'คำตอบ'}
                    </span>

                    {/* Time Out Warning Badge */}
                    {isTimeOut && (
                      <span className="absolute top-5 left-20 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-200 animate-bounce flex items-center gap-1.5 z-30">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        หมดเวลาตอบ!
                      </span>
                    )}

                    {/* Buttons on the Back */}
                    <div className="absolute top-4 right-4 flex gap-2 z-30">
                      {/* TTS Button */}
                      <button
                        onClick={(e) => handleSpeak(card.answer, e)}
                        className="p-2 rounded-full transition-colors hover:bg-white/20 text-white/70 hover:text-white"
                        title="ฟังเสียงอ่าน"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>

                      {/* Edit Button for Preview Mode */}
                      {isPreviewMode && (
                        <button
                          onClick={handleEdit}
                          className="p-2 rounded-full transition-colors hover:bg-white/20 text-white/70 hover:text-white"
                          title="แก้ไขการ์ด (E)"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="text-xl md:text-2xl font-bold text-center leading-relaxed relative z-10 w-full flex flex-col items-center max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pt-4 pb-4">
                      {/* Condensed Offline AI Feedback & Typed Answer Comparison */}
                      {typedAnswer.trim() && (() => {
                        const similarity = calculateSimilarity(typedAnswer, card.answer);
                        const matchPercent = Math.round(similarity * 100);
                        
                        let suggestionText = '';
                        let suggestionColor = '';
                        if (matchPercent >= 85) {
                          suggestionText = 'ยอดเยี่ยม (แนะนำ: ง่าย)';
                          suggestionColor = 'text-green-300';
                        } else if (matchPercent >= 60) {
                          suggestionText = 'ถูกต้องส่วนใหญ่ (แนะนำ: พอได้)';
                          suggestionColor = 'text-sky-200';
                        } else if (matchPercent >= 30) {
                          suggestionText = 'ถูกบางส่วน (แนะนำ: ยาก)';
                          suggestionColor = 'text-amber-200';
                        } else {
                          suggestionText = 'ลองใหม่อีกครั้ง (แนะนำ: ทำใหม่)';
                          suggestionColor = 'text-rose-200';
                        }
                        
                        return (
                          <div className="mb-4 w-full text-left bg-white/10 rounded-2xl p-4 border border-white/10 text-white select-text cursor-default" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">การตรวจสอบคำตอบออฟไลน์</span>
                              <span className={`text-xs font-black ${suggestionColor}`}>{suggestionText}</span>
                            </div>
                            <div className="text-xs opacity-80 mb-1">คำตอบที่คุณพิมพ์:</div>
                            <div className="p-2.5 bg-black/20 rounded-xl font-mono text-xs text-white/95 break-words whitespace-pre-wrap select-text mb-3 border border-white/5">
                              {typedAnswer}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full transition-all duration-500" style={{ width: `${matchPercent}%` }} />
                              </div>
                              <span className="text-xs font-black text-white">{matchPercent}% Match</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Show the revealed question text as context on the back */}
                      {(card.question.includes('{{') || isPreviewMode) && (
                        <div className={`mb-4 w-full text-left opacity-90 border-b border-white/20 pb-4 ${isPreviewMode ? 'text-xl md:text-2xl' : 'text-sm md:text-base'} ${isPreviewMode && !card.question.includes('{{') ? 'mt-4' : ''}`}>
                          {isPreviewMode && !card.question.includes('{{') && (
                            <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">คำถาม</span>
                          )}
                          <MathText components={markdownComponentsBack}>
                            {renderClozeText(card.question, true)}
                          </MathText>
                          {isPreviewMode && card.questionImage && (
                            <img src={card.questionImage} alt="Question" className="mt-4 rounded-xl max-h-32 object-contain" />
                          )}
                        </div>
                      )}
                      
                      {isPreviewMode && !card.question.includes('{{') && (
                        <span className="block w-full text-left text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2 mt-2">คำตอบ</span>
                      )}

                      {/* Show the actual answer */}
                      <MathText components={markdownComponentsBack}>
                        {renderClozeText(card.answer, true)}
                      </MathText>
                      {card.answerImage && (
                        <img src={card.answerImage} alt="Answer" className="mt-4 rounded-xl max-h-48 object-contain" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Review Buttons */}
            <AnimatePresence>
              {hasBeenFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6"
                >
                  {isPreviewMode ? (
                    /* Preview Mode: Single "Next" Button */
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleReview(0)}
                      className={`w-full py-5 bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all`}
                      style={gradientStyle}
                    >
                      <span>ถัดไป</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </motion.button>
                  ) : (
                    /* Normal Mode: 2x2 Grid */
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>คุณจำได้แค่ไหน?</p>
                        <p className={`text-[10px] font-medium ${
                          isDark ? 'text-slate-600' : 'text-slate-400'
                        }`}>กด 1-4 หรือปัดซ้าย/ขวา</p>
                      </div>

                      {/* Grid 2x2 Layout */}
                      <div className="grid grid-cols-2 gap-3">
                    {/* Again - ทำใหม่ */}
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleReview(1)}
                      className={`py-4 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${selectedQuality === 1 ? 'ring-4 ring-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)] scale-[1.02]' : ''}`}>
                      <AnimatePresence>
                        {selectedQuality === 1 && (
                          <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 bg-white rounded-full pointer-events-none" />
                        )}
                      </AnimatePresence>
                      <span className="text-xs opacity-50 font-mono">1</span>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="relative z-10">ทำใหม่</span>
                      <span className="text-xs opacity-80 relative z-10">จำไม่ได้</span>
                    </motion.button>

                    {/* Hard - ยาก */}
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleReview(2)}
                      className={`py-4 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${selectedQuality === 2 ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-[1.02]' : ''}`}>
                      <AnimatePresence>
                        {selectedQuality === 2 && (
                          <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 bg-white rounded-full pointer-events-none" />
                        )}
                      </AnimatePresence>
                      <span className="text-xs opacity-50 font-mono">2</span>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="relative z-10">ยาก</span>
                      <span className="text-xs opacity-80 relative z-10">นึกนาน</span>
                    </motion.button>

                    {/* Good - พอได้ */}
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleReview(3)}
                      className={`py-4 px-4 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${selectedQuality === 3 ? 'ring-4 ring-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.8)] scale-[1.02]' : ''}`}>
                      <AnimatePresence>
                        {selectedQuality === 3 && (
                          <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 bg-white rounded-full pointer-events-none" />
                        )}
                      </AnimatePresence>
                      <span className="text-xs opacity-50 font-mono">3</span>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="relative z-10">พอได้</span>
                      <span className="text-xs opacity-80 relative z-10">ปกติ</span>
                    </motion.button>

                    {/* Easy - ง่าย */}
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleReview(4)}
                      className={`py-4 px-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${selectedQuality === 4 ? 'ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] scale-[1.02]' : ''}`}>
                      <AnimatePresence>
                        {selectedQuality === 4 && (
                          <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 bg-white rounded-full pointer-events-none" />
                        )}
                      </AnimatePresence>
                      <span className="text-xs opacity-50 font-mono">4</span>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="relative z-10">ง่าย</span>
                      <span className="text-xs opacity-80 relative z-10">ทันที</span>
                    </motion.button>
                  </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ReviewCard;
