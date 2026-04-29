import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFlashcardStore, type Deck, type Flashcard } from './store/store';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import AchievementToast from './components/AchievementToast';
import type { Achievement } from './components/AchievementToast';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import DeckDetail from './pages/DeckDetail';
import ReviewSession from './pages/ReviewSession';
import ExplorePage from './pages/ExplorePage';
import PublicDeckDetail from './pages/PublicDeckDetail';
import AdminPage from './pages/AdminPage';
import AchievementsPage from './pages/AchievementsPage';
import StatisticsPage from './pages/StatisticsPage';
import AddCard from './components/AddCard';
import AddDeck from './components/AddDeck';
import EditCard from './components/EditCard';
import ConfirmModal from './components/ConfirmModal';
import HandwritingLogo from './components/HandwritingLogo';
import SplashScreen from './components/SplashScreen';
import InstallPrompt from './components/InstallPrompt';
import { haptics } from './utils/haptics';
import { getDeckColorStyles } from './utils/colorUtils';

// สีประจำวันแบบไทย (ตามเวลาประเทศไทย UTC+7)
const THAI_DAY_COLORS = {
  0: { gradient: 'from-red-600 to-rose-600', shadow: 'shadow-red-200' },
  1: { gradient: 'from-yellow-400 to-amber-500', shadow: 'shadow-amber-200' },
  2: { gradient: 'from-pink-600 to-rose-600', shadow: 'shadow-pink-200' },
  3: { gradient: 'from-green-600 to-emerald-600', shadow: 'shadow-green-200' },
  4: { gradient: 'from-orange-600 to-amber-600', shadow: 'shadow-orange-200' },
  5: { gradient: 'from-sky-600 to-blue-600', shadow: 'shadow-sky-200' },
  6: { gradient: 'from-purple-600 to-violet-600', shadow: 'shadow-purple-200' },
};

const getThaiDayColor = () => {
  const now = new Date();
  const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = thaiTime.getUTCDay();
  return THAI_DAY_COLORS[dayOfWeek as keyof typeof THAI_DAY_COLORS];
};

