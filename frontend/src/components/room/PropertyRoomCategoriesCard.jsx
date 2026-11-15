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

  // Close popup on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowPicsModal(false);
    };
    if (showPicsModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showPicsModal]);

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

    return list;
  }, [activeRateObj, stay]);

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
          background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 45%, #bfdbfe 80%, #eff6ff 100%)',
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
          <div className="relative space-y-3">
            {/* Title (2x) */}
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
              Select Room Type
            </h3>

            {/* Pill category buttons (2x) */}
            <div className="flex flex-wrap gap-2.5">
              {roomRates.map((rate, idx) => {
                const isSelected = selectedRateIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectRateIdx?.(idx)}
                    className={`px-6 py-3 rounded-full text-sm sm:text-base font-bold tracking-tight cursor-pointer select-none outline-none transition-colors duration-150 ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-md'
                        : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    }`}
                  >
                    {rate.type || `Type ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Price display with View Room Pic button on the right side */}
        <div className="relative bg-white/25 backdrop-blur-md rounded-3xl px-5 py-4 sm:px-7 sm:py-5 min-h-[76px] sm:min-h-[88px] flex items-center justify-between gap-3 shadow-inner border-2 border-white/40">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-xs">
              {displayExactPrice}
            </span>
            <span className="text-sm sm:text-base md:text-lg font-bold text-blue-100 tracking-normal whitespace-nowrap">
              {displayExactUnit}
            </span>
          </div>

          {/* View Room Pic button console: Deep Midnight Navy, 2x height, highly readable text size, fully rounded */}
          <button
            type="button"
            onClick={() => setShowPicsModal(true)}
            className="w-auto shrink-0 inline-flex items-center justify-center px-4 sm:px-6 py-3.5 sm:py-4 rounded-full bg-[#0f172a] hover:bg-[#1e293b] active:scale-95 text-white font-extrabold text-sm sm:text-base border-2 border-white/25 shadow-[0_8px_20px_rgba(15,23,42,0.35)] cursor-pointer transition-all duration-150 select-none group"
            title="View Room Photos"
          >
            <span className="whitespace-nowrap tracking-tight">View Room Pic</span>
          </button>
        </div>

        {/* 3. Facilities associated with that room category (row-wise series with rectangular background border) */}
        {categoryFacilities.length > 0 && (
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold tracking-tight text-white/95">
              <span className="uppercase tracking-wider text-[11px] sm:text-xs text-blue-100 font-extrabold flex items-center gap-1.5">
                Room Facilities
              </span>
              <span className="text-[11px] sm:text-xs text-blue-100/80 font-medium">
                {categoryFacilities.length} items
              </span>
            </div>

            {/* Row wise series with rectangular background border */}
            <div className="bg-white/20 backdrop-blur-md rounded-2xl border-2 border-white/35 divide-y divide-white/20 overflow-hidden shadow-inner">
              {categoryFacilities.map((facility, fIdx) => (
                <div
                  key={fIdx}
                  className="flex items-center px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-bold select-none hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                      <svg
                        className="w-3.5 h-3.5 text-white"
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
            className="w-full flex items-center justify-between bg-white rounded-full pl-6 pr-2.5 py-2.5 sm:pl-7 sm:pr-3 sm:py-3 shadow-xl shadow-blue-950/20 border-2 border-white/60 ring-2 ring-white/30 hover:border-white/80 hover:ring-white/45 backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all duration-200 group select-none"
          >
            {/* Left: label text (2x) */}
            <span className="text-lg sm:text-xl font-bold text-blue-900/80 select-none">
              See Room
            </span>

            {/* Right: solid blue circle icon button (2x) */}
            <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500 group-hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center shadow-lg shrink-0">
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

      {/* ── ROOM PICS MODAL (Same solid gray background tab, no transparency) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showPicsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-tech-minimal md:font-sans">
                {/* Backdrop: Solid/Opaque Gray on mobile with NO transparency */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowPicsModal(false)}
                  className="absolute inset-0 bg-[#cdd2da] cursor-pointer"
                />

                {/* Modal Card (Solid Gray Background with NO transparency) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="relative z-10 w-full max-w-lg rounded-[28px] bg-[#e2e5ea] border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-300 flex items-center justify-between gap-3 bg-[#e2e5ea]">
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <h3 className="text-xl sm:text-2xl md:text-lg font-semibold md:font-medium tracking-[-0.03em] md:tracking-tight text-slate-900 md:text-[#1f1b16]">
                        {displayRateName} Pics
                      </h3>
                      <span className="text-xs sm:text-sm md:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-300 md:bg-slate-100 text-slate-800 md:text-slate-600 border border-slate-400/60 md:border-slate-200/80">
                        {categoryPics.length}
                      </span>
                    </div>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowPicsModal(false)}
                      className="w-9 h-9 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-800 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Close"
                      aria-label="Close modal"
                    >
                      <svg
                        className="w-4.5 h-4.5 md:w-4 md:h-4 stroke-[2.2]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Content List */}
                  <div className="p-4 sm:p-6 pb-6 overflow-y-auto space-y-3.5 flex-1 bg-[#e2e5ea]">
                    {categoryPics.length > 0 ? (
                      categoryPics.map((pic, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-md border-0 bg-slate-900"
                        >
                          <img
                            src={getSafeImgSrc(pic.url)}
                            alt={pic.label || `${displayRateName} Photo ${idx + 1}`}
                            className="w-full h-full object-cover select-none"
                            loading="lazy"
                          />
                          {pic.label && (
                            <span className="absolute top-3 left-3 px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-bold shadow-sm border border-white/20">
                              {pic.label}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-12 px-4 text-center space-y-3 bg-[#d2d7df] md:bg-[#f7f4ee] border border-slate-300 md:border-slate-200/80 rounded-[20px]">
                        <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center mx-auto text-slate-700">
                          <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                        <p className="text-lg font-bold text-slate-900">
                          No photos uploaded for {displayRateName}
                        </p>
                        <p className="text-sm font-medium text-slate-600 max-w-xs mx-auto">
                          The host has not added specific category photos yet. You can inspect property overview photos above.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export default PropertyRoomCategoriesCard;
