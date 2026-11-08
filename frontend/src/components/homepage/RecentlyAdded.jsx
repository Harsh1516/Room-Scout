import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../../services/api';
import { PropertyCard } from '../common/PropertyCard';
import { HorizontalCarousel } from '../common/HorizontalCarousel';
import { ScrollReveal } from '../common/ScrollReveal';

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

    return () => {
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('stayhub_admin_sync', handleSync);
      window.removeEventListener('stayhub_slots_updated', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, []);

  return (
    <section className="w-full py-4 sm:py-12 px-4 sm:px-8 lg:px-16 2xl:px-24" id="listings">
      {/* Section Header with Scroll-Triggered Reveal */}
      <ScrollReveal desktopOffset={20} mobileOffset={12} desktopDuration={0.5} mobileDuration={0.35}>
        <div className="flex items-baseline justify-between mb-4 sm:mb-8 gap-3 sm:gap-4 w-full">
          <div>
            <h2 className="max-md:text-base max-md:font-bold max-md:text-white max-md:tracking-tight text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 mt-1 sm:mt-2 tracking-tight">
              Featured Verified Stays
            </h2>
            <p className="max-md:block hidden text-[11px] text-slate-400 font-normal mt-0.5">
              Inspected this week for quality &amp; safety
            </p>
          </div>

          <button
            onClick={() => navigate('/search')}
            className="max-md:text-xs max-md:font-semibold max-md:text-emerald-400 max-md:hover:text-emerald-300 max-md:bg-transparent max-md:border-0 max-md:shadow-none max-md:p-0 flex items-center gap-1 transition-colors self-auto text-[11px] sm:text-xs font-bold text-slate-900 hover:text-slate-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 border border-slate-200 backdrop-blur-2xl cursor-pointer shadow-xs active:scale-95"
          >
            <span>View all</span>
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </ScrollReveal>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Fetching verified listings from database...</p>
        </div>
      )}

      {/* Empty State when no host has listed a stay yet */}
      {!loading && recentStays.length === 0 && (
        <ScrollReveal desktopOffset={16} mobileOffset={10}>
          <div className="max-md:bg-[#141B26] max-md:border-white/[0.09] max-md:shadow-card bg-white/80 border border-slate-200 rounded-3xl p-6 sm:p-12 text-center backdrop-blur-xl max-w-2xl mx-auto shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full max-md:bg-emerald-500/15 max-md:text-emerald-400 bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 sm:mb-4">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3 className="text-base sm:text-xl font-extrabold max-md:text-white text-slate-900">
              No Properties Listed Yet
            </h3>
            <p className="text-[11px] sm:text-sm max-md:text-slate-400 text-slate-500 mt-1.5 sm:mt-2 max-w-md mx-auto leading-relaxed">
              New verified listings are currently being processed. Check back soon for fresh PGs, hostels, and stays!
            </p>
          </div>
        </ScrollReveal>
      )}

      {/* Horizontal Carousel with Staggered Scroll-Triggered Card Reveals */}
      {!loading && recentStays.length > 0 && (
        <HorizontalCarousel itemCount={recentStays.length} gapClass="gap-3 sm:gap-4">
          {recentStays.map((room, idx) => (
            <ScrollReveal
              key={room._id || idx}
              staggerIndex={idx}
              desktopOffset={20}
              mobileOffset={12}
              desktopDuration={0.55}
              mobileDuration={0.35}
              className="w-[270px] sm:w-[310px] md:w-[330px] max-w-[340px] shrink-0 snap-start"
            >
              <PropertyCard
                stay={room}
                onStayClick={onStayClick}
                onBookClick={onBookClick}
              />
            </ScrollReveal>
          ))}
        </HorizontalCarousel>
      )}
    </section>
  );
}

export default RecentlyAdded;
