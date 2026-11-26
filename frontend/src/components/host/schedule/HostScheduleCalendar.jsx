import React, { useState, useMemo, lazy, Suspense, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOccupantsForRoomInMonth } from '../../../utils/dateUtils';
import { PersonOccupancyGrid } from '../../common/PersonOccupancyGrid';

const MonthOccupantsListModal = lazy(() =>
 import('./MonthOccupantsListModal').then((m) => ({ default: m.MonthOccupantsListModal }))
);

const extractDateKey = (val) => {
 if (!val) return '';
 if (val instanceof Date) {
 if (isNaN(val.getTime())) return '';
 const y = val.getUTCFullYear() < 2025 ? 2026 : val.getUTCFullYear();
 const m = String(val.getUTCMonth() + 1).padStart(2, '0');
 const d = String(val.getUTCDate()).padStart(2, '0');
 return `${y}-${m}-${d}`;
 }
 const str = String(val).trim();
 // 1. Match DD Mon YYYY e.g. "Thu 22 Oct 2026" or "22 Oct 2026" or "Sun 1 Nov 2026"
 const MONTHS = {
 jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
 jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
 january: '01', february: '02', march: '03', april: '04', june: '06',
 july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
 };
 const textMatch = str.match(/(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
 if (textMatch) {
 const d = String(textMatch[1]).padStart(2, '0');
 const monKey = textMatch[2].slice(0, 3).toLowerCase();
 const m = MONTHS[monKey] || '11';
 let y = textMatch[3];
 if (parseInt(y, 10) < 2025) y = '2026';
 return `${y}-${m}-${d}`;
 }
 // 2. Match pure date-only YYYY-MM-DD
 const pureIsoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (pureIsoMatch) {
 let [_, y, m, d] = pureIsoMatch;
 if (parseInt(y, 10) < 2025) y = '2026';
 return `${y}-${m}-${d}`;
 }
 const parsed = new Date(str);
 if (!isNaN(parsed.getTime())) {
 const y = parsed.getFullYear() < 2025 ? 2026 : parsed.getFullYear();
 const m = String(parsed.getMonth() + 1).padStart(2, '0');
 const d = String(parsed.getDate()).padStart(2, '0');
 return `${y}-${m}-${d}`;
 }
 return '';
};

const formatCleanSlotDate = (dateVal) => {
 if (!dateVal) return '';
 if (typeof dateVal === 'string' && dateVal.includes('(') && dateVal.includes(')')) {
 return dateVal.replace(/\s*\([^)]*\)/, '').trim();
 }
 const key = extractDateKey(dateVal);
 if (key) {
 const [y, m, d] = key.split('-').map(Number);
 const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
 const dayName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
 const monthName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
 return `${dayName} ${d} ${monthName} ${y}`;
 }
 return String(dateVal);
};

const getCleanSlotTiming = (dateVal, isCheckIn, isMonthly) => {
 if (typeof dateVal === 'string') {
 const match = dateVal.match(/\(([^)]+)\)/);
 if (match) return match[1];
 }
 if (isMonthly) {
 return isCheckIn ? '12:00 AM' : '11:59 PM';
 }
 return isCheckIn ? '12:00 PM' : '11:59 AM';
};

