import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Extending Window interface for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallPromptProps {
  dayColor: {
    gradient: string;
    shadow?: string;
  };
}

export default function InstallPrompt({ dayColor }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isPwaInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           ('standalone' in window.navigator && (window.navigator as any).standalone);
    setIsStandalone(!!isPwaInstalled);

    if (isPwaInstalled) {
      // If installed, we might want to ask for notification permissions
      if ('Notification' in window && Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      }
      return; // Do not show install prompt if already installed
    }

    // Check if user dismissed the prompt before
    const dismissedAt = localStorage.getItem('installPromptDismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show again for 7 days
      }
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show iOS instruction after a delay
      setTimeout(() => setShowPrompt(true), 5000); // Increased to 5 seconds
    }

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setShowNotificationPrompt(false);
      // Optional: Show a success toast
    } else {
      setShowNotificationPrompt(false);
    }
  };

  if (isStandalone && !showNotificationPrompt) return null;

  return (
    <AnimatePresence>
      {(showPrompt || showNotificationPrompt) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
        >
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden">
            {/* Subtle Gradient background matching the day */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${dayColor.gradient} opacity-20 rounded-full blur-2xl`} />

            {/* Notification Prompt */}
            {showNotificationPrompt ? (
              <>
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`p-3 bg-gradient-to-br ${dayColor.gradient} rounded-2xl text-white shadow-lg`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">เปิดรับการแจ้งเตือน</h3>
                    <p className="text-sm text-slate-500 mt-1">ให้แอปช่วยเตือนคุณทบทวนการ์ดทุกวัน เพื่อไม่ให้ลืมเนื้อหาสำคัญ</p>
                  </div>
                  <button onClick={() => setShowNotificationPrompt(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  className={`w-full py-2.5 mt-2 bg-gradient-to-r ${dayColor.gradient} text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all relative z-10`}
                >
                  อนุญาตการแจ้งเตือน
                </button>
              </>
            ) : (
              /* Install App Prompt */
              <>
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`p-3 bg-gradient-to-br ${dayColor.gradient} rounded-2xl text-white shadow-lg`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">ติดตั้งแอปลงเครื่อง</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {isIOS 
                        ? 'แตะปุ่ม Share ด้านล่าง แล้วเลือก "Add to Home Screen" เพื่อใช้งานแบบแอปพลิเคชัน'
                        : 'ติดตั้งแอป MemoKard ลงบนเครื่องเพื่อเข้าใช้งานได้รวดเร็วและใช้แบบออฟไลน์ได้'
                      }
                    </p>
                  </div>
                  <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {!isIOS && deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className={`w-full py-2.5 mt-2 bg-gradient-to-r ${dayColor.gradient} text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all relative z-10`}
                  >
                    ติดตั้งแอปพลิเคชัน
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
