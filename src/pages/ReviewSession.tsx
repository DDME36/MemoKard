import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import ReviewCard from '../components/ReviewCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ReviewModeSelector, { type ReviewMode } from '../components/ReviewModeSelector';
import { haptics, sounds } from '../utils/haptics';

interface ReviewSessionProps {
  activeDeck: Deck | null;
  isCramMode?: boolean;
  onGoHome: () => void;
  onEditCard?: (card: any) => void;
  dayColor: { gradient: string; shadow: string };
  deckColor?: { gradient: string; shadow: string };
  skipModeSelector?: boolean;
}

// Utility function to shuffle an array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const ReviewSession = memo(function ReviewSession({ 
  activeDeck, 
  isCramMode = false, 
  onGoHome, 
  onEditCard,
  dayColor, 
  deckColor, 
  skipModeSelector = false 
}: ReviewSessionProps) {
  const store = useFlashcardStore();
  const { getCardsByDeck, getDueCards, reviewCard, trackStudyTime } = store;
  const { isDark } = useTheme();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('normal');
  const [showModeSelector, setShowModeSelector] = useState(!skipModeSelector);
  const [, setFailedCardIds] = useState<Set<string>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Freeze the review list when session starts so it doesn't shrink dynamically
  const [reviewCards, setReviewCards] = useState(() => {
    let initialCards = [];
    if (activeDeck) {
      const allCards = getCardsByDeck(activeDeck.id);
      // ถ้าเป็น Cram Mode ให้ดึงการ์ดทั้งหมด ไม่กรองตามเวลา
      if (isCramMode) {
        initialCards = allCards;
      } else {
        // ถ้าไม่ใช่ Cram Mode ให้กรองเฉพาะการ์ดที่ถึงเวลาทบทวน
        initialCards = allCards.filter(card => new Date(card.nextReviewDate) <= new Date());
      }
    } else {
      initialCards = getDueCards();
    }
    // สุ่มลำดับการ์ดเพื่อให้ไม่ต้องจำตามลำดับ
    return shuffleArray(initialCards);
  });

  // Filter cards based on review mode
  const filteredCards = useMemo(() => {
    if (showModeSelector) return [];
    
    let cards = [...reviewCards];
    
    switch (reviewMode) {
      case 'focus':
        // Only difficult cards (Ease Factor < 2.5)
        cards = cards.filter(c => c.easeFactor < 2.5);
        break;
      case 'quick':
        // Maximum 10 cards
        cards = cards.slice(0, 10);
        break;
      case 'exam':
        // All cards in deck (ignore due date)
        if (activeDeck) {
          cards = shuffleArray(getCardsByDeck(activeDeck.id));
        }
        break;
      case 'weak':
        // Only cards with low ease factor (< 2.0) - truly weak cards
        cards = cards.filter(c => c.easeFactor < 2.0);
        break;
      case 'preview':
        // All cards in deck for preview
        if (activeDeck) {
          cards = shuffleArray(getCardsByDeck(activeDeck.id));
        } else {
          cards = shuffleArray(store.cards);
        }
        break;
      case 'normal':
      default:
        // Keep as is
        break;
    }
    
    return cards;
  }, [reviewCards, reviewMode, showModeSelector, activeDeck, getCardsByDeck, store.cards]);

  // Simulate loading for smooth UX
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [activeDeck?.id]);

  // Start timer when review session begins (after mode selection)
  useEffect(() => {
    if (!showModeSelector && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
  }, [showModeSelector, sessionStartTime]);

  // Track study time when session ends or component unmounts
  useEffect(() => {
    return () => {
      if (sessionStartTime) {
        const studyTimeMinutes = Math.round((Date.now() - sessionStartTime) / 60000);
        if (studyTimeMinutes > 0) {
          trackStudyTime(studyTimeMinutes);
        }
      }
    };
  }, [sessionStartTime, trackStudyTime]);

  // Reset when switching decks or changing skip mode
  useEffect(() => {
    let newCards = [];
    if (activeDeck) {
      const allCards = getCardsByDeck(activeDeck.id);
      if (isCramMode) {
        newCards = allCards;
      } else {
        newCards = allCards.filter(card => new Date(card.nextReviewDate) <= new Date());
      }
    } else {
      newCards = getDueCards();
    }
    setReviewCards(shuffleArray(newCards));
    setCurrentCardIndex(0);
    setShowCelebration(false);
    setShowModeSelector(!skipModeSelector);
    setFailedCardIds(new Set());
    setSessionStartTime(null); // Reset timer on deck change
  }, [activeDeck?.id, isCramMode, skipModeSelector, getCardsByDeck, getDueCards]);

  const activeColor = useMemo(() =>
    (activeDeck && deckColor) ? deckColor : dayColor,
    [activeDeck, deckColor, dayColor]
  );

  const isCustomColor = activeColor.gradient.includes('gradient(');
  const activeGradientClass = isCustomColor ? '' : activeColor.gradient;
  const activeShadowClass = isCustomColor ? '' : activeColor.shadow;

  const activeGradientStyle = isCustomColor ? { backgroundImage: activeColor.gradient } : {};
  const activeShadowStyle = (isCustomColor && !isDark && activeColor.shadow) ? { boxShadow: activeColor.shadow } : {};
  const combinedButtonStyle = { ...activeGradientStyle, ...activeShadowStyle };
  const textGradientStyle = isCustomColor 
    ? { backgroundImage: activeColor.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' } 
    : {};

  const currentCard = useMemo(() =>    filteredCards[currentCardIndex],
    [filteredCards, currentCardIndex]
  );

  const reviewTotal = useMemo(() => filteredCards.length, [filteredCards]);
  const reviewProgress = useMemo(() => 
    reviewTotal > 0 ? Math.round(((currentCardIndex + 1) / reviewTotal) * 100) : 0,
    [currentCardIndex, reviewTotal]
  );

  const handleReview = useCallback(async (quality: number) => {
    if (!currentCard) return;
    
    // Preview mode: just go to next card without recording
    if (reviewMode === 'preview') {
      if (currentCardIndex >= filteredCards.length - 1) {
        setShowCelebration(true);
      } else {
        setCurrentCardIndex((i) => i + 1);
      }
      return;
    }
    
    // Track failed cards for "Weak Points" mode
    if (quality === 1) {
      setFailedCardIds(prev => new Set(prev).add(currentCard.id));
    }
    
    // Exam mode should behave like Cram mode (don't update FSRS scheduling)
    // Preview mode is already handled above by returning early
    const shouldSkipFSRS = isCramMode || reviewMode === 'exam';
    await reviewCard(currentCard.id, quality, shouldSkipFSRS);
    
    // Check if this was the last card
    if (currentCardIndex >= filteredCards.length - 1) {
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
  }, [currentCard, currentCardIndex, filteredCards.length, reviewCard, isCramMode]);

  // This useEffect is removed - state reset is handled in the previous useEffect

  // Show mode selector first
  if (showModeSelector) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        <ReviewModeSelector
          selectedMode={reviewMode}
          onSelectMode={(mode) => {
            setReviewMode(mode);
            setShowModeSelector(false);
            setCurrentCardIndex(0);
          }}
          dayColor={activeColor}
          deckId={activeDeck?.id}
        />
        <div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGoHome}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            ยกเลิก
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Empty state - no cards available for selected mode
  if (filteredCards.length === 0 && !showCelebration) {
    const emptyMessages: Record<ReviewMode, { title: string; description: string }> = {
      normal: {
        title: 'ไม่มีการ์ดที่ต้องทบทวน',
        description: 'ยินดีด้วย! คุณทบทวนการ์ดครบแล้ว กลับมาทบทวนอีกครั้งในวันพรุ่งนี้นะ'
      },
      focus: {
        title: 'ไม่มีการ์ดที่ยาก',
        description: 'ยอดเยี่ยม! ไม่มีการ์ดที่มีความยาก (Ease Factor < 2.5) ในขณะนี้'
      },
      quick: {
        title: 'ไม่มีการ์ดที่ต้องทบทวน',
        description: 'ไม่มีการ์ดที่ถึงเวลาทบทวนในขณะนี้'
      },
      exam: {
        title: 'ไม่มีการ์ดในชุดนี้',
        description: 'กรุณาเพิ่มการ์ดในชุดนี้ก่อนเริ่มทบทวน'
      },
      weak: {
        title: 'ไม่มีการ์ดจุดอ่อน',
        description: 'ยอดเยี่ยม! ไม่มีการ์ดที่มีความยากมาก (Ease Factor < 2.0) ในขณะนี้'
      },
      preview: {
        title: 'ไม่มีการ์ดในชุดนี้',
        description: 'กรุณาเพิ่มการ์ดในชุดนี้ก่อน'
      }
    };

    const message = emptyMessages[reviewMode] || emptyMessages.normal;

    return (
      <motion.div 
        key="no-cards" 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0 }}
        className="text-center py-20"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isDark ? 'bg-slate-800' : 'bg-slate-100'
          }`}
        >
          <svg className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {message.title}
        </h2>
        <p className={`mb-8 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {message.description}
        </p>
        <div className="flex gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModeSelector(true)}
            className={`px-6 py-3 rounded-xl font-bold transition-colors ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            เลือกโหมดใหม่
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGoHome}
            className={`bg-gradient-to-r ${activeGradientClass} hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl transition-all ${
              isDark ? '' : `shadow-lg ${activeShadowClass}`
            }`}
            style={combinedButtonStyle}
          >
            กลับหน้าแรก
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Celebration screen - only show when actually completed reviews
  if (showCelebration) {
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
          className={`w-32 h-32 mx-auto mb-6 bg-gradient-to-br ${activeGradientClass} rounded-full flex items-center justify-center ${
            isDark ? '' : `shadow-2xl ${activeShadowClass}`
          }`}
          style={combinedButtonStyle}
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
          className={`bg-gradient-to-r ${activeGradientClass} hover:opacity-90 text-white font-bold px-8 py-4 rounded-xl transition-all ${
            isDark ? '' : `shadow-lg ${activeShadowClass} hover:shadow-xl`
          }`}
          style={combinedButtonStyle}
        >
          กลับหน้าแรก
        </motion.button>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div className="h-full w-1/4 bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse" />
          </div>
        </div>
        <LoadingSkeleton type="card" />
      </div>
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
          <span 
            className={`text-sm font-bold bg-gradient-to-r ${activeGradientClass} bg-clip-text text-transparent`}
            style={textGradientStyle}
          >
            {reviewProgress}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${
          isDark ? 'bg-slate-800' : 'bg-slate-200'
        }`}>
          <motion.div
            className={`h-full bg-gradient-to-r ${activeGradientClass}`}
            style={activeGradientStyle}
            initial={{ width: 0 }}
            animate={{ width: `${reviewProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Review Card */}
      <ReviewCard 
        card={currentCard} 
        onReview={handleReview} 
        onEditCard={onEditCard}
        dayColor={activeColor}
        isPreviewMode={reviewMode === 'preview'}
      />
    </motion.div>
  );
});

export default ReviewSession;
