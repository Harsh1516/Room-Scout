import { useMemo } from 'react';
import { toast } from '../../context/ToastContext';
import { isOnlineGuest, isPaidGuest } from '../../utils/guestFilters';
import { isRoomMatchingCategory, isRoomOccupiedInMonth } from '../../utils/dateUtils';

export function PropertyDetailsSection({
  hostProperty,
  isPending,
  onEditDetails,
  onSaveProperty,
  guests,
  allGuests,
  setGuests,
  showToast,
  refreshGuests,
  broadcastStayUpdate,
  onSelectUserRequest,
  activePaidUsers,
  onSwitchTab,
  activeSubTabIndex,
  onSubTabChange,
}) {
  const formattedJoinedDate = useMemo(() => {
    const rawDate =
      hostProperty?.joinedDate ||
      hostProperty?.createdAt ||
      hostProperty?.hostId?.createdAt ||
      hostProperty?.hostJoined ||
      hostProperty?.updatedAt;
    const d = rawDate ? new Date(rawDate) : new Date();
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [hostProperty]);

  const handleShare = () => {
    const url = window.location.origin + `/stay/${hostProperty?.stayId || hostProperty?._id || ''}`;
    navigator.clipboard?.writeText(url);
    toast.success('Listing URL copied');
  };

  const handleOpenPublicUrl = () => {
    const id = hostProperty?.stayId || hostProperty?._id;
    if (id) {
      window.open(`/stay/${id}`, '_blank');
    } else {
      toast.info('Preview ready in search');
    }
  };

  const propertyName = hostProperty?.propertyName || hostProperty?.title || '—';
  const propertyCategory = hostProperty?.propertyType || hostProperty?.category || 'PG';
  const rawGender = Array.isArray(hostProperty?.genderType)
    ? hostProperty.genderType.join(', ')
    : typeof hostProperty?.genderType === 'string'
    ? hostProperty.genderType
    : typeof hostProperty?.gender === 'string'
    ? hostProperty.gender
    : 'Both';
  const genderType = rawGender
    ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()
    : 'Both';
  const rating =
    (Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
      ? Number(hostProperty.rating).toFixed(1)
      : 'New';

  const locationText = [hostProperty?.city, hostProperty?.state].filter(Boolean).join(', ') || hostProperty?.location || hostProperty?.address || '';

  const analytics = useMemo(() => {
    const roomsList = Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [];
    const roomRatesList = Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates : [];

    const totalRooms =
      roomsList.length > 0
        ? roomsList.length
        : roomRatesList.reduce((acc, r) => acc + (Number(r.roomCount) || 0), 0);

    const totalBeds =
      roomsList.length > 0
        ? roomsList.reduce((acc, r) => acc + (Number(r.capacity) || 1), 0)
        : roomRatesList.reduce((acc, r) => acc + (Number(r.capacity) || 1) * (Number(r.roomCount) || 0), 0);

    const sourceGuests = Array.isArray(activePaidUsers) && activePaidUsers.length > 0
      ? activePaidUsers
      : (Array.isArray(allGuests) && allGuests.length > 0 ? allGuests : Array.isArray(guests) ? guests : []).filter(isPaidGuest);

    const allGuestsList = Array.isArray(allGuests) && allGuests.length > 0
      ? allGuests
      : (Array.isArray(guests) ? guests : []);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let bookedRooms = 0;
    if (roomsList.length > 0) {
      bookedRooms = roomsList.filter((rm) =>
        isRoomOccupiedInMonth(rm, currentMonthKey, allGuestsList)
      ).length;
    } else {
      const activeStayGuests = sourceGuests.filter((g) => {
        const st = String(g.status || '').toUpperCase();
        return !['CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(st);
      });
      const bookedRoomSet = new Set(
        activeStayGuests
          .map((g) => String(g.roomNumber || '').replace(/[^0-9a-zA-Z]/g, ''))
          .filter(Boolean)
      );
      bookedRooms = totalRooms > 0 ? Math.min(totalRooms, bookedRoomSet.size) : bookedRoomSet.size;
    }

    const availableRooms = Math.max(0, totalRooms - bookedRooms);
    const occupancyPct = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;

    const onlineBookings = sourceGuests.filter(isOnlineGuest);
    const offlineBookings = sourceGuests.filter((g) => !isOnlineGuest(g));

    const rawOnlineRevenue = onlineBookings.reduce((sum, g) => sum + (Number(g.totalAmount || g.paidAmount) || 0), 0);
    const rawOfflineRevenue = offlineBookings.reduce((sum, g) => sum + (Number(g.totalAmount || g.paidAmount) || 0), 0);
    const rawTotalRevenue = rawOnlineRevenue + rawOfflineRevenue;

    const resetInfo = hostProperty?.revenueReset;
    const isResetActive = Boolean(resetInfo && resetInfo.resetAt);

    const onlineRevenue = isResetActive
      ? Math.max(0, rawOnlineRevenue - Number(resetInfo.baselineOnline || 0))
      : rawOnlineRevenue;
    const offlineRevenue = isResetActive
      ? Math.max(0, rawOfflineRevenue - Number(resetInfo.baselineOffline || 0))
      : rawOfflineRevenue;
    const totalRevenue = isResetActive
      ? Math.max(0, rawTotalRevenue - Number(resetInfo.baselineTotal || 0))
      : rawTotalRevenue;

    const onlineShare = totalRevenue > 0 ? Math.round((onlineRevenue / totalRevenue) * 100) : 0;
    const offlineShare = totalRevenue > 0 ? 100 - onlineShare : 0;

    const categoryBreakdown = roomRatesList.map((rate, idx) => {
      const catName = rate.type || rate.name || `Category ${idx + 1}`;
      const catRooms = roomsList.filter((rm) =>
        isRoomMatchingCategory(rm, rate, idx, roomRatesList)
      );
      const count = catRooms.length > 0 ? catRooms.length : (Number(rate.roomCount) || 0);
      const catBooked = catRooms.filter((rm) =>
        isRoomOccupiedInMonth(rm, currentMonthKey, allGuestsList)
      ).length;
      return {
        name: catName,
        total: count,
        booked: catBooked,
        price: Number(rate.price) || 0,
      };
    });

    return {
      totalRooms,
      totalBeds,
      bookedRooms,
      availableRooms,
      occupancyPct,
      totalRevenue,
      onlineRevenue,
      offlineRevenue,
      onlineShare,
      offlineShare,
      onlineCount: onlineBookings.length,
      offlineCount: offlineBookings.length,
      totalBookingsCount: sourceGuests.length,
      categoryBreakdown,
    };
  }, [hostProperty, guests, allGuests, activePaidUsers]);

  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-start relative bg-[#ebedf0]">
      {/* ── 1. Top Section (Fixed / Sticky Property Overview) ── */}
      <div className="sticky top-[70px] sm:top-[88px] z-10 w-full pt-1 sm:pt-2 pb-6 px-4 flex flex-col items-center pointer-events-auto">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 bg-white border border-black/[0.05] shadow-[0_12px_36px_-8px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.03)] relative overflow-hidden">
            {/* Top ambient highlight */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

            {/* Title */}
            <h2 className="text-2xl sm:text-[28px] font-bold tracking-[-0.025em] text-[#111827] leading-tight truncate">
              {propertyName}
            </h2>

            {/* Location if available */}
            {locationText && (
              <p className="text-sm sm:text-[15px] text-slate-500 font-medium tracking-[-0.01em] truncate mt-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span className="truncate">{locationText}</span>
              </p>
            )}

            {/* Category and Rating (Unboxed) */}
            <div className="flex items-center gap-4 mt-3.5 pb-4 border-b border-slate-200/70">
              <div className="inline-flex items-center gap-1.5 text-slate-800 text-sm sm:text-[15px] font-semibold tracking-tight">
                <svg className="w-4 h-4 text-slate-800 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>{propertyCategory} Category</span>
              </div>
              <span className="text-slate-300 text-base">&bull;</span>
              <div className="inline-flex items-center gap-1.5 text-slate-800 text-sm sm:text-[15px] font-semibold tracking-tight">
                <span className="text-amber-500 text-base leading-none">★</span>
                <span>{rating}</span>
              </div>
            </div>

            {/* Dual Info: FOR & JOINED (Unboxed with horizontal line separation) */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200/70">
              {/* For Gender */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center text-slate-500 shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] uppercase font-semibold tracking-[0.08em] text-slate-400 leading-tight">FOR</span>
                  <span className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight truncate mt-0.5">
                    {genderType}
                  </span>
                </div>
              </div>

              {/* Joined Date */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center text-slate-500 shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] uppercase font-semibold tracking-[0.08em] text-slate-400 leading-tight">JOINED</span>
                  <span className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight truncate mt-0.5">
                    {formattedJoinedDate || 'Nov 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* UPI Direct Payment Status (Unboxed with horizontal line separation) */}
            {hostProperty?.upiSettings?.upiId && (
              <div className="py-4 border-b border-slate-200/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight truncate">
                    UPI: <span className="font-medium text-slate-600">{hostProperty.upiSettings.upiId}</span>
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0">
                  Active
                </span>
              </div>
            )}

            {/* Action Buttons: Public URL & Edit (Fully Rounded Borders) */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {/* Public URL */}
              <button
                type="button"
                onClick={handleOpenPublicUrl}
                className="w-full py-3 sm:py-3.5 px-4 rounded-full text-[15px] sm:text-base font-semibold tracking-tight flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-300/80 text-slate-800 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Public URL</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
                </svg>
              </button>

              {/* Edit Button */}
              {onEditDetails ? (
                <button
                  type="button"
                  onClick={onEditDetails}
                  className="w-full py-3 sm:py-3.5 px-4 bg-[#111827] border border-black text-white rounded-full text-[15px] sm:text-base font-semibold tracking-tight flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-3 sm:py-3.5 px-4 bg-[#111827] border border-black text-white rounded-full text-[15px] sm:text-base font-semibold tracking-tight flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Bottom Section: White Rounded Window (Rooms & Revenue Analysis) ── */}
      <section className="relative z-20 w-full bg-white rounded-t-[36px] sm:rounded-t-[48px] shadow-[0_-12px_36px_rgba(0,0,0,0.08),0_-4px_14px_rgba(0,0,0,0.04)] pt-6 sm:pt-8 pb-36 sm:pb-40 px-4 sm:px-6 lg:px-8 mt-2 min-h-screen">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 w-full text-center">
          <div className="w-10 h-1 bg-slate-300/80 rounded-full mb-3" />
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none text-center">
            Rooms &amp; Revenue Analysis
          </h2>
          <span className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{analytics.occupancyPct}% Occupancy &bull; {analytics.totalBookingsCount} Paid {analytics.totalBookingsCount === 1 ? 'Booking' : 'Bookings'}</span>
          </span>
        </div>

        {/* Analytics Content */}
        <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-5">
          {/* Primary 3 KPI Cards: Total Rooms, Booked Rooms, Total Revenue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Total Rooms */}
            <div className="rounded-3xl p-4 sm:p-5 bg-[#F7F9FC] border border-slate-200/80 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Rooms</span>
                <span className="w-8 h-8 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-700 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tracking-tight leading-none">
                  {analytics.totalRooms}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  {analytics.totalBeds} total {analytics.totalBeds === 1 ? 'bed' : 'beds'} capacity
                </p>
              </div>
            </div>

            {/* Booked Rooms */}
            <div className="rounded-3xl p-4 sm:p-5 bg-[#F4FBF7] border border-emerald-200/80 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Booked Rooms</span>
                <span className="w-8 h-8 rounded-full bg-white border border-emerald-200/70 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-800 font-mono tracking-tight leading-none">
                    {analytics.bookedRooms}
                  </p>
                  <span className="text-xs font-semibold text-emerald-600">
                    / {analytics.totalRooms}
                  </span>
                </div>
                <p className="text-xs text-emerald-700/80 mt-1.5 font-medium">
                  {analytics.availableRooms} {analytics.availableRooms === 1 ? 'room' : 'rooms'} available
                </p>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="rounded-3xl p-4 sm:p-5 bg-[#111827] text-white border border-slate-800 flex flex-col justify-between gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Total Revenue</span>
                <span className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight leading-none">
                  ₹{analytics.totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">
                  Across {analytics.totalBookingsCount} verified {analytics.totalBookingsCount === 1 ? 'payment' : 'payments'}
                </p>
              </div>
            </div>
          </div>

          {/* Room Occupancy & Revenue Split Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Occupancy Progress Card */}
            <div className="rounded-3xl p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Room Occupancy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Active occupied vs available inventory</p>
                </div>
                <span className="text-lg font-bold font-mono text-slate-900">{analytics.occupancyPct}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, analytics.occupancyPct))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Booked: {analytics.bookedRooms}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  Vacant: {analytics.availableRooms}
                </span>
              </div>
            </div>

            {/* Revenue Channel Split Card */}
            <div className="rounded-3xl p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Revenue Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Online Direct UPI vs Offline Counter</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {analytics.onlineCount + analytics.offlineCount} txns
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                {analytics.totalRevenue > 0 ? (
                  <>
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${analytics.onlineShare}%` }}
                    />
                    <div
                      className="h-full bg-teal-500 transition-all duration-500"
                      style={{ width: `${analytics.offlineShare}%` }}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-200" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 px-3 py-2">
                  <span className="text-indigo-700 font-semibold block">Online ({analytics.onlineCount})</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ₹{analytics.onlineRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="rounded-2xl bg-teal-50/70 border border-teal-100 px-3 py-2">
                  <span className="text-teal-700 font-semibold block">Offline ({analytics.offlineCount})</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ₹{analytics.offlineRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Room Categories Summary (if configured) */}
          {analytics.categoryBreakdown.length > 0 && (
            <div className="rounded-3xl p-4 sm:p-5 bg-[#F8FAFC] border border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Room Categories</h3>
                <span className="text-xs font-medium text-slate-500">
                  {analytics.categoryBreakdown.length} {analytics.categoryBreakdown.length === 1 ? 'category' : 'categories'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analytics.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between rounded-2xl bg-white border border-slate-200/70 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{cat.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {cat.booked} booked &bull; {Math.max(0, cat.total - cat.booked)} free
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-mono font-bold text-slate-800 block">
                        ₹{cat.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {cat.total} {cat.total === 1 ? 'room' : 'rooms'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions to Manage Rooms or View Paid Records */}
          {typeof onSwitchTab === 'function' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onSwitchTab('room')}
                className="w-full py-3 px-4 rounded-2xl bg-[#F4F6F9] hover:bg-slate-100 border border-slate-200/80 text-slate-800 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
              >
                Manage Rooms
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('paid')}
                className="w-full py-3 px-4 rounded-2xl bg-[#1f1b16] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
              >
                View Paid Records
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PropertyDetailsSection;
