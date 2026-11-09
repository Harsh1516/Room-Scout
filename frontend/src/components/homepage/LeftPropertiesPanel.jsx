import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staysAPI } from '../../services/api';

const ALL_CATEGORIES = [
  {
    id: 'hotels',
    title: 'Hotel',
    matchTypes: ['hotel'],
  },
  {
    id: 'flats',
    title: 'Flat',
    matchTypes: ['flat'],
  },
  {
    id: 'pg',
    title: 'PG',
    matchTypes: ['pg'],
  },
];

function renderCategoryIcon(id) {
  switch (id) {
    case 'hotels':
      return (
        <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
        <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M12 6h.01" />
          <path d="M12 10h.01M16 10h.01M8 10h.01" />
          <path d="M12 14h.01M16 14h.01M8 14h.01" />
        </svg>
      );
    case 'pg':
      return (
        <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        </svg>
      );
  }
}

export function LeftPropertiesPanel({ onSelectCategory, selectedCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState(ALL_CATEGORIES);
  const [typeCounts, setTypeCounts] = useState({});

  // Close smoothly on Escape key press (matching WishlistDrawer)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('leftpanel:toggle', { detail: { open: isOpen } }));
  }, [isOpen]);

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
          setActiveCategories(ALL_CATEGORIES);
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

  const handleSelect = (categoryId) => {
    setIsOpen(false);
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
  };

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
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 rounded-r-2xl border-l-0 border-r border-y max-md:border-white/[0.08] max-md:bg-[#141B26]/90 max-md:shadow-card border-white/80 bg-white/85 backdrop-blur-2xl shadow-xl px-2.5 py-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-white transition-colors duration-150 select-none"
            title="Open Properties Panel"
          >
            <svg className="w-4 h-4 max-md:text-emerald-400 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
            </svg>
            <span className="[writing-mode:vertical-lr] text-[11px] font-medium tracking-wider max-md:text-slate-300 text-slate-700 uppercase rotate-180">
              Stays
            </span>
            <span className="text-xs max-md:text-emerald-400 text-sky-600 font-medium">
              ›
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Left Side Properties Drawer (Matching WishlistDrawer Architecture) ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              key="properties-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer Wrapper */}
            <div className="fixed inset-y-0 left-0 flex pr-0 sm:pr-10 max-w-full pointer-events-none">
              <motion.div
                key="properties-drawer-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{
                  duration: 0.32,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="pointer-events-auto w-80 sm:w-88 max-w-[85vw] flex flex-col bg-white border-r border-slate-200 shadow-2xl h-full will-change-transform select-none"
              >
                {/* Header (Clean, Compact, matching WishlistDrawer) */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                        Properties
                      </h2>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/25 whitespace-nowrap">
                        {activeCategories.length} Types
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Added website listings & categories
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close Properties"
                    aria-label="Close Properties"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* List of Category Cards (Exact Wishlist item card style) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {activeCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const catCount = cat.matchTypes.reduce(
                      (sum, t) => sum + (typeCounts[t] || 0),
                      0
                    );

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
                          isSelected
                            ? 'border-slate-400 bg-slate-50/60 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Top: Thumbnail / Icon + Info (Clicking selects & navigates) */}
                        <div
                          className="flex gap-3 p-3 cursor-pointer"
                          onClick={() => handleSelect(cat.id)}
                        >
                          {/* Thumbnail / Icon container */}
                          <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60 flex items-center justify-center">
                            {renderCategoryIcon(cat.id)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
                                {cat.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/25 whitespace-nowrap">
                                {cat.title} Category
                              </span>
                              <span className="text-slate-300 text-[11px]">·</span>
                              <span className="text-[11px] text-slate-400 truncate">
                                {catCount} {catCount === 1 ? 'stay' : 'stays'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Row: Sleek Slate-900 Action Button */}
                        <div
                          className="flex items-center justify-between px-3 pb-2.5 pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-400">
                            {catCount > 0 ? `${catCount} verified ${catCount === 1 ? 'stay' : 'stays'}` : 'Listing updates soon'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelect(cat.id)}
                            className="text-xs font-bold px-3.5 py-1.5 min-h-[30px] rounded-lg bg-slate-900 text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Browse</span>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer (Matching WishlistDrawer) */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {activeCategories.length} categories available
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LeftPropertiesPanel;
