import React, { memo } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { getStayPricing } from '../../utils/priceUtils';

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

 // Check tags, facilities, or amenities dynamically
 const tags = Array.isArray(stay.tags) && stay.tags.length > 0
 ? stay.tags
 : (Array.isArray(stay.facilities) && stay.facilities.length > 0
 ? stay.facilities
 : (stay.amenities || ['Wifi', 'Attached Bath']));

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

 // Responsive downscaled WebP/AVIF images for mobile screens
 const getOptimizedImageUrl = (url, width = 640) => {
 if (!url || typeof url !== 'string') return url;
 if (url.includes('images.unsplash.com')) {
 if (url.includes('w=')) {
 return url.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, 'q=75');
 }
 return `${url}&auto=format&fit=crop&w=${width}&q=75`;
 }
 return url;
 };

 return (
 <div
 onMouseEnter={() => onHover && onHover(stayId)}
 onMouseLeave={() => onLeave && onLeave()}
 onClick={() => onStayClick && onStayClick(stay)}
 className={`group relative cursor-pointer select-none bg-white border border-[#1f1b16]/10 rounded-xl overflow-hidden transition-colors duration-150 hover:border-[#1f1b16]/25 ${className}`}
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

 {/* Top-left badges */}
 <div className="absolute top-3 left-3 flex items-center gap-2">
 <span className="text-xs font-medium text-[#1f1b16] bg-white/90 px-2 py-1 rounded-md">
 {propertyType}
 </span>
 {isNewStay ? (
 <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0f766e] bg-white/90 px-2 py-1 rounded-md">
 <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
 New
 </span>
 ) : (
 <span className="text-xs font-medium text-[#1f1b16] bg-white/90 px-2 py-1 rounded-md">
 {ratingText}
 </span>
 )}
 </div>

 {/* Wishlist */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 toggleWishlist(stay);
 }}
 className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
 saved ? 'bg-[#0f766e] text-white' : 'bg-white/90 text-[#1f1b16] hover:bg-white'
 }`}
 title={saved ? 'Remove from Wishlist' : 'Save to Wishlist'}
 >
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
 </svg>
 </button>
 </div>

 {/* Info */}
 <div className="p-4 space-y-2">
 <div className="flex items-center gap-1.5 text-xs text-[#7b7266]">
 <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
 <circle cx="12" cy="10" r="3" />
 </svg>
 <span className="truncate">{stay.location || stay.city || stay.address || 'Uttarakhand'}</span>
 </div>

 <h3 className="text-sm font-medium text-[#1f1b16] line-clamp-1 leading-snug">
 {stay.title || stay.propertyName}
 </h3>

 <div className="flex items-center gap-1.5 flex-wrap">
 {tags.slice(0, 3).map((tag, tIdx) => (
 <span key={tIdx} className="text-xs text-[#5e554a] bg-[#efe9df] px-2 py-0.5 rounded">
 {tag}
 </span>
 ))}
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-[#1f1b16]/10">
 <div>
 <div className="text-xs text-[#7b7266]">Starting price</div>
 <div className="text-base font-medium text-[#1f1b16]">
 ₹{pricing.primaryPrice}
 <span className="text-xs text-[#7b7266] ml-1">{pricing.primaryUnit}</span>
 </div>
 </div>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 if (onStayClick) onStayClick(stay);
 }}
 className="text-sm font-medium px-3 py-1.5 rounded-lg bg-[#1f1b16] text-white hover:bg-[#0f766e] transition-colors cursor-pointer"
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