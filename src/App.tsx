import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFlashcardStore, type Deck, type Flashcard } from './store/store';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import AchievementToast from './components/AchievementToast';
import type { Achievement } from './components/AchievementToast';
import AddCard from './components/AddCard';
import AddDeck from './components/AddDeck';
import EditCard from './components/EditCard';
import ConfirmModal from './components/ConfirmModal';
import HandwritingLogo from './components/HandwritingLogo';
import SplashScreen from './components/SplashScreen';
import InstallPrompt from './components/InstallPrompt';
import LoadingSkeleton from './components/LoadingSkeleton';
import PwaStatusBar from './components/PwaStatusBar';
import { haptics } from './utils/haptics';
import { getDeckColorStyles } from './utils/colorUtils';
import { Zap } from 'lucide-react';
import { getThaiDayColor, DECK_COLOR_MAP } from './utils/thaiDayColors';

// Lazy loaded page components to optimize bundle size
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeckDetail = lazy(() => import('./pages/DeckDetail'));
const ReviewSession = lazy(() => import('./pages/ReviewSession'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const PublicDeckDetail = lazy(() => import('./pages/PublicDeckDetail'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));

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
  const [hasHandledLaunchShortcut, setHasHandledLaunchShortcut] = useState(false);

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

  useEffect(() => {
    if (!isLoggedIn || hasHandledLaunchShortcut) return;

    const params = new URLSearchParams(window.location.search);
    const shortcut = params.get('shortcut');

    if (shortcut === 'review') {
      Promise.resolve().then(() => startReview(undefined, false, true));
    } else if (shortcut === 'explore') {
      Promise.resolve().then(() => goExplore());
    }

    if (shortcut) {
      params.delete('shortcut');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }

    Promise.resolve().then(() => setHasHandledLaunchShortcut(true));
  }, [hasHandledLaunchShortcut, isLoggedIn]);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50'}`}>
      {/* Premium Cosmic Ambient Glowing Nodes (2026 Cosmic Theme) */}
      <div className="cosmic-glow-node-1 top-[-10%] left-[-10%] opacity-50 dark:opacity-40" />
      <div className="cosmic-glow-node-2 bottom-[10%] right-[-10%] opacity-40 dark:opacity-30" />

      {/* ── Header — outside AnimatePresence, always instant ── */}
      {isLoggedIn && (
        <header className={`border-b sticky top-0 z-40 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white/90 border-purple-100 shadow-sm backdrop-blur-xl'
        }`} style={{
          paddingTop: 'env(safe-area-inset-top)'
        }}>
          <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2" style={{
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
          }}>
            {/* Logo - Responsive */}
            <button onClick={goHome} className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br ${dayColor.gradient} flex items-center justify-center group-hover:scale-105 transition-all ${
                isDark ? '' : `shadow-lg ${dayColor.shadow}`
              }`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-left hidden xs:block">
                <HandwritingLogo gradient={dayColor.gradient} size="sm" animated={false} />
                <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Daily Memory
                </p>
              </div>
            </button>

            {/* Right Side - Responsive */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Icon Buttons Group */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Achievements */}
                {view !== 'achievements' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goAchievements}
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-amber-400 hover:bg-slate-800'
                        : 'text-amber-600 hover:bg-amber-50'
                    }`}
                    title="ความสำเร็จ"
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
                      isDark
                        ? 'text-rose-400 hover:bg-slate-800'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                    title="ผู้ดูแลระบบ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </motion.button>
                )}

                {/* Divider - Hidden on mobile */}
                <div className={`hidden sm:block w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-colors ${
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

              {/* New Deck Button - Hide text on mobile */}
              {view === 'home' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptics.medium(); setShowAddDeck(true); }}
                  className={`hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r ${dayColor.gradient} text-white rounded-lg font-semibold text-sm transition-all ${
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

      {isLoggedIn && <PwaStatusBar dayColor={dayColor} />}

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
            className="min-h-screen flex items-center justify-center p-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center max-w-xs mx-auto">
              {/* Dynamic Theme-Colored Pulsing Icon */}
              <div className={`w-16 h-16 mx-auto mb-5 bg-gradient-to-br ${dayColor.gradient} rounded-3xl flex items-center justify-center shadow-lg ${isDark ? '' : dayColor.shadow}`}>
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              
              <h3 className={`text-base font-bold mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>กำลังเชื่อมต่อเซิร์ฟเวอร์</h3>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-6 leading-relaxed`}>หากระบบโหลดช้าเนื่องจากการเชื่อมต่อขัดข้อง คุณสามารถสลับใช้งานโหมดทดลองออฟไลน์ได้ทันที</p>
              
              {/* Fallback button to skip to demo mode */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  haptics.success();
                  setDemoMode(true);
                }}
                className={`w-full py-3.5 px-5 rounded-2xl text-xs font-bold shadow-md transition-all ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>เข้าใช้งานโหมดทดลอง (Offline)</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : (!user && !isDemo) ? (
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSkeleton type="card" />
            </div>
          }>
            <AuthPage key="auth" />
          </Suspense>
        ) : (
          <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-10" style={{
            paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
            paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
            paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))'
          }}>
            <Suspense fallback={<LoadingSkeleton type="card" />}>
              <AnimatePresence mode="wait">
              {view === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Dashboard
                    onOpenDeck={openDeck}
                    onStartReview={() => startReview(undefined, false, true)}
                    onShowAddDeck={() => setShowAddDeck(true)}
                    dayColor={dayColor}
                  />
                </motion.div>
              )}
              {view === 'deck' && liveActiveDeck && (
                <motion.div
                  key="deck"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <DeckDetail
                    deck={liveActiveDeck}
                    onStartReview={startReview}
                    onShowAddCard={() => setShowAddCard(true)}
                    onEditCard={setEditingCard}
                    onDeleteDeck={handleDeleteDeck}
                  />
                </motion.div>
              )}
              {view === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ReviewSession
                    activeDeck={liveActiveDeck}
                    isCramMode={isCramMode}
                    onGoHome={goHome}
                    onEditCard={setEditingCard}
                    dayColor={dayColor}
                    deckColor={deckColor}
                    skipModeSelector={skipModeSelector}
                  />
                </motion.div>
              )}
              {view === 'explore' && (
                <motion.div
                  key="explore"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ExplorePage
                    onOpenDeck={openPublicDeck}
                  />
                </motion.div>
              )}
              {view === 'public-deck' && activePublicDeckId && (
                <motion.div
                  key="public-deck"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <PublicDeckDetail
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
                </motion.div>
              )}
              {view === 'admin' && isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <AdminPage />
                </motion.div>
              )}
              {view === 'achievements' && (
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <AchievementsPage dayColor={dayColor} />
                </motion.div>
              )}
              {view === 'statistics' && (
                <motion.div
                  key="statistics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <StatisticsPage dayColor={dayColor} />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        </main>
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
        }`} style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
        }}>
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
            className={`sm:hidden fixed z-40 w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-r ${dayColor.gradient} text-white`}
            style={{
              bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1.5rem))',
              right: 'max(1.5rem, calc(env(safe-area-inset-right) + 1.5rem))'
            }}
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