// map deck color key → gradient/shadow
const DECK_COLOR_MAP: Record<string, { gradient: string; shadow: string }> = {
  violet:  { gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
  sky:     { gradient: 'from-sky-500 to-blue-600',      shadow: 'shadow-sky-200' },
  teal:    { gradient: 'from-teal-500 to-emerald-600',  shadow: 'shadow-teal-200' },
  rose:    { gradient: 'from-rose-500 to-pink-600',     shadow: 'shadow-rose-200' },
  amber:   { gradient: 'from-amber-500 to-orange-600',  shadow: 'shadow-amber-200' },
  emerald: { gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-200' },
  pink:    { gradient: 'from-pink-500 to-fuchsia-600',  shadow: 'shadow-pink-200' },
  indigo:  { gradient: 'from-indigo-500 to-blue-600',   shadow: 'shadow-indigo-200' },
};

type View = 'home' | 'deck' | 'review' | 'explore' | 'public-deck' | 'admin' | 'achievements' | 'statistics';

function AppContent() {
  const { user, loading, isDemo, signOut, setDemoMode } = useAuth();
  const store = useFlashcardStore();
  const setAuthState = useFlashcardStore((state) => state.setAuthState);
  const { isDark, toggleTheme } = useTheme();
  const { showUndoToast } = useToast();
  const dayColor = getThaiDayColor();

  // Update theme-color meta tag dynamically based on dark mode
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
    }
  }, [isDark]);

  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
  };

  const [view, setView] = useState<View>('home');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [activePublicDeckId, setActivePublicDeckId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Poll for achievements from the queue
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentAchievement) {
        const achievement = store.popAchievement();
        if (achievement) {
          setCurrentAchievement(achievement);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentAchievement, store]);

  useEffect(() => {
    const userId = user?.id || null;
    setAuthState(userId, isDemo);
  }, [user?.id, isDemo, setAuthState]);

  const { deleteDeck, undoDeleteDeck } = store;

  const handleDeleteDeck = async (deck: Deck) => {
    await deleteDeck(deck.id); // Soft delete
    goHome();
    showUndoToast(`ลบชุด "${deck.name}" แล้ว`, () => undoDeleteDeck(deck.id));
  };

  const [isCramMode, setIsCramMode] = useState(false);
  const [skipModeSelector, setSkipModeSelector] = useState(false);

  const openDeck = (deck: Deck) => { setActiveDeck(deck); setView('deck'); };
  const startReview = (deck?: Deck, cramMode?: boolean, skipMode?: boolean) => { 
    setActiveDeck(deck ?? null); 
    setIsCramMode(cramMode ?? false);
    setSkipModeSelector(skipMode ?? false);
    setView('review'); 
  };
  const goHome = () => { 
    setView('home'); 
    setActiveDeck(null); 
    setActivePublicDeckId(null);
    setSkipModeSelector(false); // Reset skip mode selector
  };
  const goExplore = () => { setView('explore'); setActiveDeck(null); setActivePublicDeckId(null); };
  const goAdmin = () => { setView('admin'); setActiveDeck(null); setActivePublicDeckId(null); };
  const goAchievements = () => { setView('achievements'); setActiveDeck(null); setActivePublicDeckId(null); };
  const goStatistics = () => { setView('statistics'); setActiveDeck(null); setActivePublicDeckId(null); };
  const openPublicDeck = (publicDeckId: string) => { setActivePublicDeckId(publicDeckId); setView('public-deck'); };
  const closePublicDeck = () => { setView('explore'); setActivePublicDeckId(null); };

  const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID;
  const isAdmin = user?.id === ADMIN_USER_ID && !!ADMIN_USER_ID;

  // deckColor = สีของ deck ที่กำลัง review (ถ้ามี)
  const liveActiveDeck = activeDeck ? store.decks.find(d => d.id === activeDeck.id) || activeDeck : null;
  const deckColor = liveActiveDeck 
    ? (DECK_COLOR_MAP[liveActiveDeck.color] ?? getDeckColorStyles(liveActiveDeck.color))
    : undefined;

  const isLoggedIn = !showSplash && !loading && (user || isDemo);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50'}`} style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>

      {/* ── Header — outside AnimatePresence, always instant ── */}
      {isLoggedIn && (
        <header className={`border-b sticky top-0 z-40 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white/90 border-purple-100 shadow-sm backdrop-blur-xl'
        }`}>
          <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
            <button onClick={goHome} className="flex items-center gap-3 group">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${dayColor.gradient} flex items-center justify-center group-hover:scale-105 transition-all ${
                isDark ? '' : `shadow-lg ${dayColor.shadow}`
              }`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-left">
                <HandwritingLogo gradient={dayColor.gradient} size="sm" animated={false} />
                <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Daily Memory
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              {/* Icon Buttons Group */}
              <div className="flex items-center gap-1">
                {/* Achievements */}
                {view !== 'achievements' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goAchievements}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-amber-400 hover:bg-slate-800'
                        : 'text-amber-600 hover:bg-amber-50'
                    }`}
                    title="Achievements"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </motion.button>
                )}

                {/* Statistics */}
                {view !== 'statistics' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goStatistics}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-blue-400 hover:bg-slate-800'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                    title="สถิติ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </motion.button>
                )}

                {/* Explore */}
                {view !== 'explore' && view !== 'public-deck' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goExplore}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="สำรวจ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </motion.button>
                )}

                {/* Admin */}
                {isAdmin && view !== 'admin' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goAdmin}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-rose-400 hover:bg-slate-800'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Admin"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </motion.button>
                )}

                {/* Divider */}
                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
                >
                  {isDark ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {/* Logout */}
                {(user || isDemo) && (
                  <button
                    onClick={isDemo ? () => setShowLogoutConfirm(true) : signOut}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isDemo ? 'ออกจากโหมดทดลอง' : 'ออกจากระบบ'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </div>

              {/* New Deck Button */}
              {view === 'home' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptics.medium(); setShowAddDeck(true); }}
                  className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r ${dayColor.gradient} text-white rounded-lg font-semibold text-sm transition-all ${
                    isDark ? '' : 'shadow-md hover:shadow-lg'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>ชุดใหม่</span>
                </motion.button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Page Content ── */}
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen
            key="splash"
            onComplete={handleSplashComplete}
            dayColor={dayColor}
            isAuthenticated={!!(user || isDemo)}
          />
        ) : loading ? (
          <motion.div
            key="loading"
            className="min-h-screen flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>กำลังโหลด...</p>
            </div>
          </motion.div>
        ) : (!user && !isDemo) ? (
          <AuthPage key="auth" />
        ) : (
          <motion.main
            key="main"
            className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {view === 'home' && (
                <Dashboard
                  key="home"
                  onOpenDeck={openDeck}
                  onStartReview={() => startReview(undefined, false, true)}
                  onShowAddDeck={() => setShowAddDeck(true)}
                  dayColor={dayColor}
                />
              )}
              {view === 'deck' && liveActiveDeck && (
                <DeckDetail
                  key="deck"
                  deck={liveActiveDeck}
                  onStartReview={startReview}
                  onShowAddCard={() => setShowAddCard(true)}
                  onEditCard={setEditingCard}
                  onDeleteDeck={handleDeleteDeck}
                />
              )}
              {view === 'review' && (
                <ReviewSession
                  key="review"
                  activeDeck={liveActiveDeck}
                  isCramMode={isCramMode}
                  onGoHome={goHome}
                  onEditCard={setEditingCard}
                  dayColor={dayColor}
                  deckColor={deckColor}
                  skipModeSelector={skipModeSelector}
                />
              )}
              {view === 'explore' && (
                <ExplorePage
                  key="explore"
                  onOpenDeck={openPublicDeck}
                />
              )}
              {view === 'public-deck' && activePublicDeckId && (
                <PublicDeckDetail
                  key="public-deck"
                  publicDeckId={activePublicDeckId}
                  onClose={closePublicDeck}
                  onImported={(deckId) => {
                    const deck = store.getDeckById(deckId);
                    if (deck) {
                      closePublicDeck();
                      openDeck(deck);
                    }
                  }}
                />
              )}
              {view === 'admin' && isAdmin && (
                <AdminPage key="admin" />
              )}
              {view === 'achievements' && (
                <AchievementsPage key="achievements" dayColor={dayColor} />
              )}
              {view === 'statistics' && (
                <StatisticsPage key="statistics" dayColor={dayColor} />
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddDeck && <AddDeck onClose={() => setShowAddDeck(false)} onCreated={(id) => { const d = store.getDeckById(id); if (d) openDeck(d); }} dayColor={dayColor} />}
        {showAddCard && activeDeck && <AddCard deckId={activeDeck.id} onClose={() => setShowAddCard(false)} />}
        {editingCard && <EditCard card={editingCard} onClose={() => setEditingCard(null)} />}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="ออกจากโหมดทดลอง?"
        message={`คุณต้องการออกจากโหมดทดลองเพื่อไปหน้าล็อคอินใช่ไหม?\n\nข้อมูลในโหมดทดลองจะยังคงอยู่ใน localStorage`}
        confirmText="ออกจากระบบ" cancelText="ยกเลิก" type="warning"
        onConfirm={() => { setDemoMode(false); window.location.reload(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* ── Footer — outside AnimatePresence, always instant ── */}
      {isLoggedIn && (
        <footer className={`mt-auto text-center py-6 text-xs font-medium ${
          isDark ? 'text-slate-700' : 'text-slate-400'
        }`}>
          MemoKard · เมมโมการ์ด
        </footer>
      )}

      {/* ── Mobile FAB (Floating Action Button) ── */}
      <AnimatePresence>
        {isLoggedIn && view === 'home' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptics.medium(); setShowAddDeck(true); }}
            className={`sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-r ${dayColor.gradient} text-white`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <InstallPrompt dayColor={dayColor} />
      
      {/* Achievement Toast */}
      <AchievementToast 
        achievement={currentAchievement} 
        onClose={() => setCurrentAchievement(null)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
