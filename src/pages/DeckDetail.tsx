import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFlashcardStore, type Deck, type Flashcard } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { communityStore, type PublicDeck, type DeckCategory } from '../store/communityStore';
import ShareDeckModal from '../components/ShareDeckModal';
import DeckStatsPanel from '../components/DeckStatsPanel';
import ConfirmModal from '../components/ConfirmModal';
import EditDeckModal from '../components/EditDeckModal';
import MathText from '../components/MathText';
import { exportDeck } from '../utils/deckIO';
import { getDeckColorStyles } from '../utils/colorUtils';

interface DeckDetailProps {
  deck: Deck;
  onStartReview: (deck: Deck, isCramMode?: boolean) => void;
  onShowAddCard: () => void;
  onEditCard: (card: Flashcard) => void;
  onDeleteDeck: (deck: Deck) => void;
}

export default function DeckDetail({ deck: initialDeck, onStartReview, onShowAddCard, onEditCard, onDeleteDeck }: DeckDetailProps) {
  const store = useFlashcardStore();
  const deck = store.decks.find(d => d.id === initialDeck.id) || initialDeck;
  const { getCardsByDeck, getDueCount, editDeck } = store;
  const { isDark } = useTheme();
  const { user, isDemo, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [publicDeck, setPublicDeck] = useState<PublicDeck | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUnshareConfirm, setShowUnshareConfirm] = useState(false);
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingPublicDeck, setLoadingPublicDeck] = useState(true);

  const col = getDeckColorStyles(deck.color);
  const cards = getCardsByDeck(deck.id);
  const due = getDueCount(deck.id);
  
  // Check if this is a synced deck
  const isSynced = deck.isSynced || false;
  const canEdit = !isSynced; // Can only edit non-synced decks
  const canShare = !isSynced; // Can only share non-synced decks

  // Check if deck is already shared
  useEffect(() => {
    if (authLoading) return;
    if (user && !isDemo) {
      loadPublicDeck();
    } else {
      setLoadingPublicDeck(false);
    }
  }, [deck.id, user, isDemo, authLoading]);

  const loadPublicDeck = async () => {
    if (!user || isDemo) return;
    setLoadingPublicDeck(true);
    try {
      const pd = await communityStore.getPublicDeckBySourceDeckId(deck.id, user.id);
      setPublicDeck(pd);
    } catch (error) {
      console.error('Error loading public deck:', error);
    } finally {
      setLoadingPublicDeck(false);
    }
  };

  const handleShare = async (description: string, category: DeckCategory, tags: string[]) => {
    if (!user || isDemo) {
      showToast('ต้องเข้าสู่ระบบก่อนถึงจะแชร์ได้', 'warning');
      return;
    }

    if (cards.length === 0) {
      showToast('ไม่สามารถแชร์ชุดการ์ดที่ไม่มีการ์ดได้', 'warning');
      return;
    }

    try {
      const cardsData = cards.map((c) => ({
        question: c.question,
        answer: c.answer,
      }));

      const result = await communityStore.shareDeckToCommunity(
        user.id,
        deck.id,
        deck.name,
        description,
        category,
        tags,
        deck.color,
        cardsData
      );

      if (result) {
        setPublicDeck(result);
        showToast('แชร์สำเร็จ!', 'success');
      } else {
        showToast('ชุดการ์ดนี้ถูกแชร์ไปแล้ว', 'info');
      }
    } catch (error) {
      console.error('Error sharing deck:', error);
      showToast('เกิดข้อผิดพลาดในการแชร์', 'error');
    }
  };

  const handleUnshare = async () => {
    if (!publicDeck) return;

    try {
      await communityStore.unshareDecktoCommunity(publicDeck.id);
      setPublicDeck(null);
      setShowUnshareConfirm(false);
      showToast('ยกเลิกการแชร์เรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error unsharing deck:', error);
      showToast('เกิดข้อผิดพลาดในการยกเลิกการแชร์', 'error');
    }
  };

  const handleUpdateDeck = async () => {
    if (!publicDeck) return;

    try {
      const cardsData = cards.map((c) => ({
        question: c.question,
        answer: c.answer,
      }));

      await communityStore.updatePublicDeckCards(publicDeck.id, cardsData);
      showToast('อัปเดตชุดการ์ดสาธารณะเรียบร้อยแล้ว', 'success');
      await loadPublicDeck();
    } catch (error) {
      console.error('Error updating public deck:', error);
      showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
    }
  };

  const handleUnsubscribe = async () => {
    if (!deck.linkedPublicDeckId) return;

    try {
      const success = await communityStore.unsubscribePublicDeck(deck.id);
      if (success) {
        showToast('ยกเลิก Subscribe เรียบร้อยแล้ว', 'success');
        setShowUnsubscribeConfirm(false);
        // Navigate back to home
        window.location.reload();
      } else {
        showToast('เกิดข้อผิดพลาดในการยกเลิก Subscribe', 'error');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      showToast('เกิดข้อผิดพลาดในการยกเลิก Subscribe', 'error');
    }
  };

  const handleEditDeck = async (name: string, color: string) => {
    try {
      await editDeck(deck.id, name, color);
      showToast('แก้ไขชุดการ์ดเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error editing deck:', error);
      showToast('เกิดข้อผิดพลาดในการแก้ไข', 'error');
    }
  };

  const shareLink = publicDeck ? `${window.location.origin}/deck/${publicDeck.id}` : '';

  return (
    <motion.div 
      key="deck" 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0 }}
    >
      {/* Deck Header */}
      <div 
        className={`rounded-3xl p-6 mb-6 relative overflow-hidden ${
          isDark ? '' : 'shadow-2xl'
        }`}
        style={{
          background: col.gradient,
          boxShadow: isDark ? undefined : col.shadow
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        
        {/* Title Section - Centered */}
        <div className="relative z-10 text-center mb-6">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <h2 className="text-2xl font-bold text-white">{deck.name}</h2>
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                  title="แก้ไขชุดการ์ด"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {isSynced && (
                <span className="px-2 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  ซิงค์
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-white/80 font-medium">
            {isSynced && deck.originalCreatorUsername && (
              <>โดย {deck.originalCreatorUsername} · </>
            )}
            {cards.length} การ์ด · ต้องทบทวน {due} ใบ
          </p>
          {isSynced && (
            <p className="text-xs text-white/60 mt-1">
              🔄 อัปเดตอัตโนมัติจากเจ้าของต้นฉบับ
            </p>
          )}
        </div>

        {/* Buttons - Centered */}
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 justify-center">
            {/* แชร์ - แสดงเฉพาะเมื่อ login, มีการ์ด, และไม่ใช่ชุด sync */}
            {canShare && user && !isDemo && cards.length > 0 && !publicDeck && (
              loadingPublicDeck || authLoading ? (
                <div className="opacity-60 bg-white/10 backdrop-blur-sm text-white/50 text-sm font-bold px-3 sm:px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/10 cursor-default pointer-events-none animate-pulse">
                  <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">แชร์</span>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => setShowShareModal(true)}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                  title="แชร์ชุดการ์ด">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>แชร์</span>
                </motion.button>
              )
            )}
            {/* เพิ่มการ์ด - แสดงเฉพาะเมื่อมีการ์ดแล้วและไม่ใช่ชุด sync */}
            {canEdit && cards.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }} 
                onClick={onShowAddCard}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                title="เพิ่มการ์ด">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>เพิ่มการ์ด</span>
              </motion.button>
            )}
            {/* ยกเลิก Subscribe - แสดงเฉพาะชุด sync */}
            {isSynced && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }} 
                onClick={() => setShowUnsubscribeConfirm(true)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                title="ยกเลิก Subscribe">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>ยกเลิก</span>
              </motion.button>
            )}
            {/* ปุ่มทบทวน - แสดงเฉพาะเมื่อมีการ์ด */}
            {cards.length > 0 && (
              <>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => onStartReview(deck, false)}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                  title="ทบทวนการ์ดที่ถึงเวลา">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>ตามกำหนด</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => onStartReview(deck, true)}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 border border-white/30 transition-all"
                  title="ทบทวนทั้งหมด (ไม่สนใจเวลา)">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>ทั้งหมด</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => exportDeck(deck, cards)}
                  className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                  title="ส่งออกชุดการ์ด (JSON)">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </motion.button>
              </>
            )}
            {/* ปุ่มลบ - แสดงเสมอ (ยกเว้นชุด sync) */}
            {!isSynced && (
              <button
                onClick={() => onDeleteDeck(deck)}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 flex items-center justify-center transition-all"
                title="ลบชุดการ์ด">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Panel - แสดงเมื่อแชร์แล้ว */}
      {publicDeck && (
        <div className="mb-6">
          <DeckStatsPanel
            publicDeck={publicDeck}
            shareLink={shareLink}
            onUnshare={() => setShowUnshareConfirm(true)}
            onUpdateDeck={handleUpdateDeck}
          />
        </div>
      )}

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ยังไม่มีการ์ดในชุดนี้</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>เริ่มสร้างการ์ดแรกของคุณ</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }} 
            onClick={onShowAddCard}
            className="inline-flex items-center gap-2 text-white text-base font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
            style={{
              background: col.gradient,
              boxShadow: col.shadow
            }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มการ์ด
          </motion.button>
        </div>
      ) : (
        <div className="space-y-3">
          {isSynced && (
            <div className={`p-4 rounded-xl text-sm ${isDark ? 'bg-violet-900/20 border border-violet-800/30' : 'bg-violet-50 border border-violet-200'}`}>
              <div className="flex gap-3">
                <svg className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className={isDark ? 'text-violet-300' : 'text-violet-800'}>
                  <p className="font-bold">🔒 ชุดการ์ดนี้เป็นแบบ read-only</p>
                  <p className="text-xs mt-1">ไม่สามารถแก้ไขได้ เพราะซิงค์กับชุดต้นฉบับ</p>
                </div>
              </div>
            </div>
          )}
          {cards.map((card) => {
            const isDue = new Date(card.nextReviewDate) <= new Date();
            return (
              <motion.div 
                key={card.id} 
                whileHover={canEdit ? { scale: 1.02, y: -2 } : {}}
                whileTap={canEdit ? { scale: 0.98 } : {}}
                className={`backdrop-blur-sm rounded-2xl border p-5 flex items-start gap-4 transition-all duration-300 ${
                  canEdit ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isDark 
                    ? `bg-slate-800/90 border-slate-700 ${canEdit ? 'hover:bg-slate-800 hover:border-purple-500/50' : ''}` 
                    : `bg-white/80 border-purple-100 ${canEdit ? 'hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100' : ''}`
                }`}
                onClick={() => canEdit && onEditCard(card)}>
                <div className="flex-1 min-w-0">
                  <div className={`text-base font-bold mb-1 line-clamp-1 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <MathText className="[&_p]:mb-0 [&_.katex]:text-[0.95em]">{card.question}</MathText>
                  </div>
                  <div className={`text-sm line-clamp-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <MathText className="[&_p]:mb-0 [&_.katex]:text-[0.85em]">{card.answer}</MathText>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {isDue && (
                    <span className="text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-xl">ถึงเวลา</span>
                  )}
                  {canEdit && (
                    <svg className={`w-5 h-5 ${
                      isDark ? 'text-purple-400' : 'text-purple-300'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ShareDeckModal
        isOpen={showShareModal}
        deckName={deck.name}
        cardCount={cards.length}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      />

      <EditDeckModal
        isOpen={showEditModal}
        deckName={deck.name}
        deckColor={deck.color}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditDeck}
      />

      <ConfirmModal
        isOpen={showUnshareConfirm}
        title="ยกเลิกการแชร์?"
        message={`คุณต้องการยกเลิกการแชร์ชุด "${deck.name}" ใช่ไหม?\n\nชุดการ์ดจะถูกซ่อนจากหน้าสำรวจ แต่ลิงก์เก่ายังใช้งานได้`}
        confirmText="ยกเลิกการแชร์"
        cancelText="ยกเลิก"
        type="warning"
        onConfirm={handleUnshare}
        onCancel={() => setShowUnshareConfirm(false)}
      />

      <ConfirmModal
        isOpen={showUnsubscribeConfirm}
        title="ยกเลิก Subscribe?"
        message={`คุณต้องการยกเลิก Subscribe ชุด "${deck.name}" ใช่ไหม?\n\nชุดการ์ดและความคืบหน้าการทบทวนจะถูกลบ\n\nถ้าต้องการเก็บไว้ ให้ใช้ "คัดลอกเป็นของฉัน" แทน`}
        confirmText="ยกเลิก Subscribe"
        cancelText="ยกเลิก"
        type="danger"
        onConfirm={handleUnsubscribe}
        onCancel={() => setShowUnsubscribeConfirm(false)}
      />
    </motion.div>
  );
}
