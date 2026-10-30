import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyCard } from '../components/common/PropertyCard';
import { StayCinematicShowcase } from '../components/common/StayCinematicShowcase';

const SearchInteractiveMap = lazy(() =>
  import('../components/SearchInteractiveMap').then((m) => ({ default: m.SearchInteractiveMap }))
);

function MapSkeletonLoader() {
  return (
    <div className="w-full h-full min-h-[360px] sm:min-h-[380px] rounded-3xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse border border-slate-300/40 dark:border-slate-700/40 flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Loading Interactive Map...
      </span>
    </div>
  );
}

export function SearchResultsPage({
  stays = [],
  allFilteredStays = [],
  pagination = {},
  isLoading = false,
  isBackgroundRefreshing = false,
  filters = {},
  setCategoryFilter,
  setGenderFilter,
  setSortOrder,
  setMinRating,
  setPriceRange,
  toggleAmenity,
  resetFilters,
  onStayClick,
  onBookClick,
}) {
  const [viewMode, setViewMode] = useState('showcase');
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [hoveredStayId, setHoveredStayId] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Reset showcaseIndex only when stays list actually changes
  const prevStaysRef = useRef(stays);
  useEffect(() => {
    if (prevStaysRef.current !== stays) {
      prevStaysRef.current = stays;
      setShowcaseIndex(0);
    }
  }, [stays]);

  // Close drawer or map modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isMapModalOpen) setIsMapModalOpen(false);
        else if (isFiltersOpen) setIsFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFiltersOpen, isMapModalOpen]);

  const categories = ['All', 'PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat'];
  const genders = ['All', 'Boys', 'Girls', 'Unisex'];
  const budgetPresets = [
    { label: 'All Budgets', min: null, max: null },
    { label: 'Under ₹3k', min: null, max: 3000 },
    { label: '₹3k - ₹6k', min: 3000, max: 6000 },
    { label: '₹6k - ₹12k', min: 6000, max: 12000 },
    { label: '₹12k+', min: 12000, max: null },
  ];
  const amenityOptions = [
    'Power Backup',
    'AC',
    'Attached Bath',
    'Food Included',
    'Wifi',
    'Security',
    'Kitchen',
    'Gym',
    'Balcony',
  ];

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category && filters.category !== 'All') count++;
    if (filters.type && filters.type !== 'All' && filters.type !== filters.category) count++;
    if (filters.gender && filters.gender !== 'All') count++;
    if (
      (filters.minPrice !== null && filters.minPrice !== undefined) ||
      (filters.maxPrice !== null && filters.maxPrice !== undefined)
    ) {
      count++;
    }
    if (filters.minRating && filters.minRating > 0) count++;
    if (Array.isArray(filters.selectedAmenities) && filters.selectedAmenities.length > 0) {
      count += filters.selectedAmenities.length;
    }
    return count;
  }, [filters]);

  const totalResults = pagination.totalCount ?? allFilteredStays.length ?? stays.length;
  const currentPage = pagination.currentPage || 1;
  const totalPages = pagination.totalPages || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && pagination.setCurrentPage) {
      pagination.setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={`w-full ${viewMode === 'showcase' ? 'h-screen overflow-hidden pt-30 sm:pt-32 lg:pt-34 pb-2.5 sm:pb-3 px-6 sm:px-10 lg:px-12 xl:px-16 flex flex-col justify-between' : 'min-h-screen pt-28 sm:pt-30 pb-20 px-6 sm:px-10 lg:px-12 xl:px-16'} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors`}>
      {/* ── 1. Soft Backdrop Overlay when Filter Drawer is Open ── */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setIsFiltersOpen(false)}
            className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs z-50 cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* ── 2. Sliding Left Filter Panel with Ultra-Premium Animated Toggle Handle ── */}
      <motion.aside
        initial={false}
        animate={{ x: isFiltersOpen ? '0%' : '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed top-0 bottom-0 left-0 z-50 w-80 sm:w-96 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800 shadow-[10px_0_36px_rgba(0,0,0,0.14)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.6)] flex flex-col justify-between select-none"
      >
        {/* Ultra-Premium Minimal Toggle Handle at the Center of the Left Screen Border */}
        <button
          type="button"
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          className="absolute top-1/2 -translate-y-1/2 left-full flex flex-col items-center justify-center w-8 sm:w-9 h-22 sm:h-26 bg-gradient-to-b from-white/95 via-slate-50/95 to-slate-100/90 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-950/95 backdrop-blur-2xl border border-l-0 border-slate-300/80 dark:border-slate-700/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-r-2xl shadow-[4px_0_24px_rgba(0,0,0,0.12)] hover:shadow-[6px_0_28px_rgba(16,185,129,0.22)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.7)] dark:hover:shadow-[6px_0_32px_rgba(16,185,129,0.3)] text-slate-700 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all duration-300 cursor-pointer group active:scale-95 select-none"
          title={isFiltersOpen ? 'Collapse Filters (<)' : 'Expand Filters (>)'}
          aria-label={isFiltersOpen ? 'Close filters' : 'Open filters'}
        >
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            {/* Upper tactile micro-notch */}
            <span className="w-1 h-2 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500/70 transition-colors" />

            {/* Ultra-Premium Precision Chevron (> when closed, rotates 180° to < when open) */}
            <motion.div
              animate={{ rotate: isFiltersOpen ? 180 : 0, scale: isFiltersOpen ? 1.05 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-5 h-5 flex items-center justify-center group-hover:translate-x-0.5 transition-transform"
            >
              <svg
                className="w-4 h-4 text-slate-700 dark:text-slate-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </motion.div>

            {/* Active indicator dot or lower tactile micro-notch */}
            {activeFiltersCount > 0 && !isFiltersOpen ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse" />
            ) : (
              <span className="w-1 h-2 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-500/70 transition-colors" />
            )}
          </div>
        </button>

        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-950 dark:text-white leading-tight">
                  Filters
                </h2>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Refine your stay search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => resetFilters && resetFilters()}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline px-2 py-1 rounded-lg cursor-pointer"
              >
                Reset All
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(false)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              title="Close Panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Filter Categories */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {/* 0. Sort Order Dropdown */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Sort By
            </span>
            <select
              value={filters.sortOrder || 'price-desc'}
              onChange={(e) => setSortOrder && setSortOrder(e.target.value)}
              className="w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Added (Fresh)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Top Rated (★ 4.5+)</option>
              <option value="title-asc">Name (A-Z)</option>
            </select>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* 1. Property Type */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Property Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const isCurrentActive = filters.type === cat || filters.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter && setCategoryFilter(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      isCurrentActive
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>{cat}</span>
                    {isCurrentActive && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* 2. Budget Presets */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Budget Range
            </span>
            <div className="flex flex-col gap-1.5">
              {budgetPresets.map((preset, idx) => {
                const isActive =
                  filters.minPrice === preset.min && filters.maxPrice === preset.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPriceRange && setPriceRange(preset.min, preset.max)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between border ${
                      isActive
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isActive && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* 3. Gender / Accommodation */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Accommodation Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {genders.map((gen) => {
                const isGenActive = (filters.gender || 'All') === gen;
                return (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setGenderFilter && setGenderFilter(gen)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      isGenActive
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>{gen}</span>
                    {isGenActive && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* 4. Guest Rating */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Minimum Rating
            </span>
            <button
              type="button"
              onClick={() => setMinRating && setMinRating(filters.minRating === 4.5 ? 0 : 4.5)}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                filters.minRating >= 4.5
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">★</span>
                <span>Top Rated (4.5+ Stars)</span>
              </span>
              {filters.minRating >= 4.5 && <span className="text-[10px] font-bold">✓</span>}
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* 5. Amenities */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Amenities
            </span>
            <div className="flex flex-wrap gap-1.5">
              {amenityOptions.map((amenity) => {
                const isSelected = (filters.selectedAmenities || []).includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity && toggleAmenity(amenity)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            {stays.length} {stays.length === 1 ? 'property' : 'properties'} found
          </span>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Apply & View
          </button>
        </div>
      </motion.aside>

      {/* ── 3. Dedicated Interactive Map Explorer Window Modal ── */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMapModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Map Window Header */}
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                      <line x1="9" y1="3" x2="9" y2="18" />
                      <line x1="15" y1="6" x2="15" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white leading-tight">
                      Map Explorer
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Showing {stays.length} properties located on map
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(false)}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Close Map Window"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Map Window Body */}
              <div className="flex-1 w-full h-full relative overflow-hidden">
                <Suspense fallback={<MapSkeletonLoader />}>
                  <SearchInteractiveMap
                    stays={allFilteredStays.length > 0 ? allFilteredStays : stays}
                    hoveredStayId={hoveredStayId}
                    onStayClick={(stay) => {
                      setIsMapModalOpen(false);
                      onStayClick && onStayClick(stay);
                    }}
                    onStayHover={setHoveredStayId}
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* ── Fixed Top Control Bar: Fixed in the EXACT same position across Showcase and Grid ── */}
      {!isLoading && stays.length > 0 && (
        <div className="fixed top-16 sm:top-18 inset-x-0 z-30 pointer-events-none px-3 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-[1760px] mx-auto flex items-center justify-between">
            {/* Showcase / Grid View Mode Switcher */}
            <div className="pointer-events-auto inline-flex items-center p-1 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-md backdrop-blur-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('showcase')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'showcase'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <span>✦ Showcase</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <span>⊞ Grid</span>
              </button>
            </div>

            {/* Right Side: Slide Counter in Showcase, or Total Stays in Grid */}
            <div className="pointer-events-auto flex items-center pr-2">
              {viewMode === 'showcase' ? (
                <span className="text-xl sm:text-2xl font-black tracking-wider text-slate-950 dark:text-white font-sans select-none drop-shadow-xs">
                  {showcaseIndex + 1}/{stays.length}
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
                  {stays.length} {stays.length === 1 ? 'Stay' : 'Stays'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`w-full max-w-[1760px] mx-auto ${viewMode === 'showcase' ? 'h-full flex flex-col justify-between min-h-0' : 'space-y-6'}`}>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 sm:h-70 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 animate-pulse p-4 flex flex-col justify-between border border-slate-300/40 dark:border-slate-700/40"
              >
                <div className="flex justify-between">
                  <div className="w-16 h-4 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="w-6 h-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-20 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-md" />
                  <div className="w-36 h-4 bg-slate-300 dark:bg-slate-700 rounded-md" />
                  <div className="w-full h-7 bg-slate-300 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Display */}
        {!isLoading && stays.length > 0 && (
          <div className={`w-full ${viewMode === 'showcase' ? 'h-full flex flex-col justify-between min-h-0' : 'space-y-4'}`}>
            {/* View Content */}
            {viewMode === 'showcase' ? (
              <StayCinematicShowcase
                stays={stays}
                viewMode={viewMode}
                hideTopBar={true}
                activeIndex={showcaseIndex}
                onActiveIndexChange={setShowcaseIndex}
                onStayClick={onStayClick}
                onBookClick={onBookClick}
                onOpenMap={() => setIsMapModalOpen(true)}
                onHover={setHoveredStayId}
                onLeave={() => setHoveredStayId(null)}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 w-full">
                  {stays.map((stay) => (
                    <PropertyCard
                      key={stay._id}
                      stay={stay}
                      isHovered={hoveredStayId === stay._id}
                      onHover={setHoveredStayId}
                      onLeave={() => setHoveredStayId(null)}
                      onStayClick={onStayClick}
                      onBookClick={onBookClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && stays.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
              No verified properties match your search criteria.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your category, location, or price filters to explore more stays.
            </p>
            <button
              onClick={() => resetFilters && resetFilters()}
              className="mt-2 px-5 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Numbered Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalResults} total stays)
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MINIMAL PREMIUM FLOATING "SEE MAP" BUTTON AT SCREEN BOTTOM-RIGHT CORNER (DEFAULT FOR BOTH SHOWCASE AND GRID) ── */}
      {stays.length > 0 && (
        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          className="fixed bottom-3 sm:bottom-4 right-3 sm:right-4 z-40 h-8 sm:h-9 inline-flex items-center gap-1.5 px-3.5 sm:px-4 rounded-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 border border-sky-400 dark:border-sky-400 transition-all active:scale-95 cursor-pointer select-none"
          title="Open Map View"
        >
          <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span>See Map</span>
        </button>
      )}
    </div>
  );
}

export default SearchResultsPage;