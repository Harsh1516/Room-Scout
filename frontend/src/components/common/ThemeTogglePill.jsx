import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeTogglePill
 * Single-icon theme mode toggle button (Day icon in light mode, Night icon in dark mode).
 * Icon size strictly matches the w-4 h-4 dimensions of the Wishlist heart button.
 */
export function ThemeTogglePill({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={`apple-liquid-nav relative w-8 h-8 sm:w-9 sm:h-9 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/15 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 shrink-0 ${className}`}
    >
      {/* Dynamic Ambient Aura Behind Icon */}
      <div
        className={`absolute inset-0 rounded-full blur-xs transition-opacity duration-300 pointer-events-none ${
          isDark ? 'bg-cyan-500/20 opacity-100' : 'bg-amber-400/25 opacity-100'
        }`}
      />

      {/* Single Icon: Shows only Day (Sun) or Night (Moon) icon matching Back button proportions */}
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="night-mode-pill-icon"
            initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-10 flex items-center justify-center text-cyan-400"
          >
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" strokeWidth={2} />
          </motion.div>
        ) : (
          <motion.div
            key="day-mode-pill-icon"
            initial={{ scale: 0.6, rotate: 45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-10 flex items-center justify-center text-amber-500"
          >
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" strokeWidth={2} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default ThemeTogglePill;

