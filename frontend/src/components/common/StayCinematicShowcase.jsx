import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../../context/WishlistContext';
import { getStayPricing, getOtherStayPrices } from '../../utils/priceUtils';

/**
 * RollingStayTitle Component:
 * Continuous zero-gap vertical reel slide transition using Framer Motion AnimatePresence.
 * Eliminates DOM-swapping flickers and 1-frame flashes completely.
 * - direction >= 0 (forward / next): slides UP
 * - direction < 0 (backward / prev): slides DOWN
 */
function RollingStayTitle({
  title,
  stayId,
  direction = 1,
  className = 'text-3xl sm:text-3.5xl md:text-4xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-stone-900 dark:text-slate-950 leading-[0.96] drop-shadow-sm break-words line-clamp-2',
}) {
  return (
    <div className="overflow-hidden relative w-full">
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.h1
          key={stayId || title}
          custom={direction}
          variants={{
            enter: (dir) => ({
              y: dir >= 0 ? '100%' : '-100%',
              opacity: 0,
            }),
            center: {
              y: '0%',
              opacity: 1,
            },
            exit: (dir) => ({
              y: dir >= 0 ? '-100%' : '100%',
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: 'spring', stiffness: 380, damping: 32 },
            opacity: { duration: 0.22 },
          }}
          className={`${className} m-0 p-0`}
        >
          {title}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}

/**
 * StayCinematicShowcase Component
 * Full-Page Split Cinematic Showcase:
 * - Left Half: Stay Name, Borderless Facilities List (top to bottom), Starting Price, CTA Buttons
 * - Right Half: At most 3 stays visible in the row:
 *   - Cards slide like a physical train from right to left (with leftmost card disappearing to the left)
 *   - 3rd card displays 50% left body only (peek effect)
 *   - Strict 50% center line boundary
 * - Top Bar: Showcase / Grid view toggle at Top-Left, slide counter at Top-Right
 * - Bottom Bar: Smaller < and > navigation buttons centered with NO horizontal dot carousel
 */
export function StayCinematicShowcase({
  stays = [],
  viewMode = 'showcase',
  onViewModeChange,
  onStayClick,
  onBookClick,
  onOpenMap,
  onHover,
  onLeave,
  className = '',
  hideTopBar = false,
  activeIndex: controlledIndex,
  onActiveIndexChange,
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Reset activeIndex ONLY when the stays list itself changes
  const prevStaysRef = useRef(stays);
  useEffect(() => {
    if (prevStaysRef.current !== stays) {
      prevStaysRef.current = stays;
      if (controlledIndex === undefined) {
        setInternalIndex(0);
      }
      if (onActiveIndexChange) {
        onActiveIndexChange(0);
      }
      setSelectedPhotoIndex(0);
    }
  }, [stays, controlledIndex, onActiveIndexChange]);

  // Reset photo index when active stay changes
  useEffect(() => {
    setSelectedPhotoIndex((prev) => (prev !== 0 ? 0 : prev));
  }, [activeIndex]);

  const canGoNext = activeIndex < stays.length - 1;
  const canGoPrev = activeIndex > 0;

  const goToIndex = useCallback(
    (newIdx, dir) => {
      if (dir !== undefined) {
        setSlideDirection(dir);
      }
      if (controlledIndex === undefined) {
        setInternalIndex(newIdx);
      }
      if (onActiveIndexChange) {
        onActiveIndexChange(newIdx);
      }
    },
    [controlledIndex, onActiveIndexChange]
  );

  const handleNext = useCallback(() => {
    if (canGoNext) {
      goToIndex(activeIndex + 1, 1);
    }
  }, [canGoNext, activeIndex, goToIndex]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      goToIndex(activeIndex - 1, -1);
    }
  }, [canGoPrev, activeIndex, goToIndex]);

  // Keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stays.length <= 1) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stays.length, handleNext, handlePrev]);

  if (!stays || stays.length === 0) return null;

  const currentStay = stays[activeIndex] || stays[0];
  const isSaved = isInWishlist(currentStay?._id);
  const pricing = getStayPricing(currentStay);
  const otherPrices = useMemo(
    () => getOtherStayPrices(currentStay, pricing.primaryPrice),
    [currentStay, pricing.primaryPrice]
  );

  // Compute facilities / tags (top 3)
  const allFacilities = useMemo(() => {
    if (!currentStay) return ['Wifi', 'Attached Bath', 'Power Backup'];
    if (Array.isArray(currentStay.facilities) && currentStay.facilities.length > 0) {
      return currentStay.facilities;
    }
    if (Array.isArray(currentStay.amenities) && currentStay.amenities.length > 0) {
      return currentStay.amenities;
    }
    if (Array.isArray(currentStay.tags) && currentStay.tags.length > 0) {
      return currentStay.tags;
    }
    return ['Wifi', 'Attached Bath', 'Power Backup'];
  }, [currentStay]);

  const top3Facilities = allFacilities.slice(0, 3);

  // Ratings calculation
  const hasUserReviews = Array.isArray(currentStay?.reviews) && currentStay.reviews.length > 0;
  const computedRating = hasUserReviews
    ? (currentStay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / currentStay.reviews.length).toFixed(1)
    : null;
  const isNewStay = !computedRating;
  const ratingText = isNewStay ? 'NEW' : `★ ${computedRating}`;

  // Image handling for active stay
  const stayImages = useMemo(() => {
    if (!currentStay) return ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'];
    if (Array.isArray(currentStay.images) && currentStay.images.length > 0) {
      return currentStay.images;
    }
    if (currentStay.image) return [currentStay.image];
    return ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'];
  }, [currentStay]);

  const mainDisplayImage = stayImages[selectedPhotoIndex] || stayImages[0];
  const currentBgImage = mainDisplayImage || getStayImage(currentStay);

  // Helper to extract primary image for upcoming stays
  const getStayImage = (stay) => {
    if (!stay) return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
    if (Array.isArray(stay.images) && stay.images.length > 0) return stay.images[0];
    if (stay.image) return stay.image;
    return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
  };

  // Exact 50% peek formula: W_card = (100% - 2*gap) / 2.5
  const hasThirdCard = stays.length >= 3;
  const cardWidthClass = hasThirdCard
    ? 'w-[calc(40%-16px)] xl:w-[calc(40%-19.2px)]'
    : (stays.length === 2 ? 'w-[calc(50%-10px)] max-w-[420px]' : 'w-[340px] sm:w-[400px]');

  // Facility icon helper
  const getFacilityIcon = (facility) => {
    const text = String(facility).toLowerCase();
    if (text.includes('wifi')) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      );
    }
    if (text.includes('ac') || text.includes('air') || text.includes('cool')) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
      );
    }
    if (text.includes('bath') || text.includes('water')) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-2 0C3.5 4.5 3 6 3 8c0 4 3 7 7 7h10a4 4 0 0 0 4-4V8" />
        </svg>
      );
    }
    if (text.includes('food') || text.includes('kitchen') || text.includes('meal')) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2v20M2 12h16M4 2v6a4 4 0 0 0 4 4v10" />
        </svg>
      );
    }
    if (text.includes('power') || text.includes('backup') || text.includes('electric')) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    );
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between select-none ${className}`}
      onMouseEnter={() => onHover && onHover(currentStay._id)}
      onMouseLeave={() => onLeave && onLeave()}
    >
      {/* ── 1. TOP BAR: Rendered only when not handled externally ── */}
      {!hideTopBar && (
        <div className="relative z-20 w-full flex items-center justify-between pt-1 sm:pt-2 pb-2 shrink-0">
          {/* Showcase / Grid View Mode Switcher */}
          {onViewModeChange ? (
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs backdrop-blur-md text-xs font-bold">
              <button
                type="button"
                onClick={() => onViewModeChange('showcase')}
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
                onClick={() => onViewModeChange('grid')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <span>⊞ Grid</span>
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Slide Counter in Bold Black/White (e.g. 1/2) */}
          <div className="flex items-center pr-2">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-slate-950 dark:text-white font-sans select-none drop-shadow-xs">
              {activeIndex + 1}/{stays.length}
            </span>
          </div>
        </div>
      )}

      {/* ── 2. MIDDLE SHOWCASE TAB: Purple Blue Mix Gradient ── */}
      <div className="relative z-10 w-full flex-1 min-h-0 rounded-3xl sm:rounded-[32px] lg:rounded-[36px] bg-gradient-to-r from-purple-600 to-indigo-600 backdrop-blur-2xl border border-purple-400/40 dark:border-purple-500/30 shadow-[0_20px_60px_rgba(99,102,241,0.28)] flex flex-col lg:flex-row items-center justify-between px-4 sm:px-8 lg:pl-9 xl:pl-11 lg:pr-0 py-3 sm:py-3.5 lg:py-4 overflow-hidden my-auto mb-3.5 sm:mb-4 transition-colors duration-300">
        
        {/* ── LEFT HALF: Stay Title, Facilities List, Price, Action CTAs ── */}
        <div className="w-full lg:w-[48%] xl:w-[46%] flex flex-col justify-center space-y-2 sm:space-y-2.5 lg:space-y-3 lg:pr-6 xl:pr-8 shrink-0 z-20">
          
          {/* Stay Name: Continuous Zero-Gap Vertical Slide Reel (Up on Next, Down on Prev) */}
          <div className="w-full">
            <RollingStayTitle
              title={currentStay.title || currentStay.propertyName || 'Verified Stay'}
              stayId={currentStay._id || activeIndex}
              direction={slideDirection}
              className="text-2xl sm:text-3.5xl md:text-4xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-white leading-[0.98] drop-shadow-sm break-words line-clamp-2"
            />
          </div>

          {/* Facilities List: Top to bottom series with NO icons, clean normal text */}
          <div className="flex flex-col gap-1 pt-0 items-start min-h-[52px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStay._id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-1 items-start"
              >
                {top3Facilities.map((fac, idx) => (
                  <span
                    key={`${currentStay._id}-${idx}`}
                    className="text-white/85 text-xs sm:text-xs font-semibold tracking-wide"
                  >
                    {fac}
                  </span>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── PRICING TAB: Premium Frosted Glassmorphism Card enclosing Lowest Price and Other Prices only ── */}
          <div className="relative w-full rounded-2xl p-3 sm:p-3.5 lg:p-4 transition-colors duration-200 bg-white/15 dark:bg-white/20 backdrop-blur-xl border border-white/25 shadow-md">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-5">
              {/* Left Column: Lowest Price */}
              <div className="space-y-0.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-white/80 block">
                    Lowest Price
                  </span>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStay._id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="flex items-baseline gap-1.5 flex-wrap pt-0.5"
                  >
                    <span className="text-2xl sm:text-3xl lg:text-3.5xl xl:text-4xl font-black text-white tracking-tight">
                      ₹{pricing.primaryPrice}
                    </span>
                    <span className="text-xs font-bold text-white/80">
                      {pricing.primaryUnit}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right Column: Other Prices List */}
              {otherPrices.length > 0 && (
                <>
                  {/* Subtle Vertical Hairline Separator */}
                  <div className="w-px self-stretch bg-gradient-to-b from-transparent via-white/30 to-transparent mx-1 shrink-0 hidden sm:block" />

                  <div className="space-y-0.5 flex flex-col items-end text-right min-w-0 max-w-[55%]">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-white/80 block">
                      Other Prices
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={currentStay._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="flex flex-col gap-0.5 items-end max-h-[105px] sm:max-h-[125px] overflow-y-auto custom-scrollbar pr-1 w-full"
                      >
                        {otherPrices.map((op, idx) => (
                          <div
                            key={idx}
                            className="flex items-baseline gap-1.5 text-[11px] sm:text-xs font-semibold text-white/90"
                          >
                            {op.label && (
                              <span
                                className="text-white/75 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide truncate max-w-[110px] sm:max-w-[140px]"
                                title={op.label}
                              >
                                {op.label}:
                              </span>
                            )}
                            <span className="font-extrabold text-white">
                              ₹{op.price}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-white/75">
                              {op.unit}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action CTAs: Situated right below the pricing tab */}
          <div className="flex items-center gap-3 pt-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => onStayClick && onStayClick(currentStay)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 text-indigo-950 font-black text-xs shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2 group"
            >
              <span>Explore Stay</span>
              <svg className="w-3.5 h-3.5 stroke-indigo-950 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── RIGHT HALF: ROOM CARDS STARTING AT CENTER LINE, EXTENDING TO RIGHT TAB BORDER ── */}
        <div className="w-full lg:flex-1 h-full flex flex-col justify-center overflow-visible pl-2 lg:pl-4 z-10 min-w-0">
          
          {/* Location on TOP of the image tab (outside) */}
          <div className="flex items-center gap-1.5 pt-0.5 pb-1 text-xs sm:text-xs font-semibold text-white/85 shrink-0 pr-4 sm:pr-6">
            <svg className="w-3.5 h-3.5 text-emerald-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStay._id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="truncate max-w-[280px] sm:max-w-[340px]"
              >
                {currentStay.location || currentStay.city || currentStay.address || 'Uttarakhand, India'}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Linear Sliding Track Stage: clips at center line and contours to the outer tab right border */}
          <div className="relative w-full overflow-hidden pt-0.5 pb-1.5 rounded-r-3xl sm:rounded-r-[32px] lg:rounded-r-[36px]">
            <div
              style={{
                transform: `translateX(calc(-${activeIndex} * var(--step)))`,
                transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="flex items-center gap-5 xl:gap-6 shrink-0 w-full h-[235px] sm:h-[260px] md:h-[285px] lg:h-[305px] xl:h-[320px] [--step:calc(40%+4px)] xl:[--step:calc(40%+4.8px)]"
            >
              {stays.map((stay, idx) => {
                const isActive = idx === activeIndex;
                const isThisSaved = isInWishlist(stay._id);
                const hasReviews = Array.isArray(stay.reviews) && stay.reviews.length > 0;
                const computedR = hasReviews
                  ? (stay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / stay.reviews.length).toFixed(1)
                  : null;
                const isNew = !computedR;
                const rText = isNew ? 'NEW' : `★ ${computedR}`;

                return (
                  <div
                    key={stay._id || idx}
                    onClick={() => {
                      if (isActive) {
                        onStayClick && onStayClick(stay);
                      } else {
                        goToIndex(idx, idx > activeIndex ? 1 : -1);
                      }
                    }}
                    className={`relative ${cardWidthClass} shrink-0 self-center ${
                      isActive
                        ? 'h-[230px] sm:h-[255px] md:h-[280px] lg:h-[300px] xl:h-[315px] z-10'
                        : 'h-[190px] sm:h-[215px] md:h-[235px] lg:h-[250px] xl:h-[260px] z-0'
                    } rounded-md overflow-hidden bg-slate-900 cursor-pointer select-none group transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)]`}
                    title={stay.title || stay.propertyName}
                  >
                    <img
                      src={isActive ? (mainDisplayImage || getStayImage(stay)) : getStayImage(stay)}
                      alt={stay.title || 'Stay Cover'}
                      className="w-full h-full object-cover select-none"
                      draggable={false}
                    />

                    {/* Top-Right: Wishlist Heart on active card */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(stay);
                        }}
                        className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 pointer-events-auto ${
                          isThisSaved
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/90 text-slate-800 dark:bg-black/80 dark:text-white'
                        }`}
                        title={isThisSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                      >
                        <svg
                          className={`w-4 h-4 ${isThisSaved ? 'fill-white stroke-white' : 'fill-none stroke-current stroke-[2.2]'}`}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Soft Vignette Scrim at Card Bottom for Flawless Text Readability & Contrast */}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

                    {/* Bottom Capsules: Modern Glassmorphic Category & Status Capsules */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white z-20 pointer-events-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Modern Glassmorphic Category Capsule */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-sans text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span>{stay.type || stay.category || 'PG'}</span>
                        </span>

                        {/* Modern Rating / Status Capsule */}
                        {isNew ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-[11px] font-black tracking-wider uppercase shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span>NEW</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/25 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-black tracking-tight shadow-xs">
                            <svg className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{computedR}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. BOTTOM BAR: Navigation Buttons (<, >) perfectly centered ── */}
      <div className="relative z-20 w-full flex items-center justify-between pt-0.5 pb-0.5 shrink-0 px-1 sm:px-3">
        {/* Left spacer to keep center buttons balanced */}
        <div className="w-28" />

        {/* Center: Previous & Next Buttons (White in Dark theme, Black in Light theme) */}
        {stays.length > 1 ? (
          <div className="flex items-center gap-2.5 mx-auto">
            {/* Previous Button (<) */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev}
              data-no-hover="true"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 border border-slate-900 dark:border-white/20 shadow-md flex items-center justify-center transition-all ${
                !canGoPrev
                  ? 'opacity-35 cursor-not-allowed'
                  : 'cursor-pointer active:scale-90'
              }`}
              title={canGoPrev ? "Previous Stay (←)" : "At first stay"}
              aria-label="Previous Stay"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Next Button (>) */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              data-no-hover="true"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 border border-slate-900 dark:border-white/20 shadow-md flex items-center justify-center transition-all ${
                !canGoNext
                  ? 'opacity-35 cursor-not-allowed'
                  : 'cursor-pointer active:scale-90'
              }`}
              title={canGoNext ? "Next Stay (→)" : "At last stay"}
              aria-label="Next Stay"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mx-auto" />
        )}

        {/* Right spacer to balance the layout with the fixed See Map button */}
        <div className="w-28" />
      </div>



    </div>
  );
}

export default StayCinematicShowcase;
