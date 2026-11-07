import React from 'react';

/**
 * PropertyArchitecturalBackground
 * Ambient radiant mesh glow background matching the Admin Page (Pic 1),
 * with top purple-indigo glow, subtle cyan and violet side auras, and micro-dot depth matrix.
 */
export function PropertyArchitecturalBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none max-md:bg-white bg-slate-50 dark:bg-[#06080F]"
    >
      {/* Top Center Radiant Glow (Hidden on mobile for pure clean white header) */}
      <div className="max-md:hidden absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl rounded-full" />
      {/* Top Left Subtle Cyan/Blue Aura */}
      <div className="max-md:hidden absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/[0.07] blur-[120px] rounded-full" />
      {/* Bottom Right Soft Violet Aura */}
      <div className="max-md:hidden absolute top-2/3 -right-48 w-96 h-96 bg-purple-600/[0.08] blur-[120px] rounded-full" />
      {/* Subtle Micro-Dot Matrix Overlay for Depth */}
      <div className="max-md:hidden absolute inset-0 bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
    </div>
  );
}

export default PropertyArchitecturalBackground;
