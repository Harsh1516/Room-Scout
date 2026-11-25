import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../../services/api';

export function HeroSection() {
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
    } catch { /* ignore cache parse error */ }

    return {
      staysCount: cachedStaysCount,
      onlineUsersBooked: null,
      loading: cachedStaysCount === null,
    };
  });
  useEffect(() => {
    let mounted = true;

    const loadStats = async (isBackground = false) => {
      try {
        const res = await staysAPI.getPublicStats();
        if (res && res.success && mounted) {
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
        if (mounted) {
          setStats((prev) => ({
            staysCount: list.length,
            onlineUsersBooked: prev.onlineUsersBooked ?? 0,
            loading: false,
          }));
        }
      } catch (fallbackErr) {
        console.warn('Fallback stays load error:', fallbackErr);
        if (!isBackground && mounted) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

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
    } catch { /* ignore broadcast channel error */ }

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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const update = (e) => setIsMobile(e.matches);
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

  const exploreButton = (
    <button
      type="button"
      onClick={() => navigate('/search')}
      className="relative overflow-hidden w-auto inline-flex items-center justify-center gap-2 py-3 px-6 sm:py-3.5 sm:px-7 min-h-[44px] sm:min-h-[48px] rounded-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-xs sm:text-sm tracking-wider uppercase border-2 border-white/50 shadow-lg shadow-sky-500/30 backdrop-blur-xs active:scale-95 transition-all duration-150 cursor-pointer select-none group mx-auto lg:mx-0"
    >
      <span className="button-flash-sweep button-flash-sweep-light pointer-events-none" />
      <span className="relative z-10 tracking-[0.14em]">
        {stats.staysCount !== null && stats.staysCount !== undefined
          ? `Explore ${stats.staysCount > 999 ? `${(stats.staysCount / 1000).toFixed(1)}k+` : stats.staysCount.toLocaleString()} ${stats.staysCount === 1 ? 'Stay' : 'Stays'}`
          : 'Explore Stays'}
      </span>
      <svg
        className="relative z-10 w-4 h-4 text-white transition-transform group-hover:translate-x-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  );

  return (
    <div className="relative w-full min-h-0 lg:min-h-[calc(100vh-4rem)] flex flex-col justify-center pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-8 sm:pb-12 lg:pb-16 px-4 sm:px-8 lg:px-14 2xl:px-24">
      {/* ── Upper Section Wallpaper Background (Extended height so rounded corners gap is 100% filled) ── */}
      <div 
        aria-hidden="true" 
        className="absolute inset-x-0 top-0 -bottom-16 sm:-bottom-24 pointer-events-none z-0 overflow-hidden"
      >
        {/* Full Rich Visibility Mountain Wallpaper (No white brightness haze) */}
        <img
          src="/mountain_hero.jpg"
          alt="Alpine Mountain Valley Landscape"
          className="w-full h-full object-cover object-[center_25%] md:object-[center_35%] select-none"
        />
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 xl:gap-16 items-center flex-1 my-0 lg:my-auto relative z-10">

        {/* ── Left Column: Staggered Headline, Subtitle, CTA Actions ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-6 text-left flex flex-col items-start w-full">
          {/* 1. Main Architectural Headline (Alpine White) */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : 0.05, ease }}
            className="relative will-change-transform w-full text-left"
          >
            <h1 className="text-[48px] xs:text-[52px] sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-extrabold tracking-[-0.035em] leading-[1.04] select-none text-left w-full mb-1">
              <span className="block text-white text-left drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
                <span className="inline-block underline decoration-1 sm:decoration-[1.5px] underline-offset-[6px] sm:underline-offset-[10px] decoration-white/80">
                  Find Your
                </span>
              </span>
              <span className="block text-white/75 font-extrabold tracking-tight text-left drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
                Perfect Living Space.
              </span>
            </h1>
          </motion.div>

          {/* Desktop CTA Action Button (Shown on desktop lg+) */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : 0.25, ease }}
            className="hidden lg:flex flex-col items-start gap-4 pt-1 sm:pt-2 will-change-transform w-full"
          >
            {exploreButton}
          </motion.div>
        </div>

        {/* ── Right Column: Staggered Metric Cards (Mobile: 3-column TrustStatsBar from design) ── */}
        <div className="lg:col-span-5 xl:col-span-4 w-full pt-1 lg:pt-0">
          <div className="max-md:grid max-md:grid-cols-3 max-md:gap-3 max-md:bg-white/75 max-md:backdrop-blur-2xl max-md:p-2.5 sm:max-md:p-3.5 max-md:rounded-3xl max-md:border max-md:border-white/90 max-md:shadow-[0_12px_32px_rgba(0,0,0,0.08)] md:grid md:grid-cols-2 lg:flex lg:flex-col gap-2.5 sm:gap-3.5 w-full max-w-md lg:max-w-[320px] xl:max-w-[340px] mx-auto lg:ml-auto lg:mr-0">
            {/* Metric Item 1: Verified Stays */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.15 : 0.28), ease }}
              className="text-center px-1 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/90 md:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-150 will-change-transform"
            >
              <div className="max-md:text-lg max-md:font-extrabold max-md:text-slate-950 max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.staysCount !== null && stats.staysCount !== undefined ? (
                  stats.staysCount > 999 ? `${(stats.staysCount / 1000).toFixed(1)}k+` : stats.staysCount.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse text-slate-400">—</span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">
                Verified Stays
              </div>
            </motion.div>

            {/* Metric Item 2: Commissions (Centered - Subtle Glass Inset) */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.22 : 0.38), ease }}
              className="text-center px-1 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/95 border border-slate-200/90 shadow-xs backdrop-blur-xl transition-all duration-150 will-change-transform"
            >
              <div className="max-md:text-lg max-md:font-extrabold text-emerald-600 max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                0%
              </div>
              <div className="text-xs sm:text-sm text-slate-700 font-semibold mt-0.5">
                Commission
              </div>
            </motion.div>

            {/* Metric Item 3: Online Users Booked / Happy Residents */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.28 : 0.46), ease }}
              className="text-center px-1 max-md:flex max-md:flex-col max-md:items-center max-md:justify-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/90 md:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-150 will-change-transform md:col-span-2 lg:col-span-1"
            >
              <div className="max-md:text-lg max-md:font-extrabold max-md:text-slate-950 max-md:tracking-tight text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.onlineUsersBooked !== null && stats.onlineUsersBooked !== undefined ? (
                  stats.onlineUsersBooked > 999 ? `${(stats.onlineUsersBooked / 1000).toFixed(1)}k+` : stats.onlineUsersBooked.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse text-slate-400">—</span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">
                Happy Residents
              </div>
            </motion.div>
          </div>

          {/* Mobile CTA Action Button (Exchanged Position: Directly Below Metric Section) */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.35 : 0.45), ease }}
            className="lg:hidden w-full flex justify-center pt-6 sm:pt-8 pb-2 sm:pb-3 relative z-20"
          >
            {exploreButton}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
