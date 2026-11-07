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
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col justify-center pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-8 lg:px-14 2xl:px-24 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-16 items-center flex-1 my-auto">

        {/* ── Left Column: Staggered Headline, Subtitle, CTA Actions ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 sm:space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
          {/* 1. Main Architectural Headline */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : 0.05, ease }}
            className="relative will-change-transform"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.08] select-none text-center lg:text-left">
              <span className="block text-slate-950">
                Find Your
              </span>
              <span className="block text-slate-500">
                Perfect Living Space.
              </span>
            </h1>
          </motion.div>

          {/* 2. Subtitle with refined editorial cadence */}
          <motion.p
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.12 : 0.18), ease }}
            className="text-xs sm:text-base md:text-lg text-slate-600 max-w-xl font-normal leading-relaxed tracking-normal text-center lg:text-left will-change-transform"
          >
            Curated student PGs, serviced flats, and serene homestays. Book transparently directly with verified property owners—<span className="text-slate-900 font-semibold">zero middlemen, zero commissions</span>.
          </motion.p>

          {/* 3. Quick CTA Action Cluster */}
          <motion.div
            initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.2 : 0.3), ease }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2 will-change-transform"
          >
            {/* Primary Button: Explore Stays */}
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-950 text-white font-medium text-xs sm:text-sm tracking-wider uppercase hover:opacity-90 active:scale-98 transition-all cursor-pointer select-none shadow-sm"
            >
              <span>
                {stats.staysCount !== null && stats.staysCount !== undefined
                  ? `Explore ${stats.staysCount.toLocaleString()} ${stats.staysCount === 1 ? 'Stay' : 'Stays'}`
                  : 'Explore Stays'}
              </span>
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
          </motion.div>
        </div>

        {/* ── Right Column: Staggered Metric Cards ── */}
        <div className="lg:col-span-5 xl:col-span-4 w-full pt-4 lg:pt-0">
          <div className="grid grid-cols-2 lg:flex lg:flex-col gap-3 sm:gap-3.5 w-full max-w-md lg:max-w-[320px] xl:max-w-[340px] mx-auto lg:ml-auto lg:mr-0">
            {/* Card 1: Verified Stays */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.15 : 0.28), ease }}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/70 hover:border-slate-300 shadow-xs transition-colors duration-150 flex flex-col items-center justify-center text-center will-change-transform"
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.staysCount !== null && stats.staysCount !== undefined ? (
                  stats.staysCount.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse">—</span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                Verified Stays
              </div>
            </motion.div>

            {/* Card 2: Brokerage Fees */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.22 : 0.38), ease }}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/70 hover:border-slate-300 shadow-xs transition-colors duration-150 flex flex-col items-center justify-center text-center will-change-transform"
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 tracking-tight">
                0%
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                Brokerage Fees
              </div>
            </motion.div>

            {/* Card 3: Online Users Booked */}
            <motion.div
              initial={{ opacity: shouldReduceMotion ? 1 : 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: shouldReduceMotion ? 0 : (isMobile ? 0.28 : 0.46), ease }}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/70 hover:border-slate-300 shadow-xs transition-colors duration-150 flex flex-col items-center justify-center text-center will-change-transform"
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {stats.onlineUsersBooked !== null && stats.onlineUsersBooked !== undefined ? (
                  stats.onlineUsersBooked.toLocaleString()
                ) : (
                  <span className="opacity-40 animate-pulse">—</span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                Online Users Booked
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
