import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface PwaStatusBarProps {
  dayColor: {
    gradient: string;
    shadow?: string;
  };
}

export default function PwaStatusBar({ dayColor }: PwaStatusBarProps) {
  const { isDark } = useTheme();
  const isOnline = useNetworkStatus();
  const [queuedActions, setQueuedActions] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const refreshQueueCount = async () => {
      const { syncQueue } = await import('../store/syncQueue');
      const queue = await syncQueue.getQueue();
      if (isMounted) setQueuedActions(queue.length);
    };

    refreshQueueCount();
    const interval = window.setInterval(refreshQueueCount, 4000);
    window.addEventListener('online', refreshQueueCount);
    window.addEventListener('offline', refreshQueueCount);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('online', refreshQueueCount);
      window.removeEventListener('offline', refreshQueueCount);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let waitingWorker: ServiceWorker | null = null;

    const handleControllerChange = () => {
      if (waitingWorker) window.location.reload();
    };

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      const markWaitingWorker = () => {
        waitingWorker = registration.waiting;
        if (waitingWorker) setUpdateReady(true);
      };

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = worker;
            setUpdateReady(true);
          }
        });
      });

      markWaitingWorker();
    };

    navigator.serviceWorker.ready.then(watchRegistration).catch(() => undefined);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const hasSyncQueue = queuedActions > 0;
  const shouldShow = !isOnline || hasSyncQueue || updateReady;

  const handleSyncNow = async () => {
    const { syncQueue } = await import('../store/syncQueue');
    await syncQueue.processQueue();
    const queue = await syncQueue.getQueue();
    setQueuedActions(queue.length);
  };

  const handleReloadForUpdate = async () => {
    const registration = await navigator.serviceWorker.ready;
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`sticky top-[calc(env(safe-area-inset-top)+3.8rem)] z-30 border-b ${
            isDark
              ? 'border-slate-800 bg-slate-950/95 text-slate-200'
              : 'border-violet-100 bg-white/95 text-slate-700'
          } backdrop-blur-xl`}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 text-xs font-semibold">
            <div className="flex min-w-0 items-center gap-2">
              {!isOnline ? (
                <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
              ) : hasSyncQueue ? (
                <CloudOff className="h-4 w-4 shrink-0 text-sky-500" />
              ) : (
                <RefreshCw className="h-4 w-4 shrink-0 text-emerald-500" />
              )}
              <span className="truncate">
                {!isOnline
                  ? 'ออฟไลน์อยู่ ใช้งานต่อได้และจะซิงก์เมื่อออนไลน์'
                  : hasSyncQueue
                    ? `มี ${queuedActions} รายการรอซิงก์`
                    : 'มีเวอร์ชันใหม่พร้อมใช้งาน'}
              </span>
            </div>

            {isOnline && hasSyncQueue && (
              <button
                type="button"
                onClick={handleSyncNow}
                className={`shrink-0 rounded-lg px-3 py-1.5 transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Cloud className="mr-1 inline h-3.5 w-3.5" />
                ซิงก์
              </button>
            )}

            {updateReady && (
              <button
                type="button"
                onClick={handleReloadForUpdate}
                className={`shrink-0 rounded-lg bg-gradient-to-r ${dayColor.gradient} px-3 py-1.5 text-white shadow-sm transition-opacity hover:opacity-90`}
              >
                อัปเดต
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
