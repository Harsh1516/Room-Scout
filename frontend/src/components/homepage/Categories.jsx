import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HorizontalCarousel } from '../common/HorizontalCarousel';
import { staysAPI } from '../../services/api';

const ALL_CATEGORIES = [
  {
    id: 'pg-hostels',
    title: 'PG & Hostels',
    description: 'Fully furnished co-living spaces with Wi-Fi, meals, and security.',
    icon: '🏠',
    tag: 'Co-Living',
    matchTypes: ['pg', 'hostel'],
  },
  {
    id: 'flats',
    title: 'Flats & Apts',
    description: 'Independent furnished 1BHK, 2BHK, and studio flats with private kitchens.',
    icon: '🏢',
    tag: 'Flats',
    matchTypes: ['flat', 'apartment'],
  },
  {
    id: 'hotels',
    title: 'Hotels',
    description: 'Prime location stayovers with 24/7 room service and lounges.',
    icon: '🏨',
    tag: 'Short Stays',
    matchTypes: ['hotel'],
  },
  {
    id: 'resorts',
    title: 'Resorts',
    description: 'Luxury weekend getaways with infinity pools and scenic views.',
    icon: '🏖️',
    tag: 'Luxury Havens',
    matchTypes: ['resort'],
  },
  {
    id: 'villas',
    title: 'Stays & Villas',
    description: 'Authentic local homestays and private villas for family retreats.',
    icon: '🏡',
    tag: 'Private Living',
    matchTypes: ['villa', 'homestay'],
  },
];

export function Categories({ selectedCategory, onSelectCategory }) {
  const [activeCategories, setActiveCategories] = useState(ALL_CATEGORIES);

  useEffect(() => {
    let mounted = true;
    const fetchTypes = async () => {
      try {
        const stays = await staysAPI.getStays();
        const staysList = Array.isArray(stays)
          ? stays
          : (Array.isArray(stays?.stays) ? stays.stays : (Array.isArray(stays?.data) ? stays.data : []));

        const availableTypes = new Set(
          staysList.map((s) => (s.type || s.propertyType || '').toLowerCase().trim())
        );

        if (mounted) {
          const filtered = ALL_CATEGORIES.filter((cat) =>
            cat.matchTypes.some((t) => availableTypes.has(t))
          );
          setActiveCategories(filtered.length > 0 ? filtered : ALL_CATEGORIES);
        }
      } catch (err) {
        console.error('Error fetching categories types:', err);
        if (mounted) setActiveCategories(ALL_CATEGORIES);
      }
    };
    fetchTypes();
    return () => {
      mounted = false;
    };
  }, []);

  if (activeCategories.length === 0) return null;

  return (
    <section className="w-full px-2 sm:px-8 lg:px-16 2xl:px-24 py-4 sm:py-10">
      <HorizontalCarousel itemCount={activeCategories.length} trackClassName="gap-3 sm:gap-5">
        {activeCategories.map((cat, idx) => {
          const isSelected = selectedCategory === cat.id;

          return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                className={`min-w-[200px] sm:min-w-[240px] md:min-w-[260px] flex-1 shrink-0 snap-start cursor-pointer rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 transition-all duration-200 border ${
                  isSelected
                    ? 'bg-white/90 dark:bg-white/20 border-white shadow-[0_16px_36px_rgba(59,130,246,0.16),_inset_0_1px_2px_rgba(255,255,255,1)] ring-2 ring-sky-400/50'
                    : 'bg-white/65 dark:bg-white/[0.05] hover:bg-white/85 dark:hover:bg-white/[0.12] border-white/80 dark:border-white/15 shadow-[0_10px_30px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] hover:shadow-[0_16px_36px_rgba(31,38,135,0.1),_inset_0_1px_2px_rgba(255,255,255,1)]'
                } backdrop-blur-2xl flex flex-col justify-between group select-none active:scale-95 hover:-translate-y-1`}
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 sm:mb-4">
                    <div className="text-lg sm:text-2xl lg:text-3xl select-none p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] group-hover:scale-105 transition-transform self-start sm:self-auto">
                      {cat.icon}
                    </div>
                    <span className="text-[9px] sm:text-xs font-mono font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/20 shadow-[0_2px_6px_rgba(31,38,135,0.04),_inset_0_1px_1px_rgba(255,255,255,0.9)] self-start sm:self-auto truncate max-w-full">
                      {cat.tag}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base lg:text-xl font-black text-slate-950 dark:text-white mb-1 sm:mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors leading-tight truncate sm:whitespace-normal">
                    {cat.title}
                  </h3>
                  <p className="line-clamp-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300/80 leading-relaxed font-medium">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  <span>Browse {cat.title}</span>
                  <span className="group-hover:translate-x-1.5 transition-transform text-xs sm:text-sm text-sky-600 dark:text-sky-400">→</span>
                </div>
              </motion.div>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}

export default Categories;