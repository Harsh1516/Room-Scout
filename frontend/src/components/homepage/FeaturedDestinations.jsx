import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HorizontalCarousel } from '../common/HorizontalCarousel';

const DESTINATION_TABS = [
  { id: 'all', label: 'All Prime Hubs' },
  { id: 'mountains', label: '🏔️ Alpine & Mountains' },
  { id: 'beaches', label: '🌴 Coastal & Beaches' },
  { id: 'cities', label: '⚡ Silicon Co-Living' },
];

const DESTINATION_HUBS = [
  {
    id: 'manali',
    category: 'mountains',
    name: 'Manali & Solang Valley',
    region: 'Himachal Pradesh',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    staysCount: '340+ Stays',
    avgPrice: '₹2,800/nt',
    weather: '14°C Alpine',
    tag: 'Mountain Chalets',
    description: 'Snow-capped peaks, cedar forests, and remote work retreats with 1Gbps fiber.',
  },
  {
    id: 'goa',
    category: 'beaches',
    name: 'North & South Goa',
    region: 'Goa Coast',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    staysCount: '580+ Stays',
    avgPrice: '₹4,500/nt',
    weather: '28°C Tropical',
    tag: 'Beachfront Villas',
    description: 'Private infinity pools, beachfront balconies, and sunset digital nomad hubs.',
  },
  {
    id: 'bengaluru',
    category: 'cities',
    name: 'Bengaluru Silicon Corridor',
    region: 'Karnataka',
    image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
    staysCount: '1,200+ PGs',
    avgPrice: '₹12,000/mo',
    weather: '23°C Pleasant',
    tag: 'Tech Co-Living',
    description: 'HSR & Koramangala premium student & founder PGs with zero brokerage fees.',
  },
  {
    id: 'jaipur',
    category: 'cities',
    name: 'Jaipur Pink City',
    region: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
    staysCount: '290+ Havelis',
    avgPrice: '₹3,600/nt',
    weather: '26°C Sunny',
    tag: 'Royal Havelis',
    description: 'Heritage courtyards, hand-painted suites, and regal rooftop dining.',
  },
  {
    id: 'rishikesh',
    category: 'mountains',
    name: 'Rishikesh Ganga Ghats',
    region: 'Uttarakhand',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    staysCount: '210+ Stays',
    avgPrice: '₹2,200/nt',
    weather: '20°C Serene',
    tag: 'Riverside Retreats',
    description: 'Ganga views, morning yoga terraces, and peaceful riverside boutique stays.',
  },
  {
    id: 'mumbai',
    category: 'cities',
    name: 'Mumbai Sea Breeze',
    region: 'Maharashtra',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
    staysCount: '840+ Apartments',
    avgPrice: '₹18,500/mo',
    weather: '29°C Coastal',
    tag: 'Luxury Penthouses',
    description: 'Bandra & Juhu sea-facing serviced suites with 24/7 concierge & verified KYC.',
  },
];

export function FeaturedDestinations() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredHubs = DESTINATION_HUBS.filter((hub) =>
    activeFilter === 'all' ? true : hub.category === activeFilter
  );

  return (
    <section className="w-full py-8 sm:py-12 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 sm:mb-8 gap-4 sm:gap-5 w-full">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
            Prime Geographic Hubs
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white mt-1.5 sm:mt-2 tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
            Explore Top Stay Destinations
          </h2>
        </div>

        {/* Clean Filter Tabs - Horizontal Scroll on Mobile, Balanced & Ultra-Compact */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1.5 rounded-lg sm:rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/15 backdrop-blur-xl shadow-xs overflow-x-auto no-scrollbar max-w-full">
          {DESTINATION_TABS.map((tab) => {
            const isSelected = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 select-none active:scale-95 ${
                  isSelected
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Carousel with Mouse-Wheel & Dots */}
      <HorizontalCarousel itemCount={filteredHubs.length} gapClass="gap-3 sm:gap-4">
        <AnimatePresence>
          {filteredHubs.map((hub, idx) => (
            <motion.div
              layout
              key={hub.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              onClick={() => navigate('/search')}
              className="w-[270px] sm:w-[310px] md:w-[330px] max-w-[340px] shrink-0 snap-start group relative cursor-pointer select-none p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              {/* Refined YouTube-Style Warm Light Orange Cushion */}
              <div
                className="absolute rounded-xl sm:rounded-2xl bg-[#f8ebd8] dark:bg-[#2d2218] shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] pointer-events-none inset-0 opacity-0 scale-95 group-hover:-inset-1 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />

              {/* Foreground Content Stack */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                {/* 1. TOP SECTION: Balanced Widescreen Rounded Media Box */}
                <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 shadow-xs group-hover:shadow-md flex flex-col justify-between p-1.5 sm:p-2.5 border border-slate-200/60 dark:border-white/10 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  {/* Background Image */}
                  <img
                    src={hub.image}
                    alt={hub.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:brightness-[1.03] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />

                  {/* Top Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between gap-1">
                    <span className="text-[7.5px] sm:text-[10px] font-mono font-bold text-white bg-black/60 border border-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-md truncate">
                      {hub.weather.split(' ')[0]}<span className="hidden md:inline"> {hub.weather.split(' ').slice(1).join(' ')}</span>
                    </span>
                    <span className="text-[7.5px] sm:text-[10px] font-mono font-bold text-slate-200 bg-white/15 border border-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-md shrink-0">
                      {hub.staysCount.replace(' Stays', '+').replace(' PGs', '+').replace(' Apartments', '+').replace(' Havelis', '+')}
                    </span>
                  </div>
                </div>

                {/* 2. BOTTOM SECTION: Structured Information Section Sitting Below Photo */}
                <div className="pt-1.5 sm:pt-2.5 pb-0.5 px-0.5 flex flex-col space-y-0.5 sm:space-y-1">
                  {/* Location / Tag Subtitle */}
                  <span className="text-[8px] sm:text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                    {hub.tag}
                  </span>

                  {/* Title */}
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-950 dark:text-white line-clamp-1 group-hover:text-amber-950 dark:group-hover:text-amber-100 transition-colors leading-snug">
                    {hub.name}
                  </h3>

                  <p className="hidden lg:line-clamp-1 text-xs text-slate-500 dark:text-slate-400 font-normal pb-0.5">
                    {hub.description}
                  </p>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-slate-200/80 dark:border-white/10 text-[9px] sm:text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400 font-normal truncate">
                      <span className="hidden sm:inline">Avg </span>
                      <strong className="text-slate-950 dark:text-white font-black">{hub.avgPrice}</strong>
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      <span className="hidden sm:inline">Explore</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </HorizontalCarousel>
    </section>
  );
}
