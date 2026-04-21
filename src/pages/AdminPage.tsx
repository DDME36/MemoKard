import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface ReportedDeck {
  id: string;
  name: string;
  creator_username: string;
  creator_id: string;
  category: string;
  import_count: number;
  is_active: boolean;
  is_hidden: boolean;
  report_count: number;
  created_at: string;
  reports: Report[];
}

interface Report {
  id: string;
  reporter_username: string;
  reason: string;
  details: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  spam: 'สแปม',
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  copyright: 'ละเมิดลิขสิทธิ์',
  other: 'อื่นๆ',
};

export default function AdminPage() {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [decks, setDecks] = useState<ReportedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReportedDecks();
  }, []);

  const loadReportedDecks = async () => {
    setLoading(true);
    try {
      // Get all decks that have at least 1 report
      const { data: reportData, error } = await supabase
        .from('deck_reports')
        .select(`
          id,
          reason,
          details,
          created_at,
          public_deck_id,
          reporter_id
        `)
        .order('created_at', { ascending: false });

      if (error || !reportData) {
        console.error('Error loading reports:', error);
        setLoading(false);
        return;
      }

      // Get unique deck IDs
      const deckIds = [...new Set(reportData.map((r) => r.public_deck_id))];

      if (deckIds.length === 0) {
        setDecks([]);
        setLoading(false);
        return;
      }

      // Get deck details
      const { data: deckData } = await supabase
        .from('public_decks_with_stats')
        .select('*')
        .in('id', deckIds);

      // Get reporter usernames
      const reporterIds = [...new Set(reportData.map((r) => r.reporter_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', reporterIds);

      const profileMap = Object.fromEntries(
        (profileData || []).map((p) => [p.id, p.username])
      );

      // Combine data
      const combined: ReportedDeck[] = (deckData || []).map((deck) => {
        const deckReports = reportData
          .filter((r) => r.public_deck_id === deck.id)
          .map((r) => ({
            id: r.id,
            reporter_username: profileMap[r.reporter_id] || 'Unknown',
            reason: r.reason,
            details: r.details,
            created_at: r.created_at,
          }));

        return {
          id: deck.id,
          name: deck.name,
          creator_username: deck.creator_username || 'Unknown',
          creator_id: deck.creator_id,
          category: deck.category,
          import_count: deck.import_count || 0,
          is_active: deck.is_active,
          is_hidden: !deck.is_active,
          report_count: deckReports.length,
          created_at: deck.created_at,
          reports: deckReports,
        };
      });

      // Sort by report count descending
      combined.sort((a, b) => b.report_count - a.report_count);
      setDecks(combined);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async (deckId: string) => {
    setActionLoading(deckId);
    try {
      const { error } = await supabase
        .from('public_decks')
        .update({ is_active: false })
        .eq('id', deckId);

      if (error) throw error;

      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, is_active: false, is_hidden: true } : d))
      );
      showToast('ซ่อนชุดการ์ดแล้ว', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (deckId: string) => {
    setActionLoading(deckId);
    try {
      const { error } = await supabase
        .from('public_decks')
        .update({ is_active: true })
        .eq('id', deckId);

      if (error) throw error;

      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, is_active: true, is_hidden: false } : d))
      );
      showToast('คืนสถานะชุดการ์ดแล้ว', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm('ลบชุดการ์ดนี้ถาวรหรือไม่? ไม่สามารถย้อนกลับได้')) return;

    setActionLoading(deckId);
    try {
      const { error } = await supabase
        .from('public_decks')
        .delete()
        .eq('id', deckId);

      if (error) {
        console.error('Delete error:', error);
        showToast(`ลบไม่ได้: ${error.message}`, 'error');
        return;
      }

      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      showToast('ลบชุดการ์ดแล้ว', 'success');
    } catch (err) {
      console.error('Delete exception:', err);
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissReports = async (deckId: string) => {
    setActionLoading(deckId + '_dismiss');
    try {
      const { error } = await supabase
        .from('deck_reports')
        .delete()
        .eq('public_deck_id', deckId);

      if (error) throw error;

      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      showToast('ยกเลิกรายงานทั้งหมดแล้ว', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = decks.filter((d) => {
    if (filter === 'active') return d.is_active;
    if (filter === 'hidden') return !d.is_active;
    return true;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            จัดการรายงาน
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ชุดการ์ดที่ถูกรายงานทั้งหมด {decks.length} รายการ
          </p>
        </div>
        <button
          onClick={loadReportedDecks}
          className={`p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
          title="รีเฟรช"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {[
          { key: 'all', label: 'ทั้งหมด', count: decks.length },
          { key: 'active', label: 'แสดงอยู่', count: decks.filter((d) => d.is_active).length },
          { key: 'hidden', label: 'ซ่อนแล้ว', count: decks.filter((d) => !d.is_active).length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              filter === tab.key
                ? isDark
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
              filter === tab.key
                ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-24 rounded-2xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ไม่มีรายงานในขณะนี้
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((deck) => (
              <motion.div
                key={deck.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl border overflow-hidden ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                } ${!deck.is_active ? isDark ? 'border-rose-900/50' : 'border-rose-200' : ''}`}
              >
                {/* Deck Row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Report count badge */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      deck.report_count >= 5
                        ? 'bg-rose-500 text-white'
                        : deck.report_count >= 3
                        ? 'bg-amber-500 text-white'
                        : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {deck.report_count}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {deck.name}
                        </span>
                        {!deck.is_active && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-500/20 text-rose-500">
                            ซ่อนแล้ว
                          </span>
                        )}
                        {deck.report_count >= 5 && deck.is_active && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-500">
                            ควรตรวจสอบ
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        โดย {deck.creator_username} · {deck.category} · {deck.import_count} ผู้ติดตาม
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Toggle expand */}
                      <button
                        onClick={() => setExpandedDeck(expandedDeck === deck.id ? null : deck.id)}
                        className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                          isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}
                        title="ดูรายงาน"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedDeck === deck.id ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Hide / Restore */}
                      {deck.is_active ? (
                        <button
                          onClick={() => handleHide(deck.id)}
                          disabled={actionLoading === deck.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isDark
                              ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border border-amber-800/30'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          } disabled:opacity-50`}
                        >
                          {actionLoading === deck.id ? '...' : 'ซ่อน'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(deck.id)}
                          disabled={actionLoading === deck.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isDark
                              ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800/30'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          } disabled:opacity-50`}
                        >
                          {actionLoading === deck.id ? '...' : 'คืนสถานะ'}
                        </button>
                      )}

                      {/* Dismiss reports */}
                      <button
                        onClick={() => handleDismissReports(deck.id)}
                        disabled={actionLoading === deck.id + '_dismiss'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isDark
                            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        } disabled:opacity-50`}
                        title="ยกเลิกรายงานทั้งหมด (ชุดการ์ดนี้ไม่มีปัญหา)"
                      >
                        {actionLoading === deck.id + '_dismiss' ? '...' : 'ยกเลิกรายงาน'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(deck.id)}
                        disabled={!!actionLoading}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark
                            ? 'text-rose-500 hover:bg-rose-900/30'
                            : 'text-rose-500 hover:bg-rose-50'
                        } disabled:opacity-50`}
                        title="ลบถาวร"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Reports */}
                <AnimatePresence>
                  {expandedDeck === deck.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
                    >
                      <div className="p-4 space-y-2">
                        <p className={`text-xs font-bold mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          รายงานทั้งหมด ({deck.reports.length})
                        </p>
                        {deck.reports.map((report) => (
                          <div
                            key={report.id}
                            className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                  report.reason === 'inappropriate'
                                    ? isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'
                                    : report.reason === 'copyright'
                                    ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
                                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {REASON_LABEL[report.reason] || report.reason}
                                </span>
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  โดย {report.reporter_username}
                                </span>
                              </div>
                              <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                {formatDate(report.created_at)}
                              </span>
                            </div>
                            {report.details && (
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {report.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
