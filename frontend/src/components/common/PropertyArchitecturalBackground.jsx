import React from 'react';

/**
 * PropertyArchitecturalBackground
 * Ambient radiant mesh glow background matching Pic 2 clean studio minimalism on mobile,
 * with subtle architectural concentric circles, and glowing desktop aesthetics.
 */
export function PropertyArchitecturalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none max-md:bg-gradient-to-b max-md:from-[#EAEFF4] max-md:via-[#EFF2F6] max-md:to-[#E6EBF1] bg-[#f7f4ee]"
    >
      {/* ── Mobile Architectural Studio Geometry (Pic 2 Minimal Aesthetic) ── */}
      <div className="md:hidden absolute -top-28 -left-28 w-[400px] h-[400px] rounded-full border border-white/60 pointer-events-none" />
      <div className="md:hidden absolute -top-48 -left-48 w-[580px] h-[580px] rounded-full border border-white/40 pointer-events-none" />
      <div className="md:hidden absolute -top-68 -left-68 w-[760px] h-[760px] rounded-full border border-white/25 pointer-events-none" />
      <div className="md:hidden absolute top-[28%] -right-40 w-[480px] h-[480px] rounded-full border border-white/50 pointer-events-none" />
      <div className="md:hidden absolute top-[22%] -right-60 w-[660px] h-[660px] rounded-full border border-white/30 pointer-events-none" />

      {/* Top Center Radiant Glow (Hidden on mobile for pure clean white header) */}
      <div className="max-md:hidden absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] /15 blur-3xl rounded-full" />
      {/* Top Left Subtle Cyan/Blue Aura */}
      <div className="max-md:hidden absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/[0.07] blur-[120px] rounded-full" />
      {/* Bottom Right Soft Violet Aura */}
      <div className="max-md:hidden absolute top-2/3 -right-48 w-96 h-96 bg-purple-600/[0.08] blur-[120px] rounded-full" />
      {/* Subtle Micro-Dot Matrix Overlay for Depth */}
      <div className="max-md:hidden absolute inset-0 bg-[radial-gradient(#0000000d_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
    </div>
  );
}

export default PropertyArchitecturalBackground;
