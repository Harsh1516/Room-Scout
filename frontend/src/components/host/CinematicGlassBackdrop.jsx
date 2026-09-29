import React from 'react';

/**
 * CinematicGlassBackdrop (Option 4: The Cinematic Glass Showcase)
 * High-end architectural luxury hospitality aesthetic (Airbnb Luxe / AD style):
 * - Curated luxury modern villa architectural facade with slow cinematic parallax zoom
 * - Deep frosted glassmorphism gradient veil ensuring 100% crisp typography on the left
 * - Seamless peek of illuminated luxury architecture on the right
 * - Golden/emerald ambient specular rim highlights
 */
export function CinematicGlassBackdrop({ coverImage }) {
  // Use property's actual uploaded image, or an ultra-luxury modern villa architectural showcase
  const architecturalImage =
    coverImage ||
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl sm:rounded-3xl z-0 select-none transition-colors duration-500"
    >
      {/* ── Layer 1: Cinematic Architectural Photograph with Slow Motion Zoom ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={architecturalImage}
          alt="Luxury Architecture"
          className="w-full h-full object-cover object-center animate-cinematic-zoom opacity-40 dark:opacity-35 filter brightness-105 contrast-105"
        />
      </div>

      {/* ── Layer 2: Frosted Glass Gradient Veil (Guarantees 100% Readability on Left) ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 sm:via-white/80 to-white/20 dark:from-[#080d16] dark:via-[#080d16]/90 sm:dark:via-[#080d16]/80 dark:to-transparent backdrop-blur-[2px] transition-colors duration-500" />

      {/* ── Layer 3: Warm Architectural Ambient Lighting on Right ── */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-amber-400/10 via-emerald-400/5 to-transparent dark:from-cyan-400/10 dark:via-emerald-400/5 dark:to-transparent pointer-events-none" />

      {/* ── Layer 4: Hairline Specular Glass Perimeter Edge ── */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 dark:via-emerald-400/50 to-transparent" />

      {/* ── Layer 5: Luxury Corner Badge ── */}
      <div className="absolute top-2.5 right-4 font-mono text-[8.5px] text-slate-400/70 dark:text-cyan-400/60 tracking-wider flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>ESTATE RESIDENCE // LUXE 4K</span>
      </div>
    </div>
  );
}

export default CinematicGlassBackdrop;
