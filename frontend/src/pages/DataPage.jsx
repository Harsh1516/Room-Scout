import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { staysAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Left } from '../components/navbar/Left';

export function DataPage({ onStayClick, onBookClick }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [sortOrder, setSortOrder] = useState('recent-first'); // 'recent-first' | 'price-asc' | 'price-desc' | 'rating-desc' | 'title-asc'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real host stays from database API
  const fetchStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getStays();
      if (Array.isArray(data)) {
        setStays(data);
      } else {
        setStays([]);
      }
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
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStays();
  };

  // Helper to format date or show "Recently Added"
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
    // For sample stays, infer freshness based on index or ID
    return `Verified Listing #${stay.id || index + 1}`;
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
        const tags = (s.tags || s.amenities || []).join(' ').toLowerCase();
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
        return type === catLower;
      });
    }

    // 3. Gender Filter
    if (selectedGender !== 'All') {
      list = list.filter((s) => {
        const gender = (s.genderType || '').toLowerCase();
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
        // Priority 1: Check ISO createdAt or timestamp
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (typeof a.id === 'number' ? a.id * 1000 : 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (typeof b.id === 'number' ? b.id * 1000 : 0);
        return timeB - timeA;
      }
      if (sortOrder === 'price-asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortOrder === 'price-desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortOrder === 'rating-desc') {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortOrder === 'title-asc') {
        const titleA = a.title || a.propertyName || '';
        const titleB = b.title || b.propertyName || '';
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [stays, searchQuery, selectedCategory, selectedGender, sortOrder]);

  const categories = ['All', 'PG', 'Hostel', 'Flat', 'Hotel', 'Stays & Villas'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/85 dark:bg-slate-900/85 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          {/* Left: Back Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="apple-liquid-nav flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-white/15 hover:border-blue-500/40 hover:bg-white/40 dark:hover:bg-white/10 text-slate-950 dark:text-white text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Back to Home"
            >
              <svg
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Centered Stays Database Header Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs select-none">
            <div className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
            </div>
            <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Stays Database</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {filteredStays.length} Stays
              </span>
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Stays Data"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer active:scale-95"
              title="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stay, location, host..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="recent-first">⚡ Recently Added First</option>
              <option value="price-asc">💵 Price: Low to High</option>
              <option value="price-desc">💎 Price: High to Low</option>
              <option value="rating-desc">⭐ Top Rated</option>
              <option value="title-asc">🔤 Title: A-Z</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner / Info Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-teal-600/10 border border-blue-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>All Added Stays & Live Properties</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                Sorted: Recently Added First
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Browse through all registered accommodation units, student PGs, hostels, luxury villas, and hotels with live rates and host records.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Total: {stays.length}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Matching: {filteredStays.length}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading stays database...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredStays.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No properties found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No stays match your current filter query. Try clearing the search term or resetting category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedGender('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* 3-LINE LIST TABLE VIEW */}
        {!loading && filteredStays.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4"># Property</th>
                    <th className="py-3.5 px-4">Type / Gender</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Monthly Rate</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4">Date Added</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredStays.map((stay, idx) => {
                    const stayId = stay._id || stay.id;
                    const dateLabel = formatStayDate(stay, idx);

                    return (
                      <tr
                        key={stayId || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Property Image & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={stay.image || (stay.images && stay.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'}
                              alt={stay.title}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 flex-shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                                {stay.title || stay.propertyName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {stay.hostName ? `Host: ${stay.hostName}` : 'RoomScout Verified'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type & Gender */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                              {stay.type || stay.propertyType || 'PG'}
                            </span>
                            {stay.genderType && (
                              <span className="text-[10px] text-slate-400">
                                {stay.genderType}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {stay.location || stay.city || 'Uttarakhand'}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{Number(stay.price || 3500).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">/mo</span>
                        </td>

                        {/* Rating */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-amber-500">★ {stay.rating || 4.8}</span>
                        </td>

                        {/* Date Added */}
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {dateLabel}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => onStayClick && onStayClick(stay)}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
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
