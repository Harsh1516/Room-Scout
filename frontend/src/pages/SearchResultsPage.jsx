import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StayCinematicShowcase } from '../components/common/StayCinematicShowcase';
import { DotGridWaveLoader } from '../components/common/DotGridWaveLoader';

const SearchInteractiveMap = lazy(() =>
 import('../components/SearchInteractiveMap').then((m) => ({ default: m.SearchInteractiveMap }))
);

function MapSkeletonLoader() {
 return (
 <DotGridWaveLoader
 fullScreen={false}
 className="h-full min-h-[360px] sm:min-h-[380px] rounded-3xl"
 />
 );
}

const STAY_TYPE_OPTIONS = ['All', 'PG', 'Hostel', 'Flat', 'Independent Room', 'Hotel'];
const GENDER_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Boys', value: 'Boys' },
  { label: 'Girls', value: 'Girls' },
  { label: 'Both', value: 'Both' },
  { label: 'Family', value: 'Family' },
];
const SORT_OPTIONS = [
  { label: 'Newest', value: 'recent' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'rating-desc' },
];
const BUDGET_OPTIONS = [
  { label: 'Any', min: null, max: null },
  { label: 'Under ₹4,000', min: null, max: 4000 },
  { label: '₹4,000 – ₹7,000', min: 4000, max: 7000 },
  { label: '₹7,000 – ₹10,000', min: 7000, max: 10000 },
  { label: '₹10,000+', min: 10000, max: null },
];
const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '3.0★+', value: 3 },
  { label: '4.0★+', value: 4 },
  { label: '4.5★+', value: 4.5 },
];
const AMENITY_OPTIONS = ['Wi-Fi', 'AC', 'Food', 'Laundry', 'Parking', 'CCTV'];

