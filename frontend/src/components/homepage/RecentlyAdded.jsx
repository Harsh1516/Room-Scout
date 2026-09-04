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

  useEffect(() => {
    async function loadStays() {
      try {
        setLoading(true);
        const data = await staysAPI.getStays();
        if (Array.isArray(data)) {
          // Take the 6 most recent database stays
          setRecentStays(data.slice(0, 6));
        } else {
          setRecentStays([]);
        }
      } catch (err) {
        console.warn('Could not load recent stays from database:', err);
        setRecentStays([]);
      } finally {
        setLoading(false);
      }
    }
    loadStays();
  }, []);

  return (
    <section className="w-full py-8 sm:py-12 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3 sm:gap-4 w-full">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
            Fresh Stays
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white mt-1.5 sm:mt-2 tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
            Recently Added Listings
          </h2>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="self-start sm:self-auto text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/15 backdrop-blur-xl transition-colors cursor-pointer shadow-xs"
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
            All listings on RoomScout are created by verified property hosts. Be the first to list your PG, hostel, or stay!
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/host/upload')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              + List Your Property Now
            </button>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Search Database
            </button>
          </div>
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