import React from 'react';
import { cn } from '../../lib/utils';

/**
 * SkiperBadge
 * Skiper UI & Landing Page signature status and tag pill badge.
 */
export function SkiperBadge({
  children,
  variant = 'emerald', // 'emerald' | 'blue' | 'amber' | 'slate'
  pulse = false,
  className = '',
  ...props
}) {
  const variantStyles = {
    emerald:
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    blue:
      'bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-800 text-sky-800 dark:text-sky-300',
    amber:
      'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    slate:
      'bg-slate-100/90 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider shadow-2xs select-none',
        variantStyles[variant] || variantStyles.emerald,
        className
      )}
      {...props}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {children}
    </span>
  );
}

export default SkiperBadge;
