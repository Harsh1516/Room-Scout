import React from 'react';

/**
 * PropertyArchitecturalBackground
 * Option 2: Subtle Precision Dot Grid (Engineered & Architectural)
 * - Porcelain / Slate-50 base (#F8FAFC) for clean light theme
 * - Deep architectural space-slate (#070D18) for dark theme
 * - Precision 28px dot-matrix grid with hairline crosshair markers
 * - Soft dual atmospheric aura (subtle lavender on left, mint on right)
 * - Radial fade mask ensuring zero visual clash or distraction from cards
 */
export function PropertyArchitecturalBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* ── Base Surface Color ── */}
      <div className="absolute inset-0 bg-[#F8FAFC] dark:bg-[#070D18] transition-colors duration-500" />

      {/* ── Subtle Dual Ambient Optical Wash (Diffused 4-7% Aura) ── */}
      <div className="absolute -top-32 -left-20 w-[640px] h-[520px] bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-12 -right-20 w-[580px] h-[480px] bg-teal-400/8 dark:bg-teal-500/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[400px] bg-purple-400/6 dark:bg-purple-600/6 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Architectural Precision Dot Matrix (28px Cadence) with Radial Fade Mask ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse 90% 85% at 50% 30%, rgba(0, 0, 0, 0.9) 40%, rgba(0, 0, 0, 0.35) 75%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 85% at 50% 30%, rgba(0, 0, 0, 0.9) 40%, rgba(0, 0, 0, 0.35) 75%, transparent 100%)',
        }}
      >
        <svg
          className="w-full h-full opacity-60 dark:opacity-35"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
        >
          <defs>
            {/* Standard 28px Dot Matrix */}
            <pattern
              id="architectural-dot-grid"
              x="0"
              y="0"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="2"
                cy="2"
                r="1.15"
                className="fill-slate-400/55 dark:fill-slate-500/50"
              />
            </pattern>

            {/* Hairline Crosshair Markers at 112px intervals (4x cadence) for blueprint feel */}
            <pattern
              id="architectural-cross-grid"
              x="0"
              y="0"
              width="112"
              height="112"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M2 0 V4 M0 2 H4"
                className="stroke-slate-400/65 dark:stroke-slate-500/60"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>

          {/* Dot matrix layer */}
          <rect width="100%" height="100%" fill="url(#architectural-dot-grid)" />
          {/* Micro crosshair accents */}
          <rect width="100%" height="100%" fill="url(#architectural-cross-grid)" />
        </svg>
      </div>

      {/* ── Soft Vignette along Screen Borders to Keep Workspace Focused ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/[0.02] dark:to-black/40 pointer-events-none" />
    </div>
  );
}

export default PropertyArchitecturalBackground;
