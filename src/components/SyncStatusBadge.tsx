import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, HardDrive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { syncQueue } from '../store/syncQueue';

export default function SyncStatusBadge() {
  const { user, isDemo, backendStatus, retryBackend } = useAuth();
  const { isDark } = useTheme();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showTooltip, setShowTooltip] = useState(false);

  // ตรวจสอบจำนวนงานที่ค้างใน Offline Queue
  const updatePendingQueue = useCallback(async () => {
    try {
      const queue = await syncQueue.getQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void updatePendingQueue();
    const interval = setInterval(updatePendingQueue, 3000);

    const handleOnline = () => {
      setIsOnline(true);
      void updatePendingQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updatePendingQueue]);

  // สั่งประมวลผลคิวทันทีเมื่อผู้ใช้กด
  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await retryBackend();
      await syncQueue.processQueue();
      await updatePendingQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. ถ้าเป็น Demo Mode (Local-only)
  if (isDemo || !user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTooltip((prev) => !prev)}
          title="โหมดเก็บข้อมูลในเครื่อง (Local Mode)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700' 
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-purple-500" />
          <span className="hidden sm:inline">ในเครื่อง</span>
        </button>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl shadow-xl z-50 text-xs border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'
              }`}
            >
              <p className="font-bold text-sm mb-1 text-purple-500">โหมดจัดเก็บในเครื่อง</p>
              <p className="leading-relaxed">
                ข้อมูลแฟลชการ์ดของคุณจะถูกบันทึกไว้อย่างปลอดภัยในเบราว์เซอร์นี้ (IndexedDB)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 2. ถ้าเน็ตหลุด (Offline)
  if (!isOnline) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTooltip((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300"
        >
          <CloudOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>ออฟไลน์ {pendingCount > 0 && `(${pendingCount})`}</span>
        </button>
      </div>
    );
  }

  // 3. ถ้ามีรายการค้างในคิวซิงก์
  if (pendingCount > 0) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          title="กดเพื่อซิงก์ข้อมูลขึ้นคลาวด์ทันที"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>รอซิงก์ ({pendingCount})</span>
        </button>
      </div>
    );
  }

  // 4. สถานะคลาวด์ปกติ (Synced)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        title="ข้อมูลซิงก์กับคลาวด์เรียบร้อยแล้ว"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
          backendStatus === 'available'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300'
            : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
        }`}
      >
        {backendStatus === 'available' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">ซิงก์แล้ว</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">คลาวด์</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl shadow-xl z-50 text-xs border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'
            }`}
          >
            <p className="font-bold text-sm mb-1 text-emerald-500">
              {backendStatus === 'available' ? 'เชื่อมต่อคลาวด์สำเร็จ' : 'กำลังตรวจสอบเซิร์ฟเวอร์'}
            </p>
            <p className="leading-relaxed mb-2">
              การ์ดและประวัติการทบทวนถูกสำรองขึ้น PocketBase เรียบร้อยแล้ว
            </p>
            <button
              type="button"
              onClick={handleManualSync}
              className={`w-full py-1.5 rounded-xl font-bold transition-all ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ตรวจสอบการซิงก์
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
