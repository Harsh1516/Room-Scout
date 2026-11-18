import React, { memo } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { getStayPricing } from '../../utils/priceUtils';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

/**
 * PropertyCard Component
 * Standard unified property container based on the Recently Added design,
 * featuring a warm cushion hover effect, media box with Property Type & Rating badges,
 * wishlist toggle, location, title, amenities chips, pricing, and action buttons.
 */
export const PropertyCard = memo(function PropertyCard({
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

 const stayId = stay._id;
 const saved = isInWishlist(stayId);
 const pricing = getStayPricing(stay);

 // Resolve Gender policy / preference
  const rawGender = stay.genderType || stay.gender || stay.targetGender || '';
  const normalizedGender = String(rawGender).toLowerCase().trim();

  let genderLabel = 'Both (Boys & Girls)';
  let genderCategory = 'both';

  if (['boys', 'male', 'boy', 'men'].includes(normalizedGender)) {
    genderLabel = 'Boys Only';
    genderCategory = 'boys';
  } else if (['girls', 'female', 'girl', 'women'].includes(normalizedGender)) {
    genderLabel = 'Girls Only';
    genderCategory = 'girls';
  } else if (['family', 'families'].includes(normalizedGender)) {
    genderLabel = 'Family';
    genderCategory = 'family';
  } else if (['both', 'unisex', 'co-ed', 'coed', 'all'].includes(normalizedGender)) {
    genderLabel = 'Both (Boys & Girls)';
    genderCategory = 'both';
  } else if (rawGender) {
    genderLabel = rawGender;
    genderCategory = 'custom';
  } else if (stay.title && /bachelor|boys/i.test(stay.title)) {
    genderLabel = 'Boys Only';
    genderCategory = 'boys';
  } else if (stay.title && /girls|female/i.test(stay.title)) {
    genderLabel = 'Girls Only';
    genderCategory = 'girls';
  }

 const propertyType = stay.type || stay.propertyType || stay.category || 'PG';

 const hasUserReviews = Array.isArray(stay.reviews) && stay.reviews.length > 0;
 const computedRating = hasUserReviews
 ? (stay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / stay.reviews.length).toFixed(1)
 : null;
 const isNewStay = !computedRating;
 const ratingText = isNewStay ? 'NEW' : ` ${computedRating}`;

 const displayImage =
 stay.image ||
 (Array.isArray(stay.images) && stay.images[0]) ||
 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      onMouseEnter={() => onHover && onHover(stayId)}
      onMouseLeave={() => onLeave && onLeave()}
      onClick={() => onStayClick && onStayClick(stay)}
      className={`group relative cursor-pointer select-none bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 ${className}`}
    >
      {/* Foreground Content Stack */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* 1. TOP SECTION: Media Box */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#efe9df]">
          {/* Background Image */}
          <img
            src={getOptimizedImageUrl(displayImage, 640)}
            srcSet={`${getOptimizedImageUrl(displayImage, 420)} 420w, ${getOptimizedImageUrl(displayImage, 768)} 768w`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            alt={stay.title || stay.propertyName || 'Property'}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Premium Luxury Wishlist Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(stay);
            }}
            className="absolute top-3.5 right-3.5 p-1 flex items-center justify-center hover:scale-115 active:scale-90 transition-transform duration-150 z-20 cursor-pointer"
            title={saved ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <svg
              className="w-8 h-8 sm:w-[32px] sm:h-[32px] transition-all duration-200"
              viewBox="0 0 32 32"
              fill={saved ? "#FF385C" : "rgba(255, 56, 92, 0.08)"}
              stroke="#FF385C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
            </svg>
          </button>

          {/* Bottom Overlay: Stay name on left, Rating tag on bottom right corner */}
          <div className="absolute inset-x-0 bottom-0 pt-10 pb-3.5 px-3.5 sm:px-4 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex items-end justify-between gap-2 z-10 pointer-events-none">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-white line-clamp-1 leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {stay.title || stay.propertyName}
            </h3>

            {/* Rating / New tag shifted to bottom right corner of pic */}
            <div className="shrink-0 mb-0.5 pointer-events-auto">
              {isNewStay ? (
                <span className="inline-flex items-center text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 px-2.5 py-1 rounded-md shadow-xs border border-amber-300/80">
                  New
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 px-2.5 py-1 rounded-md shadow-xs border border-amber-300/80">
                  <svg className="w-3.5 h-3.5 text-slate-950 fill-slate-950" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{computedRating}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Area Below Photo */}
        <div className="p-4 sm:p-4.5 space-y-2">
          {/* Category & Gender Badges (Shifted above location, transparent background) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-[13px] font-bold text-slate-900">
              {propertyType}
            </span>
            <span className="text-slate-300 text-xs select-none">•</span>
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-slate-700">
              {genderCategory === 'boys' ? (
                <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="14" r="5" />
                  <line x1="19" y1="5" x2="13.6" y2="10.4" />
                  <polyline points="15 5 19 5 19 9" />
                </svg>
              ) : genderCategory === 'girls' ? (
                <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="9" r="5" />
                  <line x1="12" y1="14" x2="12" y2="21" />
                  <line x1="9" y1="18" x2="15" y2="18" />
                </svg>
              ) : genderCategory === 'family' ? (
                <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              )}
              <span>{genderLabel}</span>
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 font-medium">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{stay.location || stay.city || stay.address || 'Uttarakhand'}</span>
          </div>

          {/* Pricing & Fully Rounded Details Button */}
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mb-0.5">Starting price</div>
              <div className="text-[25px] sm:text-[28px] font-black text-[#1f1b16] tracking-tight leading-none">
                ₹{pricing.primaryPrice}
                <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-1.5 align-baseline">{pricing.primaryUnit}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onStayClick) onStayClick(stay);
              }}
              className="min-h-[44px] min-w-[98px] sm:min-w-[106px] px-6.5 sm:px-7 py-2.5 rounded-full bg-[#1f1b16] text-white font-bold text-[16px] sm:text-[17px] hover:bg-[#0f766e] transition-all cursor-pointer inline-flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PropertyCard;
