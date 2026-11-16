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
    <section className="w-full bg-white rounded-t-[36px] sm:rounded-t-[48px] shadow-[0_-12px_36px_rgba(0,0,0,0.08),0_-4px_14px_rgba(0,0,0,0.04)] pt-6 sm:pt-10 pb-8 sm:pb-16 px-4 sm:px-8 lg:px-16 2xl:px-24 relative z-20" id="listings">
      {/* Section Header with Scroll-Triggered Reveal */}
      <ScrollReveal desktopOffset={20} mobileOffset={12} desktopDuration={0.5} mobileDuration={0.35}>
        <div className="flex items-center justify-center mb-5 sm:mb-8 w-full text-center">
          <h2 className="text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none text-center">
            Recently Added
          </h2>
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
          <div className="max-md:bg-white max-md:border-slate-200/90 max-md:shadow-xs bg-white/80 border border-slate-200 rounded-3xl p-6 sm:p-12 text-center backdrop-blur-xl max-w-2xl mx-auto shadow-sm">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full max-md:bg-emerald-50 max-md:text-emerald-600 bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 sm:mb-4">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3 className="text-base sm:text-xl font-extrabold max-md:text-slate-950 text-slate-900">
              No Properties Listed Yet
            </h3>
            <p className="text-[11px] sm:text-sm max-md:text-slate-500 text-slate-500 mt-1.5 sm:mt-2 max-w-md mx-auto leading-relaxed">
              New verified listings are currently being processed. Check back soon for fresh PGs, hostels, and stays!
            </p>
          </div>
        </ScrollReveal>
      )}

      {/* Horizontal Carousel with Staggered Scroll-Triggered Card Reveals & Bottom Right "View all" */}
      {!loading && recentStays.length > 0 && (
        <HorizontalCarousel
          itemCount={recentStays.length}
          gapClass="gap-3 sm:gap-4"
          rightAction={
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="text-[17px] sm:text-[19px] md:text-[20px] font-bold text-slate-900 hover:text-slate-700 underline underline-offset-4 decoration-2 decoration-slate-900/60 hover:decoration-slate-900 transition-colors cursor-pointer shrink-0 active:opacity-70 py-1"
            >
              View all
            </button>
          }
        >
          {recentStays.map((room, idx) => (
            <ScrollReveal
              key={room._id || idx}
              staggerIndex={idx}
              desktopOffset={20}
              mobileOffset={12}
              desktopDuration={0.55}
              mobileDuration={0.35}
              className="w-[295px] sm:w-[330px] md:w-[350px] max-w-[360px] shrink-0 snap-start"
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
