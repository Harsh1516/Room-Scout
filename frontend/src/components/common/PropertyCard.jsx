import React from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { getStayPricing } from '../../utils/priceUtils';

/**
 * PropertyCard Component
 * Standard unified property container based on the Recently Added design,
 * featuring a warm cushion hover effect, media box with Property Type & Rating badges,
 * wishlist toggle, location, title, amenities chips, pricing, and action buttons.
 */
export function PropertyCard({
  stay,
  onStayClick,
  onBookClick,
  isHovered = false,
  onHover,
  onLeave,
  className = '',
}) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  if (!stay) return null;

  const stayId = stay._id || stay.id;
  const saved = isInWishlist(stayId);
  const pricing = getStayPricing(stay);
  const tags = Array.isArray(stay.tags) && stay.tags.length > 0
    ? stay.tags
    : (stay.amenities || ['Wifi', 'Attached Bath']);

  const propertyType = stay.type || stay.propertyType || stay.category || 'PG';

  const hasUserReviews = Array.isArray(stay.reviews) && stay.reviews.length > 0;
  const computedRating = hasUserReviews
    ? (stay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / stay.reviews.length).toFixed(1)
    : (stay.rating && Number(stay.rating) !== 4.8 ? Number(stay.rating).toFixed(1) : null);
  const ratingText = computedRating ? `★ ${computedRating}` : 'NEW';

  const displayImage = stay.image || (Array.isArray(stay.images) && stay.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      onMouseEnter={() => onHover && onHover(stayId)}
      onMouseLeave={() => onLeave && onLeave()}
      onClick={() => onStayClick && onStayClick(stay)}
      className={`group relative cursor-pointer select-none p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* Warm Light Orange Cushion on Hover */}
      <div
        className={`absolute rounded-xl sm:rounded-2xl bg-[#f8ebd8] dark:bg-[#2d2218] shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHovered
            ? '-inset-1.5 opacity-100 scale-100'
            : 'inset-0 opacity-0 scale-95 group-hover:-inset-1 group-hover:opacity-100 group-hover:scale-100'
        }`}
      />

      {/* Foreground Content Stack */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* 1. TOP SECTION: Media Box */}
        <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 shadow-xs group-hover:shadow-md flex flex-col justify-between p-1.5 sm:p-2.5 border border-slate-200/60 dark:border-white/10 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]">
          {/* Background Image */}
          <img
            src={displayImage}
            alt={stay.title || stay.propertyName || 'Property'}
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:brightness-[1.03] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />

          {/* Top Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges: Property Type + Rating + Wishlist */}
          <div className="relative z-10 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 truncate">
              {/* Property Type Badge (Added everywhere as requested) */}
              <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-white bg-black/60 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-md shrink-0">
                {propertyType}
              </span>

              {/* Rating / New Badge */}
              <span
                className={`text-[7.5px] sm:text-[9px] font-mono font-extrabold border px-1.5 sm:px-2 py-0.5 rounded-full backdrop-blur-md truncate ${
                  computedRating
                    ? 'text-white bg-black/60 border-white/20'
                    : 'text-emerald-300 bg-black/70 border-emerald-500/40'
                }`}
              >
                {ratingText}
              </span>
            </div>

            {/* Heart Wishlist Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(stay);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shrink-0 active:scale-90 ${
                saved
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105'
                  : 'bg-black/50 hover:bg-black/75 text-white border border-white/25 hover:scale-105'
              }`}
              title={saved ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <svg
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${
                  saved ? 'fill-white stroke-white' : 'fill-none stroke-white stroke-[2.2]'
                }`}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. BOTTOM SECTION: Structured Info Below Photo */}
        <div className="pt-1.5 sm:pt-2.5 pb-0.5 px-0.5 flex flex-col space-y-0.5 sm:space-y-1">
          {/* Location Subtitle */}
          <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
            <svg
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 dark:text-slate-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{stay.location || stay.city || stay.address || 'Uttarakhand'}</span>
          </div>

          {/* Title */}
          <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-950 dark:text-white line-clamp-1 group-hover:text-amber-950 dark:group-hover:text-amber-100 transition-colors leading-snug">
            {stay.title || stay.propertyName}
          </h3>

          {/* Amenity Tags */}
          <div className="hidden md:flex flex-wrap gap-1 py-0.5">
            {tags.slice(0, 3).map((tag, tIdx) => (
              <span
                key={tIdx}
                className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-white/10 border border-slate-300/60 dark:border-white/15 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Footer Price & Action Buttons */}
          <div className="flex items-center justify-between pt-1 sm:pt-2 border-t border-slate-200/80 dark:border-white/10 gap-1 sm:gap-2">
            <div className="min-w-0">
              <span className="hidden sm:block text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Starting Price
              </span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-slate-950 dark:text-white font-black text-[10px] sm:text-sm md:text-base leading-none">
                  ₹{pricing.primaryPrice}
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {pricing.primaryUnit}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStayClick) onStayClick(stay);
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[10px] sm:text-xs font-bold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-white/15 shadow-2xs active:scale-95"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyCard;
