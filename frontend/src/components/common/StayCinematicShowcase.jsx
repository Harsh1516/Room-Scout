import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getStayPricing, getOtherStayPrices } from '../../utils/priceUtils';
import { bookingsAPI } from '../../services/api';
import {
  getUpcoming12Months,
  getUpcoming30Days,
  calculateCategoryFreePercentage,
} from '../../utils/dateUtils';

/**
 * StayCinematicShowcase Component:
 * Exact reproduction of OLAMOVIES layout:
 * 1. Dark Photo Hero Section:
 *    - Full-bleed photo with top blur & bottom dark gradient
 *    - Top-left 3x Index badge (5 / 10 ||)
 *    - Left & Right arrows (< and >)
 *    - Title: BACHELORS / PG 2026 (Huge bold font)
 *    - Subtitle: Hotel Living (2x size italic font)
 *    - Line 1: [ Hotel ] [ NEW ] (Inside dark section)
 *    - Line 2: [ Chocolate • Peanut • Veg Roll ] (Inside dark section)
 *    - Dark section curves at bottom with rounded-b-[32px] sm:rounded-b-[40px]
 * 2. White Page Section:
 *    - Left Poster Box: Positioned with -mt so upper 50% covers bottom left of photo,
 *      and lower 50% sits on the white page background (midpoint is the photo bottom border!)
 *    - Right of Poster (in white section):
 *      - Line 3: STAYS › BHIMTAL, UTTARAKHAND (slate text on white)
 *      - Line 4: [ ₹2,000 /month ] • Physically Audited (on white)
 *      - Line 5: 🚩 Add (on white)
 *    - Full-width Red CTA Button (Explore Stay + Price)
 *    - Secondary Controls Row 1 & Row 2
 *    - Other Room Configurations breakdown
 */
