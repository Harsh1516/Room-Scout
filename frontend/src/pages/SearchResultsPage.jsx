import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StayCinematicShowcase } from '../components/common/StayCinematicShowcase';

const SearchInteractiveMap = lazy(() =>
 import('../components/SearchInteractiveMap').then((m) => ({ default: m.SearchInteractiveMap }))
);

function MapSkeletonLoader() {
 return (
 <div className="w-full h-full min-h-[360px] sm:min-h-[380px] rounded-3xl bg-slate-200/70 border border-slate-300/40 flex flex-col items-center justify-center gap-3">
 <div className="w-9 h-9 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
 <span className="text-sm font-medium text-slate-600">Loading map...</span>
 </div>
 );
}

export function SearchResultsPage({
	stays = [],
	allFilteredStays = [],
	isLoading = false,
	filters = {},
	resetFilters,
	onStayClick,
	onBookClick,
}) {
 const [showcaseIndex, setShowcaseIndex] = useState(0);
 const [hoveredStayId, setHoveredStayId] = useState(null);
 const [isMapModalOpen, setIsMapModalOpen] = useState(false);

 // Reset showcaseIndex only when stays list actually changes
 const prevStaysRef = useRef(stays);
 useEffect(() => {
 if (prevStaysRef.current !== stays) {
 prevStaysRef.current = stays;
 setShowcaseIndex(0);
 }
 }, [stays]);

 // Close map modal on Escape key press
 useEffect(() => {
 const handleKeyDown = (e) => {
 if (e.key === 'Escape') {
 if (isMapModalOpen) setIsMapModalOpen(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isMapModalOpen]);

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
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto rounded-[28px] sm:rounded-[36px] bg-slate-200/80 p-6 flex flex-col gap-4 border border-slate-300/40 animate-pulse my-auto">
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9] max-h-[340px] bg-slate-300 rounded-2xl" />
            <div className="h-6 w-48 bg-slate-300 rounded-lg" />
            <div className="h-4 w-32 bg-slate-300 rounded-md" />
            <div className="h-16 w-full bg-slate-300 rounded-2xl" />
            <div className="h-12 w-full bg-slate-300 rounded-2xl" />
          </div>
        )}

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

  {/* ── 2X CENTERED FLOATING "SEE MAP" BUTTON WITH FULL ROUNDED GRAY BORDER ── */}
 {stays.length > 0 && (
        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-14 sm:h-16 inline-flex items-center justify-center gap-3 px-8 sm:px-10 rounded-full border-2 border-slate-300 bg-slate-700 hover:bg-slate-800 text-white text-base sm:text-lg font-black shadow-2xl backdrop-blur-md transition-all cursor-pointer select-none active:scale-95 hover:scale-105"
          title="Open Map View"
        >
          <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6.5L9 3.5L15 6.5L21 3.5V17.5L15 20.5L9 17.5L3 20.5V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
            <path d="M9 3.5V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
            <path d="M15 6.5V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
            <circle cx="12" cy="11.5" r="2.2" fill="#34d399" />
            <circle cx="12" cy="11.5" r="4" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.5" />
          </svg>
          <span>See Map</span>
        </button>
      )}
 </div>
 );
}

export default SearchResultsPage;