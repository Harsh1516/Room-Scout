import { motion } from 'framer-motion';

const FEATURES = [
  {
    id: 'verified',
    title: 'Verified Student Stays',
    description: 'Every PG, hostel, and rental is physically inspected for safety, hygiene, and amenities.',
    icon: (
      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'brokerage',
    title: 'Zero Brokerage',
    description: 'Connect directly with property owners without hidden middleman fees or extra commissions.',
    icon: (
      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'speed',
    title: 'Instant Booking',
    description: 'Lock in your stay with custom price filtering and instant confirmation on verified stays.',
    icon: (
      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'support',
    title: '24/7 Assistance',
    description: 'Dedicated support team to assist with check-ins, roommate matching, and host queries.',
    icon: (
      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="w-full py-8 sm:py-16 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Section Heading */}
      <div className="text-center mb-6 sm:mb-8 space-y-1.5 sm:space-y-2 max-w-3xl mx-auto">
        <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
          Why Choose Room-Scout
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
          Built for Seamless Living
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs md:text-sm font-medium">
          Discover why thousands of students and travelers rely on Room-Scout for verified stays across India.
        </p>
      </div>

      {/* Two Tabs in a Row Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 w-full">
        {FEATURES.map((feature, idx) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className="group relative p-2.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/85 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 shadow-sm sm:shadow-md dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-colors duration-200 hover:border-slate-400 dark:hover:border-white/30 flex flex-col justify-between min-w-0"
          >
            <div>
              {/* Icon Box */}
              <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 flex items-center justify-center mb-2 sm:mb-4 transition-colors duration-200 shadow-xs shrink-0">
                <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                  {feature.icon}
                </div>
              </div>

              <h3 className="text-[11px] sm:text-base font-bold text-slate-950 dark:text-white mb-1 sm:mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors leading-snug">
                {feature.title}
              </h3>

              <p className="text-[9.5px] sm:text-xs text-slate-600 dark:text-slate-300 leading-snug sm:leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}