import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HorizontalCarousel } from '../common/HorizontalCarousel';

const REVIEW_TABS = [
  { id: 'all', label: 'All Reviews (10,000+)' },
  { id: 'tech', label: '💻 Remote Tech & Founders' },
  { id: 'students', label: '🎓 Students & Co-Living' },
  { id: 'vacation', label: '🏔️ Vacationers & Villas' },
];

const REVIEWS = [
  {
    id: 1,
    category: 'tech',
    author: 'Aarav Sharma',
    role: 'Senior Software Engineer @ Microsoft',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
    stay: 'Forest Pines Eco Homestay, Mukteshwar',
    rating: 5,
    quote: 'Finding a mountain stay with reliable 1Gbps WiFi and direct host billing was impossible until Room-Scout. Saved over ₹8,000 in brokerage!',
    verified: 'Verified Booking',
  },
  {
    id: 2,
    category: 'vacation',
    author: 'Priya Iyer',
    role: 'Graphic Designer & Digital Nomad',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    stay: 'Lakeside Suites & Residency, Nainital',
    rating: 5,
    quote: 'The 3D preview was 100% true to reality. The lake view and bonfire setups were exactly as promised. Seamless check-in experience.',
    verified: 'Verified Booking',
  },
  {
    id: 3,
    category: 'students',
    author: 'Rohan Mehra',
    role: 'BITS Pilani Student',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80',
    stay: 'Himalayan View Residency, Bhimtal',
    rating: 5,
    quote: 'Locked in my semester PG without paying any broker. Food, laundry, and power backup are all top notch. Highly recommended for students!',
    verified: 'Verified Booking',
  },
  {
    id: 4,
    category: 'tech',
    author: 'Vikramaditya Rao',
    role: 'Y Combinator Founder',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    stay: 'Silicon Haven Villa, Bengaluru',
    rating: 5,
    quote: 'Hosted our 10-person engineering offsite here. High-speed mesh routers across all rooms and heated pool made it unforgettable.',
    verified: 'Verified Booking',
  },
  {
    id: 5,
    category: 'vacation',
    author: 'Ananya Deshmukh',
    role: 'Travel Photographer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    stay: 'Goa Coastal Palm Haven, Candolim',
    rating: 5,
    quote: 'Direct WhatsApp communication with the property owner was fantastic. No commission markup and zero check-in hassles!',
    verified: 'Verified Booking',
  },
  {
    id: 6,
    category: 'students',
    author: 'Tanvi Joshi',
    role: 'Manipal University Med Student',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80',
    stay: 'Valley Student Suites, Manipal',
    rating: 5,
    quote: 'Safe gated security, clean mess food, and 48-hour deposit refund guarantee gave my parents total peace of mind.',
    verified: 'Verified Booking',
  },
];

export function GuestReviews() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredReviews = REVIEWS.filter((r) =>
    activeTab === 'all' ? true : r.category === activeTab
  );

  return (
    <section className="w-full py-8 sm:py-16 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Header & Review Category Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 sm:mb-10 gap-4 sm:gap-6 w-full">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
            Real Stays • Authentic Feedback
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white mt-1.5 sm:mt-2 tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
            Loved by Over 10,000+ Guests
          </h2>
        </div>

        {/* Clean Category Tabs - Horizontal Scroll on Mobile - Ultra-Compact */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1.5 rounded-lg sm:rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 backdrop-blur-xl shadow-xs overflow-x-auto no-scrollbar max-w-full">
          {REVIEW_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-bold transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 select-none active:scale-95 ${
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
      <HorizontalCarousel itemCount={filteredReviews.length} gapClass="gap-3 sm:gap-4">
        <AnimatePresence>
          {filteredReviews.map((rev, idx) => (
            <motion.div
              layout
              key={rev.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className="w-[280px] sm:w-[320px] max-w-[320px] shrink-0 snap-start p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/85 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30 shadow-md dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col justify-between group transition-colors duration-200"
            >
              <div>
                {/* Star Rating & Verified Pill */}
                <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
                  <div className="flex text-amber-400 text-[10px] sm:text-xs tracking-wider shrink-0">
                    {'★'.repeat(rev.rating)}
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 px-1.5 py-0.5 rounded-full truncate">
                    ✓ Verified
                  </span>
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug sm:leading-relaxed font-medium mb-3 italic line-clamp-4">
                  "{rev.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 sm:gap-2.5">
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300 dark:border-white/20 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-950 dark:text-white truncate">
                    {rev.author}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {rev.college}
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
