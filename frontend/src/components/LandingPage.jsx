import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../context/ToastContext';

// ── Interactive 60FPS Constellation Particle Canvas ──
function ConstellationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates
    const mouse = { x: -1000, y: -1000, radius: 150 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Particle nodes setup
    const particleCount = Math.min(65, Math.floor((width * height) / 18000));
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const isEmerald = Math.random() > 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: Math.random() * 1.8 + 1.2,
        color: isEmerald ? 'rgba(16, 185, 129, ' : 'rgba(99, 102, 241, ',
        baseAlpha: Math.random() * 0.4 + 0.35,
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Bounce from walls
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse Repulsion & Gravity
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const forceX = (dx / dist) * force * 2.5;
          const forceY = (dy / dist) * force * 2.5;
          p.x -= forceX;
          p.y -= forceY;

          // Draw connection to cursor
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.45 * (1 - dist / mouse.radius)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.baseAlpha + ')';
        ctx.fill();

        // 2. Interconnect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distNodes = Math.hypot(p.x - p2.x, p.y - p2.y);
          const maxDist = 125;

          if (distNodes < maxDist) {
            const alpha = (1 - distNodes / maxDist) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10 opacity-75 dark:opacity-65"
    />
  );
}

// ── Smooth Flat 2D Elevation Card Wrapper (Zero 3D Distortion) ──
function SmoothHoverCard({ children, className = '', ...props }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      className={`w-full flex flex-col justify-between transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── Rotating Kinetic Categories for Hero Title ──
const ROTATING_CATEGORIES = [
  {
    text: 'Student PGs',
    accent: 'from-emerald-600 via-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-300',
    border: 'border-emerald-300/80 dark:border-emerald-700/80',
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/50',
    dot: 'bg-emerald-500',
  },
  {
    text: 'Coliving Spaces',
    accent: 'from-teal-600 via-cyan-500 to-emerald-500 dark:from-teal-400 dark:to-cyan-300',
    border: 'border-teal-300/80 dark:border-teal-700/80',
    bg: 'bg-teal-500/10 dark:bg-teal-950/50',
    dot: 'bg-teal-500',
  },
  {
    text: 'Private Rooms',
    accent: 'from-indigo-600 via-blue-500 to-sky-500 dark:from-indigo-400 dark:to-sky-300',
    border: 'border-indigo-300/80 dark:border-indigo-700/80',
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/50',
    dot: 'bg-indigo-500',
  },
  {
    text: 'Shared Flats',
    accent: 'from-sky-600 via-teal-500 to-indigo-500 dark:from-sky-400 dark:to-blue-300',
    border: 'border-sky-300/80 dark:border-sky-700/80',
    bg: 'bg-sky-500/10 dark:bg-sky-950/50',
    dot: 'bg-sky-500',
  },
  {
    text: 'Hostel Wings',
    accent: 'from-violet-600 via-indigo-500 to-teal-500 dark:from-violet-400 dark:to-indigo-300',
    border: 'border-violet-300/80 dark:border-violet-700/80',
    bg: 'bg-violet-500/10 dark:bg-violet-950/50',
    dot: 'bg-violet-500',
  },
];

export function LandingPage({ onSelectUpload, onSelectSearch }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  // 1.5-second initial center hold, then cinematic transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroComplete(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Continuous word rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_CATEGORIES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const activeCategory = ROTATING_CATEGORIES[wordIndex];

  return (
    <div className="bg-[#fafbfc] dark:bg-[#090b10] text-slate-900 dark:text-white font-sans antialiased h-screen max-h-screen flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 relative overflow-hidden transition-colors duration-500">
      {/* ── Interactive Particle Constellation Canvas ── */}
      <ConstellationCanvas />

      {/* Ambient Gradient Underglow */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-emerald-100/40 via-teal-50/20 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 blur-3xl pointer-events-none" />
      </div>

      {/* ── Main Hero & Dual Choice Cards ── */}
      <main className="relative z-30 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-2 sm:py-4 min-h-0">
        <div className="max-w-5xl w-full mx-auto flex flex-col items-center my-auto">
          {/* ── Step 1 & 2: Hero Typography Block (Centered for 1.5s, then shifts upward) ── */}
          <motion.div
            initial={{ y: '18vh', scale: 1.06 }}
            animate={{
              y: isIntroComplete ? 0 : '18vh',
              scale: isIntroComplete ? 1 : 1.06,
            }}
            transition={{
              duration: 0.95,
              ease: [0.16, 1, 0.3, 1], // Fluid decelerating cubic-bezier curve
            }}
            className="text-center max-w-3xl mx-auto mb-4 sm:mb-6 shrink-0"
          >

            {/* Brand Logo Title */}
            <motion.h1
              initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl font-extrabold tracking-[-0.035em] text-slate-900 dark:text-white leading-tight mb-2 sm:mb-2.5"
            >
              Room<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">Scout</span>
            </motion.h1>

            {/* Dynamic Kinetic Word Rotator Punchline */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-center gap-2 flex-wrap text-sm sm:text-xl font-bold text-slate-700 dark:text-zinc-200 mb-2 sm:mb-3 min-h-[38px]"
            >
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                Rent Verified
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ y: 18, opacity: 0, filter: 'blur(4px)', scale: 0.94 }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
                  exit={{ y: -18, opacity: 0, filter: 'blur(4px)', scale: 0.94 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-xl border shadow-xs backdrop-blur-md ${activeCategory.bg} ${activeCategory.border}`}
                >
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r font-extrabold ${activeCategory.accent}`}>
                    {activeCategory.text}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeCategory.dot} animate-pulse`} />
                </motion.span>
              </AnimatePresence>
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                with Zero Brokerage
              </span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-normal leading-relaxed tracking-tight max-w-lg mx-auto"
            >
              Direct stays, verified spaces, and direct host connections across top education &amp; corporate hubs.
            </motion.p>
          </motion.div>

          {/* ── Step 2: Dual Choice Cards (Transitions in from respective sides at 1.5s) ── */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl overflow-visible">
            {/* Card 1: List Property (Slides in from LEFT) */}
            <motion.div
              initial={{ x: -280, opacity: 0, scale: 0.96 }}
              animate={{
                x: isIntroComplete ? 0 : -280,
                opacity: isIntroComplete ? 1 : 0,
                scale: isIntroComplete ? 1 : 0.96,
              }}
              transition={{
                duration: 0.95,
                delay: isIntroComplete ? 0.05 : 0,
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
                className="group relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-lg shadow-emerald-950/[0.04] hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500 overflow-hidden cursor-pointer select-none"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-200/40 dark:bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                
                <div>
                  <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                      For Owners &amp; Hosts
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1.5 sm:mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    List Your Property
                  </h2>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5 font-normal">
                    Connect directly with students and verified guests without middleman fees.
                  </p>
                </div>

                <div>
                  <div className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs sm:text-sm tracking-normal shadow-md shadow-emerald-600/25 group-hover:shadow-lg group-hover:shadow-emerald-600/40 group-hover:from-emerald-500 group-hover:to-teal-500 transition-all duration-200">
                    <span>Host a Stay</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </SmoothHoverCard>
            </motion.div>

            {/* Card 2: Find Verified Rooms (Slides in from RIGHT) */}
            <motion.div
              initial={{ x: 280, opacity: 0, scale: 0.96 }}
              animate={{
                x: isIntroComplete ? 0 : 280,
                opacity: isIntroComplete ? 1 : 0,
                scale: isIntroComplete ? 1 : 0.96,
              }}
              transition={{
                duration: 0.95,
                delay: isIntroComplete ? 0.05 : 0,
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
                className="group relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-sky-200/80 dark:border-indigo-800/60 shadow-lg shadow-indigo-950/[0.04] hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-500 overflow-hidden cursor-pointer select-none"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-sky-200/40 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                
                <div>
                  <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 bg-sky-100/80 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-sky-200/60 dark:border-indigo-800/60">
                      For Students &amp; Travelers
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1.5 sm:mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Find Verified Rooms
                  </h2>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5 font-normal">
                    Browse curated rooms, PGs, and shared apartments near your campus or workplace.
                  </p>
                </div>

                <div>
                  <div className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs sm:text-sm tracking-normal shadow-md shadow-slate-900/20 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-600/30 transition-all duration-200">
                    <span>Explore Rooms</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </SmoothHoverCard>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── Minimal Footer (Fades in after 1.5s) ── */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isIntroComplete ? 1 : 0,
          y: isIntroComplete ? 0 : 20,
        }}
        transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        className="relative z-30 border-t border-slate-200/70 dark:border-zinc-800 bg-white/50 dark:bg-[#090b10]/60 backdrop-blur-sm py-2.5 sm:py-3 shrink-0"
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
          <p>© 2025 RoomScout. Direct stays, zero brokerage.</p>
          <div className="flex items-center gap-5 sm:gap-6">
            <button
              type="button"
              onClick={() => toast.info('Privacy Policy: All personal data and phone numbers are encrypted.')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => toast.info('Terms of Service: Zero brokerage direct living agreements.')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => toast.info('Support Contact: support@roomscout.in')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

export default LandingPage;