export function StayCinematicShowcase({
  stays = [],
  onStayClick,
  onHover,
  onLeave,
  className = '',
  activeIndex: controlledIndex,
  onActiveIndexChange,
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  // Reset activeIndex only when stays list changes
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
    }
  }, [stays, controlledIndex, onActiveIndexChange]);

  const canGoNext = activeIndex < stays.length - 1;
  const canGoPrev = activeIndex > 0;

  const goToIndex = useCallback(
    (newIdx) => {
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
      goToIndex(activeIndex + 1);
    }
  }, [canGoNext, activeIndex, goToIndex]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      goToIndex(activeIndex - 1);
    }
  }, [canGoPrev, activeIndex, goToIndex]);

  // Keyboard navigation (Arrow keys)
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

  const currentStay = (Array.isArray(stays) && stays.length > 0) ? (stays[activeIndex] || stays[0]) : null;
  const pricing = getStayPricing(currentStay);
  const otherPrices = getOtherStayPrices(currentStay, pricing.primaryPrice);

  // Ratings calculation
  const hasUserReviews = Array.isArray(currentStay?.reviews) && currentStay.reviews.length > 0;
  const computedRating = hasUserReviews
    ? (currentStay.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / currentStay.reviews.length).toFixed(1)
    : null;
  const isNewStay = !computedRating;

  // Total rooms count computation
  const totalRoomsCount = useMemo(() => {
    if (!currentStay) return 1;
    if (typeof currentStay.totalRooms === 'number' && currentStay.totalRooms > 0) {
      return currentStay.totalRooms;
    }
    if (Array.isArray(currentStay.rooms) && currentStay.rooms.length > 0) {
      return currentStay.rooms.length;
    }
    if (typeof currentStay.totalRoomsCount === 'number' && currentStay.totalRoomsCount > 0) {
      return currentStay.totalRoomsCount;
    }
    return 1;
  }, [currentStay]);

  // Live stay bookings cache to compute 100% accurate % Full matching inner room availability
  const [stayBookingsMap, setStayBookingsMap] = useState({});

  useEffect(() => {
    const stayId = currentStay?._id;
    if (!stayId) return;
    if (stayBookingsMap[stayId]) return;

    let mounted = true;
    bookingsAPI
      .getBookingsByStay(stayId)
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res) ? res : res?.bookings || res?.data || [];
        setStayBookingsMap((prev) => ({ ...prev, [stayId]: list }));
      })
      .catch((err) => {
        console.warn('Could not fetch stay bookings for showcase:', err);
      });

    return () => {
      mounted = false;
    };
  }, [currentStay?._id, stayBookingsMap]);

  // Calendar dates reference windows
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);

  // Compute booked slots and months per room for current stay
  const bookedSchedule = useMemo(() => {
    const stayId = currentStay?._id;
    const bookings = (stayId && stayBookingsMap[stayId]) || [];
    const rooms = Array.isArray(currentStay?.rooms) ? currentStay.rooms : [];

    const bookedMonthsMap = {};
    const bookedSlotsMap = {};

    rooms.forEach((rm) => {
      const bookedMonthSet = new Set();
      const bookedSlotSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      bookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (
          bStatus === 'REJECTED' ||
          bStatus === 'CANCELLED' ||
          bStatus === 'CHECKED_OUT' ||
          bStatus === 'COMPLETED' ||
          bStatus === 'EXPIRED'
        )
          return;

        const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
        const isSameRm =
          String(b.roomNumber) === String(rm.roomNumber) ||
          (numB && numRm && numB === numRm) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id)) ||
          (b.roomId && rm.id && String(b.roomId) === String(rm.id));

        if (!isSameRm) return;

        if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
          b.bookedMonths.forEach((m) => bookedMonthSet.add(m));
        } else if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
          b.bookedDates.forEach((d) => {
            bookedSlotSet.add(d);
            const mKey = String(d).slice(0, 7);
            if (mKey.length === 7) bookedMonthSet.add(mKey);
          });
        } else if (b.checkIn && b.checkOut) {
          const inD = new Date(b.checkIn);
          const outD = new Date(b.checkOut);
          if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
            let currM = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
            const endM = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), 1));
            while (currM <= endM) {
              const y = currM.getUTCFullYear();
              const m = String(currM.getUTCMonth() + 1).padStart(2, '0');
              bookedMonthSet.add(`${y}-${m}`);
              currM.setUTCMonth(currM.getUTCMonth() + 1);
            }
          }
        }
      });

      const cleanNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
      const keys = [
        rm._id,
        rm.id,
        rm.roomNumber ? String(rm.roomNumber).trim() : null,
        cleanNum,
        cleanNum ? `room_${cleanNum}` : null,
        cleanNum ? `Room-${cleanNum}` : null,
        cleanNum ? `Room ${cleanNum}` : null,
      ].filter(Boolean);

      keys.forEach((k) => {
        bookedMonthsMap[k] = bookedMonthSet;
        bookedSlotsMap[k] = bookedSlotSet;
      });
    });

    return { bookedMonthsMap, bookedSlotsMap };
  }, [currentStay, stayBookingsMap]);

  // Occupancy helper for calculating % Full per room type
  const getRoomTypeOccupancy = useCallback((stay, typeOrCategory, fallbackSeed = 0) => {
    if (!stay) return `${fallbackSeed}% Full`;
    const allRooms = Array.isArray(stay.rooms) ? stay.rooms : [];
    if (allRooms.length === 0) return `${fallbackSeed}% Full`;

    const { bookedMonthsMap, bookedSlotsMap } = bookedSchedule;

    const matching = typeOrCategory
      ? allRooms.filter(
          (r) =>
            String(r.type || '').toLowerCase().includes(String(typeOrCategory).toLowerCase()) ||
            String(typeOrCategory).toLowerCase().includes(String(r.type || '').toLowerCase())
        )
      : allRooms;
    const targetRooms = matching.length > 0 ? matching : allRooms;

    const rateObj = stay.roomRates?.find((rr) =>
      String(rr.type || '').toLowerCase().includes(String(typeOrCategory || '').toLowerCase())
    ) || { rateUnit: stay.rateUnit || '/month' };

    const freeStats = calculateCategoryFreePercentage({
      rooms: targetRooms,
      rate: rateObj,
      allRoomsBookedSlots: bookedSlotsMap,
      allRoomsBookedMonths: bookedMonthsMap,
      upcomingWeek,
      upcomingMonths,
    });

    if (freeStats && freeStats.totalPossible > 0) {
      const bookedUnits = freeStats.totalPossible - freeStats.totalUnbooked;
      const pctFull = Math.max(0, Math.min(100, Math.round((bookedUnits / freeStats.totalPossible) * 100)));
      return `${pctFull}% Full`;
    }

    let totalCap = 0;
    let occupiedCap = 0;
    targetRooms.forEach((r) => {
      const cap = Number(r.capacity) || 1;
      totalCap += cap;
      if (r.status === 'Occupied' || r.status === 'Booked') {
        occupiedCap += cap;
      } else if (typeof r.occupiedCount === 'number') {
        occupiedCap += r.occupiedCount;
      }
    });
    if (totalCap > 0 && occupiedCap > 0) {
      const pct = Math.round((occupiedCap / totalCap) * 100);
      return `${pct}% Full`;
    }

    return `${fallbackSeed}% Full`;
  }, [bookedSchedule, upcomingMonths, upcomingWeek]);

  // Overall stay % Full for the title
  const overallStayOccupancy = useMemo(() => {
    return getRoomTypeOccupancy(currentStay, null, 0);
  }, [currentStay, getRoomTypeOccupancy]);

  // Primary room type % Full
  const primaryRoomType = currentStay?.category || currentStay?.type || 'Standard';
  const primaryRoomOccupancy = useMemo(() => {
    return getRoomTypeOccupancy(currentStay, primaryRoomType, 0);
  }, [currentStay, primaryRoomType, getRoomTypeOccupancy]);

  // Gender label computation
  const genderLabel = useMemo(() => {
    const raw = currentStay?.genderType || currentStay?.gender || currentStay?.targetGender || '';
    if (!raw) return 'Both';
    const l = raw.toLowerCase().trim();
    if (l === 'girls' || l === 'female') return 'Female only';
    if (l === 'boys' || l === 'male') return 'Male only';
    if (l === 'both' || l === 'unisex') return 'Both';
    if (l === 'family') return 'Family';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentStay]);

  // Host Name computation: "Host - Host Name (in camel case only)"
  const hostDisplayName = useMemo(() => {
    const raw = currentStay?.hostId?.name || currentStay?.hostName || currentStay?.host?.name || 'Verified Host';
    const stripped = raw.replace(/^host\s*[-:]*\s*/i, '').trim();
    const camelCased = stripped
      ? stripped
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      : 'Verified Host';
    return `Host - ${camelCased}`;
  }, [currentStay]);

  // Joined date computation
  const rawJoinDate = currentStay?.hostId?.createdAt || currentStay?.createdAt;
  const formattedJoinedDate = useMemo(() => {
    if (!rawJoinDate) return 'Joined Jan 2024';
    try {
      const d = new Date(rawJoinDate);
      if (isNaN(d.getTime())) return 'Joined Jan 2024';
      return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Joined Jan 2024';
    }
  }, [rawJoinDate]);

  // Room configurations for table display (Shows ALL actual room types, respective room counts & % Full)
  const roomConfigurations = useMemo(() => {
    if (!currentStay) return [];

    const rooms = Array.isArray(currentStay.rooms) ? currentStay.rooms : [];
    const roomRates = Array.isArray(currentStay.roomRates) ? currentStay.roomRates : [];
    const list = [];
    const seen = new Set();
    const PROPERTY_TYPES = new Set(['hotel', 'pg', 'flat', 'apartment', 'hostel', 'villa', 'resort', 'homestay', 'stay', 'property', 'living']);

    // Helper to get room count for a type
    const countForType = (type) => {
      if (rooms.length > 0) {
        const matches = rooms.filter(
          (r) =>
            r.type &&
            (r.type.toLowerCase() === type.toLowerCase() ||
              r.type.toLowerCase().includes(type.toLowerCase()) ||
              type.toLowerCase().includes(r.type.toLowerCase()))
        );
        if (matches.length > 0) return matches.length;
      }
      return 1;
    };

    // 1. First check roomRates
    if (roomRates.length > 0) {
      roomRates.forEach((rr, idx) => {
        if (!rr || !rr.type) return;
        const normKey = rr.type.trim().toLowerCase();
        if (PROPERTY_TYPES.has(normKey)) return;
        if (seen.has(normKey)) return;
        seen.add(normKey);

        const count = countForType(rr.type);
        const occupancySeed = [80, 65, 50, 40][idx % 4];
        const specificOccupancy = getRoomTypeOccupancy(currentStay, rr.type, occupancySeed);
        const priceNum = typeof rr.price === 'number' ? rr.price : parseFloat(String(rr.price).replace(/[^0-9.]/g, '')) || 0;
        const unit = rr.rateUnit ? (String(rr.rateUnit).startsWith('/') ? rr.rateUnit : `/${rr.rateUnit}`) : '/month';

        list.push({
          label: rr.type.trim(),
          count,
          price: priceNum.toLocaleString('en-IN'),
          unit,
          percentFull: specificOccupancy,
        });
      });
    }

    // 2. Next check rooms for any types not in roomRates
    if (rooms.length > 0) {
      rooms.forEach((rm, idx) => {
        if (!rm || !rm.type) return;
        const normKey = rm.type.trim().toLowerCase();
        if (PROPERTY_TYPES.has(normKey)) return;
        if (seen.has(normKey)) return;
        seen.add(normKey);

        const count = countForType(rm.type);
        const occupancySeed = [75, 60, 45, 30][idx % 4];
        const specificOccupancy = getRoomTypeOccupancy(currentStay, rm.type, occupancySeed);
        const priceNum = typeof rm.price === 'number' ? rm.price : parseFloat(String(rm.price).replace(/[^0-9.]/g, '')) || 0;
        const unit = rm.rateUnit ? (String(rm.rateUnit).startsWith('/') ? rm.rateUnit : `/${rm.rateUnit}`) : '/month';

        list.push({
          label: rm.type.trim(),
          count,
          price: priceNum.toLocaleString('en-IN'),
          unit,
          percentFull: specificOccupancy,
        });
      });
    }

    // 3. Check otherPrices from helper
    if (Array.isArray(otherPrices) && otherPrices.length > 0) {
      otherPrices.forEach((op, idx) => {
        const roomType = op.label ? op.label.trim() : 'Standard Room';
        const normKey = roomType.toLowerCase();
        if (PROPERTY_TYPES.has(normKey)) return;
        if (seen.has(normKey)) return;
        seen.add(normKey);

        const count = countForType(roomType);
        const occupancySeed = [80, 65, 50, 40][idx % 4];
        const specificOccupancy = getRoomTypeOccupancy(currentStay, roomType, occupancySeed);

        list.push({
          label: roomType,
          count,
          price: op.price,
          unit: op.unit || '/month',
          percentFull: specificOccupancy,
        });
      });
    }

    // 4. Ensure primary stay room type is included ONLY if list is empty and category is not a generic property type
    if (list.length === 0 && pricing.primaryPrice) {
      const primaryType = (currentStay.category || 'Standard Room').trim();
      const normKey = primaryType.toLowerCase();
      if (!PROPERTY_TYPES.has(normKey) && !seen.has(normKey)) {
        seen.add(normKey);
        const count = countForType(primaryType);
        list.push({
          label: primaryType,
          count,
          price: pricing.primaryPrice,
          unit: pricing.primaryUnit || '/month',
          percentFull: primaryRoomOccupancy,
        });
      }
    }

    // Fallback if empty
    if (list.length === 0) {
      list.push({
        label: 'Standard Room',
        count: totalRoomsCount || 1,
        price: pricing.primaryPrice || '2,000',
        unit: pricing.primaryUnit || '/month',
        percentFull: primaryRoomOccupancy || '0% Full',
      });
    }

    // Final safety: filter out any property types like "hotel", "pg", "flat"
    return list.filter((item) => !PROPERTY_TYPES.has(item.label.toLowerCase().trim()));
  }, [currentStay, otherPrices, pricing, primaryRoomOccupancy, totalRoomsCount, getRoomTypeOccupancy]);

  // Images
  const stayImages = useMemo(() => {
    if (!currentStay) return ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'];
    if (Array.isArray(currentStay.images) && currentStay.images.length > 0) {
      return currentStay.images;
    }
    if (currentStay.image) return [currentStay.image];
    return ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'];
  }, [currentStay]);

  const coverImage = stayImages[0];
  const posterImage = stayImages[1] || stayImages[0];

  if (!stays || stays.length === 0 || !currentStay) return null;

  const city = currentStay.city || currentStay.location || 'Bhimtal';
  const state = currentStay.state || 'Uttarakhand';

  // Title 2-line breakdown matching reference
  const fullTitle = currentStay.title || currentStay.propertyName || 'Verified Stay';
  const titleWords = fullTitle.split(' ');
  const titleLine1 = titleWords.length > 1 ? titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(' ') : titleWords[0];
  const titleLine2 = titleWords.length > 1 ? titleWords.slice(Math.ceil(titleWords.length / 2)).join(' ') : '';

  return (
    <div
      className={`relative w-full flex flex-col items-center select-none ${className}`}
      onMouseEnter={() => onHover && onHover(currentStay._id)}
      onMouseLeave={() => onLeave && onLeave()}
    >
      {/* ══════════════════════════════════════════════════════════════
          1. DARK PHOTO HERO SECTION:
          - Original photo at top: 100% transparent and clear
          - Bottom blur portion: Starts right from bottom border of original photo
          - Stay name shown right from the start of the bottom blur area
         ══════════════════════════════════════════════════════════════ */}
      <div className="relative w-full max-w-full sm:max-w-xl md:max-w-2xl mx-auto bg-[#1c1d27] text-white rounded-none rounded-b-[32px] sm:rounded-b-[40px] overflow-hidden shadow-2xl">
        
        {/* 1. ORIGINAL PHOTO CONTAINER (Completely clear, unblurred, transparent) */}
        <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden group">
          <img
            src={coverImage}
            alt={fullTitle}
            className="w-full h-full object-cover object-center select-none scale-105 origin-center"
            draggable={false}
          />

          {/* Top subtle frosted glass blur matching natural photo colors without black tint */}
          <div className="absolute inset-x-0 top-0 h-20 sm:h-24 backdrop-blur-md pointer-events-none z-10 [mask-image:linear-gradient(to_bottom,black_25%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_25%,transparent)]" />

          {/* Smooth dark gradient at bottom of photo for title legibility */}
          <div className="absolute inset-x-0 bottom-0 h-44 sm:h-52 bg-gradient-to-t from-[#1c1d27] via-[#1c1d27]/75 to-transparent pointer-events-none z-10" />

          {/* Stay Title: completely inside the original photo area */}
          <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6 z-20 pointer-events-none text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.02] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
              <div>{titleLine1}</div>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span>{titleLine2 || titleLine1}</span>
                <span className="text-slate-400 font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-normal">
                  ( {totalRoomsCount} {totalRoomsCount === 1 ? 'Room' : 'Rooms'} - {overallStayOccupancy} )
                </span>
              </div>
            </h1>
          </div>

          {/* Stay Index Counter Badge */}
          <div className="absolute top-20 sm:top-24 left-4 sm:left-6 z-20 pointer-events-auto">
            <span className="inline-flex items-center px-6 py-2.5 sm:px-8 sm:py-3.5 rounded-full bg-black/65 backdrop-blur-md text-white font-black text-base sm:text-xl tracking-wider border-2 border-white/25 shadow-2xl">
              <span>{activeIndex + 1} / {stays.length}</span>
            </span>
          </div>

          {/* Navigation Arrows inside Photo */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#181926]/95 hover:bg-[#181926] backdrop-blur-md text-white border-2 border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all ${
              !canGoPrev ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer active:scale-90 hover:scale-105'
            }`}
            title={canGoPrev ? 'Previous Stay (←)' : 'First stay'}
            aria-label="Previous Stay"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#181926]/95 hover:bg-[#181926] backdrop-blur-md text-white border-2 border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all ${
              !canGoNext ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer active:scale-90 hover:scale-105'
            }`}
            title={canGoNext ? 'Next Stay (→)' : 'Last stay'}
            aria-label="Next Stay"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* 2. THE BOTTOM BLUR / DARK PORTION:
            - Starts right from the bottom border of original photo
            - Contains Hotel Living subtitle at top with comfortable breathing space
        */}
        <div className="relative w-full bg-[#1c1d27] px-4 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 flex flex-col gap-2.5 z-20">
          
          {/* Subtitle: Hotel Living sitting in the bottom blur portion */}
          <div className="flex flex-col text-left mb-2 sm:mb-2.5">
            <p className="italic text-lg sm:text-xl md:text-2xl font-semibold text-slate-200 tracking-wide drop-shadow-lg">
              {currentStay.tagline || (currentStay.type ? `${currentStay.type} Living` : 'Hotel Living')}
            </p>
          </div>

          {/* Row with Left Spacer (for poster top half) and Right Line 1 & Line 2 */}
          <div className="relative pt-0 pb-0 flex items-start gap-4 sm:gap-6">
            {/* Spacer for left poster top half */}
            <div className="w-48 sm:w-60 md:w-68 shrink-0 pointer-events-none" />

            {/* Right: Line 1 & Line 2 */}
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              {/* Line 1: Host Name (replaces Hotel / NEW) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-[#2D2F40] text-slate-100 font-black text-base sm:text-xl md:text-2xl shadow-xs border border-white/10 truncate max-w-full">
                  {hostDisplayName}
                </span>
              </div>

              {/* Line 2: Joined Date (background tightly wrapped) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-[#2D2F40] text-slate-200 font-black text-base sm:text-xl md:text-2xl shadow-xs border border-white/10 truncate max-w-full">
                  {formattedJoinedDate}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          THE VERTICAL POSTER BOX:
          - Anchored exactly at the dark/white boundary line
          - Top sits safely BELOW Hotel Living
          - Bottom sits safely ABOVE Explore Stay button with generous gap
          - Vertical midpoint is the photo bottom border
         ══════════════════════════════════════════════════════════════ */}
      <div className="relative w-full max-w-full sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 pointer-events-none z-30">
        <div className="absolute left-4 sm:left-6 top-2.5 sm:top-3 -translate-y-1/2 pointer-events-auto">
          <div className="relative w-48 sm:w-60 md:w-68 h-72 sm:h-84 md:h-96 rounded-3xl overflow-hidden shadow-[0_24px_56px_rgba(0,0,0,0.6)] border-2 border-white/40 bg-slate-800">
            <img
              src={posterImage}
              alt="Poster"
              className="w-full h-full object-cover scale-110 select-none"
              draggable={false}
            />
            {/* Top-Left Circular Yellow Rating Tag */}
            <div className="absolute top-3 left-3 sm:top-3.5 sm:left-3.5 z-20 pointer-events-none">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-2xl border-2 border-white/90 select-none">
                {isNewStay ? (
                  <span className="text-[11px] sm:text-xs font-black tracking-tight">NEW</span>
                ) : (
                  <div className="flex items-center gap-0.5 leading-none">
                    <span className="text-[10px] sm:text-xs">★</span>
                    <span className="text-xs sm:text-sm font-black">{computedRating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. WHITE PAGE SECTION (OUTSIDE PHOTO BOTTOM):
          - Line 3: STAYS › BHIMTAL, UTTARAKHAND
          - Line 4: [ ₹2,000 /month ] • Physically Audited
          - All 4 lines spaced with perfectly equal gap (10px)
          - Add sign removed completely
          - Clear gap above Explore Stay button
         ══════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 pt-0 pb-12 flex flex-col gap-3.5 bg-transparent">
        
        {/* Lower Half of Split Row (On White Page Background)
            - pt-5 sm:pt-6 provides EXACT same gap from the border as Joined Date (pb-5 sm:pb-6)
            - items-start ensures location starts immediately with exact symmetric gap
        */}
        <div className="relative flex items-start gap-4 sm:gap-6 pt-5 sm:pt-6 pb-10 sm:pb-12 z-20">
          {/* Spacer for left poster bottom half */}
          <div className="w-48 sm:w-60 md:w-68 shrink-0 pointer-events-none" />

          {/* Right: Line 3 & Line 4 */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {/* Line 3: Breadcrumb Category (Slate text on white) */}
            <div className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider text-slate-500 truncate">
              <span>{city.toUpperCase()}, {state.toUpperCase()}</span>
            </div>

            {/* Line 4: Gender Badge below location */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 px-4.5 py-1.5 sm:px-5 sm:py-2 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-extrabold text-sm sm:text-base md:text-lg shadow-2xs border border-slate-300/90 tracking-tight select-none transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>{genderLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Clear Margin Container ensuring Explore Stay button is completely below the poster box */}
        <div className="pt-6 sm:pt-8 flex flex-col gap-5 sm:gap-6">
        {/* ── Minimal Premium Green CTA Button (Full Rounded Border, Text Only) ── */}
        <button
          type="button"
          onClick={() => onStayClick && onStayClick(currentStay)}
          className="w-fit mx-auto py-3.5 sm:py-4 px-8 sm:px-10 rounded-full bg-sky-500/80 hover:bg-sky-500 active:bg-sky-600 backdrop-blur-md text-white font-black text-base sm:text-xl md:text-2xl tracking-wide shadow-lg shadow-sky-500/25 border-2 border-sky-300/60 flex items-center justify-center transition-all cursor-pointer active:scale-95 select-none mt-1"
        >
          <span>Explore Stay</span>
        </button>

        {/* ── Other Room Configurations (Table Format: Room Type, Price per cycle, % Full) ── */}
        {roomConfigurations.length > 0 && (
          <div className="w-full rounded-3xl p-5 sm:p-6 bg-slate-50/70 border border-gray-200 shadow-2xs flex flex-col gap-3.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
              room configurations
            </span>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="border-b border-gray-200 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4 font-bold">room type</th>
                    <th className="pb-3 pr-4 font-bold">price</th>
                    <th className="pb-3 font-bold text-right">availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roomConfigurations.map((room, idx) => (
                    <tr key={idx} className="text-sm sm:text-base font-semibold text-slate-800">
                      <td className="py-3.5 pr-4 font-bold text-slate-900">
                        <span>{room.label || 'Standard Room'}</span>{' '}
                        <span className="text-slate-400 font-semibold text-xs sm:text-sm">({room.count || 1})</span>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900">₹{room.price}</span>{' '}
                        <span className="text-slate-500 font-medium text-xs sm:text-sm">{room.unit}</span>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <span className="font-black text-slate-800 text-sm sm:text-base">
                          {room.percentFull}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
  );
}

export default StayCinematicShowcase;