const isGuestMatchingSelected = (g, target) => {
 if (!g || !target) return false;
 const gId = String(g.bookingId || g._id || g.bookingReferenceId || '');
 const tId = String(target.bookingId || target._id || target.bookingReferenceId || '');
 if (gId && tId && gId === tId) return true;

 if (target.bookingReferenceId && g.bookingReferenceId && target.bookingReferenceId === g.bookingReferenceId) {
 return true;
 }

 const gPhone = String(g.phone || g.userPhone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
 const tPhone = String(target.phone || target.userPhone || target.guestPhone || '').replace(/\D/g, '').slice(-10);
 if (gPhone && tPhone) {
 return gPhone === tPhone;
 }

 if (gId || tId) return false;

 const gName = String(g.name || g.userName || g.fullName || g.guestName || '').trim().toLowerCase();
 const tName = String(target.name || target.userName || target.fullName || target.guestName || '').trim().toLowerCase();
 if (gName && tName && gName === tName) return true;

 return false;
};

export function HostScheduleCalendar({
 isMonthly,
 isPropertyApproved,
 hostProperty,
 roomDisplay,
 roomTypeDisplay,
 priceDisplay,
 reservationDetails,
 sortedSelected = [],
 upcomingMonths = [],
 roomBookingInfo,
 selectedSlotIndices,
 handleToggleSlotMonth,
 monthGroups,
 selectedMonthIdx,
 setSelectedMonthIdx,
 upcomingWeek = [],
 WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
 todayISO,
 handleToggleSlotDay,
 handleOpenOccupantModal,
 roomOccupantsList = [],
 isUserRequestSelection = false,
 requestedUserBooking = null,
 selectedRoomCard,
 activeCategory,
 guests = [],
 isOccupantModalOpen = false,
 isRoomSavedToDb = true,
 selectedBookedGuest = null,
 onClearBookedGuest = () => {},
 hideCheckInOutTimes = false,
 hideMonthCardExtras = false,
 hideBookedGuestBanner = false,
 onOpenAddGuestModal = null,
 forceLight = false,
}) {
 const [activeMonthModalKey, setActiveMonthModalKey] = useState(null);
 const [activeDateModalISO, setActiveDateModalISO] = useState(null);
 const [isRoomOccupantsModalOpen, setIsRoomOccupantsModalOpen] = useState(false);

	const cleanRoomNum = useMemo(() => {
		const raw = selectedRoomCard?.roomNumber || (typeof roomDisplay === 'string' ? roomDisplay : '');
		if (!raw) return '';
		return String(raw).replace(/^room[- ]*/i, '').trim();
	}, [selectedRoomCard?.roomNumber, roomDisplay]);

 const hasCheckInBanner = Boolean(!isUserRequestSelection && !selectedBookedGuest && reservationDetails);
 const hasWarningBanner = Boolean(!isRoomSavedToDb);
 const hasAdminLockBanner = Boolean(!isPropertyApproved);
 const hasUserReqBanner = Boolean(!hideBookedGuestBanner && isUserRequestSelection && reservationDetails);
 const hasBookedGuestBanner = Boolean(!hideBookedGuestBanner && selectedBookedGuest);

 const hasActiveBanner = Boolean(
 hasCheckInBanner ||
 hasWarningBanner ||
 hasAdminLockBanner ||
 hasUserReqBanner ||
 hasBookedGuestBanner
 );

 const calendarCardRef = useRef(null);

 const [calendarGridHeight, setCalendarGridHeight] = useState('auto');
 const calendarGridContentRef = useRef(null);

 useLayoutEffect(() => {
 if (!calendarGridContentRef.current) return;
 const el = calendarGridContentRef.current;

 const measureHeight = () => {
 const h = el.offsetHeight;
 if (h > 0) {
 setCalendarGridHeight(h);
 }
 };

 measureHeight();

 const ro = new ResizeObserver(() => {
 measureHeight();
 });
 ro.observe(el);

 return () => ro.disconnect();
 }, [selectedMonthIdx, monthGroups]);

 const activeMonthOccupantsModal = useMemo(() => {
 if (!activeMonthModalKey) return null;
 const m = upcomingMonths.find((item) => item.monthKey === activeMonthModalKey);
 if (!m) return null;

 const roomCapacity = Math.max(
 1,
 Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
 );

 const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
 const allOccupants = (roomOccupantsList && roomOccupantsList.length > 0)
 ? roomOccupantsList
 : monthOccupants;

 const occupiedCount = Math.min(
 roomCapacity,
 monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0)
 );
 const isFullyBooked = occupiedCount >= roomCapacity;
 const isPartiallyBooked = occupiedCount > 0 && occupiedCount < roomCapacity;

 return {
 monthKey: m.monthKey,
 monthShort: m.monthShort,
 year: m.year,
 occupiedCount,
 roomCapacity,
 occupants: allOccupants,
 isFullyBooked,
 isPartiallyBooked,
 monthIndex: m.index,
 isDaily: false,
 };
 }, [activeMonthModalKey, upcomingMonths, selectedRoomCard, activeCategory, guests, roomOccupantsList]);

 const activeDateOccupantsModal = useMemo(() => {
 if (!activeDateModalISO) return null;

 const roomCapacity = Math.max(
 1,
 Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
 );

 // List of all booked users for this room
 const allOccupants = (roomOccupantsList && roomOccupantsList.length > 0)
 ? roomOccupantsList
 : (guests || []);

 const [dy, dm, dd] = activeDateModalISO.split('-').map(Number);
 const dateObj = new Date(dy, dm - 1, dd);
 const formattedDate = !isNaN(dateObj.getTime())
 ? dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
 : activeDateModalISO;

 const slotIndex = (upcomingWeek || []).findIndex((s) => s.fullISO === activeDateModalISO);

 return {
 monthKey: activeDateModalISO,
 dateTitle: formattedDate,
 occupiedCount: allOccupants.length,
 roomCapacity,
 occupants: allOccupants,
 isFullyBooked: allOccupants.length >= roomCapacity,
 isPartiallyBooked: allOccupants.length > 0 && allOccupants.length < roomCapacity,
 slotIndex: slotIndex >= 0 ? slotIndex : null,
 isDaily: true,
 };
 }, [activeDateModalISO, roomOccupantsList, guests, selectedRoomCard, activeCategory, upcomingWeek]);

 const activeRoomOccupantsModal = useMemo(() => {
 if (!isRoomOccupantsModalOpen) return null;

 const roomCapacity = Math.max(
 1,
 Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
 );

 const allOccupants = Array.isArray(roomOccupantsList) ? roomOccupantsList : [];
 const occupiedCount = allOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);

 return {
 monthKey: 'room-occupants',
 dateTitle: 'All Occupants',
 occupiedCount,
 roomCapacity,
 occupants: allOccupants,
 isFullyBooked: false,
 isPartiallyBooked: false,
 isDaily: !isMonthly,
 hideBookFooter: true,
 };
 }, [isRoomOccupantsModalOpen, selectedRoomCard, activeCategory, roomOccupantsList, isMonthly]);

 const activeOccupantsModalData = activeRoomOccupantsModal || activeDateOccupantsModal || activeMonthOccupantsModal;

 const selectedISOSet = useMemo(() => {
 const set = new Set();
 selectedSlotIndices.forEach((idx) => {
 if (upcomingWeek[idx]?.fullISO) {
 set.add(upcomingWeek[idx].fullISO);
 }
 });
 return set;
 }, [selectedSlotIndices, upcomingWeek]);

 const findFullOccupant = (guestSummary) => {
 if (!guestSummary) return null;
 let matched = roomOccupantsList.find((occ) => {
 const gId = guestSummary.bookingId || guestSummary._id || guestSummary.bookingReferenceId || guestSummary.id;
 const occId = occ.bookingId || occ._id || occ.bookingReferenceId || occ.id;
 if (gId && occId && String(gId) === String(occId)) return true;

 const gRef = guestSummary.bookingReferenceId;
 const occRef = occ.bookingReferenceId;
 if (gRef && occRef && String(gRef) === String(occRef)) return true;

 const gName = guestSummary.userName || guestSummary.name;
 const occName = occ.name || occ.userName;
 const gPhone = guestSummary.phone || guestSummary.userPhone;
 const occPhone = occ.phone || occ.userPhone;

 if (gName && occName && gName.trim().toLowerCase() === occName.trim().toLowerCase()) {
 if (gPhone && occPhone) {
 return gPhone.replace(/\D/g, '').slice(-10) === occPhone.replace(/\D/g, '').slice(-10);
 }
 return true;
 }
 return false;
 });

 const cleanDigits = (guestSummary.phone || guestSummary.userPhone || '').replace(/\D/g, '').slice(-10);
 const guestFromAll = (Array.isArray(guests) ? guests : []).find((g) => {
 const gId = g._id || g.id || g.bookingReferenceId;
 const targetId = guestSummary.bookingId || guestSummary._id || guestSummary.bookingReferenceId || guestSummary.id;
 if (targetId && gId && (String(gId) === String(targetId) || String(g.bookingReferenceId) === String(targetId))) return true;
 if (guestSummary.bookingReferenceId && String(g.bookingReferenceId) === String(guestSummary.bookingReferenceId)) return true;
 const gDigits = (g.phone || g.userPhone || '').replace(/\D/g, '').slice(-10);
 if (cleanDigits && gDigits && cleanDigits === gDigits) return true;
 return false;
 });

 if (matched || guestFromAll) {
 return {
 ...(guestFromAll || {}),
 ...(matched || {}),
 checkInCode: (matched?.bookingSource === 'OFFLINE_HOST' || matched?.paymentMethod === 'OFFLINE' || guestFromAll?.bookingSource === 'OFFLINE_HOST' || guestSummary.bookingSource === 'OFFLINE_HOST' || guestSummary.isOffline) ? '' : (matched?.checkInCode || guestFromAll?.checkInCode || guestSummary.checkInCode || ''),
 aadhar:
 matched?.aadhar ||
 matched?.aadharNumber ||
 matched?.guestAadhar ||
 guestFromAll?.guestAadhar ||
 guestFromAll?.aadharNumber ||
 guestFromAll?.aadhar ||
 guestSummary.aadhar ||
 '',
 aadharNumber:
 matched?.aadharNumber ||
 matched?.guestAadhar ||
 matched?.aadhar ||
 guestFromAll?.aadharNumber ||
 guestFromAll?.guestAadhar ||
 guestFromAll?.aadhar ||
 guestSummary.aadharNumber ||
 '',
 guestAadhar:
 matched?.guestAadhar ||
 matched?.aadharNumber ||
 matched?.aadhar ||
 guestFromAll?.guestAadhar ||
 guestFromAll?.aadharNumber ||
 guestFromAll?.aadhar ||
 guestSummary.guestAadhar ||
 '',
 bookingReferenceId:
 matched?.bookingReferenceId || guestFromAll?.bookingReferenceId || guestSummary.bookingReferenceId || '',
 name:
 matched?.name ||
 guestFromAll?.userName ||
 guestFromAll?.fullName ||
 guestSummary.userName ||
 guestSummary.name ||
 'Occupant',
 phone:
 matched?.phone ||
 guestFromAll?.userPhone ||
 guestFromAll?.phone ||
 guestSummary.phone ||
 guestSummary.userPhone ||
 '',
 email:
 matched?.email ||
 guestFromAll?.userEmail ||
 guestFromAll?.email ||
 guestSummary.email ||
 guestSummary.userEmail ||
 '',
 };
 }

 return {
 ...guestSummary,
 _id: guestSummary._id || guestSummary.bookingId || guestSummary.bookingReferenceId,
 bookingId: guestSummary.bookingId || guestSummary._id,
 bookingReferenceId: guestSummary.bookingReferenceId,
 checkInCode: (guestSummary.bookingSource === 'OFFLINE_HOST' || guestSummary.isOffline || guestSummary.paymentMethod === 'OFFLINE') ? '' : (guestSummary.checkInCode || ''),
 name: guestSummary.userName || guestSummary.fullName || guestSummary.name || guestSummary.guestName || 'Occupant',
 phone: guestSummary.phone || guestSummary.userPhone || guestSummary.guestPhone || '',
 email: guestSummary.email || guestSummary.userEmail || guestSummary.guestEmail || '',
 aadhar: guestSummary.aadhar || guestSummary.aadharNumber || guestSummary.guestAadhar || guestSummary.aadharId || '',
 personCount: Number(guestSummary.personCount) || 1,
 gender: guestSummary.gender || '',
 bookedDates: guestSummary.bookedDates || [],
 bookedMonths: guestSummary.bookedMonths || [],
 rateUnit: guestSummary.rateUnit,
 checkIn: guestSummary.checkIn,
 checkOut: guestSummary.checkOut,
 checkInISO: guestSummary.checkInISO,
 checkOutISO: guestSummary.checkOutISO,
 status: guestSummary.status || 'CONFIRMED',
 totalAmount: guestSummary.totalAmount !== undefined ? guestSummary.totalAmount : (guestSummary.paidAmount || 0),
 source: guestSummary.source || 'booking',
 roomNumber: guestSummary.roomNumber || selectedRoomCard?.roomNumber,
 };
 };

 const isWithinSelectedRange = useMemo(() => {
 if (!selectedBookedGuest) return () => false;
 if (Array.isArray(selectedBookedGuest.bookedDates) && selectedBookedGuest.bookedDates.length > 0) {
 const set = new Set(selectedBookedGuest.bookedDates.map((d) => extractDateKey(d)).filter(Boolean));
 return (iso) => set.has(iso);
 }
 const rawIn = extractDateKey(selectedBookedGuest.checkInISO || selectedBookedGuest.checkIn);
 const rawOut = extractDateKey(selectedBookedGuest.checkOutISO || selectedBookedGuest.checkOut);
 if (rawIn && rawOut) {
 if (rawIn === rawOut) return (iso) => iso === rawIn;
 return (iso) => iso >= rawIn && iso < rawOut;
 }
 return () => false;
 }, [selectedBookedGuest]);

 // Range-based helper for monthly bookings (UTC month intersection)
 const getMonthlyBooking = (monthKey) => {
 if (roomBookingInfo?.monthToGuestMap?.[monthKey]) {
 return roomBookingInfo.monthToGuestMap[monthKey];
 }
 const [mYear, mMonth] = monthKey.split('-').map(Number);
 const targetVal = mYear * 100 + mMonth;

 return roomOccupantsList.find((b) => {
 const rawIn = b.checkInISO || b.checkIn;
 const rawOut = b.checkOutISO || b.checkOut;
 if (!rawIn || !rawOut) return false;

 const bIn = new Date(rawIn);
 const bOut = new Date(rawOut);
 if (isNaN(bIn.getTime()) || isNaN(bOut.getTime())) return false;

 // Strict UTC extraction prevents positive timezone roll-overs into the next month
 const startVal = bIn.getUTCFullYear() * 100 + (bIn.getUTCMonth() + 1);
 const endVal = bOut.getUTCFullYear() * 100 + (bOut.getUTCMonth() + 1);

 return targetVal >= startVal && targetVal <= endVal;
 });
 };

 // Range-based helper for daily/nightly bookings (strict date key comparison)
 const getDailyBooking = (fullISO) => {
 if (roomBookingInfo?.dateToGuestMap?.[fullISO]) {
 return roomBookingInfo.dateToGuestMap[fullISO];
 }
 return roomOccupantsList.find((b) => {
 if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
 const hasDate = b.bookedDates.some((d) => extractDateKey(d) === fullISO);
 if (hasDate) return true;
 }

 const inKey = extractDateKey(b.checkInISO || b.checkIn);
 const outKey = extractDateKey(b.checkOutISO || b.checkOut);
 if (!inKey || !outKey) return false;

 if (inKey === outKey) {
 return fullISO === inKey;
 }
 return fullISO >= inKey && fullISO < outKey;
 });
 };

 const occupancyPercentage = useMemo(() => {
 const roomCapacity = Math.max(
 1,
 Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
 );

 if (isMonthly) {
 if (!upcomingMonths || upcomingMonths.length === 0) return 0;
 const totalSlots = upcomingMonths.length * roomCapacity;
 let occupiedSlots = 0;
 upcomingMonths.forEach((m) => {
 const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
 let count = monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);
 if (count === 0 && getMonthlyBooking(m.monthKey)) {
 count = 1;
 }
 occupiedSlots += Math.min(roomCapacity, count);
 });
 return totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
 } else {
 if (!upcomingWeek || upcomingWeek.length === 0) return 0;
 const totalSlots = upcomingWeek.length * roomCapacity;
 let occupiedSlots = 0;
 upcomingWeek.forEach((day) => {
 const fullISO = day.fullISO;
 const b = getDailyBooking(fullISO);
 if (b) {
 occupiedSlots += Math.min(roomCapacity, Number(b.personCount) || 1);
 }
 });
 return totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
 }
 }, [
 isMonthly,
 upcomingMonths,
 upcomingWeek,
 selectedRoomCard,
 activeCategory,
 guests,
 roomOccupantsList,
 roomBookingInfo,
 ]);

 return (
 <div
 ref={calendarCardRef}
 className={`w-full flex-1 flex flex-col select-none relative min-h-0 bg-transparent border-0 shadow-none ${forceLight ? 'pb-2' : 'pb-20 sm:pb-24'}`}
 >
		{/* Room Detail Banner & Occupant + Add Guest Actions */}
		<div className={`px-2.5 sm:px-4 py-2 sm:py-2.5 border-b relative z-10 w-full ${forceLight ? 'border-slate-100 bg-transparent' : 'max-xl:border-slate-100 max-xl:bg-transparent xl:border-white/15 xl:bg-white/10'}`}>
			<div className="flex items-center justify-between w-full gap-2">
				<div className="inline-flex items-center justify-center py-1 select-none min-w-0">
					<h2 className="text-[16px] sm:text-lg md:text-xl font-black tracking-tight leading-none flex items-center gap-1.5 truncate">
						<span className={forceLight ? 'text-black' : 'max-xl:text-black xl:text-white'}>Room No.</span>
						<span className={`${forceLight ? 'text-slate-400' : 'max-xl:text-slate-400 xl:text-sky-100'} font-semibold`}>{cleanRoomNum || 'Room'}</span>
					</h2>
				</div>

				{typeof onOpenAddGuestModal === 'function' && (
					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<button
							type="button"
							onClick={() => setIsRoomOccupantsModalOpen(true)}
							className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-[13.5px] shadow-sm border transition-all active:scale-95 cursor-pointer shrink-0 ${
								forceLight
									? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
									: 'max-xl:bg-white max-xl:hover:bg-slate-50 max-xl:text-slate-800 max-xl:border-slate-200 xl:bg-white/15 xl:hover:bg-white/25 xl:text-white xl:border-white/25'
							}`}
							title="View occupants for this room"
						>
							<span className="material-symbols-outlined text-[16px] sm:text-[17px]">group</span>
							<span className="leading-none tracking-tight">Occupant</span>
							{roomOccupantsList.length > 0 && (
								<span
									className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-semibold inline-flex items-center justify-center leading-none ${
										forceLight
											? 'bg-slate-900 text-white'
											: 'max-xl:bg-slate-900 max-xl:text-white xl:bg-white/25 xl:text-white'
									}`}
								>
									{roomOccupantsList.length}
								</span>
							)}
						</button>

						<button
							type="button"
							onClick={onOpenAddGuestModal}
							className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1f1b16] hover:bg-black text-white font-medium text-xs sm:text-[13.5px] shadow-sm border border-white/20 transition-all active:scale-95 cursor-pointer shrink-0"
							title="Add a new guest to this room"
						>
							<span className="material-symbols-outlined text-[17px] sm:text-[18px] text-emerald-400 font-medium">person_add</span>
							<span className="leading-none tracking-tight">Add Guest</span>
						</button>
					</div>
				)}
			</div>
		</div>

		<div className={`px-1.5 sm:px-3 pb-3 sm:pb-3.5 pt-2 sm:pt-2.5 flex flex-col gap-2 font-bold w-full ${forceLight ? 'text-[#0b0b0b]' : 'max-xl:text-[#0b0b0b] xl:text-white'}`}>

		{/* User Request Display-Only Banner */}
 <AnimatePresence initial={false} mode="sync">
 {hasUserReqBanner && (
 <motion.div
 key="user-req-banner"
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{
 height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
 opacity: { duration: 0.22, ease: 'easeOut' },
 }}
 className="overflow-hidden"
 >
 <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-600 text-white border border-purple-400 shadow-md space-y-1.5 mt-0.5">
 <div className="flex items-center justify-between pb-1 border-b border-purple-400/60 text-[11px]">
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-700 text-white font-medium text-[10.5px] border border-purple-400/80">
 <span className="w-1.5 h-1.5 rounded-full bg-purple-200 " />
 Online User
 </span>
 <span className="text-purple-100 font-medium text-[11px] truncate max-w-[180px]">
 {requestedUserBooking?.userName || requestedUserBooking?.fullName || requestedUserBooking?.guestName}
 </span>
 </div>

 <div className="flex items-center justify-between gap-2 w-full text-xs leading-tight">
 <div className="flex flex-col min-w-0">
 <span className="font-semibold text-white text-[12px] truncate">
 {reservationDetails.checkInDate}
 </span>
 <span className="font-normal text-[10.5px] text-purple-100/90 mt-0.5">
 ({reservationDetails.checkInTime})
 </span>
 </div>

 <div className="text-purple-200/50 text-xs px-1 shrink-0 font-medium">
 →
 </div>

 <div className="flex flex-col items-end text-right min-w-0">
 <span className="font-semibold text-white text-[12px] truncate">
 {reservationDetails.checkOutDate}
 </span>
 <span className="font-normal text-[10.5px] text-purple-100/90 mt-0.5">
 ({reservationDetails.checkOutTime})
 </span>
 </div>
 </div>

 {reservationDetails.unitPrice > 0 && (
 <div className="pt-1.5 border-t border-purple-400/60 flex items-center justify-between text-xs sm:text-[12.5px]">
 <span className="font-medium text-purple-100">
 {reservationDetails.priceBreakdown}
 </span>
 <span className="font-medium text-white">
 ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
 </span>
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* Booked Guest Banner */}
 {hasBookedGuestBanner && (
 <motion.div
 key="booked-guest-banner"
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{
 height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
 opacity: { duration: 0.22, ease: 'easeOut' },
 }}
 className="overflow-hidden"
 >
 <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white border border-emerald-400 shadow-md space-y-1.5 mt-0.5">
 <div className="flex items-center justify-between pb-1 border-b border-emerald-400/60 text-[11px]">
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-700/90 text-white font-medium text-[10.5px] border border-emerald-400/80">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 " />
 {selectedBookedGuest.bookingSource === 'ONLINE' || selectedBookedGuest.bookingSource === 'ONLINE_USER' || selectedBookedGuest.isOnline
 ? 'Online User'
 : 'Offline Guest'}
 </span>
 <div className="flex items-center gap-2">
 <span className="text-emerald-100 font-semibold text-[11px] truncate max-w-[180px]">
 {selectedBookedGuest.userName || selectedBookedGuest.fullName || selectedBookedGuest.guestName}
 </span>
 {onClearBookedGuest && (
 <button
 type="button"
 onClick={onClearBookedGuest}
 className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer border border-emerald-400"
 title="Dismiss banner"
 >
 
 </button>
 )}
 </div>
 </div>

 {(() => {
 const checkInRaw = selectedBookedGuest.checkIn || selectedBookedGuest.checkInISO;
 const checkOutRaw = selectedBookedGuest.checkOut || selectedBookedGuest.checkOutISO;
 const checkInFormatted = formatCleanSlotDate(checkInRaw);
 const checkInTiming = getCleanSlotTiming(checkInRaw, true, isMonthly);
 const checkOutFormatted = formatCleanSlotDate(checkOutRaw);
 const checkOutTiming = getCleanSlotTiming(checkOutRaw, false, isMonthly);

 return (
 <div className="flex items-center justify-between gap-2 w-full text-xs leading-tight">
 <div className="flex flex-col min-w-0">
 <span className="font-semibold text-white text-[12px] truncate">
 {checkInFormatted || 'Check-in'}
 </span>
 <span className="font-normal text-[10.5px] text-emerald-100/90 mt-0.5">
 ({checkInTiming})
 </span>
 </div>

 <div className="text-emerald-200/50 text-xs px-1 shrink-0 font-medium">
 →
 </div>

 <div className="flex flex-col items-end text-right min-w-0">
 <span className="font-semibold text-white text-[12px] truncate">
 {checkOutFormatted || 'Check-out'}
 </span>
 <span className="font-normal text-[10.5px] text-emerald-100/90 mt-0.5">
 ({checkOutTiming})
 </span>
 </div>
 </div>
 );
 })()}

 <div className="pt-1.5 border-t border-emerald-400/60 flex items-center justify-between text-xs sm:text-[12.5px]">
 <span className="font-medium text-emerald-100">
 {selectedBookedGuest.durationDisplay || (isMonthly ? 'Monthly Stay' : 'Nightly Stay')} • {selectedBookedGuest.personCount || 1} Person{Number(selectedBookedGuest.personCount) > 1 ? 's' : ''}
 </span>
 <span className="font-medium text-white">
 ₹{Number(selectedBookedGuest.totalAmount || selectedBookedGuest.price || 0).toLocaleString('en-IN')}
 </span>
 </div>
 </div>
 </motion.div>
 )}

  {/* State B: Unsaved Room Lock Banner (Image 3) */}
 {hasWarningBanner && (
 <motion.div
 key="unsaved-room-lock-banner"
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{
 height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
 opacity: { duration: 0.22, ease: 'easeOut' },
 }}
 className="overflow-hidden"
 >
 <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#191512] border border-amber-500/40 text-white flex items-start gap-2.5 shadow-md mt-0.5">
 <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5 flex-wrap">
 <h4 className="text-xs sm:text-[12.5px] font-medium text-white tracking-tight">
 Room Slots Locked — Unsaved Room Number
 </h4>
 <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 ">
 Pending Update
 </span>
 </div>
 <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
 This room number is not saved in the database yet. Click the <span className="font-medium text-amber-400">"Update"</span> button on the room category tab to save it to the database and unlock slot scheduling.
 </p>
 </div>
 </div>
 </motion.div>
 )}

 {/* Amber Lock Banner: Awaiting Admin Approval */}
 {hasAdminLockBanner && (
 <motion.div
 key="unapproved-lock-banner"
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{
 height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
 opacity: { duration: 0.22, ease: 'easeOut' },
 }}
 className="overflow-hidden"
 >
 <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#191512] border border-amber-500/40 text-white flex items-start gap-2.5 shadow-md mt-0.5">
 <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
 <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5 flex-wrap">
 <h4 className="text-xs sm:text-[12.5px] font-medium text-white tracking-tight">
 Slots Locked — Awaiting Admin Approval
 </h4>
 <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 ">
 {hostProperty?.status || 'Pending Approval'}
 </span>
 </div>
 <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
 No host can select any month or date slots until an Admin approves this property on the Admin Dashboard.
 </p>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Month Card Header & Subtitle — label removed per UI request */}
 {!hideMonthCardExtras && isUserRequestSelection && (
 <div className="flex items-center justify-between pt-0.5">
 <span className="text-[15px] sm:text-[16px] font-bold max-xl:text-[#0b0b0b] xl:text-sky-100 flex items-center gap-1.5">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-code-sm text-[11px] font-medium bg-white/20 text-white border border-white/30">
 <span className="material-symbols-outlined text-[13px]">lock</span>
 Display-Only
 </span>
 </span>
 <span className="text-[13.5px] sm:text-[14.5px] font-medium text-white">
 {isMonthly
 ? `${sortedSelected.length} Month(s) Requested`
 : `${sortedSelected.length} Night(s) Requested`}
 </span>
 </div>
 )}
 {/* Schedule Matrix */}
 {isMonthly ? (
 <div className="space-y-4">
 <div className="w-full bg-transparent border-0 shadow-none p-0">
							<div className="grid grid-cols-4 gap-1.5 sm:gap-2">
 {(() => {
 const roomCapacity = Math.max(
 1,
 Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
 );

 return upcomingMonths.map((m) => {
 const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
 const occupiedCount = Math.min(
 roomCapacity,
 monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0)
 );
 const isFullyBooked = occupiedCount >= roomCapacity;
 const isPartiallyBooked = occupiedCount > 0 && occupiedCount < roomCapacity;
 const isSelected = selectedSlotIndices.includes(m.index);
 const isCurrentMonth = m.isCurrentMonth;
 const isLocked = (!isPropertyApproved || !isRoomSavedToDb) && !isFullyBooked && occupiedCount === 0;

 const primaryOccupant = monthOccupants[0] || getMonthlyBooking(m.monthKey);

 const isGuestBookedInThisMonth = Boolean(
 selectedBookedGuest &&
 (() => {
 if (Array.isArray(selectedBookedGuest.bookedMonths) && selectedBookedGuest.bookedMonths.length > 0) {
 return selectedBookedGuest.bookedMonths.includes(m.monthKey);
 }
 if (Array.isArray(selectedBookedGuest.bookedDates) && selectedBookedGuest.bookedDates.length > 0) {
 return selectedBookedGuest.bookedDates.some((d) => String(d).startsWith(m.monthKey));
 }
 const inVal = selectedBookedGuest.checkInISO || selectedBookedGuest.checkIn;
 const outVal = selectedBookedGuest.checkOutISO || selectedBookedGuest.checkOut;
 if (inVal && outVal) {
 const inK = extractDateKey(inVal);
 const outK = extractDateKey(outVal);
 if (inK && outK) {
 return m.monthKey >= inK.slice(0, 7) && m.monthKey <= outK.slice(0, 7);
 }
 }
 return false;
 })()
 );

 const isSelectedBookedMonth = Boolean(
 selectedBookedGuest &&
 isGuestBookedInThisMonth &&
 (
 (primaryOccupant && isGuestMatchingSelected(primaryOccupant, selectedBookedGuest)) ||
 (monthOccupants.some((occ) => isGuestMatchingSelected(occ, selectedBookedGuest))) ||
 isGuestBookedInThisMonth
 )
 );

 const isOnlineBooking = Boolean(
 primaryOccupant?.isOnline === true ||
 primaryOccupant?.bookingSource === 'ONLINE_USER' ||
 (primaryOccupant?.source === 'booking' && primaryOccupant?.bookingSource !== 'OFFLINE_HOST')
 );

 const isSelectedMonthOnline = Boolean(
 isOnlineBooking ||
 selectedBookedGuest?.isOnline === true ||
 selectedBookedGuest?.bookingSource === 'ONLINE_USER' ||
 selectedBookedGuest?.bookingSource === 'ONLINE'
 );

 return (
 <button
 type="button"
 key={m.monthKey}
 disabled={(!isFullyBooked && (!isPropertyApproved || !isRoomSavedToDb)) || (isUserRequestSelection && !isFullyBooked && !isPartiallyBooked)}
 onClick={() => {
 if (isFullyBooked) {
 setActiveMonthModalKey(m.monthKey);
 } else if (!isUserRequestSelection) {
 handleToggleSlotMonth(m.index);
 }
 }}
 className={`relative aspect-square p-1 sm:p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border select-none transition-all flex flex-col justify-between items-center text-center outline-none ${
 isSelectedBookedMonth && !forceLight
 ? isSelectedMonthOnline
 ? 'animate-slot-flash border-2 font-medium shadow-md cursor-pointer'
 : 'animate-booked-slot-flash border-2 font-medium shadow-md cursor-pointer'
 : isFullyBooked
 ? forceLight
 ? 'bg-amber-50 text-amber-900 border-2 border-amber-400 cursor-pointer hover:border-amber-300'
 : 'max-xl:bg-amber-50 max-xl:text-amber-900 max-xl:border-2 max-xl:border-amber-400 text-white border-2 border-amber-400 cursor-pointer hover:border-amber-300'
 : isLocked
 ? 'bg-white/5 border border-dashed border-white/20 text-white/40 cursor-not-allowed opacity-50'
 : isSelected && !isUserRequestSelection
 ? 'bg-white text-[#1f1b16] border-2 border-slate-900 z-10 cursor-pointer shadow-sm'
 : isPartiallyBooked
 ? forceLight
 ? 'bg-amber-50/70 border-2 border-amber-300 text-amber-900 font-medium hover:border-amber-200 cursor-pointer'
 : 'max-xl:bg-amber-50/70 max-xl:border-2 max-xl:border-amber-300 max-xl:text-amber-900 xl:bg-amber-950/40 xl:border-2 xl:border-amber-300 xl:text-amber-100 font-medium hover:border-amber-200 cursor-pointer'
 : isUserRequestSelection
 ? forceLight
 ? 'bg-white border border-slate-200/90 text-slate-900 cursor-default pointer-events-none'
 : 'bg-white/10 border border-white/20 text-white/40 cursor-not-allowed pointer-events-none'
 : forceLight
 ? 'bg-white border border-slate-200/90 shadow-xs text-slate-900 cursor-pointer active:scale-95'
 : 'max-xl:bg-white max-xl:border max-xl:border-slate-200/90 max-xl:shadow-xs xl:bg-white/15 xl:border xl:border-white/20 hover:border-white/40 hover:bg-white/25 text-white cursor-pointer shadow-xs active:scale-95'
 } ${
 isSelected && isUserRequestSelection
 ? '!border animate-border-flash z-10'
 : forceLight && isSelectedBookedMonth
 ? '!border-2 !border-orange-300 z-10'
 : ''
 }`}
 >
 <span
 title={
 isFullyBooked
 ? 'Click to view occupants list'
 : isPartiallyBooked
 ? 'Click to select remaining available bed'
 : undefined
 }
 className={`text-[11px] sm:text-[12px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full tracking-tight truncate max-w-[95%] leading-snug ${
 isFullyBooked
 ? forceLight
 ? 'bg-amber-100 text-amber-800 border border-amber-300 font-medium'
 : 'max-xl:bg-amber-100 max-xl:text-amber-800 max-xl:border max-xl:border-amber-300 xl:bg-amber-400/25 xl:text-amber-100 xl:border xl:border-amber-300/60 font-medium'
 : isLocked
 ? 'bg-white/10 text-white/60'
 : isSelected && !isUserRequestSelection
 ? 'bg-slate-900 text-white font-medium shadow-xs'
 : isPartiallyBooked
 ? forceLight
 ? 'bg-amber-100 text-amber-800 border border-amber-300'
 : 'max-xl:bg-amber-100 max-xl:text-amber-800 max-xl:border max-xl:border-amber-300 xl:bg-amber-400/30 xl:text-amber-100 xl:border xl:border-amber-300'
 : forceLight
 ? 'bg-slate-100 text-slate-700 border border-slate-200/80'
 : 'max-xl:bg-slate-100 max-xl:text-slate-700 max-xl:border max-xl:border-slate-200/80 xl:bg-emerald-400/25 xl:text-emerald-100 xl:border xl:border-emerald-400/40'
 }`}>
 {isFullyBooked
 ? (roomCapacity > 1 ? `${roomCapacity}/${roomCapacity} Booked` : (primaryOccupant?.userName ? primaryOccupant.userName.split(' ')[0] : 'Booked'))
 : isLocked
 ? ' Locked'
 : isSelected && !isUserRequestSelection
 ? 'Stay'
 : isPartiallyBooked
 ? `${occupiedCount}/${roomCapacity} Booked`
 : 'Available'}
 </span>

 <div className="my-auto py-0.5 flex items-baseline justify-center gap-1.5 whitespace-nowrap">
 <span className={`text-base sm:text-lg md:text-xl font-bold leading-tight tracking-tight ${
 isSelected && !isUserRequestSelection
 ? 'text-[#1f1b16]'
 : forceLight
 ? 'text-slate-900'
 : 'max-xl:text-slate-900 text-white'
 }`}>{m.monthShort}</span>
 <span className={`text-xs sm:text-sm font-medium leading-tight ${
 isSelected && !isUserRequestSelection
 ? 'text-slate-600 font-medium'
 : isFullyBooked
 ? forceLight ? 'text-amber-700' : 'max-xl:text-amber-700 text-amber-200'
 : forceLight ? 'text-slate-500' : 'max-xl:text-slate-500 text-sky-200'
 }`}>{m.year}</span>
 </div>

 {/* Person Occupancy Icons Matching Room Card Capacity */}
 <PersonOccupancyGrid
 capacity={roomCapacity}
 occupiedCount={occupiedCount}
 requestedCount={
 isSelected && isUserRequestSelection
 ? Math.max(1, Number(requestedUserBooking?.personCount) || 1)
 : 0
 }
 requestedColor={forceLight ? 'text-[#1f1b16]' : 'max-xl:text-[#1f1b16] text-white'}
 className="py-1"
 iconClassName="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.6]"
 occupiedColor={
 isSelected && !isUserRequestSelection
 ? 'text-[#1f1b16]'
 : isFullyBooked
 ? forceLight ? 'text-amber-600' : 'max-xl:text-amber-600 text-amber-300'
 : forceLight ? 'text-slate-800' : 'max-xl:text-slate-800 text-white'
 }
 vacantColor={
 isSelected && !isUserRequestSelection
 ? 'text-slate-400'
 : forceLight ? 'text-slate-300' : 'max-xl:text-slate-300 text-sky-100'
 }
 customTitle={
 isSelected && isUserRequestSelection
 ? `${Math.max(1, Number(requestedUserBooking?.personCount) || 1)} person slot${(Number(requestedUserBooking?.personCount) || 1) > 1 ? 's' : ''} requested in ${m.monthShort} ${m.year}`
 : `${occupiedCount} of ${roomCapacity} slot${roomCapacity > 1 ? 's' : ''} occupied in ${m.monthShort} ${m.year} (solid = booked, outline = available)`
 }
 />
 </button>
 );
 });
 })()}
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-3.5">
 {monthGroups.length > 1 && (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 {monthGroups.map((group, gIdx) => {
 const isCurrent = selectedMonthIdx === gIdx;
 return (
 <button
 key={group.monthYear}
 type="button"
 onClick={() => setSelectedMonthIdx(gIdx)}
 className="relative px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[13.5px] sm:text-[15px] cursor-pointer whitespace-nowrap outline-none select-none transition-colors"
 >
 {isCurrent && (
 <motion.span
 layoutId="activeMonthSchedulePill"
 className="absolute inset-0 rounded-full bg-[#c0c1ff] shadow-sm shadow-[#c0c1ff]/30 z-0"
 transition={{ type: 'spring', stiffness: 420, damping: 32 }}
 />
 )}
 {!isCurrent && (
 <span className="absolute inset-0 rounded-full bg-slate-100 border border-slate-200/80 z-0" />
 )}
 <span className={`relative z-10 transition-colors ${
 isCurrent
 ? 'text-[#07006c] font-medium'
 : 'text-slate-600 hover:text-[#1f1b16] font-medium'
 }`}>
 {group.monthYear}
 </span>
 </button>
 );
 })}
 </div>
 )}

 <div className={`flex flex-col w-full bg-transparent border-0 shadow-none p-0 ${forceLight ? 'text-slate-900' : 'max-xl:text-slate-900 text-white'}`}>
 <div className={`grid grid-cols-7 text-center text-[11px] sm:text-xs font-semibold pb-3 pt-0.5 select-none ${forceLight ? 'text-slate-500' : 'max-xl:text-slate-500 text-sky-200'}`}>
 {WEEKDAYS.map((wd) => (
 <span key={wd}>{wd}</span>
 ))}
 </div>

 <motion.div
 initial={false}
 animate={{ height: calendarGridHeight }}
 transition={{
 height: { type: 'spring', stiffness: 280, damping: 28, mass: 0.85 },
 }}
 className="overflow-hidden relative w-full"
 >
 <div ref={calendarGridContentRef} className="w-full relative pb-2.5 sm:pb-3">
 <AnimatePresence mode="popLayout" initial={false}>
 {(() => {
 const activeGroup = monthGroups[selectedMonthIdx] || (monthGroups.length > 0 ? monthGroups[0] : null);
 if (!activeGroup) return null;

 const firstDayOfWeek = activeGroup.days[0]?.dayOfWeek || 0;
 const leadingBlanks = Array.from({ length: firstDayOfWeek });

 return (
 <motion.div
 key={activeGroup.monthYear}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8, position: 'absolute', top: 0, left: 0, right: 0 }}
 transition={{
 opacity: { duration: 0.18, ease: 'easeOut' },
 y: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
 }}
 className="w-full"
 >
 <div className="grid grid-cols-7 gap-y-3 sm:gap-y-3.5 items-center text-center">
 {leadingBlanks.map((_, bIdx) => (
 <div key={`blank-${bIdx}`} className="flex items-center justify-center h-11 sm:h-12" />
 ))}

 {activeGroup.days.map((slot) => {
 const slotGuest = getDailyBooking(slot.fullISO);
 const isBooked = Boolean(slotGuest);
 const isSelected = selectedSlotIndices.includes(slot.index);
 const isToday = slot.fullISO === todayISO;
 const isLocked = (!isPropertyApproved || !isRoomSavedToDb) && !isBooked;

 const isThisSlotSelectedGuest = Boolean(
 selectedBookedGuest && isBooked && (
 (slotGuest && isGuestMatchingSelected(slotGuest, selectedBookedGuest)) ||
 isWithinSelectedRange(slot.fullISO)
 )
 );

 const isOnlineBooking = Boolean(
 slotGuest?.isOnline === true ||
 slotGuest?.bookingSource === 'ONLINE_USER' ||
 (slotGuest?.source === 'booking' && slotGuest?.bookingSource !== 'OFFLINE_HOST')
 );

 const isSelectedGuestOnline = Boolean(
 isOnlineBooking ||
 selectedBookedGuest?.isOnline === true ||
 selectedBookedGuest?.bookingSource === 'ONLINE_USER' ||
 selectedBookedGuest?.bookingSource === 'ONLINE' ||
 (selectedBookedGuest?.source === 'booking' && selectedBookedGuest?.bookingSource !== 'OFFLINE_HOST')
 );
 const guestName = slotGuest?.userName ? slotGuest.userName.split(' ')[0] : (slotGuest?.guestName ? slotGuest.guestName.split(' ')[0] : 'Booked');
 const dayOfWeek = slot.dayOfWeek;

 const getGuestIdentifier = (g) => {
 if (!g) return null;
 return (
 g.bookingId ||
 g._id ||
 g.bookingReferenceId ||
 g.referenceId ||
 (g.userName ? `${g.userName}_${g.phone || g.userPhone || g.totalAmount || ''}` : null)
 );
 };

 const currentKey = isBooked ? getGuestIdentifier(slotGuest) : null;
 const [sY, sM, sD] = slot.fullISO.split('-').map(Number);
 const prevDateISO = new Date(Date.UTC(sY, sM - 1, sD - 1)).toISOString().split('T')[0];
 const nextDateISO = new Date(Date.UTC(sY, sM - 1, sD + 1)).toISOString().split('T')[0];
 
 const prevGuest = getDailyBooking(prevDateISO);
 const nextGuest = getDailyBooking(nextDateISO);

 const prevKey = prevGuest ? getGuestIdentifier(prevGuest) : null;
 const nextKey = nextGuest ? getGuestIdentifier(nextGuest) : null;

 const isSameAsPrev = isBooked && Boolean(prevGuest && currentKey && prevKey === currentKey);
 const isSameAsNext = isBooked && Boolean(nextGuest && currentKey && nextKey === currentKey);

 const isUserReqSelected = isUserRequestSelection && isSelected;
 const isReqSameAsPrev = isUserReqSelected && (selectedISOSet.has(prevDateISO) || selectedSlotIndices.includes(slot.index - 1));
 const isReqSameAsNext = isUserReqSelected && (selectedISOSet.has(nextDateISO) || selectedSlotIndices.includes(slot.index + 1));

 const connectPrev = isBooked ? isSameAsPrev : (isUserReqSelected ? isReqSameAsPrev : false);
 const connectNext = isBooked ? isSameAsNext : (isUserReqSelected ? isReqSameAsNext : false);

 const hasPrevInRow = dayOfWeek !== 0 && connectPrev;
 const hasNextInRow = dayOfWeek !== 6 && connectNext;
 const wrapsToNextRow = dayOfWeek === 6 && connectNext;
 const wrapsFromPrevRow = dayOfWeek === 0 && connectPrev;

 const isSeparatePrevBooking = (prevGuest && !isSameAsPrev) || (prevGuest && isUserReqSelected);
 const isSeparateNextBooking = (nextGuest && !isSameAsNext) || (nextGuest && isUserReqSelected);

 let boundaryGap = '';
 if (isBooked || isUserReqSelected) {
 if (isSeparatePrevBooking && dayOfWeek !== 0) boundaryGap += ' pl-1';
 if (isSeparateNextBooking && dayOfWeek !== 6) boundaryGap += ' pr-1';
 }

 let capsuleTrack = 'mx-auto w-12.5 h-12.5 sm:w-13 sm:h-13 max-w-[96%] rounded-full aspect-square shrink-0';
 if (isBooked) {
 if ((hasPrevInRow || wrapsFromPrevRow) && (hasNextInRow || wrapsToNextRow)) {
 capsuleTrack = 'w-full h-12.5 sm:h-13 rounded-none border-y-2 border-amber-400';
 } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
 capsuleTrack = 'w-full h-12.5 sm:h-13 rounded-r-full rounded-l-none border-y-2 border-r-2 border-amber-400';
 } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
 capsuleTrack = 'w-full h-12.5 sm:h-13 rounded-l-full rounded-r-none border-y-2 border-l-2 border-amber-400';
 } else {
 capsuleTrack = 'w-12.5 h-12.5 sm:w-13 sm:h-13 max-w-[96%] rounded-full mx-auto border-2 border-amber-400 aspect-square shrink-0';
 }
 } else if (isUserReqSelected) {
 const reqBorderClass = forceLight ? 'animate-border-flash' : 'border-sky-400';
 if ((hasPrevInRow || wrapsFromPrevRow) && (hasNextInRow || wrapsToNextRow)) {
 capsuleTrack = `w-full h-12.5 sm:h-13 rounded-none border-y-2 ${reqBorderClass}`;
 } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
 capsuleTrack = `w-full h-12.5 sm:h-13 rounded-r-full rounded-l-none border-y-2 border-r-2 ${reqBorderClass}`;
 } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
 capsuleTrack = `w-full h-12.5 sm:h-13 rounded-l-full rounded-r-none border-y-2 border-l-2 ${reqBorderClass}`;
 } else {
 capsuleTrack = `w-12.5 h-12.5 sm:w-13 sm:h-13 max-w-[96%] rounded-full mx-auto border-2 ${reqBorderClass} aspect-square shrink-0`;
 }
 }

 const capsuleBg = isThisSlotSelectedGuest
 ? forceLight
 ? 'text-slate-900 font-medium !border-orange-300'
 : isSelectedGuestOnline
 ? 'animate-slot-flash bg-[#E0F2FE] text-[#1f1b16] border-[#38BDF8] font-medium shadow-md'
 : 'animate-booked-slot-flash bg-[#E0F2FE] text-[#1f1b16] border-[#38BDF8] font-medium shadow-md'
 : isBooked
 ? 'bg-[#a86500] text-white font-semibold'
 : isUserReqSelected
 ? forceLight
 ? 'bg-transparent text-slate-900'
 : 'animate-slot-flash bg-[#E0F2FE] text-[#1f1b16] border-[#38BDF8] shadow-md'
 : '';

 const isCheckInDay = isBooked && !isSameAsPrev;

 return (
 <div key={slot.fullISO} className={`flex items-center justify-center h-13 sm:h-14 relative w-full ${boundaryGap}`}>
 <button
 type="button"
 disabled={!isBooked && (!isPropertyApproved || !isRoomSavedToDb || isUserRequestSelection)}
 onClick={() => {
 if (isBooked) {
 setActiveDateModalISO(slot.fullISO);
 } else if (!isUserRequestSelection) {
 handleToggleSlotDay(slot.index);
 }
 }}
 className={`flex flex-col items-center justify-center select-none outline-none relative ${capsuleTrack} ${
 isBooked
 ? `${capsuleBg} cursor-pointer hover:brightness-105 active:scale-[0.98]`
 : isLocked
 ? 'border border-dashed border-white/20 text-white/40 cursor-not-allowed rounded-full font-normal'
 : isUserReqSelected
 ? `${capsuleBg} font-medium cursor-default pointer-events-none`
 : isUserRequestSelection
										? `${forceLight ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'} flex items-center justify-center font-normal transition-colors cursor-pointer rounded-full`
										: isSelected
										? 'bg-white text-[#1f1b16] font-normal cursor-pointer border-2 border-white rounded-full z-10'
										: `${forceLight ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'} flex items-center justify-center font-normal transition-colors cursor-pointer rounded-full`
 }`}
 >
 <span className={`text-[23px] sm:text-[25px] font-normal leading-none tracking-normal select-none flex items-center justify-center ${
 isSelected ? 'text-[#1f1b16]' : forceLight ? 'text-slate-900' : 'max-xl:text-slate-900 text-white'
 }`}>{slot.dayNum}</span>
 {isCheckInDay ? (
 <span
 className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full border border-amber-200 text-[#1f1b16] text-[12px] sm:text-[12.5px] leading-tight font-normal whitespace-nowrap shadow-xs"
 title={slotGuest?.userName || slotGuest?.guestName || ''}
 >
 {guestName}
 </span>
 ) : !forceLight && isUserReqSelected && !isReqSameAsPrev ? (
 <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full bg-[#E0F2FE] border border-[#7DD3FC] text-[#0369A1] text-[12px] sm:text-[12.5px] leading-tight font-normal whitespace-nowrap shadow-xs animate-badge-flash">
 {requestedUserBooking?.userName ? requestedUserBooking.userName.split(' ')[0] : (requestedUserBooking?.fullName ? requestedUserBooking.fullName.split(' ')[0] : (requestedUserBooking?.guestName ? requestedUserBooking.guestName.split(' ')[0] : 'Requested'))}
 </span>
 ) : null}
 </button>
 </div>
 );
 })}
 </div>
 </motion.div>
 );
 })()}
 </AnimatePresence>
 </div>
 </motion.div>
 </div>
 </div>
 )}

 {/* Occupants List Modal (Loaded on-demand when either a month card or date is selected) */}
 {Boolean(activeOccupantsModalData) && (
 <Suspense fallback={null}>
 <MonthOccupantsListModal
 monthData={activeOccupantsModalData}
 roomDisplay={roomDisplay}
 roomTypeDisplay={roomTypeDisplay}
 isOccupantModalOpen={isOccupantModalOpen}
 onClose={() => {
 setIsRoomOccupantsModalOpen(false);
 setActiveMonthModalKey(null);
 setActiveDateModalISO(null);
 }}
 onSelectOccupant={(occ) => {
 if (handleOpenOccupantModal) {
 handleOpenOccupantModal(findFullOccupant(occ));
 }
 }}
 onBookOpenSlot={() => {
 if (activeOccupantsModalData?.isDaily) {
 if (activeOccupantsModalData.slotIndex !== null && typeof handleToggleSlotDay === 'function') {
 handleToggleSlotDay(activeOccupantsModalData.slotIndex);
 }
 setActiveDateModalISO(null);
 if (typeof onOpenAddGuestModal === 'function') {
 onOpenAddGuestModal();
 }
 } else {
 if (activeOccupantsModalData?.monthIndex !== undefined && typeof handleToggleSlotMonth === 'function') {
 handleToggleSlotMonth(activeOccupantsModalData.monthIndex);
 }
 setActiveMonthModalKey(null);
 if (typeof onOpenAddGuestModal === 'function') {
 onOpenAddGuestModal();
 }
 }
 }}
 />
 </Suspense>
 )}
 </div>
 </div>
 );
}