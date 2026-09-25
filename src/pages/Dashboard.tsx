import { useMemo, useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search, SlidersHorizontal, X, Download, Upload } from 'lucide-react';
import { useFlashcardStore, type Deck } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import ReviewForecast from '../components/ReviewForecast';
import CustomSelect from '../components/CustomSelect';
import TodayPanel from '../components/TodayPanel';
import { cardBuckets } from '../utils/memoryStats';
import { nextBatch } from '../utils/todaySummary';
import { getDeckColorStyles } from '../utils/colorUtils';
import { exportFullBackup, importFullBackup } from '../utils/deckIO';
import { haptics } from '../utils/haptics';
import { isCardDue } from '../utils/studyDay';

interface DashboardProps {
  onOpenDeck: (deck: Deck) => void;
  onStartReview: () => void;
  onShowAddDeck: (mode?: 'create' | 'import') => void;
  dayColor: { gradient: string; shadow: string };
}

const Dashboard = memo(function Dashboard({ onOpenDeck, onStartReview, onShowAddDeck, dayColor }: DashboardProps) {
  const store = useFlashcardStore();
  const { decks, getTotalCards, getDueCount, importFullBackupData } = store;
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deckFilter, setDeckFilter] = useState<'all' | 'due'>('all');
  const [sortMode, setSortMode] = useState<'due' | 'recent' | 'name'>('due');

  const handleExportBackup = () => {
    try {
      exportFullBackup(store);
      haptics.success();
      showToast('ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ!', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรอง', 'error');
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = await importFullBackup(file);
      importFullBackupData(backup);
      haptics.success();
      showToast('นำเข้าข้อมูลสำรองเรียบร้อยแล้ว!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าไฟล์';
      showToast(msg, 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // ✅ Fix: read store.cards directly instead of getDueCards (unstable reference)
  const allDueCards = useMemo(() => {
    const now = new Date();
    return store.cards.filter(c => isCardDue(c, now));
  }, [store.cards]);
  const totalDue = allDueCards.length;
  const totalCards = store.cards.length;
  // ✅ Fix: pull mastered count out of JSX into a proper useMemo at component level
  const masteredCount = useMemo(() => cardBuckets(store.cards).mature, [store.cards]);
  const upcoming = useMemo(() => nextBatch(store.cards), [store.cards]);
  const deckSummaries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return decks
      .map((deck) => ({
        deck,
        due: getDueCount(deck.id),
        total: getTotalCards(deck.id),
      }))
      .filter(({ deck, due }) => {
        const matchesSearch = normalizedQuery.length === 0 || deck.name.toLowerCase().includes(normalizedQuery);
        const matchesFilter = deckFilter === 'all' || due > 0;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortMode === 'name') {
          return a.deck.name.localeCompare(b.deck.name, 'th');
        }
        if (sortMode === 'recent') {
          return new Date(b.deck.createdAt).getTime() - new Date(a.deck.createdAt).getTime();
        }
        return b.due - a.due || new Date(b.deck.createdAt).getTime() - new Date(a.deck.createdAt).getTime();
      });
  }, [decks, deckFilter, getDueCount, getTotalCards, searchQuery, sortMode]);

  const hasActiveDeckControls = searchQuery.trim().length > 0 || deckFilter !== 'all' || sortMode !== 'due';

  return (
    <div>
      <TodayPanel
        due={totalDue}
        totalCards={totalCards}
        mastered={masteredCount}
        streak={store.streak}
        hasDecks={decks.length > 0}
        nextBatch={upcoming}
        dayColor={dayColor}
        onStartReview={onStartReview}
        onCreateDeck={() => onShowAddDeck('create')}
        onCreateWithAI={() => onShowAddDeck('import')}
      />

      {/* Review Forecast */}
      {totalCards > 0 && (
        <div className="mb-8">
          <ReviewForecast dayColor={dayColor} />
        </div>
      )}

      {/* Deck List (ผู้ใช้ใหม่เห็นแผง "วันนี้" ด้านบนแทน) */}
      {decks.length === 0 ? null : (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackupFile}
            accept=".json"
            className="hidden"
          />
          <div className="mb-4 flex items-center justify-between gap-3 px-2">
            <div>
              <h2 className={`text-lg font-bold display-font ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>ชุดการ์ดของฉัน</h2>
              <p className={`mt-1 text-xs font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                แสดง {deckSummaries.length} จาก {decks.length} ชุด
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                title="ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมด"
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                  isDark
                    ? 'bg-slate-800 text-purple-400 hover:bg-slate-700'
                    : 'bg-white text-purple-600 shadow-sm hover:bg-purple-50 border border-purple-100'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">สำรองข้อมูล</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="นำเข้าไฟล์สำรองข้อมูล (.json)"
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                  isDark
                    ? 'bg-slate-800 text-teal-400 hover:bg-slate-700'
                    : 'bg-white text-teal-600 shadow-sm hover:bg-teal-50 border border-teal-100'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">นำเข้าสำรอง</span>
              </button>
              {hasActiveDeckControls && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDeckFilter('all');
                    setSortMode('due');
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* ค้นหา/กรองมีประโยชน์เมื่อมีหลายชุด — ชุดน้อยแสดงรายการเลย */}
          {(decks.length > 5 || hasActiveDeckControls) && (
          <div className={`mb-4 rounded-2xl border p-3 ${
            isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-white/80 shadow-sm'
          }`}>
            <label className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-700'
            }`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                name="deck-search"
                aria-label="ค้นหาชุดการ์ด"
                autoComplete="off"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชุดการ์ด…"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <CustomSelect
                value={deckFilter}
                onChange={(val) => setDeckFilter(val as 'all' | 'due')}
                options={[
                  { value: 'all', label: 'ทุกชุด' },
                  { value: 'due', label: 'รอทบทวน' }
                ]}
                variant="flat"
                icon={<Filter className="h-4 w-4 shrink-0 text-slate-400" />}
                className="w-full"
              />

              <CustomSelect
                value={sortMode}
                onChange={(val) => setSortMode(val as 'due' | 'recent' | 'name')}
                options={[
                  { value: 'due', label: 'ค้างมากก่อน' },
                  { value: 'recent', label: 'ล่าสุดก่อน' },
                  { value: 'name', label: 'ชื่อ A-Z' }
                ]}
                variant="flat"
                icon={<SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />}
                className="w-full"
              />
            </div>
          </div>
          )}

          {deckSummaries.length === 0 ? (
            <div className={`rounded-2xl border px-5 py-10 text-center ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-white/80 shadow-sm'
            }`}>
              <Search className={`mx-auto mb-3 h-8 w-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                ไม่พบชุดการ์ดที่ตรงเงื่อนไข
              </h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                ลองเปลี่ยนคำค้น หรือกลับไปดูทุกชุด
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
            {deckSummaries.map(({ deck, due, total }) => {
              const colorStyles = getDeckColorStyles(deck.color);
              return (
                <motion.div 
                  key={deck.id} 
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="premium-card accent-glow rounded-3xl p-4 flex items-center gap-4 border cursor-pointer transition group"
                  onClick={() => {
                    haptics.light();
                    onOpenDeck(deck);
                  }}>
                  {/* Icon Box - Dynamic color */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{ 
                      background: colorStyles.gradient,
                      opacity: 0.9
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  {/* Text Area - Bolder title */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-bold mb-0.5 truncate display-font ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>{deck.name}</h3>
                    <div className={`flex items-center gap-2 text-sm font-medium ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span>{total} การ์ด</span>
                      {due > 0 && (
                        <>
                          <span className={`w-1 h-1 rounded-full ${
                            isDark ? 'bg-slate-600' : 'bg-slate-300'
                          }`}></span>
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            รอทบทวน {due}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Arrow - Animated */}
                  <div className={`group-hover:translate-x-1 transition pr-2 ${
                    isDark ? 'text-slate-600 group-hover:text-slate-500' : 'text-slate-300 group-hover:text-slate-400'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default Dashboard;
