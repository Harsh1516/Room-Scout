import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staysAPI } from '../../services/api';

const ALL_CATEGORIES = [
  {
    id: 'hotels',
    title: 'Hotels',
    matchTypes: ['hotel'],
  },
  {
    id: 'flats',
    title: 'Flats & Apartments',
    matchTypes: ['flat', 'apartment'],
  },
  {
    id: 'pg-hostels',
    title: 'PG & Hostels',
    matchTypes: ['pg', 'hostel'],
  },
  {
    id: 'villas',
    title: 'Stays & Villas',
    matchTypes: ['villa', 'homestay'],
  },
  {
    id: 'resorts',
    title: 'Resorts',
    matchTypes: ['resort'],
  },
];

function renderCategoryIcon(id) {
  switch (id) {
    case 'hotels':
      return (
        <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case 'flats':
      return (
        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M12 6h.01" />
          <path d="M12 10h.01M16 10h.01M8 10h.01" />
          <path d="M12 14h.01M16 14h.01M8 14h.01" />
        </svg>
      );
    case 'pg-hostels':
      return (
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'villas':
      return (
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10 12 3l9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="M9 22v-7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7" />
        </svg>
      );
    case 'resorts':
      return (
        <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        </svg>
      );
  }
}

export function LeftPropertiesPanel({ onSelectCategory, selectedCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState(ALL_CATEGORIES);
  const [typeCounts, setTypeCounts] = useState({});

  useEffect(() => {
    let mounted = true;
    const fetchTypes = async () => {
      try {
        const stays = await staysAPI.getStays();
        const staysList = Array.isArray(stays)
          ? stays
          : (Array.isArray(stays?.stays) ? stays.stays : (Array.isArray(stays?.data) ? stays.data : []));

        const counts = {};
        const availableTypes = new Set();

        staysList.forEach((s) => {
          const t = (s.type || s.propertyType || '').toLowerCase().trim();
          if (t) {
            availableTypes.add(t);
            counts[t] = (counts[t] || 0) + 1;
          }
        });

        if (mounted) {
          setTypeCounts(counts);
          const filtered = ALL_CATEGORIES.filter((cat) =>
            cat.matchTypes.some((t) => availableTypes.has(t))
          );
          setActiveCategories(filtered.length > 0 ? filtered : ALL_CATEGORIES);
        }
      } catch (err) {
        console.error('Error fetching properties panel types:', err);
        if (mounted) setActiveCategories(ALL_CATEGORIES);
      }
    };

    fetchTypes();

    const handleSync = () => {
      if (mounted) fetchTypes();
    };

    window.addEventListener('stayhub_rooms_updated', handleSync);
    window.addEventListener('stayhub_admin_sync', handleSync);
    window.addEventListener('focus', handleSync);

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
            handleSync();
          }
        };
      }
    } catch {}

    return () => {
      mounted = false;
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('stayhub_admin_sync', handleSync);
      window.removeEventListener('focus', handleSync);
      if (bc) bc.close();
    };
  }, []);

  return (
    <>
      {/* ── Collapsed Toggle Handle (When Panel is Closed) ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="properties-panel-handle"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 rounded-r-2xl border-l-0 border-r border-y border-white/80 dark:border-white/15 bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl shadow-xl px-2.5 py-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors duration-150 select-none"
            title="Open Properties Panel"
          >
            <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
            </svg>
            <span className="[writing-mode:vertical-lr] text-[11px] font-medium tracking-wider text-slate-700 dark:text-slate-300 uppercase rotate-180">
              Properties
            </span>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
              ›
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Left Side Properties Panel (Strictly No Left Border) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="properties-left-panel"
            initial={{ opacity: 0, x: -340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -340 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-40 w-80 sm:w-88 max-w-[85vw] flex flex-col bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-l-0 border-r border-t-0 border-b-0 border-white/80 dark:border-white/15 shadow-[12px_0_36px_rgba(31,38,135,0.08)] select-none"
            style={{ borderLeft: 'none' }}
          >
            {/* Header Area */}
            <div className="pt-20 sm:pt-24 px-4 pb-3 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-slate-900 dark:text-white tracking-tight">
                    Properties
                  </h2>
                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/15">
                    {activeCategories.length} {activeCategories.length === 1 ? 'Type' : 'Types'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                  Added website listings & categories
                </p>
              </div>

              {/* Close / Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-xs font-normal active:scale-95"
                title="Collapse Panel"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Properties Cards List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 no-scrollbar">
              {activeCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;

                // Calculate count of stays in this category
                const catCount = cat.matchTypes.reduce(
                  (sum, t) => sum + (typeCounts[t] || 0),
                  0
                );

                return (
                  <div
                    key={cat.id}
                    onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                    className={`p-3 sm:p-3.5 rounded-2xl cursor-pointer transition-colors duration-150 border ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-white/15 border-sky-300 dark:border-white/30'
                        : 'bg-white/60 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    } flex items-center justify-between gap-3 select-none`}
                  >
                    {/* Left: Premium SVG Icon + Property Type + Count */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200/70 dark:border-white/15 flex items-center justify-center shrink-0">
                        {renderCategoryIcon(cat.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 tracking-tight truncate">
                          {cat.title}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                          {catCount} {catCount === 1 ? 'stay' : 'stays'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Browse Button with Premium Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectCategory) onSelectCategory(cat.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/70 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors duration-150 cursor-pointer active:scale-95 shrink-0 select-none"
                    >
                      <span>Browse</span>
                      <svg
                        className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Area */}
            <div className="p-3 border-t border-slate-200/70 dark:border-white/10 text-center bg-white/40 dark:bg-slate-950/40">
              <span className="text-[10px] font-mono font-normal text-slate-400 dark:text-slate-500">
                0% Brokerage Direct Stays
              </span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export default LeftPropertiesPanel;
