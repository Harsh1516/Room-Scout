import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, ArrowRight } from 'lucide-react';
import { MatrixInteractiveGridBackground } from './common/MatrixInteractiveGridBackground';

// ── Card Wrapper (Static / No Hover Elevation) ──
function SmoothHoverCard({ children, className = '', ...props }) {
  return (
    <div
      className={`w-full flex flex-col justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Rotating Kinetic Categories for Hero Title ──
const ROTATING_CATEGORIES = [
  {
    text: 'Hostel Wings',
    accent: 'text-[#5468ff] dark:text-[#8ea0ff]',
    border: 'border-[#c5d2f6] dark:border-[#384260]',
    bg: 'bg-[#dce4f7]/85 dark:bg-[#202738]/85',
    dot: 'bg-[#5468ff]',
  },
  {
    text: 'Coliving Spaces',
    accent: 'text-[#0d9488] dark:text-[#2dd4bf]',
    border: 'border-[#99f6e4] dark:border-[#115e59]',
    bg: 'bg-[#ccfbf1]/85 dark:bg-[#134e4a]/85',
    dot: 'bg-[#0d9488]',
  },
  {
    text: 'Student PGs',
    accent: 'text-[#0284c7] dark:text-[#38bdf8]',
    border: 'border-[#bae6fd] dark:border-[#0369a1]',
    bg: 'bg-[#e0f2fe]/85 dark:bg-[#0c4a6e]/85',
    dot: 'bg-[#0284c7]',
  },
  {
    text: 'Private Rooms',
    accent: 'text-[#7c3aed] dark:text-[#a78bfa]',
    border: 'border-[#ddd6fe] dark:border-[#5b21b6]',
    bg: 'bg-[#ede9fe]/85 dark:bg-[#3b0764]/85',
    dot: 'bg-[#7c3aed]',
  },
  {
    text: 'Shared Flats',
    accent: 'text-[#0891b2] dark:text-[#22d3ee]',
    border: 'border-[#a5f3fc] dark:border-[#155e75]',
    bg: 'bg-[#cffafe]/85 dark:bg-[#164e63]/85',
    dot: 'bg-[#0891b2]',
  },
];

export function LandingPage({ onSelectUpload, onSelectSearch }) {
  const [wordIndex, setWordIndex] = useState(0);

  // Continuous word rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_CATEGORIES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const activeCategory = ROTATING_CATEGORIES[wordIndex];

  return (
    <div className="bg-white dark:bg-black text-slate-900 dark:text-white font-sans antialiased h-screen max-h-screen flex flex-col justify-between selection:bg-[#00c2cb] selection:text-white relative overflow-hidden transition-colors duration-500">
      {/* ── Cybernetic Matrix Interactive Grid with Mouse Sliding Circle (Dark mode only) ── */}
      <div className="hidden dark:block">
        <MatrixInteractiveGridBackground />
      </div>

      {/* ── Main Hero & Dual Choice Cards ── */}
      <main className="relative z-30 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-2 sm:py-3 min-h-0">
        <div className="max-w-5xl w-full mx-auto flex flex-col items-center my-auto">
          {/* ── Hero Typography Block ── */}
          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.85,
              delay: 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center max-w-3xl mx-auto mb-4 sm:mb-6 shrink-0 relative z-20"
          >
            {/* Brand Logo Title */}
            <div className="relative block mb-1.5 sm:mb-2">
              <motion.h1
                className="text-4xl sm:text-6xl font-black tracking-[-0.035em] leading-tight select-none"
              >
                <span className="text-slate-900 dark:text-white drop-shadow-none dark:drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] transition-colors">
                  Room
                </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#009299] via-[#0284c7] to-[#4f46e5] dark:from-[#00c2cb] dark:via-[#0ea5e9] dark:to-[#6366f1] drop-shadow-none dark:drop-shadow-[0_2px_18px_rgba(0,194,203,0.35)]">
                  Scout
                </span>
              </motion.h1>
            </div>

            {/* Dynamic Kinetic Word Rotator Punchline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.28, ease: 'easeOut' }}
              className="flex items-center justify-center gap-2 flex-wrap text-base sm:text-xl font-bold text-slate-800 dark:text-white mb-2 sm:mb-3 min-h-[40px] transition-colors"
            >
              <span className="drop-shadow-none dark:drop-shadow-md">
                Rent Verified
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ y: 12, opacity: 0, filter: 'blur(4px)', scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
                  exit={{ y: -12, opacity: 0, filter: 'blur(4px)', scale: 0.95 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full border shadow-sm backdrop-blur-md ${activeCategory.bg} ${activeCategory.border}`}
                >
                  <span className={`font-extrabold ${activeCategory.accent}`}>
                    {activeCategory.text}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeCategory.dot} animate-pulse`} />
                </motion.span>
              </AnimatePresence>
              <span className="drop-shadow-none dark:drop-shadow-md">
                with Zero Brokerage
              </span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.38, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 font-medium leading-relaxed tracking-tight max-w-lg mx-auto drop-shadow-none dark:drop-shadow-md transition-colors"
            >
              Direct stays, verified spaces, and direct host connections across top education &amp; corporate hubs.
            </motion.p>
          </motion.div>

          {/* ── Two Action Cards ── */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl overflow-visible">
            {/* Card 1: List Your Property (Host Onboarding) */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.82,
                delay: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full flex"
            >
              <SmoothHoverCard
                onClick={onSelectUpload}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectUpload && onSelectUpload();
                  }
                }}
                className="relative rounded-3xl p-6 sm:p-7 bg-white/95 dark:bg-[#12161f]/75 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_rgba(15,118,110,0.09)] overflow-hidden cursor-pointer select-none transition-colors duration-300"
              >
                {/* Soft ambient teal glow */}
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    {/* Mint/Teal Home Icon Badge */}
                    <div className="w-12 h-12 rounded-2xl bg-[#e6f7f5] dark:bg-teal-950/60 text-[#0d9488] dark:text-teal-300 flex items-center justify-center border border-teal-200/50 dark:border-teal-700/50 shadow-xs">
                      <Home className="w-6 h-6" strokeWidth={2.4} />
                    </div>
                    {/* Pill Badge */}
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#0f766e] dark:text-teal-300 bg-[#e6f7f5] dark:bg-teal-950/60 px-3 py-1 rounded-full border border-teal-200/50 dark:border-teal-700/50 shadow-xs">
                      FOR OWNERS &amp; HOSTS
                    </span>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                    List Your Property
                  </h2>
                  <p className="text-slate-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                    Connect directly with students and verified guests without middleman fees.
                  </p>
                </div>

                <div>
                  {/* Solid Teal CTA Button */}
                  <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0d9488] text-white font-bold text-xs sm:text-sm tracking-normal shadow-md shadow-teal-700/20">
                    <span>Host a Stay</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              </SmoothHoverCard>
            </motion.div>

            {/* Card 2: Find Verified Rooms */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.82,
                delay: 0.68,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full flex"
            >
              <SmoothHoverCard
                onClick={onSelectSearch}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSearch && onSelectSearch();
                  }
                }}
                className="relative rounded-3xl p-6 sm:p-7 bg-white/95 dark:bg-[#12161f]/75 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_rgba(30,27,75,0.09)] overflow-hidden cursor-pointer select-none transition-colors duration-300"
              >
                {/* Soft ambient indigo glow */}
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    {/* Lavender/Indigo Compass Icon Badge */}
                    <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] dark:bg-indigo-950/60 text-[#6366f1] dark:text-indigo-300 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/50 shadow-xs">
                      <Compass className="w-6 h-6" strokeWidth={2.4} />
                    </div>
                    {/* Pill Badge */}
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6366f1] dark:text-indigo-300 bg-[#ede9fe] dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-700/50 shadow-xs">
                      FOR STUDENTS &amp; TRAVELERS
                    </span>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                    Find Verified Rooms
                  </h2>
                  <p className="text-slate-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                    Browse curated rooms, PGs, and shared apartments near your campus or workplace.
                  </p>
                </div>

                <div>
                  {/* Solid Deep Indigo CTA Button */}
                  <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1e1b4b] dark:bg-indigo-600 text-white font-bold text-xs sm:text-sm tracking-normal shadow-md shadow-indigo-950/20">
                    <span>Explore Rooms</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                </div>
              </SmoothHoverCard>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;