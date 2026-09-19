import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 text-center px-4 sm:px-8 lg:px-16 2xl:px-24 overflow-hidden">
      {/* ── Main Hero Content (Upper / Center) ── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-6xl mx-auto space-y-5 sm:space-y-6 flex-1 flex flex-col justify-center my-auto w-full"
      >
        {/* ── Top Micro-Pill: Direct Living Badge ── */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="group inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider uppercase bg-white/75 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-white/80 dark:border-white/20 backdrop-blur-2xl shadow-[0_8px_24px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] hover:border-white transition-all select-none"
          >
            {/* Live radar dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              0% BROKERAGE
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Pan-India Direct Living Network
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono hidden sm:inline">
              ✦
            </span>
          </motion.div>
        </div>

        {/* ── Main Architectural Headline ── */}
        <div className="relative">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-extrabold text-slate-950 dark:text-white tracking-[-0.04em] leading-[1.06] select-none max-w-5xl mx-auto">
            Find Your Perfect{' '}
            <span className="relative inline-block">
              <span className="font-serif-luxury italic font-normal tracking-[-0.015em] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-300 dark:via-blue-300 dark:to-indigo-200 bg-clip-text text-transparent px-1">
                Living Space.
              </span>
              {/* Ethereal Glow Underline Accent */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-1 left-1 right-1 h-[2.5px] sm:h-[3.5px] bg-gradient-to-r from-blue-600/0 via-blue-500/70 to-sky-400/0 rounded-full origin-left pointer-events-none"
              />
            </span>
          </h1>
        </div>

        {/* ── Subtitle with refined editorial cadence ── */}
        <p className="text-xs sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed tracking-normal">
          Curated student PGs, serviced apartments, and serene homestays across India.
          Book transparently directly with verified property owners—<span className="text-slate-900 dark:text-white font-semibold">zero middlemen, zero commissions</span>.
        </p>

        {/* ── Quick CTA Action Cluster ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          {/* Primary Button */}
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-medium text-xs sm:text-sm tracking-wider uppercase hover:opacity-90 active:scale-98 transition-opacity cursor-pointer select-none shadow-sm"
          >
            <span>Explore 5,000+ Stays</span>
            <svg 
              className="w-4 h-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

          {/* Secondary Button */}
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl bg-white/80 hover:bg-slate-100 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/20 text-slate-800 dark:text-white font-medium text-xs sm:text-sm backdrop-blur-xl transition-colors duration-150 cursor-pointer active:scale-98 select-none"
          >
            <svg 
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Verified Listings</span>
          </button>
        </div>

      </motion.div>

      {/* ── Architectural Metric Stats Cards (Shifted to the Bottom of Section) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl mx-auto pt-6 sm:pt-8"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
          <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl border border-slate-200/70 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/25 shadow-xs transition-colors duration-150">
            <div className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              5,000+
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Verified Stays
            </div>
          </div>
          <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl border border-slate-200/70 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/25 shadow-xs transition-colors duration-150">
            <div className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              0%
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Brokerage Fees
            </div>
          </div>
          <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl border border-slate-200/70 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/25 shadow-xs transition-colors duration-150">
            <div className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              14+
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              States Covered
            </div>
          </div>
          <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl border border-slate-200/70 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/25 shadow-xs transition-colors duration-150">
            <div className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight">
              4.9★
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Guest Satisfaction
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}