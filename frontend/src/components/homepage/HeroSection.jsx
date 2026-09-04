import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const POPULAR_HUBS = [
  { name: '🏔️ Manali', query: 'Manali' },
  { name: '🌴 Goa', query: 'Goa' },
  { name: '⚡ Bengaluru', query: 'Bengaluru' },
  { name: '🏰 Jaipur', query: 'Jaipur' },
  { name: '⛵ Nainital', query: 'Nainital' },
  { name: '🧘 Rishikesh', query: 'Rishikesh' },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="w-full pt-20 sm:pt-28 pb-8 sm:pb-12 text-center px-3 sm:px-8 lg:px-16 2xl:px-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full space-y-4 sm:space-y-6"
      >
        {/* Top Tag */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-slate-900/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-900/10 dark:border-white/15 backdrop-blur-md shadow-xs">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Pan-India Direct Living • 0% Brokerage</span>
        </div>

        {/* Main Editorial Heading */}
        <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.1] select-none max-w-5xl mx-auto">
          Find Your Perfect <span className="text-slate-500 dark:text-slate-400">Living Space.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[11px] sm:text-sm md:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
          From verified student PGs, flats, and budget hostels to luxury hotels, serene resorts, and homestays—book directly with verified property owners.
        </p>

        {/* Quick CTA & Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1 sm:pt-2">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="px-5 py-2 sm:px-10 sm:py-4 rounded-lg sm:rounded-2xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-widest transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
          >
            Explore All 5,000+ Stays →
          </button>
        </div>

        {/* Popular Hub Quick Search Pills */}
        <div className="pt-3 sm:pt-6 border-t border-slate-200 dark:border-white/10 w-full max-w-5xl mx-auto">
          <div className="text-[9.5px] sm:text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 sm:mb-3">
            Trending Destinations:
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() => navigate('/search')}
                className="px-2 py-0.5 sm:px-4 sm:py-2 rounded-md sm:rounded-xl bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Full-Width Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6 pt-4 sm:pt-8 w-full max-w-6xl mx-auto">
          <div className="p-2.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-950 dark:text-white">5,000+</div>
            <div className="text-[9.5px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1">Verified Stays</div>
          </div>
          <div className="p-2.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-950 dark:text-white">0%</div>
            <div className="text-[9.5px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1">Brokerage Fees</div>
          </div>
          <div className="p-2.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-950 dark:text-white">14+</div>
            <div className="text-[9.5px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1">States Covered</div>
          </div>
          <div className="p-2.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-950 dark:text-white">4.9★</div>
            <div className="text-[9.5px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1">Guest Satisfaction</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}