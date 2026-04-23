import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MathText from './MathText';
import type { Flashcard } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { haptics, sounds } from '../utils/haptics';

interface ReviewCardProps {
  card: Flashcard;
  onReview: (quality: number) => void;
  dayColor: { gradient: string; shadow: string };
}

export default function ReviewCard({ card, onReview, dayColor }: ReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { isDark } = useTheme();

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      haptics.cardFlip();
      sounds.play('flip');
    }
  };

  const handleReview = async (quality: number) => {
    haptics.reviewQuality(quality);
    sounds.play('tap');
    setIsExiting(true);
    setTimeout(async () => {
      await onReview(quality);
      setIsFlipped(false);
      setIsExiting(false);
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (!isFlipped && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped && !isExiting) {
        if (e.key === '1') { e.preventDefault(); handleReview(0); }
        else if (e.key === '2') { e.preventDefault(); handleReview(3); }
        else if (e.key === '3') { e.preventDefault(); handleReview(5); }
        else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleReview(3); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isExiting, card.id]);

  const handleDragEnd = (_e: any, info: any) => {
    if (!isFlipped || isExiting) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 100 || velocity > 500) {
      handleReview(5); // Easy
    } else if (offset < -100 || velocity < -500) {
      handleReview(0); // Again
    }
  };

  const MarkdownComponents = (isBack: boolean) => ({
    p: ({ children }: any) => <p className={`mb-3 last:mb-0 ${isBack ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-800'}`}>{children}</p>,
    strong: ({ children }: any) => <strong className={`font-black ${isBack ? 'text-white' : isDark ? 'text-slate-100' : 'text-slate-900'}`}>{children}</strong>,
    em: ({ children }: any) => <em className="italic opacity-90">{children}</em>,
    code: ({ children, inline }: any) =>
      inline ? (
        <code className={`px-2 py-0.5 rounded-md text-sm font-mono ${isBack ? 'bg-white/20 text-white' : isDark ? 'bg-slate-700 text-purple-300' : 'bg-slate-100 text-purple-700'}`}>
          {children}
        </code>
      ) : (
        <code className={`block p-4 rounded-xl text-left text-sm font-mono overflow-x-hidden w-full ${isBack ? 'bg-black/30 text-emerald-300' : 'bg-slate-800 text-emerald-400'}`}>
          {children}
        </code>
      ),
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-3 text-left space-y-1 w-full max-w-sm">{children}</ol>,
    li: ({ children }: any) => <li className={isBack ? 'text-white/90' : isDark ? 'text-slate-300' : 'text-slate-700'}>{children}</li>,
    // KaTeX math elements inherit text color
    span: ({ className, children, ...props }: any) => {
      if (className?.includes('katex')) {
        return <span className={`${className} ${isBack ? 'text-white' : ''}`} {...props}>{children}</span>;
      }
      return <span className={className} {...props}>{children}</span>;
    },
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {!isExiting && (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
          >
            {/* Card */}
            <motion.div
              className="relative w-full h-[50dvh] min-h-[280px] max-h-[400px] cursor-pointer perspective-1000 touch-pan-y"
              onClick={handleFlip}
              drag={isFlipped ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
            >
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
                  zIndex: isFlipped ? 1 : 2
                }}>
                  <div className={`w-full h-full rounded-3xl border p-8 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden ${
                    isDark
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-2xl shadow-purple-100'
                  }`}>
                    {!isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30" />}
                    <span className={`absolute top-6 left-6 text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>
                      คำถาม
                    </span>
                    <div className="text-xl md:text-2xl font-bold text-center leading-relaxed relative z-10 w-full flex flex-col items-center max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-6 pt-4">
                      <MathText components={MarkdownComponents(false)}>
                        {card.question}
                      </MathText>
                      {card.questionImage && (
                        <img src={card.questionImage} alt="Question" className="mt-4 rounded-xl max-h-48 object-contain" />
                      )}
                    </div>
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`absolute bottom-6 flex items-center gap-2 text-xs font-semibold bg-gradient-to-r ${dayColor.gradient} bg-clip-text text-transparent`}>
                      แตะเพื่อดูคำตอบ
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
                    zIndex: isFlipped ? 2 : 1
                  }}>
                  <div className={`w-full h-full bg-gradient-to-br ${dayColor.gradient} rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <span className="absolute top-6 left-6 text-xs font-bold text-white/80 uppercase tracking-widest">
                      คำตอบ
                    </span>
                    <div className="text-xl md:text-2xl font-bold text-center leading-relaxed relative z-10 w-full flex flex-col items-center max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pt-4 pb-4">
                      <MathText components={MarkdownComponents(true)}>
                        {card.answer}
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
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6 space-y-3"
                >
                  <p className={`text-center text-xs font-bold mb-4 uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>คุณจำได้แค่ไหน?</p>

                  {/* Easy */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleReview(5)}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-2xl font-bold text-base flex items-center justify-between transition-all duration-300">
                    <span>นึกออกทันที</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold">ง่าย</span>
                    </div>
                  </motion.button>

                  {/* Good */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleReview(3)}
                    className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-2xl font-bold text-base flex items-center justify-between transition-all duration-300">
                    <span>นึกออกช้า</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold">พอได้</span>
                    </div>
                  </motion.button>

                  {/* Again */}
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleReview(0)}
                    className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold text-base flex items-center justify-between transition-all duration-300">
                    <span>จำไม่ได้</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-semibold">ทำใหม่</span>
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
