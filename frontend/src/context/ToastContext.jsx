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
  warning: (msg) => notify(msg, 'warn'),
};

function condenseToastMessage(raw) {
  if (!raw) return '';
  let text = typeof raw === 'string' ? raw : raw?.message || String(raw || '');

  // Strip leading emojis, bullet points, and icons
  text = text.replace(/^[\p{Emoji}\s•\-–—✓✅🎉⚠️❌]+/u, '').trim();

  // Common verbose or complex patterns mapped to crisp 1-line phrases (< 30 chars)
  const replacements = [
    [/network\s*error|failed\s*to\s*fetch/i, 'Network connection error'],
    [/server\s*is\s*waking\s*up|cold\s*start/i, 'Server waking up, retry soon'],
    [/cannot\s*connect\s*to\s*server|backend\s*is\s*running/i, 'Server unreachable'],
    [/already\s*booked|already\s*has\s*an\s*active\s*reservation/i, 'Room already reserved'],
    [/duplicate|already\s*been\s*submitted|already\s*recorded/i, 'Reference already submitted'],
    [/maximum\s*payment\s*attempts/i, 'Max attempts reached'],
    [/cannot\s*be\s*cancelled/i, 'Cannot be cancelled'],
    [/please\s*log\s*in|please\s*sign\s*in/i, 'Sign in to continue'],
    [/google\s*sign-in\s*(was\s*cancelled|failed|error)/i, 'Google sign-in cancelled'],
    [/payment\s*window.*expired|slot\s*has\s*been\s*released/i, 'Payment expired, slot released'],
    [/5-minute\s*payment\s*window/i, '5-min payment window open'],
    [/contiguous\s*without\s*gaps/i, 'Dates must be contiguous'],
    [/letters\s*only|no\s*numbers\s*or\s*special/i, 'Name: letters only'],
    [/10-digit\s*mobile/i, 'Enter 10-digit mobile'],
    [/12-digit\s*(aadhar|id)/i, 'Enter 12-digit Aadhar'],
    [/12-digit\s*(upi|utr|rrn)/i, 'Enter 12-digit UTR'],
    [/16:9\s*aspect\s*ratio/i, 'Photos must be 16:9 ratio'],
    [/receipt\s*image\s*must\s*be\s*under\s*5\s*mb/i, 'Receipt must be under 5 MB'],
    [/upload\s*an\s*image\s*file/i, 'Upload JPEG/PNG/WebP image'],
    [/offline\s*users\s*cannot\s*be\s*logged/i, 'Offline user has no login'],
    [/personal\s*details\s*updated/i, 'Profile updated'],
    [/password\s*updated/i, 'Password updated'],
    [/subscription\s*plan\s*verified/i, 'Plan verified & activated'],
    [/payment\s*reference\s*submitted/i, 'Payment reference sent'],
    [/payment\s*details\s*sent/i, 'Payment sent for review'],
    [/booking\s*request\s*sent/i, 'Booking request sent'],
    [/reservation\s*request\s*was\s*declined/i, 'Reservation declined'],
    [/reservation\s*has\s*been\s*cancelled/i, 'Reservation cancelled'],
    [/all\s*notifications\s*marked/i, 'Notifications marked read'],
    [/settings\s*saved/i, 'Settings saved'],
    [/welcome\s*to\s*stay\s*in/i, 'Welcome to Stay In!'],
    [/fresh\s*verification\s*code|new\s*code/i, 'New code sent to email'],
    [/verification\s*code\s*sent/i, 'Code sent to email'],
    [/security\s*code\s*sent/i, 'Security code sent'],
    [/property\s*approved\s*by\s*admin/i, 'Property approved by Admin'],
    [/location\s*imported/i, 'Location imported'],
    [/entry\s*pass.*downloaded/i, 'Entry pass downloaded'],
    [/please\s*select\s*at\s*least\s*1\s*day/i, 'Select at least 1 day'],
    [/please\s*select\s*at\s*least\s*1\s*month/i, 'Select at least 1 month'],
    [/please\s*select\s*an\s*available\s*room/i, 'Select an available room'],
    [/cannot\s*select\s*a\s*(date|month)\s*range\s*containing/i, 'Range has unavailable dates'],
    [/please\s*upload\s*at\s*least\s*1\s*showcase/i, 'Upload at least 1 photo'],
    [/please\s*add\s*at\s*least\s*1\s*room\s*card/i, 'Add at least 1 room card'],
    [/please\s*configure\s*at\s*least\s*1\s*room/i, 'Set at least 1 room rate'],
    [/property\s*description\s*must\s*be\s*at\s*least/i, 'Description min 10 chars'],
    [/property\s*name\s*must\s*be\s*at\s*least/i, 'Property name min 3 chars'],
    [/host\s*contact\s*number/i, 'Contact min 10 digits'],
    [/enter\s*the\s*host\s*name/i, 'Host name min 2 chars'],
    [/select\s*a\s*property\s*category/i, 'Select property category'],
    [/select\s*who\s*this\s*stay\s*is\s*available/i, 'Select target occupants'],
    [/select\s*at\s*least\s*1\s*facility/i, 'Select at least 1 facility'],
    [/select\s*at\s*least\s*1\s*house\s*rule/i, 'Select at least 1 rule'],
    [/review\s*and\s*rating\s*have\s*been\s*published|review\s*has\s*been\s*saved/i, 'Review published!'],
    [/successfully\s*approved\s*\d+\s*property\s*host/i, 'Approved selected hosts'],
    [/extracted\s*\d+\s*(12-digit\s*)?utr/i, 'UTRs extracted from PDF'],
    [/matched\s*\d+\s*host\s*request/i, 'Matched host requests'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) {
      return replacement;
    }
  }

  // Strip technical or conversational prefixes
  text = text.replace(/^(error|warning|info|alert|notice):\s*/i, '');
  text = text.replace(/^(failed to|could not|unable to)\s+/i, '');
  text = text.replace(/^(please\s+)/i, '');

  // Strip trailing punctuation for clean capsule appearance
  text = text.replace(/[.!]+$/, '').trim();

  // If still lengthy (over 34 chars), trim cleanly at word boundary
  if (text.length > 34) {
    const cut = text.slice(0, 32);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 18 ? cut.slice(0, lastSpace) : cut) + '…';
  }
  return text;
}

function notify(message, type = 'info') {
  const cleanMessage = condenseToastMessage(message);
  if (!cleanMessage) return;

  if (type === 'success') {
    haptic.success();
  } else if (type === 'error') {
    haptic.error();
  } else {
    haptic.tap();
  }
  toastListeners.forEach((listener) => listener({ id: Date.now() + Math.random(), message: cleanMessage, type }));
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

      {/* Top Center Floating Toast Container - Compact 1-line on mobile */}
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex flex-col items-center gap-1.5 w-max max-w-[90vw]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="pointer-events-auto inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#0f1115]/95 backdrop-blur-md text-white border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.45)] text-[11.5px] sm:text-xs font-semibold tracking-tight select-none cursor-pointer text-center whitespace-nowrap max-w-[88vw] sm:max-w-xs"
              onClick={() => removeToast(t.id)}
            >
              {t.type === 'error' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mr-2 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              )}
              {t.type === 'success' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 mr-2 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
              {t.type === 'warn' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 mr-2 shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              )}
              {t.type === 'info' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-400 mr-2 shrink-0 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
              )}
              {/* Message Text - strictly single line */}
              <span className="text-zinc-100 tracking-tight text-center leading-none truncate whitespace-nowrap select-none max-w-[72vw] sm:max-w-[240px]">
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
