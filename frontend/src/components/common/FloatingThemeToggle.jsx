import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AnimasterMagnetic } from './AnimasterMagnetic';

/**
 * FloatingThemeToggle
 * Compact global theme toggle button anchored at the top-right corner.
 * - Single source of truth for changing theme across standalone pages.
 * - Shows strictly ONE icon: Day (Sun) in light mode or Night (Moon) in dark mode.
 * - Icon size strictly matches the w-4 h-4 dimensions of the Wishlist heart button.
 */
export function FloatingThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // FloatingThemeToggle is ONLY used on standalone pages without a navbar (such as the Landing Page '/')
  const isStandalonePageWithoutNavbar = location.pathname === '/';

  if (!isStandalonePageWithoutNavbar) {
    return null;
  }

  return (
    <aside
      aria-label="Theme toggle"
      className="fixed top-3.5 right-3.5 sm:top-4 sm:right-6 z-[9998] select-none pointer-events-auto"
    >
      <AnimasterMagnetic strength={0.15} maxOffset={4}>
        <button
          type="button"
          onClick={() => toggleTheme()}
          aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          className="group relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.18)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer outline-none ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
        >
          {/* Micro Tooltip (Positioned below since button is at top) */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all duration-150 ease-out whitespace-nowrap z-20">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-md backdrop-blur-md border border-white/10 dark:border-black/5">
              {isDark ? 'Night Mode' : 'Day Mode'}
            </span>
          </div>

          {/* Dynamic Ambient Aura Behind Icon */}
          <div
            className={`absolute inset-0 rounded-full blur-xs transition-opacity duration-300 pointer-events-none ${
              isDark ? 'bg-cyan-500/20 opacity-100' : 'bg-amber-400/25 opacity-100'
            }`}
          />

          {/* Single Icon: Shows only Day (Sun) or Night (Moon) icon matching Wishlist size (w-4 h-4) */}
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="night-mode-icon"
                initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative z-10 flex items-center justify-center text-cyan-400"
              >
                <Moon className="w-4 h-4 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" strokeWidth={2} />
              </motion.div>
            ) : (
              <motion.div
                key="day-mode-icon"
                initial={{ scale: 0.6, rotate: 45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, rotate: -45, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative z-10 flex items-center justify-center text-amber-500"
              >
                <Sun className="w-4 h-4 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" strokeWidth={2} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </AnimasterMagnetic>
    </aside>
  );
}

export default FloatingThemeToggle;
