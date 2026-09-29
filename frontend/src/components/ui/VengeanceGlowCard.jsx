import React from 'react';
import { cn } from '../../lib/utils';

/**
 * VengeanceGlowCard
 * Vengeance UI signature ambient glow component with subtle animated
 * chromatic glow borders and sleek depth.
 */
export function VengeanceGlowCard({
  children,
  className = '',
  glowColor = 'from-emerald-500/20 via-teal-500/10 to-transparent',
  backdrop = null,
  ...props
}) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-zinc-900/80 border border-emerald-200/80 dark:border-zinc-800 shadow-md shadow-emerald-950/[0.03] hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Full-Bleed Edge-to-Edge Backdrop Layer (extends 100% till border) */}
      {backdrop && (
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl sm:rounded-3xl">
          {backdrop}
        </div>
      )}

      {/* Ambient Corner Blur Orb (Matching Landing Page) */}
      <div
        className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500 z-0"
      />

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export default VengeanceGlowCard;
