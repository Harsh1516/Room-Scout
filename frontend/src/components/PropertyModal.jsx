import { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';

export function PropertyModal({ stay, isOpen, onClose, onBookClick }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [selectedSharing, setSelectedSharing] = useState('double'); // single, double, triple
  const [reviews, setReviews] = useState([
    { id: 1, author: 'Rohan Sharma', rating: 5, date: '2 weeks ago', text: 'Great place with fast wifi and very hygienic homemade meals! Host is super friendly.' },
    { id: 2, author: 'Ananya Verma', rating: 4, date: '1 month ago', text: 'Comfortable rooms with good ventilation. Laundry service is prompt.' }
  ]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [activeTab, setActiveTab] = useState('overview'); // overview, amenities, reviews

  if (!isOpen || !stay) return null;

  const stayId = stay._id || stay.id;
  const isSaved = isInWishlist(stayId);

  // Dynamic price calculation based on sharing type
  const basePrice = stay.price || 3000;
  const currentPrice =
    selectedSharing === 'single'
      ? Math.round(basePrice * 1.35)
      : selectedSharing === 'double'
      ? basePrice
      : Math.round(basePrice * 0.8);

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    setReviews([
      {
        id: Date.now(),
        author: 'Guest User',
        rating: newRating,
        date: 'Just now',
        text: newReviewText.trim(),
      },
      ...reviews,
    ]);
    setNewReviewText('');
    setNewRating(5);
  };

  const amenitiesList = [
    { label: 'High-Speed Wi-Fi', icon: '📶' },
    { label: 'Food / Mess Included', icon: '🍱' },
    { label: 'Air Conditioning', icon: '❄️' },
    { label: '24/7 Power Backup', icon: '⚡' },
    { label: 'CCTV & Security', icon: '🛡️' },
    { label: 'Laundry & Housekeeping', icon: '🧺' },
    { label: 'Geyser / Hot Water', icon: '🚿' },
    { label: 'Study Table & Chair', icon: '🪑' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-10 my-auto flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {stay.type}
            </span>
            {stay.badge && !/verified/i.test(stay.badge) && (
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {stay.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWishlist(stay)}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isSaved
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-rose-500'
              }`}
            >
              <span>{isSaved ? '♥' : '♡'}</span>
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Title & Location */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {stay.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                📍 {stay.location}, Uttarakhand • <span className="text-amber-500 font-bold">★ {stay.rating || 4.8}</span> (18 reviews)
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs text-slate-400 block font-medium">Starting from</span>
              <span className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500"> / month</span>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl overflow-hidden h-64 sm:h-72">
            <div className="sm:col-span-2 h-full bg-slate-100 dark:bg-slate-800">
              <img
                src={stay.image || (stay.images && stay.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'}
                alt={stay.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:flex flex-col gap-3 h-full">
              <img
                src={(stay.images && stay.images[1]) || stay.image || 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80'}
                alt="Room detail"
                className="w-full h-1/2 object-cover rounded-lg filter brightness-95"
              />
              <div className="relative w-full h-1/2 rounded-lg overflow-hidden bg-slate-800">
                <img
                  src={(stay.images && stay.images[2]) || stay.image || 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=800&q=80'}
                  alt="Amenity detail"
                  className="w-full h-full object-cover filter brightness-50"
                />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs bg-slate-900/40">
                  {stay.images && stay.images.length > 2 ? `+ ${stay.images.length - 2} more photos` : 'Verified Photos'}
                </div>
              </div>
            </div>
          </div>

          {/* Instagram Reel & Video Tour Direct Link (Directly Below Picture Gallery) */}
          <a
            href={stay.instagramVideoUrl || 'https://www.instagram.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 border border-pink-500/25 hover:border-pink-500/50 hover:bg-gradient-to-r hover:from-pink-500/15 hover:via-rose-500/15 hover:to-amber-500/15 transition-all duration-200 group shadow-xs cursor-pointer select-none"
            title="Explore property on Instagram"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Explore Property Tour on Instagram
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-bold border border-pink-500/20">
                    Video Reel 📸
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Watch authentic room walk-throughs, living spaces & student amenities on Instagram.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
              <span>View on Instagram</span>
              <span>↗</span>
            </div>
          </a>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            {['overview', 'amenities', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 text-sm font-bold capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Room Occupancy Options */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Occupancy / Sharing Type
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'single', label: 'Single Occupancy', factor: 1.35, desc: 'Private room for 1 guest' },
                    { id: 'double', label: 'Double Sharing', factor: 1.0, desc: 'Twin sharing room' },
                    { id: 'triple', label: 'Triple Sharing', factor: 0.8, desc: 'Shared with 2 roommates' },
                  ].map((opt) => {
                    const price = Math.round(basePrice * opt.factor);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedSharing(opt.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedSharing === opt.id
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-slate-900 dark:text-white ring-2 ring-cyan-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                        <div className="font-black text-cyan-600 dark:text-cyan-400 text-base mt-2">
                          ₹{price.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room Capacity Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Total Rooms</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {stay.totalRooms || stay.availableRooms || 4} Rooms
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Available Now</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {stay.availableRooms ?? 4} Vacant
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Gender Policy</span>
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                    {stay.genderType || 'Both / Unisex'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                  About this Property
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {stay.description || `Located in the serene surroundings of ${stay.location}, this premier ${stay.type} offers modern student and working professional accommodation. Features fully furnished rooms with study desks, attached bathrooms, high-speed Wi-Fi, and 3-time wholesome meals. High security and close proximity to markets and transportation.`}
                </p>
              </div>

              {/* Quick Tags */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Highlights
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(stay.tags || ['Wifi', 'Food Included', 'Security']).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Amenities */}
          {activeTab === 'amenities' && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                Available Amenities & Facilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {amenitiesList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Existing Reviews List */}
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rev.author}
                      </span>
                      <span className="text-xs text-amber-500 font-bold">
                        {'★'.repeat(rev.rating)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mb-2">{rev.date}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{rev.text}</p>
                  </div>
                ))}
              </div>

              {/* Write a Review */}
              <form onSubmit={handleAddReview} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Write a Guest Review</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className={`text-lg transition-transform ${star <= newRating ? 'text-amber-400 scale-110' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  rows="2"
                  placeholder="Share your experience staying at this property..."
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer / CTA Bar */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Selected Rate
            </span>
            <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500"> / month</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                if (onBookClick) onBookClick({ ...stay, calculatedPrice: currentPrice, sharingType: selectedSharing });
              }}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              Book Now ⚡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
