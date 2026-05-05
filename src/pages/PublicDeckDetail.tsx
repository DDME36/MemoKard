import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { communityStore, type PublicDeck, type PublicDeckCard } from '../store/communityStore';
import RatingStars from '../components/RatingStars';
import ReportModal from '../components/ReportModal';
import ConfirmModal from '../components/ConfirmModal';
import MathText from '../components/MathText';

interface PublicDeckDetailProps {
  publicDeckId: string;
  onClose: () => void;
  onImported?: (deckId: string) => void;
}

export default function PublicDeckDetail({ publicDeckId, onClose, onImported }: PublicDeckDetailProps) {
  const { isDark } = useTheme();
  const { user, isDemo } = useAuth();
  const { showToast } = useToast();

  const [deck, setDeck] = useState<PublicDeck | null>(null);
  const [cards, setCards] = useState<PublicDeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hasReported, setHasReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadDeckData();
  }, [publicDeckId]);

  const loadDeckData = async () => {
    setLoading(true);
    try {
      const [deckData, cardsData] = await Promise.all([
        communityStore.getPublicDeckById(publicDeckId),
        communityStore.getPublicDeckCards(publicDeckId),
      ]);

      if (!deckData) {
        showToast('ไม่พบชุดการ์ดนี้', 'error');
        onClose();
        return;
      }

      setDeck(deckData);
      setCards(cardsData);

      // Check if user has imported this deck
      if (user && !isDemo) {
        const imported = await communityStore.hasUserImportedDeck(publicDeckId, user.id);
        setHasImported(imported);

        // Get user's rating
        const rating = await communityStore.getUserRating(publicDeckId, user.id);
        setUserRating(rating);

        // Check if user has reported
        const reported = await communityStore.getUserReportStatus(publicDeckId, user.id);
        setHasReported(reported);
      }
    } catch (error) {
      console.error('Error loading deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (isDemo || !user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!deck) return;

    setImporting(true);
    try {
      // Subscribe to public deck (sync model)
      const newDeckId = await communityStore.subscribePublicDeck(
        publicDeckId,
        user.id,
        deck.name,
        deck.color,
        deck.creatorUsername
      );

      if (!newDeckId) {
        showToast('เกิดข้อผิดพลาดในการติดตาม', 'error');
        return;
      }

      setHasImported(true);
      showToast('ติดตามสำเร็จ ชุดการ์ดจะอัปเดตอัตโนมัติ', 'success');

      if (onImported) {
        onImported(newDeckId);
      }
    } catch (error) {
      console.error('Error subscribing deck:', error);
      showToast('เกิดข้อผิดพลาดในการติดตาม', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (isDemo || !user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!deck) return;

    setImporting(true);
    try {
      const newDeckId = await communityStore.duplicatePublicDeck(
        publicDeckId,
        user.id,
        `${deck.name} (Copy)`
      );

      if (!newDeckId) {
        showToast('เกิดข้อผิดพลาดในการคัดลอก', 'error');
        return;
      }

      setHasImported(true);
      showToast('คัดลอกชุดการ์ดสำเร็จ', 'success');

      if (onImported) {
        onImported(newDeckId);
      }
    } catch (error) {
      console.error('Error duplicating deck:', error);
      showToast('เกิดข้อผิดพลาดในการคัดลอก', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (isDemo || !user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!hasImported) {
      showToast('คุณต้องติดตามชุดการ์ดก่อนถึงจะให้คะแนนได้', 'warning');
      return;
    }

    try {
      await communityStore.ratePublicDeck(publicDeckId, user.id, rating);
      setUserRating(rating);

      // Reload deck to get updated average rating
      const updatedDeck = await communityStore.getPublicDeckById(publicDeckId);
      if (updatedDeck) {
        setDeck(updatedDeck);
      }
    } catch (error) {
      console.error('Error rating deck:', error);
      showToast('เกิดข้อผิดพลาดในการให้คะแนน', 'error');
    }
  };

  const handleReport = async (reason: 'spam' | 'inappropriate' | 'copyright' | 'other', details: string) => {
    if (isDemo || !user) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      await communityStore.reportPublicDeck(publicDeckId, user.id, reason, details);
      setHasReported(true);
      showToast('ส่งรายงานเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error reporting deck:', error);
      showToast('เกิดข้อผิดพลาดในการส่งรายงาน', 'error');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className={`p-8 rounded-3xl ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          <p className={`mt-4 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`sticky top-0 px-6 py-5 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} z-10`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {deck.name}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${
                      isDark
                        ? 'bg-violet-900/30 text-violet-300 border border-violet-800/50'
                        : 'bg-violet-50 text-violet-700 border border-violet-200'
                    }`}
                  >
                    {deck.category}
                  </span>
                </div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  โดย {deck.creatorUsername} · {cards.length} การ์ด
                </p>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            {deck.description && (
              <div>
                <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  คำอธิบาย
                </h3>
                <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {deck.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {deck.tags.length > 0 && (
              <div>
                <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  แท็ก
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deck.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        isDark
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  {deck.importCount}
                </div>
                <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ผู้ติดตาม
                </div>
              </div>
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {deck.avgRating > 0 ? deck.avgRating.toFixed(1) : '—'}
                </div>
                <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  คะแนน
                </div>
              </div>
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                  {deck.ratingCount}
                </div>
                <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  รีวิว
                </div>
              </div>
            </div>

            {/* Rating */}
            {hasImported && user && !isDemo && (
              <div>
                <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ให้คะแนนชุดการ์ดนี้
                </h3>
                <RatingStars rating={userRating || 0} onRate={handleRate} size="lg" />
              </div>
            )}

            {/* Cards Preview */}
            <div>
              <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                การ์ดทั้งหมด ({cards.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`p-4 rounded-xl border ${
                      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      การ์ดที่ {index + 1}
                    </div>
                    <div className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <MathText className="[&_p]:mb-0 [&_.katex]:text-[0.95em]">{card.question}</MathText>
                    </div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <MathText className="[&_p]:mb-0 [&_.katex]:text-[0.85em]">{card.answer}</MathText>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex gap-3">
                {/* Subscribe Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubscribe}
                  disabled={importing || hasImported}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังติดตาม...
                    </>
                  ) : hasImported ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      ติดตามแล้ว
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      ติดตาม
                    </>
                  )}
                </motion.button>

                {/* Duplicate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDuplicate}
                  disabled={importing || hasImported}
                  className={`flex-1 px-4 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-slate-800 text-white hover:bg-slate-700' 
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  คัดลอกมาแก้เอง
                </motion.button>
              </div>

              {/* Info Box - Compact */}
              {!hasImported && (
                <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-violet-900/20 border border-violet-800/30 text-violet-300' : 'bg-violet-50 border border-violet-200 text-violet-700'}`}>
                  <div className="flex items-start gap-2">
                    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="leading-relaxed">
                      ติดตามชุดการ์ดนี้เพื่อเรียนรู้ เจ้าของอัปเดตคุณจะได้รับอัปเดตอัตโนมัติ
                    </p>
                  </div>
                </div>
              )}

              {/* Report Button */}
              {user && !isDemo && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowReportModal(true)}
                  disabled={hasReported}
                  className={`w-full px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                    hasReported
                      ? isDark
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isDark
                      ? 'bg-rose-900/20 text-rose-400 hover:bg-rose-900/30 border border-rose-800/30'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  {hasReported ? 'รายงานแล้ว' : 'รายงานเนื้อหา'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        deckName={deck.name}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
      />

      {/* Auth Prompt */}
      <ConfirmModal
        isOpen={showAuthPrompt}
        title="ต้องเข้าสู่ระบบ"
        message="คุณต้องเข้าสู่ระบบก่อนถึงจะติดตามหรือให้คะแนนชุดการ์ดได้"
        confirmText="เข้าสู่ระบบ"
        cancelText="ยกเลิก"
        type="warning"
        onConfirm={() => {
          setShowAuthPrompt(false);
          onClose();
        }}
        onCancel={() => setShowAuthPrompt(false)}
      />
    </>
  );
}
