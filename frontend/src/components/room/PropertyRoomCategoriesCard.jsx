import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSafeImgSrc } from '../../utils/imageUtils';

/**
 * Component-level Pricing Card for Property Detail Page.
 * Mobile redesign: soft blue gradient card (domain-search card aesthetic)
 * 2x size: bold heading, large pill category tabs, prominent inset price box,
 * View Room Pic CTA, Category Facilities list, and See Room bottom action.
 */
export function PropertyRoomCategoriesCard({
  stay,
  selectedRateIdx = 0,
  onSelectRateIdx,
  onNavigateToRooms,
}) {
  const [showPicsModal, setShowPicsModal] = useState(false);
  const [activeCategoryPicIdx, setActiveCategoryPicIdx] = useState(0);

  // Reset active photo index when category changes or modal opens
  useEffect(() => {
    setActiveCategoryPicIdx(0);
  }, [selectedRateIdx, showPicsModal]);

  const roomRates = Array.isArray(stay?.roomRates) ? stay.roomRates : [];
  const hasRoomRates = roomRates.length > 0;

  const activeRateObj = hasRoomRates
    ? roomRates[selectedRateIdx] || roomRates[0]
    : null;

  const displayRateName = activeRateObj
    ? (activeRateObj.type || 'Standard Rate')
    : 'Host Listed Rate';

  const displayExactPrice = activeRateObj
    ? (String(activeRateObj.price).startsWith('₹') ? activeRateObj.price : `₹${Number(activeRateObj.price).toLocaleString('en-IN')}`)
    : (stay?.price
      ? (String(stay.price).startsWith('₹') ? stay.price : `₹${Number(stay.price).toLocaleString('en-IN')}`)
      : '₹3,500');

  const displayExactUnit = activeRateObj
    ? (activeRateObj.rateUnit || '/month')
    : (stay?.rateUnit || '/month');

  // Extract photos for the active room category
  const categoryPics = useMemo(() => {
    if (!activeRateObj) return [];
    const list = [];

    // 1. Photos array on category
    if (Array.isArray(activeRateObj.photos)) {
      activeRateObj.photos.forEach((p, i) => {
        if (typeof p === 'string' && p.trim()) {
          list.push({ url: p.trim(), label: `Photo ${i + 1}` });
        } else if (p && typeof p === 'object' && p.url) {
          list.push({ url: p.url, label: p.label || `Photo ${i + 1}` });
        }
      });
    } else if (activeRateObj.photos && typeof activeRateObj.photos === 'object') {
      Object.entries(activeRateObj.photos).forEach(([k, u]) => {
        if (u && typeof u === 'string') {
          list.push({ url: u, label: k.charAt(0).toUpperCase() + k.slice(1) });
        }
      });
    }

    // 2. Images array on category
    if (Array.isArray(activeRateObj.images)) {
      activeRateObj.images.forEach((img) => {
        if (typeof img === 'string' && img.trim() && !list.some((item) => item.url === img.trim())) {
          list.push({ url: img.trim(), label: `Photo ${list.length + 1}` });
        }
      });
    }

    // 3. Fallback: check matching rooms in stay.rooms
    if (list.length === 0 && Array.isArray(stay?.rooms)) {
      const targetType = (activeRateObj.type || '').trim().toLowerCase();
      const matchingRoom = stay.rooms.find(
        (rm) => (rm.type || '').trim().toLowerCase() === targetType
      );
      if (matchingRoom && Array.isArray(matchingRoom.photos)) {
        matchingRoom.photos.forEach((p, i) => {
          if (typeof p === 'string' && p.trim()) list.push({ url: p.trim(), label: `Room Photo ${i + 1}` });
          else if (p && typeof p === 'object' && p.url) list.push({ url: p.url, label: p.label || `Room Photo ${i + 1}` });
        });
      }
    }

    // 4. Fallback to stay overview images if category has no specific images
    if (list.length === 0 && Array.isArray(stay?.images) && stay.images.length > 0) {
      stay.images.forEach((img, i) => {
        if (typeof img === 'string' && img.trim()) {
          list.push({ url: img.trim(), label: `Overview Photo ${i + 1}` });
        }
      });
    }

    return list;
  }, [activeRateObj, stay]);

  // Keyboard navigation for photo viewer (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!showPicsModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowPicsModal(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveCategoryPicIdx((prev) => (prev === 0 ? Math.max(0, categoryPics.length - 1) : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveCategoryPicIdx((prev) => (prev >= categoryPics.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPicsModal, categoryPics.length]);

  // Extract facilities/features associated with active room category
  const categoryFacilities = useMemo(() => {
    if (!activeRateObj) return [];
    if (Array.isArray(activeRateObj.features) && activeRateObj.features.length > 0) {
      return activeRateObj.features.filter(Boolean);
    }
    if (Array.isArray(activeRateObj.facilities) && activeRateObj.facilities.length > 0) {
      return activeRateObj.facilities.filter(Boolean);
    }
    if (Array.isArray(activeRateObj.amenities) && activeRateObj.amenities.length > 0) {
      return activeRateObj.amenities.filter(Boolean);
    }
    if (Array.isArray(stay?.facilities) && stay.facilities.length > 0) {
      return stay.facilities.slice(0, 4);
    }
    if (Array.isArray(stay?.amenities) && stay.amenities.length > 0) {
      return stay.amenities.slice(0, 4);
    }
    return ['Attached Washroom', 'Wi-Fi', 'Power Backup'];
  }, [activeRateObj, stay]);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #050505 0%, #141416 48%, #3f3f46 78%, #d4d4d8 92%, #fafafa 100%)',
        }}
      >
        {/* Soft noise overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* 1. Category selector */}
        {hasRoomRates && roomRates.length > 1 && (
          <div className="relative space-y-4 sm:space-y-5">
            {/* Title (24px bold centered, matching LeftPropertiesPanel "Properties") */}
            <h3 className="text-[24px] font-bold tracking-tight text-white leading-none text-center drop-shadow-sm">
              Select Room Type
            </h3>

            {/* Pill category buttons (comfortable spacing & gap) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {roomRates.map((rate, idx) => {
                const isSelected = selectedRateIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectRateIdx?.(idx)}
                    className={`h-[38px] sm:h-[40px] px-4 sm:px-4.5 rounded-full text-[13px] sm:text-[14px] font-semibold tracking-tight cursor-pointer select-none outline-none transition-all duration-150 inline-flex items-center justify-center active:scale-95 ${isSelected ? "bg-white text-zinc-900 border-2 border-white shadow-md ring-2 ring-white/25" : "bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 shadow-xs"}`}
                  >
                    {rate.type || `Type ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Price display with View Room Pic button on the right side */}
        <div className="relative bg-white/10 backdrop-blur-md rounded-3xl px-5 py-4 sm:px-7 sm:py-5 min-h-[76px] sm:min-h-[88px] flex items-center justify-between gap-3 shadow-inner border-2 border-white/30">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[28px] sm:text-[32px] md:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs">
              {displayExactPrice}
            </span>
            <span className="text-base sm:text-lg font-semibold text-white/95 tracking-normal whitespace-nowrap">
              {displayExactUnit}
            </span>
          </div>

          {/* View Room Pic button matching View Full button settings */}
          <button
            type="button"
            onClick={() => setShowPicsModal(true)}
            className="w-auto shrink-0 inline-flex items-center gap-2 h-[36px] sm:h-[38px] px-4 sm:px-4.5 rounded-full bg-black/80 hover:bg-black text-white text-xs sm:text-[13px] font-medium tracking-tight shadow-[0_2px_14px_rgba(0,0,0,0.45)] backdrop-blur-md border border-white/40 transition-all duration-200 cursor-pointer active:scale-95 hover:scale-105 select-none"
            title="View Room Photos"
          >
            <svg
              className="w-3.5 h-3.5 text-white stroke-[2]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span className="whitespace-nowrap tracking-tight">View Room Pic</span>
          </button>
        </div>

        {/* 3. Facilities associated with that room category (row-wise series with rectangular background border) */}
        {categoryFacilities.length > 0 && (
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold tracking-tight text-white/95">
              <span className="uppercase tracking-wider text-sm sm:text-[15px] text-white font-bold flex items-center gap-1.5">
                Room Facilities
              </span>
              <span className="text-sm sm:text-[15px] text-white/90 font-semibold">
                {categoryFacilities.length} items
              </span>
            </div>

            {/* Row wise series with rectangular background border */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border-2 border-white/30 divide-y divide-white/15 overflow-hidden shadow-inner">
              {categoryFacilities.map((facility, fIdx) => (
                <div
                  key={fIdx}
                  className="flex items-center min-h-[52px] px-4 py-3 text-white text-base font-medium select-none hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-white/25 flex items-center justify-center shrink-0 border border-white/40">
                      <svg
                        className="w-4 h-4 text-white stroke-[2.5]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="tracking-tight truncate">{facility}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. A little gap and See Room button at the bottom */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigateToRooms?.(activeRateObj?.type)}
            className="relative overflow-hidden w-full flex items-center justify-between bg-white rounded-full pl-6 pr-2.5 py-2.5 sm:pl-7 sm:pr-3 sm:py-3 shadow-xl shadow-black/30 border-2 border-white/60 ring-2 ring-white/30 hover:border-white/80 hover:ring-white/45 backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all duration-200 group select-none"
          >
            {/* Left-to-right flash sweep */}
            <span className="button-flash-sweep pointer-events-none" />

            {/* Left: label text (2x) */}
            <span className="relative z-10 text-lg sm:text-xl font-bold text-zinc-900 select-none">
              See Room
            </span>

            {/* Right: solid black circle icon button (2x) */}
            <span className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black group-hover:bg-zinc-800 transition-colors duration-200 flex items-center justify-center shadow-lg shrink-0">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:translate-x-1 transition-transform duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        </div>
      </div>

            {/* ── ROOM PICS PHOTO VIEWER / DRAWER (Matching Upper "View Full" Lightbox Style) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showPicsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[99999] bg-[#121418] flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden cursor-pointer"
                onClick={() => setShowPicsModal(false)}
              >
                {/* Top Bar with category badge, counter & close button */}
                <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-2 pt-1 z-30">
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md">
                      {displayRateName}
                    </span>
                    {categoryPics.length > 0 && (
                      <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold text-xs sm:text-sm tracking-wide shadow-md">
                        {activeCategoryPicIdx + 1} / {categoryPics.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPicsModal(false);
                    }}
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-md select-none"
                    aria-label="Close photo viewer"
                  >
                    <svg className="w-6 h-6 text-white stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Main Stage Image */}
                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 z-20">
                  <AnimatePresence mode="wait">
                    {categoryPics.length > 0 ? (
                      <motion.img
                        key={`${activeCategoryPicIdx}-${categoryPics[activeCategoryPicIdx]?.url}`}
                        src={getSafeImgSrc(categoryPics[activeCategoryPicIdx]?.url)}
                        alt={categoryPics[activeCategoryPicIdx]?.label || `${displayRateName} Photo ${activeCategoryPicIdx + 1}`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="max-h-[62vh] sm:max-h-[68vh] max-w-[92vw] object-contain rounded-2xl sm:rounded-3xl shadow-2xl border border-white/15 cursor-default bg-black/40"
                      />
                    ) : (
                      <div className="text-white/80 text-sm font-semibold text-center py-10">
                        No photos available for {displayRateName}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Thumbnail Strip */}
                {categoryPics.length > 1 && (
                  <div
                    className="w-full max-w-5xl mx-auto overflow-x-auto no-scrollbar py-3 sm:py-4 px-3 select-none z-30 flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 min-w-max mx-auto snap-x">
                      {categoryPics.map((pic, idx) => {
                        const imgUrl = getSafeImgSrc(pic.url);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategoryPicIdx(idx);
                            }}
                            className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer snap-start ${
                              idx === activeCategoryPicIdx
                                ? 'border-2 border-white scale-105 shadow-2xl ring-2 ring-white/60'
                                : 'border border-white/20 opacity-60 hover:opacity-100 hover:border-white/50 hover:scale-100 shadow-md'
                            }`}
                          >
                            <img
                              decoding="async"
                              loading="lazy"
                              src={imgUrl}
                              alt={pic.label || `${displayRateName} Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export default PropertyRoomCategoriesCard;
