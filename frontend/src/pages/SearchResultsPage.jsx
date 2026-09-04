import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchInteractiveMap } from '../components/SearchInteractiveMap';
import { PropertyCard } from '../components/common/PropertyCard';

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'split'
  const [hoveredStayId, setHoveredStayId] = useState(null);

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

  const totalResults = pagination.totalCount ?? allFilteredStays.length ?? stays.length;
  const currentPage = pagination.currentPage || 1;
  const totalPages = pagination.totalPages || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && pagination.setCurrentPage) {
      pagination.setCurrentPage(newPage);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen pt-24 sm:pt-28 px-4 sm:px-6 lg:px-10 2xl:px-16 pb-20 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full space-y-6 max-w-[1720px] mx-auto">
        {/* TOP 50/50 SECTION: Left (Search Header + Category/Filter Tab) | Right (Interactive Map) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 50% Column (lg:col-span-6): Search Result Tab & Category/Filter Tab */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            {/* 1. Search Result Tab */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Verified Inventory
                  </span>
                  {isBackgroundRefreshing && (
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 animate-pulse font-bold">
                      ● Syncing...
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={filters.sortOrder || 'price-desc'}
                  onChange={(e) => setSortOrder && setSortOrder(e.target.value)}
                  className="p-2 text-xs font-bold rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="recent">Recently Added (Fresh)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Top Rated (★ 4.5+)</option>
                  <option value="title-asc">Name (A-Z)</option>
                </select>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white">
                  Search Results
                  {filters.location && (
                    <span className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl font-bold">
                      {' '}in {filters.location}
                    </span>
                  )}
                  {filters.type && filters.type !== 'All' && (
                    <span className="text-cyan-600 dark:text-cyan-400 text-base sm:text-xl font-bold">
                      {' '}• {filters.type}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Showing <strong className="text-slate-950 dark:text-white">{stays.length}</strong> of{' '}
                  <strong className="text-slate-950 dark:text-white">{totalResults}</strong> verified properties across India.
                </p>
              </div>
            </div>

            {/* 2. Filter Controls Tab (Type, Budget, Ratings, Amenities) */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3.5 shadow-sm backdrop-blur-xl flex-1 flex flex-col justify-center">
              {/* Row 0: Stay Types / Categories (PG, Hostel, Flat, Hotel, etc.) */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 sm:mr-1">
                  Type:
                </span>
                {categories.map((cat) => {
                  const isSelected =
                    (!filters.type && cat === 'All') ||
                    filters.type === cat ||
                    (cat === 'All' && filters.type === 'All Types');
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter && setCategoryFilter(cat)}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Row 1: Budget Presets & Rating & Reset */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 sm:mr-1">
                    Budget:
                  </span>
                  {budgetPresets.map((preset, idx) => {
                    const isActive =
                      filters.minPrice === preset.min && filters.maxPrice === preset.max;
                    return (
                      <button
                        key={idx}
                        onClick={() => setPriceRange && setPriceRange(preset.min, preset.max)}
                        className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setMinRating && setMinRating(filters.minRating === 4.5 ? 0 : 4.5)}
                    className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-colors border cursor-pointer ${
                      filters.minRating >= 4.5
                        ? 'bg-slate-950 dark:bg-white border-slate-950 text-white dark:text-slate-950'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ★ 4.5+ Rating
                  </button>

                  <button
                    onClick={() => resetFilters && resetFilters()}
                    className="text-[10px] sm:text-xs font-bold text-rose-500 hover:underline px-1 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Row 3: Amenities Chips */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 sm:mr-1">
                  Amenities:
                </span>
                {amenityOptions.map((amenity) => {
                  const isSelected = (filters.selectedAmenities || []).includes(amenity);
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity && toggleAmenity(amenity)}
                      className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-slate-950 dark:bg-white border-slate-950 text-white dark:text-slate-950'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {amenity}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 50% Column (lg:col-span-6): Interactive Map fixed to match left tabs height */}
          <div className="lg:col-span-6 h-full min-h-[360px] sm:min-h-[380px]">
            <SearchInteractiveMap
              stays={allFilteredStays.length > 0 ? allFilteredStays : stays}
              hoveredStayId={hoveredStayId}
              onStayClick={onStayClick}
              onStayHover={setHoveredStayId}
            />
          </div>
        </div>

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

        {/* Main Content: Resulted Search Places (Max 4 containers in a row) */}
        {!isLoading && stays.length > 0 && (
          <div className="w-full pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 w-full">
              {stays.map((stay) => (
                <PropertyCard
                  key={stay._id || stay.id}
                  stay={stay}
                  isHovered={hoveredStayId === (stay._id || stay.id)}
                  onHover={setHoveredStayId}
                  onLeave={() => setHoveredStayId(null)}
                  onStayClick={onStayClick}
                  onBookClick={onBookClick}
                />
              ))}
            </div>
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
              {/* Prev Button */}
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                ← Prev
              </button>

              {/* Page Number Buttons */}
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

              {/* Next Button */}
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
    </div>
  );
}

export default SearchResultsPage;