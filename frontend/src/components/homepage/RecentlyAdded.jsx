import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../../services/api';
import { PropertyCard } from '../common/PropertyCard';
import { HorizontalCarousel } from '../common/HorizontalCarousel';

export function RecentlyAdded({ onStayClick, onBookClick }) {
  const navigate = useNavigate();
  const [recentStays, setRecentStays] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStays = async (isBackground = false) => {
    try {
      if (!isBackground && recentStays.length === 0) setLoading(true);
      const data = await staysAPI.getStays();
      // Support both direct array and paginated backend envelope { stays: [...] }
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.stays) ? data.stays : (Array.isArray(data?.data) ? data.data : []));

      setRecentStays(list.slice(0, 6));
    } catch (err) {
      console.warn('Could not load recent stays from database:', err);
      if (!isBackground) setRecentStays([]);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadStays();

    const handleSync = () => loadStays(true);

    window.addEventListener('stayhub_rooms_updated', handleSync);
    window.addEventListener('stayhub_admin_sync', handleSync);
    window.addEventListener('stayhub_slots_updated', handleSync);
    window.addEventListener('focus', handleSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadStays(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'HOST_APPROVED' ||
            event.data?.type === 'STAY_UPDATED' ||
            event.data?.type === 'ROOMS_UPDATED'
          ) {
            loadStays(true);
          }
        };
      }
    } catch {}

    // Polling interval (every 4 seconds) to guarantee real-time updates without page refresh
    const pollInterval = setInterval(() => {
      loadStays(true);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('stayhub_admin_sync', handleSync);
      window.removeEventListener('stayhub_slots_updated', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, []);

  return (
    <section className="w-full py-8 sm:py-12 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3 sm:gap-4 w-full">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/12 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-900/15 dark:border-white/25 backdrop-blur-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
            Fresh Stays
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white mt-1.5 sm:mt-2 tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
            Recently Added Listings
          </h2>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="self-start sm:self-auto text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/25 backdrop-blur-2xl transition-all cursor-pointer shadow-xs dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] active:scale-95"
        >
          <span>Explore All Properties</span>
          <span>→</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Fetching verified listings from database...</p>
        </div>
      )}

      {/* Empty State when no host has listed a stay yet */}
      {!loading && recentStays.length === 0 && (
        <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-xl max-w-2xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            No Properties Listed Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            New verified listings are currently being processed. Check back soon for fresh PGs, hostels, and stays!
          </p>
        </div>
      )}

      {/* Horizontal Carousel with Mouse-Wheel & Dots */}
      {!loading && recentStays.length > 0 && (
        <HorizontalCarousel itemCount={recentStays.length} gapClass="gap-3 sm:gap-4">
          {recentStays.map((room, idx) => (
            <motion.div
              key={room._id || room.id || idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="w-[270px] sm:w-[310px] md:w-[330px] max-w-[340px] shrink-0 snap-start"
            >
              <PropertyCard
                stay={room}
                onStayClick={onStayClick}
                onBookClick={onBookClick}
              />
            </motion.div>
          ))}
        </HorizontalCarousel>
      )}
    </section>
  );
}

export default RecentlyAdded;