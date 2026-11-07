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
      'bg-emerald-50 border-emerald-200/80 text-emerald-800',
    blue:
      'bg-sky-50 border-sky-200/80 text-sky-800',
    amber:
      'bg-amber-50 border-amber-200/80 text-amber-800',
    slate:
      'bg-slate-100/90 border-slate-200/80 text-slate-700',
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
