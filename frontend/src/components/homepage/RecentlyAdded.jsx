import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../../services/api';
import { PropertyCard } from '../common/PropertyCard';
import { HorizontalCarousel } from '../common/HorizontalCarousel';
import { ScrollReveal } from '../common/ScrollReveal';
import { triggerGlobalLoader } from '../common/DotGridWaveLoader';

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
    <section className="w-full bg-white rounded-t-[36px] sm:rounded-t-[48px] shadow-[0_-12px_36px_rgba(0,0,0,0.08),0_-4px_14px_rgba(0,0,0,0.04)] pt-3.5 sm:pt-5 pb-8 sm:pb-16 px-4 sm:px-8 lg:px-16 2xl:px-24 relative z-20" id="listings">
      {/* Top-Center Sheet Grabber Bar */}
      <div
        aria-hidden="true"
        className="mx-auto w-12 sm:w-14 h-1.5 rounded-full bg-slate-300/90 mb-3.5 sm:mb-5"
      />

      {/* Section Header with Scroll-Triggered Reveal */}
      <ScrollReveal desktopOffset={20} mobileOffset={12} desktopDuration={0.5} mobileDuration={0.35}>
        <div className="flex items-center justify-center mb-5 sm:mb-8 w-full text-center">
          <h2 className="text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none text-center">
            Recently Added
          </h2>
        </div>
      </ScrollReveal>

      {/* Loading State: 3 Elegant Skeleton Property Cards */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 py-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-3xl bg-slate-100/90 border border-slate-200/80 p-3.5 flex flex-col gap-3.5 animate-pulse"
            >
              <div className="w-full aspect-[4/3] rounded-2xl bg-slate-200/90" />
              <div className="space-y-2 px-1 pb-1">
                <div className="h-5 w-3/4 bg-slate-200 rounded-lg" />
                <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
                <div className="h-6 w-1/3 bg-slate-200 rounded-lg mt-2" />
              </div>
            </div>
          ))}
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

      {/* Horizontal Carousel with Bottom Right "View all" */}
      {!loading && recentStays.length > 0 && (
        <ScrollReveal desktopOffset={16} mobileOffset={10} desktopDuration={0.45} mobileDuration={0.3}>
          <HorizontalCarousel
            itemCount={recentStays.length}
            gapClass="gap-3 sm:gap-4"
            rightAction={
              <button
                type="button"
                onClick={() => {
                  triggerGlobalLoader();
                  navigate('/search');
                }}
                className="text-[17px] sm:text-[19px] md:text-[20px] font-bold text-slate-900 hover:text-slate-700 underline underline-offset-4 decoration-2 decoration-slate-900/60 hover:decoration-slate-900 transition-colors cursor-pointer shrink-0 active:opacity-70 py-1"
              >
                View all
              </button>
            }
          >
            {recentStays.map((room, idx) => (
              <div
                key={room._id || idx}
                className="w-[235px] sm:w-[330px] md:w-[350px] max-w-[360px] shrink-0 snap-start"
              >
                <PropertyCard
                  stay={room}
                  onStayClick={onStayClick}
                  onBookClick={onBookClick}
                />
              </div>
            ))}
          </HorizontalCarousel>
        </ScrollReveal>
      )}
    </section>
  );
}

export default RecentlyAdded;
