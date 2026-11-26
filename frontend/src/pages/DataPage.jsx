import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Left } from '../components/navbar/Left';
import { DotGridWaveLoader } from '../components/common/DotGridWaveLoader';

// Helper: Safely extract clean numeric price
const parseNumericPrice = (val) => {
 if (typeof val === 'number' && !isNaN(val)) return val;
 return parseInt(String(val || 0).replace(/[^0-9]/g, ''), 10) || 0;
};

export function DataPage({ onStayClick, onBookClick }) {
 const navigate = useNavigate();
 const { user } = useAuth();
 const { isInWishlist, toggleWishlist } = useWishlist();

 const [stays, setStays] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState('All');
 const [selectedGender, setSelectedGender] = useState('All');
 const [sortOrder, setSortOrder] = useState('recent-first');
 const [isRefreshing, setIsRefreshing] = useState(false);

 // Fetch real host stays from database API
 const fetchStays = async () => {
 try {
 setLoading(true);
 const data = await staysAPI.getStays();
 // Handle both direct array and enveloped { stays: [...] } or { data: [...] }
 const list = Array.isArray(data)
 ? data
 : (Array.isArray(data?.stays) ? data.stays : (Array.isArray(data?.data) ? data.data : []));

 setStays(list);
 } catch (err) {
 console.warn('API fetch error for stays data:', err);
 setStays([]);
 } finally {
 setLoading(false);
 setIsRefreshing(false);
 }
 };

 useEffect(() => {
 fetchStays();

 const handleFocus = () => fetchStays();
 window.addEventListener('focus', handleFocus);

 const handleSync = () => fetchStays();
 window.addEventListener('stayhub_slots_updated', handleSync);
 window.addEventListener('stayhub_admin_sync', handleSync);

 let bc = null;
 try {
 if (typeof BroadcastChannel !== 'undefined') {
 bc = new BroadcastChannel('stayhub_live_channel');
 bc.onmessage = () => fetchStays();
 }
 } catch {}

 const handleStorage = (e) => {
 if (e.key === 'stayhub_admin_sync_ts') {
 fetchStays();
 }
 };
 window.addEventListener('storage', handleStorage);

 return () => {
 window.removeEventListener('focus', handleFocus);
 window.removeEventListener('stayhub_slots_updated', handleSync);
 window.removeEventListener('stayhub_admin_sync', handleSync);
 window.removeEventListener('storage', handleStorage);
 if (bc) bc.close();
 };
 }, []);

 const handleRefresh = () => {
 setIsRefreshing(true);
 fetchStays();
 };

 const formatStayDate = (stay, index) => {
 if (stay.createdAt) {
 const d = new Date(stay.createdAt);
 if (!isNaN(d.getTime())) {
 return d.toLocaleDateString('en-US', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 });
 }
 }
 if (stay.joinedDate) {
 const d = new Date(stay.joinedDate);
 if (!isNaN(d.getTime())) {
 return d.toLocaleDateString('en-US', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 });
 }
 }
 return `Verified Listing #${stay._id || index + 1}`;
 };

 // Filtered & Sorted Stays
 const filteredStays = useMemo(() => {
 let list = [...stays];

 // 1. Search Query Filter
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase().trim();
 list = list.filter((s) => {
 const title = (s.title || s.propertyName || '').toLowerCase();
 const loc = (s.location || s.city || s.address || '').toLowerCase();
 const type = (s.type || s.propertyType || '').toLowerCase();
 const host = (s.hostName || s.name || s.hostEmail || '').toLowerCase();
 const tags = (s.tags || s.facilities || s.amenities || []).join(' ').toLowerCase();
 return title.includes(q) || loc.includes(q) || type.includes(q) || host.includes(q) || tags.includes(q);
 });
 }

 // 2. Category Filter
 if (selectedCategory !== 'All') {
 const catLower = selectedCategory.toLowerCase();
 list = list.filter((s) => {
 const type = (s.type || s.propertyType || '').toLowerCase();
 if (catLower === 'flat') {
 return type === 'flat' || type === 'apartment';
 }
 if (catLower === 'stays & villas') {
 return type === 'villa' || type === 'resort' || type.includes('villa');
 }
 if (catLower === 'independent room') {
 return type === 'independent room' || type === 'independent' || type.includes('independent');
 }
 return type === catLower;
 });
 }

 // 3. Gender Filter
 if (selectedGender !== 'All') {
 list = list.filter((s) => {
 const gender = (s.genderType || s.gender || '').toLowerCase();
 const title = (s.title || '').toLowerCase();
 return (
 gender === selectedGender.toLowerCase() ||
 gender === 'both' ||
 gender === 'unisex' ||
 title.includes(selectedGender.toLowerCase())
 );
 });
 }

 // 4. Sorting
 return list.sort((a, b) => {
 if (sortOrder === 'recent-first') {
 const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
 const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
 return timeB - timeA;
 }
 if (sortOrder === 'price-asc') {
 return parseNumericPrice(a.price) - parseNumericPrice(b.price);
 }
 if (sortOrder === 'price-desc') {
 return parseNumericPrice(b.price) - parseNumericPrice(a.price);
 }
 if (sortOrder === 'rating-desc') {
 const getRating = (s) => {
 if (Array.isArray(s.reviews) && s.reviews.length > 0) {
 return s.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / s.reviews.length;
 }
 return s.reviewsCount > 0 ? Number(s.rating || 0) : 0;
 };
 return getRating(b) - getRating(a);
 }
 if (sortOrder === 'title-asc') {
 const titleA = a.title || a.propertyName || '';
 const titleB = b.title || b.propertyName || '';
 return titleA.localeCompare(titleB);
 }
 return 0;
 });
 }, [stays, searchQuery, selectedCategory, selectedGender, sortOrder]);

 const categories = ['All', 'PG', 'Flat', 'Hotel', 'Independent Room'];

  return (
    <div className="min-h-screen w-full bg-white text-[#1f1b16] antialiased selection:bg-[#1f1b16] selection:text-white font-sans flex flex-col">
      {/* Top Sticky Full-Width Header */}
      <header className="sticky top-0 z-40 w-full bg-[#faf8f4]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative gap-3">
          {/* Left: Back Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/90 hover:border-[#1f1b16] text-[#1f1b16] text-[12.5px] font-medium transition-colors cursor-pointer active:scale-95"
              title="Back to Home"
            >
              <svg
                className="w-3.5 h-3.5 text-[#1f1b16]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Centered Stays Database Header Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/90 select-none">
            <span className="w-5 h-5 rounded-full bg-[#1f1b16] text-white flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
            </span>
            <span className="text-[13px] font-medium text-[#1f1b16] flex items-center gap-2 whitespace-nowrap">
              <span>Stays Database</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f7f4ee] text-stone-700 border border-stone-200/80 tabular-nums leading-none">
                {filteredStays.length} {filteredStays.length === 1 ? 'Stay' : 'Stays'}
              </span>
            </span>
          </div>

          {/* Right: Refresh Action */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh Stays Data"
              className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 text-[#1f1b16] transition-colors border border-stone-200/90 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Stays Data"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0f766e]' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Full-width, windowless) */}
      <main className="w-full flex-1 flex flex-col">
        {/* Clean Editorial Section Heading */}
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-end justify-between gap-3 bg-white">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-medium tracking-tight text-[#1f1b16] leading-tight">
              Stays &amp; Live Properties
            </h1>
            <p className="text-[13px] text-stone-500 mt-0.5">
              Browse all registered accommodation units, student PGs, flats, and hotels with live rates and host records.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="px-2.5 py-1 rounded-full bg-[#faf8f4] border border-stone-200/80 text-stone-600 tabular-nums">
              Total: <span className="font-medium text-[#1f1b16]">{stays.length}</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#faf8f4] border border-stone-200/80 text-stone-600 tabular-nums">
              Matching: <span className="font-medium text-[#0f766e]">{filteredStays.length}</span>
            </span>
          </div>
        </div>

        {/* Full-Width Filter & Search Bar */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-stone-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3" data-purpose="toolbar">
          <div className="relative w-full lg:w-80 group">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-[#1f1b16] transition-colors pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <label htmlFor="data-stays-search" className="sr-only">
              Search stays
            </label>
            <input
              id="data-stays-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stay, location, host…"
              className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-[#f7f4ee]/65 border border-stone-200 text-[13px] text-[#1f1b16] placeholder:text-stone-400 focus:outline-none focus:border-[#1f1b16] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-200/60 cursor-pointer transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f7f4ee] border border-stone-200/70 overflow-x-auto w-fit max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-[#1f1b16] font-normal border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <label htmlFor="data-sort-select" className="text-[12px] text-stone-500 font-medium whitespace-nowrap">
              Sort:
            </label>
            <select
              id="data-sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#f7f4ee]/65 border border-stone-200 text-[12.5px] font-medium text-[#1f1b16] focus:outline-none focus:border-[#1f1b16] cursor-pointer"
            >
              <option value="recent-first">Recently Added First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Top Rated</option>
              <option value="title-asc">Title: A–Z</option>
            </select>
          </div>
        </section>

        {loading && <DotGridWaveLoader />}

        {!loading && filteredStays.length === 0 && (
          <div className="w-full py-20 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#f7f4ee] border border-stone-200/90 flex items-center justify-center mx-auto mb-3 text-stone-500">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-[#1f1b16]">No properties found</h2>
            <p className="text-[13px] text-stone-500 mt-1 max-w-sm mx-auto">
              No stays match your current filter query. Try clearing the search term or resetting category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedGender('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#1f1b16] text-white text-[12.5px] font-medium hover:bg-[#0f766e] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {!loading && filteredStays.length > 0 && (
          <div className="w-full bg-white">
            <div
              tabIndex={0}
              role="region"
              aria-label="Stays database table"
              className="overflow-x-auto w-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f1b16]"
            >
              <table className="w-full text-left border-collapse min-w-[780px]">
                <caption className="sr-only">All added stays and live properties</caption>
                <thead>
                  <tr className="border-b border-stone-200/80 bg-[#faf8f4] text-[11px] uppercase tracking-[0.07em] font-medium text-stone-500">
                    <th scope="col" className="py-3 pl-4 sm:pl-6 lg:pl-8 pr-4 font-medium">Property</th>
                    <th scope="col" className="py-3 px-4 font-medium">Type / Gender</th>
                    <th scope="col" className="py-3 px-4 font-medium">Location</th>
                    <th scope="col" className="py-3 px-4 font-medium">Room rate</th>
                    <th scope="col" className="py-3 px-4 font-medium">Rating</th>
                    <th scope="col" className="py-3 px-4 font-medium">Date added</th>
                    <th scope="col" className="py-3 pr-4 sm:pr-6 lg:pr-8 pl-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStays.map((stay, idx) => {
                    const stayId = stay._id;
                    const dateLabel = formatStayDate(stay, idx);
                    const cleanPrice = parseNumericPrice(stay.price);
                    const roomsCount =
                      Array.isArray(stay.rooms) && stay.rooms.length > 0
                        ? stay.rooms.length
                        : (stay.totalRooms || stay.availableRooms || 0);
                    const hasReviews = Array.isArray(stay.reviews) && stay.reviews.length > 0;
                    const stayRating = hasReviews
                      ? (stay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / stay.reviews.length).toFixed(1)
                      : (stay.reviewsCount > 0 && stay.rating ? Number(stay.rating).toFixed(1) : null);

                    return (
                      <tr
                        key={stayId || idx}
                        className="hover:bg-[#faf8f4]/80 transition-colors"
                      >
                        <td className="py-3.5 pl-4 sm:pl-6 lg:pl-8 pr-4 align-middle">
                          <div className="flex items-center gap-3">
                            <img
                              decoding="async"
                              loading="lazy"
                              src={stay.image || (stay.images && stay.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'}
                              alt={stay.title || 'Property'}
                              className="w-10 h-10 rounded-lg object-cover bg-stone-100 border border-stone-200/80 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-[13.5px] text-[#1f1b16] line-clamp-1">
                                {stay.title || stay.propertyName || 'Property Stay'}
                              </div>
                              <div className="text-[12px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>{stay.hostName || stay.host?.name ? `Host: ${stay.hostName || stay.host?.name}` : 'Stay In Verified'}</span>
                                {roomsCount > 0 && (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#f7f4ee] text-stone-700 font-medium border border-stone-200/80 tabular-nums leading-none">
                                    {roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-md bg-[#f7f4ee] border border-stone-200/80 text-[#1f1b16] font-medium text-[11px]">
                              {stay.type || stay.propertyType || 'PG'}
                            </span>
                            {(stay.genderType || stay.gender) && (
                              <span className="text-[11.5px] text-stone-500">
                                {stay.genderType || stay.gender}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[13px] text-stone-600 align-middle">
                          {stay.location || (stay.city && stay.state ? `${stay.city}, ${stay.state}` : (stay.city || stay.address || '—'))}
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex flex-col items-start">
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-medium text-[13.5px] text-[#1f1b16] tabular-nums">
                                ₹{cleanPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-stone-500">
                                {stay.rateUnit || stay.roomRates?.[0]?.rateUnit || '/month'}
                              </span>
                            </div>
                            {stay.roomRates?.[0]?.type && (
                              <span className="text-[11px] text-[#0f766e] font-medium mt-0.5">
                                {stay.roomRates[0].type}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          {stayRating ? (
                            <span className="font-medium text-[12.5px] text-[#1f1b16] inline-flex items-center gap-1 tabular-nums">
                              <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500" viewBox="0 0 24 24" aria-hidden="true">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              <span>{stayRating}</span>
                              <span className="text-[11px] text-stone-500 font-normal">
                                ({stay.reviews?.length || stay.reviewsCount || 0})
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-medium text-[10.5px] border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                              NEW
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[12px] font-mono text-stone-500 whitespace-nowrap tabular-nums align-middle">
                          {dateLabel}
                        </td>

                        <td className="py-3.5 pr-4 sm:pr-6 lg:pr-8 pl-4 text-right align-middle">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => onStayClick && onStayClick(stay)}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#1f1b16] text-[#1f1b16] hover:text-white border border-stone-200 hover:border-[#1f1b16] text-[12px] font-medium transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DataPage;