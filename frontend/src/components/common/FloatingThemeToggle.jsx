import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { AnimasterMagnetic } from './AnimasterMagnetic';

/**
 * FloatingThemeToggle
 * Compact global theme toggle button anchored at the top-right corner.
 * - Single source of truth for changing theme across the site.
 * - Compact, sleek luxury micro-capsule.
 * - Automatically hidden on /host routes where it is already integrated into the host navbar.
 */
export function FloatingThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // When on host routes, the theme toggle is placed directly into the navbar to the left of the profile icon
  if (location.pathname.startsWith('/host')) {
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
          className="group relative flex items-center gap-1.5 px-1.5 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.18)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer outline-none ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
        >
          {/* Micro Tooltip (Positioned below since button is at top) */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all duration-150 ease-out whitespace-nowrap z-20">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-md backdrop-blur-md border border-white/10 dark:border-black/5">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          {/* Dynamic Ambient Aura Behind Pill */}
          <div
            className={`absolute inset-0 rounded-full blur-xs transition-opacity duration-300 pointer-events-none ${
              isDark ? 'bg-cyan-500/20 opacity-100' : 'bg-amber-400/25 opacity-100'
            }`}
          />

          {/* Light Mode Sun Option (Strictly equal size, smaller, no disproportionate scale) */}
          <div className="relative z-10 flex items-center justify-center w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors duration-150">
            <span
              className={`material-symbols-outlined text-[12px] sm:text-[13px] leading-none transition-all duration-200 ${
                !isDark
                  ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.7)] font-bold'
                  : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400 opacity-50'
              }`}
            >
              light_mode
            </span>
          </div>

          {/* Dark Mode Moon Option (Strictly equal size, smaller, no disproportionate scale) */}
          <div className="relative z-10 flex items-center justify-center w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors duration-150">
            <span
              className={`material-symbols-outlined text-[12px] sm:text-[13px] leading-none transition-all duration-200 ${
                isDark
                  ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.85)] font-bold'
                  : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400 opacity-50'
              }`}
            >
              dark_mode
            </span>
          </div>
        </button>
      </AnimasterMagnetic>
    </aside>
  );
}

export default FloatingThemeToggle;
