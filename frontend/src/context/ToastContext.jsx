import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '../utils/haptics';

const ToastContext = createContext(null);

// Global event bus listener for non-hook usage (e.g. standalone helpers)
const toastListeners = new Set();

export const toast = {
  success: (msg) => notify(msg, 'success'),
  error: (msg) => notify(msg, 'error'),
  info: (msg) => notify(msg, 'info'),
  warn: (msg) => notify(msg, 'warn'),
};

function notify(message, type = 'info') {
  if (type === 'success') {
    haptic.success();
  } else if (type === 'error') {
    haptic.error();
  } else {
    haptic.tap();
  }
  toastListeners.forEach((listener) => listener({ id: Date.now() + Math.random(), message, type }));
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ id, message, type }) => {
    const now = Date.now();
    setToasts((prev) => {
      // Deduplicate identical message within recent 1200ms window
      const isDuplicate = prev.some(
        (t) => t.message === message && (t.timestamp ? now - t.timestamp < 1200 : true)
      );
      if (isDuplicate) return prev;

      // Keep at most 2 active toasts to keep center neat and uncrowded
      const next = [...prev, { id, message, type, timestamp: now }].slice(-2);
      return next;
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    toastListeners.add(addToast);
    return () => {
      toastListeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showToast: (msg, type) => notify(msg, type) }}>
      {children}

      {/* Top Center Premium Black Floating Toast Container */}
      <div className="fixed top-7 sm:top-9 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex flex-col items-center gap-3 w-max max-w-[96vw]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="pointer-events-auto flex items-center justify-center px-8 py-4 sm:px-10 sm:py-4.5 rounded-full bg-[#1f1b16]/95 backdrop-blur-md text-white border border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-base sm:text-lg font-semibold select-none cursor-pointer text-center w-max max-w-[96vw] whitespace-nowrap"
              onClick={() => removeToast(t.id)}
            >
              {t.type === 'error' && (
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-rose-500 mr-3 sm:mr-3.5 shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
              )}
              {t.type === 'success' && (
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-400 mr-3 sm:mr-3.5 shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              )}
              {t.type === 'warn' && (
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-amber-400 mr-3 sm:mr-3.5 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              )}
              {t.type === 'info' && (
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-sky-400 mr-3 sm:mr-3.5 shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
              )}
              {/* Message Text */}
              <span className="text-slate-100 tracking-tight text-center leading-none whitespace-nowrap">
                {t.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