export function SearchResultsPage({
	stays = [],
	allFilteredStays = [],
	isLoading = false,
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
 const [showcaseIndex, setShowcaseIndex] = useState(0);
 const [hoveredStayId, setHoveredStayId] = useState(null);
 const [isMapModalOpen, setIsMapModalOpen] = useState(false);
 const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

 // Reset showcaseIndex only when stays list actually changes
 const prevStaysRef = useRef(stays);
 useEffect(() => {
 if (prevStaysRef.current !== stays) {
 prevStaysRef.current = stays;
 setShowcaseIndex(0);
 }
 }, [stays]);

 // Close map / filter modal on Escape key press
 useEffect(() => {
 const handleKeyDown = (e) => {
 if (e.key === 'Escape') {
 if (isMapModalOpen) setIsMapModalOpen(false);
 if (isFilterModalOpen) setIsFilterModalOpen(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isMapModalOpen, isFilterModalOpen]);

 // Compute active filters count
 const activeFiltersCount = useMemo(() => {
 let count = 0;
 if (filters.isNearby) count++;
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

 const activeCategory = String(filters.type || filters.category || '').trim();
 const searchQuery = String(filters.query || filters.location || '').trim().toLowerCase();
 const isFlatSearch =
   activeCategory.toLowerCase() === 'flat' ||
   searchQuery.includes('flat') ||
   searchQuery.includes('apartment') ||
   searchQuery.includes('1bhk') ||
   searchQuery.includes('2bhk');

 const hasStays = !isLoading && stays.length > 0;

 return (
 <div className={`relative w-full min-h-screen ${hasStays ? 'pt-0 pb-14 px-0' : 'pt-[100px] sm:pt-[116px] pb-14 px-4'} flex flex-col justify-start bg-[#fcfcfd] text-slate-900 transition-colors`}>
      {/* ── Fixed Screen Ambient Light Glass Canvas ── */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/70 to-[#ffffff]" />
        <div className="absolute -top-24 left-[15%] w-[680px] h-[480px] bg-sky-200/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -top-16 right-[15%] w-[640px] h-[460px] bg-indigo-200/20 rounded-full blur-[140px] pointer-events-none" />
      </div>
 

 {/* ── 3. Dedicated Interactive Map Explorer Window Modal ── */}
 <AnimatePresence>
 {isMapModalOpen && (
 <div className="fixed inset-0 z-50 bg-[#1f1b16]/70 flex items-center justify-center p-3 sm:p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 onClick={() => setIsMapModalOpen(false)}
 className="fixed inset-0 cursor-pointer"
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 16 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 16 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="relative w-full max-w-xl sm:max-w-2xl bg-[#fbf7f4] text-[#2e1b10] rounded-2xl shadow-2xl overflow-hidden border border-[#e2d2c5] z-10"
 >
 {/* Map Window Header */}
 <div className="relative px-4 py-3 border-b border-[#ebdcd0] flex items-center justify-center bg-[#f4ece5]">
 <h2 className="text-base font-bold text-[#2e1b10] text-center">
 Map Explorer
 </h2>

 <button
 type="button"
 onClick={() => setIsMapModalOpen(false)}
 className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#7d5740] hover:text-[#2e1b10] hover:bg-[#ebdcd0] transition-colors text-base font-bold cursor-pointer"
 title="Close Map Window"
 >
 ✕
 </button>
 </div>

 {/* Map Window Body with exact same 2x height dimension */}
 <div className="p-3.5 space-y-3">
 <div className="relative w-full h-[460px] sm:h-[500px] rounded-2xl overflow-hidden border border-[#e2d2c5] shadow-inner bg-[#f0e4db]">
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
 </div>

 {/* Map Window Footer */}
 <div className="p-3 px-4 border-t border-[#ebdcd0] bg-[#f4ece5]/90 flex items-center justify-between">
 <div className="text-sm font-medium text-slate-700">
 Showing <span className="font-semibold text-[#824a25]">{stays.length}</span> properties on map
 </div>

 <button
 type="button"
 onClick={() => setIsMapModalOpen(false)}
 className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1f1b16] text-white font-bold text-sm hover:bg-[#0f766e] transition-colors cursor-pointer active:scale-95 inline-flex items-center justify-center"
 >
 Close
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 
 {/* Search Results Display (Showcase Only) */}
      <div className={`w-full ${!hasStays ? 'flex-1 flex flex-col items-center justify-center my-auto' : ''}`}>
        {/* Centered Dot Grid Wave Loader while stays fetch */}
        {isLoading && <DotGridWaveLoader />}

        {/* Search Results Display */}
        {!isLoading && stays.length > 0 && (
          <div className="w-full">
            <StayCinematicShowcase
              stays={stays}
              activeIndex={showcaseIndex}
              onActiveIndexChange={setShowcaseIndex}
              onStayClick={onStayClick}
              onBookClick={onBookClick}
              onOpenMap={() => setIsMapModalOpen(true)}
              onHover={setHoveredStayId}
              onLeave={() => setHoveredStayId(null)}
            />
          </div>
        )}

        {/* Minimal Premium Empty State (Direct on Canvas, No Window Format) */}
        {!isLoading && stays.length === 0 && (
          <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-16 px-6 z-10 relative">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md w-full mx-auto text-center flex flex-col items-center select-none"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {isFlatSearch ? 'No flats found' : 'No properties found'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-500 font-normal leading-relaxed max-w-sm">
                {isFlatSearch
                  ? 'We could not find any verified flats in this area. Try searching nearby locations or explore other stay types.'
                  : 'We could not find any properties matching your search. Try adjusting your filters or search terms.'}
              </p>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => resetFilters && resetFilters()}
                  className="mt-6 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  Reset filters
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

  {/* ── FLOATING CIRCULAR FILTER TOGGLE BUTTON (BOTTOM-LEFT, SAME COLOR AS MAP BUTTON) ── */}
  {!isLoading && (
    <button
      type="button"
      onClick={() => setIsFilterModalOpen((prev) => !prev)}
      className="fixed bottom-6 left-4 sm:left-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/65 bg-white/50 hover:bg-white/70 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition-all cursor-pointer select-none active:scale-95 hover:scale-105 flex items-center justify-center"
      title="Filter Stays"
      aria-label="Open Filters"
    >
      <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
      {activeFiltersCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white shadow-sm">
          {activeFiltersCount}
        </span>
      )}
    </button>
  )}

  {/* ── FLOATING FILTER WINDOW (FULLY ROUNDED BORDER + WISHLIST-MATCHING BACKDROP BLUR) ── */}
  <AnimatePresence>
    {isFilterModalOpen && (
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop matching WishlistDrawer */}
        <motion.div
          key="filter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
          onClick={() => setIsFilterModalOpen(false)}
        />

        {/* Floating Panel anchored bottom-left */}
        <div className="fixed bottom-24 left-3 sm:left-6 pointer-events-none z-10 max-w-[calc(100vw-24px)]">
          <motion.div
            key="filter-drawer-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-80 sm:w-92 max-w-[calc(100vw-24px)] flex flex-col bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] max-h-[calc(100dvh-120px)] will-change-transform select-none rounded-[28px] sm:rounded-[32px] overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center px-4 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-[22px] sm:text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Compulsory Priority Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Fastest host response stays shown first</span>
              </div>

              {/* 1. Sort By */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sort By</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map((opt) => {
                    const active = (filters.sortOrder || 'price-desc') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSortOrder?.(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Stay Type */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stay Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {STAY_TYPE_OPTIONS.map((opt) => {
                    const active = (filters.type || 'All').toLowerCase() === opt.toLowerCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCategoryFilter?.(opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Preferred For (Gender) */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preferred For</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENDER_OPTIONS.map((opt) => {
                    const active = (filters.gender || 'All').toLowerCase() === opt.value.toLowerCase();
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGenderFilter?.(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Budget Range */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly / Nightly Budget</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_OPTIONS.map((opt) => {
                    const active =
                      (filters.minPrice ?? null) === opt.min &&
                      (filters.maxPrice ?? null) === opt.max;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setPriceRange?.(opt.min, opt.max)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Minimum Rating */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Minimum Rating</p>
                <div className="flex flex-wrap gap-1.5">
                  {RATING_OPTIONS.map((opt) => {
                    const active = (Number(filters.minRating) || 0) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMinRating?.(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Key Facilities */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Facilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const selectedList = Array.isArray(filters.selectedAmenities) ? filters.selectedAmenities : [];
                    const active = selectedList.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity?.(amenity)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => resetFilters?.()}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2 rounded-full bg-[#1f1b16] hover:bg-[#0f766e] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer active:scale-95"
              >
                Show {allFilteredStays.length > 0 ? allFilteredStays.length : stays.length} Stays
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>

  {/* ── 2X CENTERED FLOATING "SEE MAP" BUTTON WITH FULL ROUNDED GRAY BORDER ── */}
 {stays.length > 0 && (
        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-14 sm:h-16 inline-flex items-center justify-center gap-3 px-8 sm:px-10 rounded-full border border-white/65 bg-white/50 hover:bg-white/70 text-slate-900 text-base sm:text-lg font-black shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition-all cursor-pointer select-none active:scale-95 hover:scale-105"
          title="Open Map View"
        >
          <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6.5L9 3.5L15 6.5L21 3.5V17.5L15 20.5L9 17.5L3 20.5V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
            <path d="M9 3.5V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
            <path d="M15 6.5V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
            <circle cx="12" cy="11.5" r="2.2" fill="#059669" />
            <circle cx="12" cy="11.5" r="4" stroke="#059669" strokeWidth="1.2" strokeOpacity="0.55" />
          </svg>
          <span>See Map</span>
        </button>
      )}
 </div>
 );
}

export default SearchResultsPage;