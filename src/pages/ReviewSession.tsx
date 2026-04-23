import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import ReviewCard from '../components/ReviewCard';
import { haptics, sounds } from '../utils/haptics';

interface ReviewSessionProps {
  activeDeck: Deck | null;
  onGoHome: () => void;
  dayColor: { gradient: string; shadow: string };
  deckColor?: { gradient: string; shadow: string };
}

export default function ReviewSession({ activeDeck, onGoHome, dayColor, deckColor }: ReviewSessionProps) {
  const store = useFlashcardStore();
  const { getCardsByDeck, getDueCards, reviewCard } = store;
  const { isDark } = useTheme();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Freeze the review list when session starts so it doesn't shrink dynamically
  const [reviewCards, setReviewCards] = useState(() => 
    activeDeck ? getCardsByDeck(activeDeck.id) : getDueCards()
  );

  // Reset when switching decks
  useEffect(() => {
    setReviewCards(activeDeck ? getCardsByDeck(activeDeck.id) : getDueCards());
    setCurrentCardIndex(0);
    setShowCelebration(false);
  }, [activeDeck?.id]);

  const activeColor = (activeDeck && deckColor) ? deckColor : dayColor;
  const currentCard = reviewCards[currentCardIndex];

  const reviewTotal = reviewCards.length;
  const reviewProgress = reviewTotal > 0 ? Math.round(((currentCardIndex + 1) / reviewTotal) * 100) : 0;

  const handleReview = async (quality: number) => {
    if (!currentCard) return;
    
    await reviewCard(currentCard.id, quality);
    
    // Check if this was the last card
    if (currentCardIndex >= reviewCards.length - 1) {
      // 🎉 GAMIFICATION: Fire confetti + haptic + sound!
      setShowCelebration(true);
      
      // Haptic celebration
      haptics.celebration();
      
      // Sound celebration
      sounds.play('celebration');
      
      // Visual confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981']
      });
      
      // Fire again after a delay for extra celebration
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f59e0b', '#ef4444', '#8b5cf6']
        });
      }, 250);
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#ec4899']
        });
      }, 400);
    } else {
      setCurrentCardIndex((i) => i + 1);
    }
  };

  // Reset when switching decks
  useEffect(() => {
    setCurrentCardIndex(0);
    setShowCelebration(false);
  }, [activeDeck?.id]);

  if (reviewCards.length === 0 || showCelebration) {
    return (
      <motion.div 
        key="review-complete" 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0 }}
        className="text-center py-20"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className={`w-32 h-32 mx-auto mb-6 bg-gradient-to-br ${activeColor.gradient} rounded-full flex items-center justify-center ${
            isDark ? '' : `shadow-2xl ${activeColor.shadow}`
          }`}
        >
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-3xl font-bold mb-3 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          เยี่ยมมาก!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={isDark ? 'text-slate-400 mb-8' : 'text-slate-600 mb-8'}
        >
          คุณทบทวนการ์ดครบแล้ว กลับมาทบทวนอีกครั้งในวันพรุ่งนี้นะ
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoHome}
          className={`bg-gradient-to-r ${activeColor.gradient} hover:opacity-90 text-white font-bold px-8 py-4 rounded-xl transition-all ${
            isDark ? '' : `shadow-lg ${activeColor.shadow} hover:shadow-xl`
          }`}
        >
          กลับหน้าแรก
        </motion.button>
      </motion.div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center py-20">
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>ไม่พบการ์ดที่ต้องทบทวน</p>
        <button onClick={onGoHome} className={`mt-4 font-semibold ${
          isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'
        }`}>
          กลับหน้าแรก
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      key="review" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }}
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {currentCardIndex + 1} / {reviewTotal}
          </span>
          <span className={`text-sm font-bold bg-gradient-to-r ${activeColor.gradient} bg-clip-text text-transparent`}>{reviewProgress}%</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${
          isDark ? 'bg-slate-800' : 'bg-slate-200'
        }`}>
          <motion.div
            className={`h-full bg-gradient-to-r ${activeColor.gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${reviewProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Review Card */}
      <ReviewCard card={currentCard} onReview={handleReview} dayColor={activeColor} />
    </motion.div>
  );
}
