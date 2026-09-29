import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * SkiperSpotlightCard
 * Skiper UI signature Spotlight card that creates a dynamic radial glow
 * tracking the user's mouse position across the card surface and border.
 */
export function SkiperSpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(16, 185, 129, 0.12)',
  borderColor = 'rgba(16, 185, 129, 0.4)',
  ...props
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-2xl sm:rounded-3xl border border-emerald-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-md shadow-emerald-950/[0.03] hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Skiper Mouse-Following Spotlight Layer */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl sm:rounded-3xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 60%)`,
        }}
      />
      {/* Border Accent Highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: `inset 0 0 0 1px ${borderColor}`,
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default SkiperSpotlightCard;
