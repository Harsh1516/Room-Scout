import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeTogglePill
 * Sleek dual-icon (Sun / Moon) theme mode toggle pill without circular background discs.
 * Designed to sit cleanly in navigation headers directly to the left of the profile avatar.
 */
export function ThemeTogglePill({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={`group relative flex items-center h-8 px-1.5 py-1 gap-1.5 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-600 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none shrink-0 ${className}`}
    >
      {/* Light Mode Sun Option (Strictly equal size, smaller, clean gap) */}
      <div className="relative z-10 flex items-center justify-center w-5 h-5 transition-colors duration-150">
        <span
          className={`material-symbols-outlined text-[13px] leading-none transition-all duration-200 ${
            !isDark
              ? 'text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)] font-bold'
              : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400 opacity-50'
          }`}
        >
          light_mode
        </span>
      </div>

      {/* Dark Mode Moon Option (Strictly equal size, smaller, clean gap) */}
      <div className="relative z-10 flex items-center justify-center w-5 h-5 transition-colors duration-150">
        <span
          className={`material-symbols-outlined text-[13px] leading-none transition-all duration-200 ${
            isDark
              ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)] font-bold'
              : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400 opacity-50'
          }`}
        >
          dark_mode
        </span>
      </div>
    </button>
  );
}

export default ThemeTogglePill;
