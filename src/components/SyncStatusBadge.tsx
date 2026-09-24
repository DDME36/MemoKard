import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, CloudOff, HardDrive, LogIn, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { syncQueue } from '../store/syncQueue';

type Tone = 'local' | 'ok' | 'busy' | 'warn' | 'bad';

const TONES: Record<Tone, { light: string; dark: string; icon: string }> = {
  local: { light: 'bg-slate-100 border-slate-200 text-slate-700', dark: 'bg-slate-800/80 border-slate-700 text-slate-300', icon: 'text-purple-500' },
  ok: { light: 'bg-emerald-50 border-emerald-200 text-emerald-700', dark: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300', icon: 'text-emerald-500' },
  busy: { light: 'bg-amber-50 border-amber-200 text-amber-800', dark: 'bg-amber-950/40 border-amber-900/60 text-amber-300', icon: 'text-amber-500' },
  warn: { light: 'bg-orange-50 border-orange-200 text-orange-800', dark: 'bg-orange-950/40 border-orange-900/60 text-orange-300', icon: 'text-orange-500' },
  bad: { light: 'bg-rose-50 border-rose-200 text-rose-700', dark: 'bg-rose-950/40 border-rose-900/60 text-rose-300', icon: 'text-rose-500' },
};

export default function SyncStatusBadge() {
  const { user, isDemo, backendStatus, retryBackend } = useAuth();
  const { isDark } = useTheme();

  const [pendingCount, setPendingCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(() => syncQueue.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setSyncStatus(syncQueue.getStatus());
    try {
      setPendingCount((await syncQueue.getQueue()).length);
      setDeadCount((await syncQueue.getDeadLetters()).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(() => void refresh());
    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // อ่านสถานะครั้งแรกแบบ async (ไม่ setState ตรงใน effect)
    const first = window.setTimeout(() => void refresh(), 0);
    return () => {
      unsubscribe();
      window.clearTimeout(first);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await retryBackend();
      const { pullChanges } = await import('../store/syncEngine');
      await pullChanges().catch(() => undefined);
      await syncQueue.processQueue();
      await refresh();
    } finally {
      setIsSyncing(false);
    }
  };

  const local = isDemo || !user;
  const lastSynced = syncStatus.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null;

  let tone: Tone;
  let Icon: LucideIcon;
  let label: string;
  let title: string;
  let detail: string;

  if (local) {
    tone = 'local'; Icon = HardDrive; label = 'ในเครื่อง';
    title = 'เก็บข้อมูลในเครื่องนี้';
    detail = 'ชุดการ์ดอยู่ในเบราว์เซอร์นี้เท่านั้น สมัครบัญชีเพื่อสำรองและใช้ข้ามเครื่องได้';
  } else if (!isOnline) {
    tone = 'bad'; Icon = CloudOff; label = pendingCount > 0 ? `ออฟไลน์ (${pendingCount})` : 'ออฟไลน์';
    title = 'ออฟไลน์';
    detail = 'ใช้งานต่อได้ตามปกติ ทุกอย่างบันทึกในเครื่องก่อน แล้วจะซิงก์เองเมื่อกลับมาออนไลน์';
  } else if (syncStatus.status === 'auth') {
    tone = 'bad'; Icon = LogIn; label = 'เข้าสู่ระบบใหม่';
    title = 'ต้องเข้าสู่ระบบใหม่';
    detail = 'เซสชันหมดอายุ ออกจากระบบแล้วเข้าใหม่เพื่อซิงก์ต่อ ข้อมูลในเครื่องยังอยู่ครบ';
  } else if (deadCount > 0) {
    tone = 'warn'; Icon = AlertTriangle; label = `ส่งไม่ได้ ${deadCount}`;
    title = `มี ${deadCount} รายการส่งไม่สำเร็จ`;
    detail = 'เซิร์ฟเวอร์ปฏิเสธบางรายการ ลองส่งใหม่ หรือทิ้งรายการเหล่านี้';
  } else if (pendingCount > 0 || isSyncing || syncStatus.status === 'syncing' || syncStatus.status === 'retrying') {
    tone = 'busy'; Icon = RefreshCw; label = pendingCount > 0 ? `กำลังซิงก์ (${pendingCount})` : 'กำลังซิงก์';
    title = 'กำลังซิงก์';
    detail = syncStatus.status === 'retrying'
      ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ระบบจะลองใหม่ให้อัตโนมัติ'
      : 'กำลังส่งการเปลี่ยนแปลงขึ้นเซิร์ฟเวอร์';
  } else if (backendStatus === 'available') {
    tone = 'ok'; Icon = CheckCircle2; label = 'ซิงก์แล้ว';
    title = lastSynced ? `ซิงก์แล้ว ${lastSynced} น.` : 'เชื่อมต่อเซิร์ฟเวอร์แล้ว';
    detail = 'การ์ดและประวัติการทบทวนสำรองไว้บนเซิร์ฟเวอร์เรียบร้อย';
  } else {
    tone = 'busy'; Icon = RefreshCw; label = 'กำลังเชื่อมต่อ';
    title = 'กำลังตรวจสอบเซิร์ฟเวอร์';
    detail = 'ระหว่างนี้ใช้งานได้ตามปกติ ข้อมูลบันทึกในเครื่องไว้ก่อน';
  }

  const style = TONES[tone];
  const spinning = Icon === RefreshCw && (isSyncing || syncStatus.status === 'syncing');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`สถานะการซิงก์: ${title}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${isDark ? style.dark : style.light}`}
      >
        <Icon className={`w-3.5 h-3.5 ${style.icon} ${spinning ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl shadow-xl z-50 text-xs border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'
            }`}
          >
            <p className={`font-bold text-sm mb-1 ${style.icon}`}>{title}</p>
            <p className="leading-relaxed">{detail}</p>

            {!local && deadCount > 0 && (
              <div className="flex gap-2 mt-3">
                <button type="button" className="flex-1 py-1.5 rounded-xl bg-violet-500 text-white font-bold" onClick={() => void syncQueue.retryDeadLetters()}>
                  ลองส่งใหม่
                </button>
                <button type="button" className={`flex-1 py-1.5 rounded-xl font-bold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`} onClick={() => void syncQueue.discardDeadLetters()}>
                  ทิ้ง
                </button>
              </div>
            )}

            {!local && isOnline && deadCount === 0 && (
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={isSyncing}
                className={`w-full mt-3 py-1.5 rounded-xl font-bold transition-colors disabled:opacity-60 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {isSyncing ? 'กำลังซิงก์…' : 'ซิงก์ตอนนี้'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
