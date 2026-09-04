import { motion } from 'framer-motion';
import { HorizontalCarousel } from '../common/HorizontalCarousel';

const CATEGORIES = [
  {
    id: 'pg-hostels',
    title: 'PG & Hostels',
    description: 'Fully furnished co-living spaces with Wi-Fi, meals, and security.',
    icon: '🏢',
    tag: 'Co-Living',
  },
  {
    id: 'flats',
    title: 'Flats & Apts',
    description: 'Independent furnished 1BHK, 2BHK, and studio flats with private kitchens.',
    icon: '🏬',
    tag: 'Flats',
  },
  {
    id: 'hotels',
    title: 'Hotels',
    description: 'Prime location stayovers with 24/7 room service and lounges.',
    icon: '🏨',
    tag: 'Short Stays',
  },
  {
    id: 'resorts',
    title: 'Resorts',
    description: 'Luxury weekend getaways with infinity pools and scenic views.',
    icon: '🌴',
    tag: 'Luxury Havens',
  },
  {
    id: 'villas',
    title: 'Stays & Villas',
    description: 'Authentic local homestays and private villas for family retreats.',
    icon: '🏡',
    tag: 'Private Living',
  },
];

export function Categories({ selectedCategory, onSelectCategory }) {
  return (
    <section className="w-full px-2 sm:px-8 lg:px-16 2xl:px-24 py-4 sm:py-10">
      <HorizontalCarousel itemCount={CATEGORIES.length} trackClassName="gap-3 sm:gap-5">
        {CATEGORIES.map((cat, idx) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className={`min-w-[200px] sm:min-w-[240px] md:min-w-[260px] flex-1 shrink-0 snap-start cursor-pointer rounded-xl sm:rounded-3xl p-3 sm:p-5 lg:p-7 transition-all duration-200 border ${
                isSelected
                  ? 'bg-slate-200 dark:bg-white/20 border-slate-400 dark:border-white/40 shadow-md'
                  : 'bg-white/80 dark:bg-slate-950/60 hover:bg-slate-50 dark:hover:bg-slate-900/80 border-slate-200 dark:border-white/15 shadow-xs dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]'
              } backdrop-blur-xl flex flex-col justify-between group select-none active:scale-95`}
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 sm:mb-4">
                  <div className="text-lg sm:text-2xl lg:text-3xl select-none p-1 sm:p-2.5 rounded-lg sm:rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-slate-400 dark:group-hover:border-white/30 transition-colors self-start sm:self-auto">
                    {cat.icon}
                  </div>
                  <span className="text-[7.5px] sm:text-xs font-mono font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/5 dark:bg-white/10 border border-slate-200 dark:border-white/20 self-start sm:self-auto truncate max-w-full">
                    {cat.tag}
                  </span>
                </div>

                <h3 className="text-xs sm:text-base lg:text-xl font-black text-slate-950 dark:text-white mb-1 sm:mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors leading-tight truncate sm:whitespace-normal">
                  {cat.title}
                </h3>
                <p className="line-clamp-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {cat.description}
                </p>
              </div>

              <div className="pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-950 dark:text-white">
                <span>Browse {cat.title}</span>
                <span className="group-hover:translate-x-1.5 transition-transform text-xs sm:text-sm">→</span>
              </div>
            </motion.div>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}