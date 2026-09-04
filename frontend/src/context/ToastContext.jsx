import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  toastListeners.forEach((listener) => listener({ id: Date.now() + Math.random(), message, type }));
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ id, message, type }) => {
    setToasts((prev) => {
      // Keep at most 2 active toasts to keep center neat and uncrowded
      const next = [...prev, { id, message, type }].slice(-2);
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
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-9999 pointer-events-none flex flex-col items-center gap-2 max-w-[92vw] sm:max-w-2xl w-auto">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="pointer-events-auto flex items-center justify-center px-5 py-2.5 rounded-full bg-slate-950/95 dark:bg-black/95 text-white border border-white/15 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl text-xs sm:text-sm font-semibold select-none cursor-pointer text-center max-w-[90vw] sm:max-w-xl"
              onClick={() => removeToast(t.id)}
            >
              {/* Message Text */}
              <span className="text-slate-100 tracking-tight text-center leading-snug whitespace-normal">
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
