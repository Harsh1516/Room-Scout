import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../../services/api';

export function HeroSection({ onSelectUpload }) {
  const navigate = useNavigate();

  const [stats, setStats] = useState(() => {
    let cachedStaysCount = null;
    try {
      const cached =
        sessionStorage.getItem('roomscout_stays_cache') ||
        sessionStorage.getItem('stayhub_stays_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedStaysCount = parsed.length;
        }
      }
    } catch {}

    return {
      staysCount: cachedStaysCount,
      onlineUsersBooked: null,
      loading: cachedStaysCount === null,
    };
  });

  const loadStats = async (isBackground = false) => {
    try {
      const res = await staysAPI.getPublicStats();
      if (res && res.success) {
        setStats({
          staysCount: Number(res.totalStays ?? 0),
          onlineUsersBooked: Number(res.onlineUsersBooked ?? 0),
          loading: false,
        });
        return;
      }
    } catch (err) {
      console.warn('Could not load public stats, falling back to stays list:', err);
    }

    // Graceful fallback: fetch stays directly from stays API if public stats route is ever unavailable
    try {
      const staysData = await staysAPI.getStays();
      const list = Array.isArray(staysData)
        ? staysData
        : Array.isArray(staysData?.stays)
        ? staysData.stays
        : [];
      setStats((prev) => ({
        staysCount: list.length,
        onlineUsersBooked: prev.onlineUsersBooked ?? 0,
        loading: false,
      }));
    } catch (fallbackErr) {
      console.warn('Fallback stays load error:', fallbackErr);
      if (!isBackground) {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  useEffect(() => {
    loadStats();

    const handleSync = () => loadStats(true);

    window.addEventListener('stayhub_rooms_updated', handleSync);
    window.addEventListener('stayhub_slots_updated', handleSync);
    window.addEventListener('stayhub_admin_sync', handleSync);
    window.addEventListener('stayhub_my_bookings_updated', handleSync);
    window.addEventListener('focus', handleSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadStats(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = () => loadStats(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('stayhub_slots_updated', handleSync);
      window.removeEventListener('stayhub_admin_sync', handleSync);
      window.removeEventListener('stayhub_my_bookings_updated', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, []);

  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const update = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    } else {
      mql.addListener(update);
      return () => mql.removeListener(update);
    }
  }, []);

  const offset = shouldReduceMotion ? 0 : (isMobile ? 12 : 20);
  const duration = shouldReduceMotion ? 0 : (isMobile ? 0.35 : 0.55);
  const ease = isMobile ? [0.25, 0.1, 0.25, 1] : [0.16, 1, 0.3, 1];

  return (
    <div className="relative w-full min-h-0 lg:min-h-[calc(100vh-4rem)] flex flex-col justify-center pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-4 sm:pb-12 lg:pb-16 px-4 sm:px-8 lg:px-14 2xl:px-24 overflow-hidden">
      {/* Mobile Subtle Background Warm Architectural Glow Elements (High performance radial gradient) */}
      <div className="md:hidden absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-56 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] -z-10 rounded-full pointer-events-none" />
      <div className="md:hidden absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-44 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] -z-10 rounded-full pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 xl:gap-16 items-center flex-1 my-0 lg:my-auto">

        {/* ── Left Column: Staggered Headline, Subtitle, CTA Actions ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
          {/* 1. Main Architectural Headline */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : 0.05, ease }}
            className="relative will-change-transform"
          >
            <h1 className="max-md:text-[32px] max-md:font-bold max-md:tracking-tight max-md:text-white max-md:leading-[1.12] max-md:mb-1 text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.5rem] font-extrabold tracking-[-0.035em] leading-[1.1] select-none text-center lg:text-left">
              <span className="block max-md:text-white md:text-slate-950">
                Find Your
              </span>
              <span className="block max-md:text-transparent max-md:bg-clip-text max-md:bg-gradient-to-r max-md:from-emerald-300 max-md:via-white max-md:to-slate-200 md:text-slate-500 font-extrabold tracking-tight">
                Perfect Living Space.
              </span>
            </h1>
          </motion.div>

          {/* 2. Subtitle with refined editorial cadence */}
          <motion.p
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.12 : 0.18), ease }}
            className="max-md:text-[12px] max-md:leading-relaxed max-md:text-slate-400 max-md:max-w-[310px] max-md:mx-auto max-md:mb-3 max-md:font-normal text-base sm:text-lg md:text-xl text-slate-600 max-w-xl font-normal leading-relaxed tracking-normal text-center lg:text-left will-change-transform"
          >
            Curated student PGs, serviced flats, and serene homestays. Book transparently directly with verified property owners — <span className="max-md:font-semibold max-md:text-slate-100 font-semibold text-slate-900">zero middlemen, zero commissions.</span>
          </motion.p>

          {/* 3. Quick CTA Action Cluster */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.2 : 0.3), ease }}
            className="flex flex-col items-center lg:items-start gap-2 sm:gap-4 pt-1 sm:pt-2 will-change-transform w-full"
          >
            {/* Primary Button: Explore Stays */}
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="max-md:w-full max-md:max-w-[290px] max-md:py-3.5 max-md:px-6 max-md:rounded-full max-md:bg-gradient-to-r max-md:from-emerald-600 max-md:to-teal-600 max-md:text-white max-md:font-semibold max-md:text-[11px] max-md:tracking-widest max-md:uppercase max-md:shadow-float max-md:hover:from-emerald-500 max-md:hover:to-teal-500 max-md:active:scale-[0.97] max-md:border max-md:border-emerald-400/30 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-950 text-white font-semibold text-xs sm:text-sm tracking-wider uppercase hover:opacity-90 active:scale-95 transition-transform duration-150 cursor-pointer select-none shadow-sm group mx-auto lg:mx-0"
            >
              <span className="max-md:tracking-[0.14em]">
                {stats.staysCount !== null && stats.staysCount !== undefined
                  ? `Explore ${stats.staysCount > 999 ? `${(stats.staysCount / 1000).toFixed(1)}k+` : stats.staysCount.toLocaleString()} ${stats.staysCount === 1 ? 'Stay' : 'Stays'}`
                  : 'Explore Stays'}
              </span>
              <svg
                className="w-3.5 h-3.5 max-md:text-emerald-100 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <span className="md:hidden text-[10px] text-slate-500 font-medium tracking-wide">
              100% Physically Audited &amp; 3D Mapped
            </span>
          </motion.div>
        </div>

        {/* ── Right Column: Staggered Metric Cards (Mobile: 3-column TrustStatsBar from design) ── */}
        <div className="lg:col-span-5 xl:col-span-4 w-full pt-1 lg:pt-0">
          <div className="max-md:grid max-md:grid-cols-3 max-md:gap-1 max-md:bg-[#141B26] max-md:p-3.5 max-md:rounded-3xl max-md:border max-md:border-white/[0.08] max-md:shadow-card md:grid md:grid-cols-2 lg:flex lg:flex-col gap-2.5 sm:gap-3.5 w-full max-w-md lg:max-w-[320px] xl:max-w-[340px] mx-auto lg:ml-auto lg:mr-0">
            {/* Metric Item 1: Verified Stays */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.15 : 0.28), ease }}
              className="text-center px-1 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl md:bg-white/70 md:backdrop-blur-xl md:border md:border-slate-200/70 md:hover:border-slate-300 md:shadow-xs transition-colors duration-150 will-change-transform"
            >
              <div className="max-md:text-lg max-md:font-bold max-md:text-white max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.staysCount !== null && stats.staysCount !== undefined ? (
                  stats.staysCount > 999 ? `${(stats.staysCount / 1000).toFixed(1)}k+` : stats.staysCount.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse">—</span>
                )}
              </div>
              <div className="max-md:text-[9.5px] max-md:uppercase max-md:tracking-wider max-md:font-semibold max-md:text-slate-400 max-md:mt-0.5 text-xs sm:text-xs text-slate-600 font-medium mt-0.5">
                Verified Stays
              </div>
            </motion.div>

            {/* Metric Item 2: Brokerage Fees */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.22 : 0.38), ease }}
              className="text-center px-1 max-md:border-x max-md:border-white/[0.08] max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl md:bg-white/70 md:backdrop-blur-xl md:border md:border-slate-200/70 md:hover:border-slate-300 md:shadow-xs transition-colors duration-150 will-change-transform"
            >
              <div className="max-md:text-lg max-md:font-bold text-emerald-400 max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                0%
              </div>
              <div className="max-md:text-[9.5px] max-md:uppercase max-md:tracking-wider max-md:font-semibold max-md:text-slate-400 max-md:mt-0.5 text-xs sm:text-xs text-slate-600 font-medium mt-0.5">
                Brokerage Fee
              </div>
            </motion.div>

            {/* Metric Item 3: Online Users Booked / Happy Residents */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.28 : 0.46), ease }}
              className="text-center px-1 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl md:bg-white/70 md:backdrop-blur-xl md:border md:border-slate-200/70 md:hover:border-slate-300 md:shadow-xs transition-colors duration-150 will-change-transform md:col-span-2 lg:col-span-1"
            >
              <div className="max-md:text-lg max-md:font-bold max-md:text-white max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.onlineUsersBooked !== null && stats.onlineUsersBooked !== undefined ? (
                  stats.onlineUsersBooked > 999 ? `${(stats.onlineUsersBooked / 1000).toFixed(1)}k+` : stats.onlineUsersBooked.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse">—</span>
                )}
              </div>
              <div className="max-md:text-[9.5px] max-md:uppercase max-md:tracking-wider max-md:font-semibold max-md:text-slate-400 max-md:mt-0.5 text-xs sm:text-xs text-slate-600 font-medium mt-0.5">
                Happy Residents
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
