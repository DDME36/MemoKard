import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showUndoToast: (message: string, onUndo: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(3000);
  const [undoCallback, setUndoCallback] = useState<(() => void) | null>(null);

  const showToast = useCallback((msg: string, toastType: ToastType = 'info', toastDuration: number = 3000) => {
    setMessage(msg);
    setType(toastType);
    setDuration(toastDuration);
    setUndoCallback(null);
    setIsOpen(true);
  }, []);

  const showUndoToast = useCallback((msg: string, onUndo: () => void, toastDuration: number = 5000) => {
    setMessage(msg);
    setType('warning');
    setDuration(toastDuration);
    setUndoCallback(() => onUndo);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setUndoCallback(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoCallback) {
      undoCallback();
      setIsOpen(false);
      setUndoCallback(null);
    }
  }, [undoCallback]);

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      {children}
      <Toast
        isOpen={isOpen}
        message={message}
        type={type}
        duration={duration}
        onClose={handleClose}
        onUndo={undoCallback ? handleUndo : undefined}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
