import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Phone, Eye, LogOut, Calendar, BedDouble, CheckCircle2,
 Sparkles, ShieldCheck, Globe, Store, Receipt,
 ArrowLeft, Search, X, Users, Key,
 ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal,
 ChevronDown, Check,
} from 'lucide-react';
import { bookingsAPI, staysAPI } from '../../../services/api';
import { VisitedGuestCard } from '../visited/VisitedGuestCard';
import { SlotScheduleModal } from '../visited/SlotScheduleModal';
import { formatUtrNumber } from '../../../utils/bookingDetailsHelpers';

const ResidentIdPassModal = lazy(() =>
 import('../schedule/ResidentIdPassModal').then((m) => ({ default: m.ResidentIdPassModal }))
);

import { isOnlineGuest, isPaidGuest } from '../../../utils/guestFilters';
export { isOnlineGuest, isPaidGuest };

// Extract sortable epoch timestamp so paid records always sort newest-to-oldest
const getRecordTimestamp = (g) => {
  if (!g) return 0;
  const rawDate =
    g.lastPaymentVerifiedAt ||
    g.upiPayment?.verifiedAt ||
    g.paidAt ||
    g.createdAt ||
    g.bookedAt ||
    g.updatedAt ||
    g.checkInISO ||
    g.checkIn;
  if (rawDate) {
    const ms = new Date(rawDate).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  const idStr = String(g._id || '');
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    return parseInt(idStr.slice(0, 8), 16) * 1000;
  }
  return 0;
};

const tabVariants = {
 enter: (dir) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
 center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
 exit: (dir) => ({ opacity: 0, x: dir > 0 ? -30 : 30, transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] } }),
};

export function PaidUsersList({
 guests = [],
 allGuests = [],
 setGuests = () => {},
 hostProperty,
 setHostProperty = () => {},
 showToast = () => {},
 refreshGuests = () => {},
 broadcastStayUpdate = () => {},
 onBack = () => {},
 onSelectUserRequest = () => {},
 showBackButton = false,
}) {
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState('ALL');
 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const filterMenuRef = useRef(null);
 const [sectionFilter, setSectionFilter] = useState('ONLINE');
 const [direction, setDirection] = useState(1);
 const [currentPage, setCurrentPage] = useState(0);
 const [actionLoadingId, setActionLoadingId] = useState(null);
 const [confirmCheckoutId, setConfirmCheckoutId] = useState(null);
 const [showResetModal, setShowResetModal] = useState(false);
 const [isResettingRevenue, setIsResettingRevenue] = useState(false);

 // Revenue Reset State with Stay DB settings as primary source and localStorage fallback
 const storageKey = `stayin_rev_reset_${hostProperty?._id || 'default'}`;
 const [localRevenueReset, setLocalRevenueReset] = useState(() => {
 try {
 const saved = localStorage.getItem(storageKey);
 if (saved) return JSON.parse(saved);
 } catch {
 // fallback
 }
 return null;
 });

 const revenueReset = useMemo(() => {
 const remote = hostProperty?.revenueResetSettings;
 if (remote !== undefined) {
 return remote?.resetAt ? remote : null;
 }
 return localRevenueReset?.resetAt ? localRevenueReset : null;
 }, [hostProperty?.revenueResetSettings, localRevenueReset]);

 // Modal occupant state
 const [selectedOccupantForModal, setSelectedOccupantForModal] = useState(null);
 const [slotModalGuest, setSlotModalGuest] = useState(null);
 const [isModalEditing, setIsModalEditing] = useState(false);
 const [modalName, setModalName] = useState('');
 const [modalPhone, setModalPhone] = useState('');
 const [modalEmail, setModalEmail] = useState('');
 const [modalAadhar, setModalAadhar] = useState('');
 const [modalPaidAmount, setModalPaidAmount] = useState('');
 const [modalGender, setModalGender] = useState('Male');
 const [isSavingModalOccupant, setIsSavingModalOccupant] = useState(false);
 const [confirmModalDelete, setConfirmModalDelete] = useState(false);
 const [isRemovingModalOccupant, setIsRemovingModalOccupant] = useState(false);

 const switchTab = (tab) => {
 if (tab === sectionFilter) return;
 setDirection(tab === 'OFFLINE' ? 1 : -1);
 setSectionFilter(tab);
 if (tab === 'OFFLINE' && filterStatus === 'CONFIRMED') {
 setFilterStatus('ALL');
 }
 setCurrentPage(0);
 };

 useEffect(() => {
 if (!isFilterOpen) return;
 const handleOutside = (e) => {
 if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
 setIsFilterOpen(false);
 }
 };
 const handleEscape = (e) => {
 if (e.key === 'Escape') setIsFilterOpen(false);
 };
 document.addEventListener('mousedown', handleOutside);
 document.addEventListener('keydown', handleEscape);
 return () => {
 document.removeEventListener('mousedown', handleOutside);
 document.removeEventListener('keydown', handleEscape);
 };
 }, [isFilterOpen]);

 const formatIdNumber = (raw) => {
 if (!raw) return '';
 const digits = String(raw).replace(/\D/g, '');
 if (digits.length === 12) return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
 if (digits.length === 4) return `XXXX-XXXX-${digits}`;
 return String(raw).trim();
 };

 const formatDisplayDate = (rawDate) => {
 if (!rawDate) return '';
 try {
 const d = new Date(rawDate);
 if (isNaN(d.getTime())) return String(rawDate);
 return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
 } catch {
 return String(rawDate);
 }
 };

 const todayFormatted = useMemo(() => {
 return new Date().toLocaleDateString('en-US', {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 }, []);

  // Checked-out & completed bookings represent legitimate stays whose payments are added to the host's profit.
  // They are preserved permanently (even after checkout) and sorted newest-to-oldest.
  const activePaidGuests = useMemo(() => {
    const src = Array.isArray(allGuests) && allGuests.length > 0 ? allGuests : guests;
    return (Array.isArray(src) ? src : [])
      .filter(isPaidGuest)
      .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
  }, [allGuests, guests]);

 const onlineGuests = useMemo(() => activePaidGuests.filter(isOnlineGuest), [activePaidGuests]);
 const offlineGuests = useMemo(() => activePaidGuests.filter((g) => !isOnlineGuest(g)), [activePaidGuests]);

 // Raw All-Time Revenue (accumulated from both current and checked-out stays)
 const rawOnlineRevenue = useMemo(
 () => onlineGuests.reduce((a, g) => a + (Number(g.totalAmount || g.paidAmount) || 0), 0),
 [onlineGuests]
 );
 const rawOfflineRevenue = useMemo(
 () => offlineGuests.reduce((a, g) => a + (Number(g.totalAmount || g.paidAmount) || 0), 0),
 [offlineGuests]
 );
 const rawTotalRevenue = useMemo(() => rawOnlineRevenue + rawOfflineRevenue, [rawOnlineRevenue, rawOfflineRevenue]);

 // Adjusted Revenue accounting for host manual reset baseline
 const isResetActive = Boolean(revenueReset && revenueReset.resetAt);
 const onlineRevenue = useMemo(() => {
 if (!isResetActive) return rawOnlineRevenue;
 const base = Number(revenueReset.baselineOnline || 0);
 return Math.max(0, rawOnlineRevenue - base);
 }, [rawOnlineRevenue, isResetActive, revenueReset]);

 const offlineRevenue = useMemo(() => {
 if (!isResetActive) return rawOfflineRevenue;
 const base = Number(revenueReset.baselineOffline || 0);
 return Math.max(0, rawOfflineRevenue - base);
 }, [rawOfflineRevenue, isResetActive, revenueReset]);

 const totalRevenue = useMemo(() => {
 if (!isResetActive) return rawTotalRevenue;
 const base = Number(revenueReset.baselineTotal || 0);
 return Math.max(0, rawTotalRevenue - base);
 }, [rawTotalRevenue, isResetActive, revenueReset]);

 const checkedInCount = useMemo(() => {
 return activePaidGuests.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 if (st === 'CHECKED_OUT' || st === 'COMPLETED') return false;
 return st === 'CHECKED_IN' || !isOnlineGuest(g);
 }).length;
 }, [activePaidGuests]);

 const awaitingCheckInCount = useMemo(() => {
 return activePaidGuests.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 if (st === 'CHECKED_OUT' || st === 'COMPLETED') return false;
 return isOnlineGuest(g) && st !== 'CHECKED_IN';
 }).length;
 }, [activePaidGuests]);

 const filterList = (list) => {
 const q = searchQuery.trim().toLowerCase();
 return list.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 const online = isOnlineGuest(g);
 const out = st === 'CHECKED_OUT' || st === 'COMPLETED';
 const inhouse = !out && (st === 'CHECKED_IN' || !online);
 if (filterStatus === 'CHECKED_IN' && !inhouse) return false;
 if (filterStatus === 'CONFIRMED' && (inhouse || out)) return false;
 if (filterStatus === 'CHECKED_OUT' && !out) return false;
 if (!q) return true;
 return [
 g.userName,
 g.fullName,
 g.guestName,
 g.userPhone,
 g.phone,
 g.guestPhone,
 g.roomNumber,
 g.bookingReferenceId,
 g.bookingId,
 g.roomType,
 ]
 .map((v) => String(v || '').toLowerCase())
 .some((v) => v.includes(q));
 });
 };

 const displayedOnlineGuests = useMemo(
 () => filterList(onlineGuests),
 [onlineGuests, searchQuery, filterStatus]
 );
 const displayedOfflineGuests = useMemo(
 () => filterList(offlineGuests),
 [offlineGuests, searchQuery, filterStatus]
 );
 const currentGuests = sectionFilter === 'ONLINE' ? displayedOnlineGuests : displayedOfflineGuests;
 const currentRevenue = sectionFilter === 'ONLINE' ? onlineRevenue : offlineRevenue;
 const listForSection = sectionFilter === 'ONLINE' ? onlineGuests : offlineGuests;

 const inHouseCountForSection = useMemo(() => {
 return listForSection.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 const online = isOnlineGuest(g);
 const out = st === 'CHECKED_OUT' || st === 'COMPLETED';
 return !out && (st === 'CHECKED_IN' || !online);
 }).length;
 }, [listForSection]);

 const checkedOutCountForSection = useMemo(() => {
 return listForSection.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 return st === 'CHECKED_OUT' || st === 'COMPLETED';
 }).length;
 }, [listForSection]);

 const waitingCheckInCountForSection = useMemo(() => {
 return listForSection.filter((g) => {
 const st = String(g.status || '').toUpperCase();
 const online = isOnlineGuest(g);
 const out = st === 'CHECKED_OUT' || st === 'COMPLETED';
 const inhouse = !out && (st === 'CHECKED_IN' || !online);
 return !out && !inhouse;
 }).length;
 }, [listForSection]);

 const filterOptions = useMemo(() => {
 const base = [
 { key: 'ALL', label: 'All', count: listForSection.length },
 { key: 'CHECKED_IN', label: 'Checked In', count: inHouseCountForSection },
 { key: 'CHECKED_OUT', label: 'Checked Out', count: checkedOutCountForSection },
 ];
 if (sectionFilter === 'ONLINE') {
 base.push({ key: 'CONFIRMED', label: 'Waiting Check-in', count: waitingCheckInCountForSection });
 }
 return base;
 }, [listForSection.length, inHouseCountForSection, checkedOutCountForSection, waitingCheckInCountForSection, sectionFilter]);

 const activeFilterOption = useMemo(
 () => filterOptions.find((opt) => opt.key === filterStatus) || filterOptions[0],
 [filterOptions, filterStatus]
 );

 // 4 Cards per page limit
 const CARDS_PER_PAGE = 4;
 const totalPages = Math.max(1, Math.ceil(currentGuests.length / CARDS_PER_PAGE));
 const validPage = Math.min(currentPage, totalPages - 1);
 const paginatedGuests = useMemo(() => {
 const start = validPage * CARDS_PER_PAGE;
 return currentGuests.slice(start, start + CARDS_PER_PAGE);
 }, [currentGuests, validPage]);

 // Instant Check-In Action
 const handleMarkCheckIn = async (booking) => {
 const bookingId = booking?.bookingId || booking?._id || booking?.bookingReferenceId;
 if (!bookingId) return;
 setActionLoadingId(bookingId);
 try {
 if (booking._id && /^[0-9a-fA-F]{24}$/.test(booking._id)) {
 await bookingsAPI.updateBookingStatus(booking._id, { status: 'CHECKED_IN' }).catch(() => {});
 } else if (bookingId && !String(bookingId).startsWith('res_')) {
 await bookingsAPI.updateBookingStatus(bookingId, { status: 'CHECKED_IN' }).catch(() => {});
 }
 setGuests((prev) =>
 prev.map((item) => {
 const match =
 (item.bookingId && item.bookingId === booking.bookingId) ||
 (item._id && item._id === booking._id) ||
 (item.bookingReferenceId && item.bookingReferenceId === booking.bookingReferenceId);
 return match ? { ...item, status: 'CHECKED_IN' } : item;
 })
 );
 if (hostProperty?._id) broadcastStayUpdate(hostProperty._id);
 ['stayhub_slots_updated', 'stayhub_rooms_updated', 'stayhub_admin_sync'].forEach((e) =>
 window.dispatchEvent(new CustomEvent(e, { detail: { sender: 'HostDashboard' } }))
 );
 localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
 showToast('Guest checked in', 'success');
 refreshGuests();
 } catch {
 showToast('Check-in failed', 'error');
 } finally {
 setActionLoadingId(null);
 }
 };

 // Check-Out Action - frees room slots for new bookings while safely PRESERVING the booking & host profit
 const handleMarkCheckOut = async (booking) => {
 const bookingId = booking?.bookingId || booking?._id || booking?.bookingReferenceId;
 if (!bookingId) return;
 setActionLoadingId(bookingId);
 try {
 const targetId = (booking._id && /^[0-9a-fA-F]{24}$/.test(booking._id)) ? booking._id : bookingId;
 await bookingsAPI.updateBookingStatus(targetId, { status: 'CHECKED_OUT' });
 setGuests((prev) =>
 prev.map((item) => {
 const match =
 (item.bookingId && item.bookingId === booking.bookingId) ||
 (item._id && item._id === booking._id) ||
 (item.bookingReferenceId && item.bookingReferenceId === booking.bookingReferenceId);
 return match ? { ...item, status: 'CHECKED_OUT' } : item;
 })
 );
 if (hostProperty?._id) broadcastStayUpdate(hostProperty._id);
 ['stayhub_slots_updated', 'stayhub_rooms_updated', 'stayhub_admin_sync'].forEach((e) =>
 window.dispatchEvent(new CustomEvent(e, { detail: { sender: 'HostDashboard' } }))
 );
 localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
 showToast('Guest checked out', 'success');
 setConfirmCheckoutId(null);
 refreshGuests();
 } catch {
 showToast('Checkout failed', 'error');
 } finally {
 setActionLoadingId(null);
 }
 };

 // Host Manual Revenue Counter Reset to ₹0
 const handleResetRevenue = async () => {
 setIsResettingRevenue(true);
 try {
 const stayId = hostProperty?._id;
 const resetData = {
 resetAt: new Date().toISOString(),
 baselineTotal: rawTotalRevenue,
 baselineOnline: rawOnlineRevenue,
 baselineOffline: rawOfflineRevenue,
 };
 if (stayId) {
 await staysAPI.resetRevenue(stayId, resetData).catch((err) => {
 console.warn('Backend reset revenue sync error (non-fatal):', err);
 });
 }
 localStorage.setItem(storageKey, JSON.stringify(resetData));
 setLocalRevenueReset(resetData);
 setHostProperty((prev) => (prev ? { ...prev, revenueResetSettings: resetData } : prev));
 showToast('Revenue counter reset', 'success');
 setShowResetModal(false);
 } catch (err) {
 console.error('Reset revenue error:', err);
 showToast('Failed to reset revenue', 'error');
 } finally {
 setIsResettingRevenue(false);
 }
 };

 // Restore All-Time Revenue Counter
 const handleRestoreAllTime = async () => {
 setIsResettingRevenue(true);
 try {
 const stayId = hostProperty?._id;
 if (stayId) {
 await staysAPI.resetRevenue(stayId, { restoreAllTime: true }).catch((err) => {
 console.warn('Backend restore all-time sync error (non-fatal):', err);
 });
 }
 localStorage.removeItem(storageKey);
 setLocalRevenueReset(null);
 setHostProperty((prev) =>
 prev
 ? {
 ...prev,
 revenueResetSettings: {
 resetAt: null,
 baselineTotal: 0,
 baselineOnline: 0,
 baselineOffline: 0,
 },
 }
 : prev
 );
 showToast('Revenue restored', 'success');
 setShowResetModal(false);
 } catch (err) {
 console.error('Restore all-time revenue error:', err);
 showToast('Failed to restore revenue', 'error');
 } finally {
 setIsResettingRevenue(false);
 }
 };

 const handleOpenOccupantModal = (occupant) => {
 if (!occupant) return;
 const cleanName = occupant.fullName || occupant.userName || occupant.guestName || occupant.name || '';
 const rawPhone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
 const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
 const cleanEmail = occupant.email || occupant.userEmail || '';
 const rawAadhar =
 occupant.aadharNumber ||
 occupant.guestAadhar ||
 occupant.aadharId ||
 occupant.aadhar ||
 occupant.nationalId ||
 '';
 const cleanAadhar = String(rawAadhar).replace(/\D/g, '');
 const rawPaid = occupant.totalAmount || occupant.paidAmount || occupant.amount || '';
 const parsedPaid = rawPaid ? String(rawPaid).replace(/[^0-9.]/g, '') : '';
 const parsedGender = occupant.gender === 'Female' ? 'Female' : 'Male';

 const normalizedOccupant = {
 ...occupant,
 name: cleanName,
 phone: cleanPhone,
 email: cleanEmail,
 aadhar: formatIdNumber(cleanAadhar || rawAadhar),
 aadharNumber: rawAadhar,
 guestAadhar: rawAadhar,
 aadharPhoto: occupant.aadharPhoto || occupant.guestAadharPhoto || '',
 guestAadharPhoto: occupant.guestAadharPhoto || occupant.aadharPhoto || '',
 };

 setSelectedOccupantForModal(normalizedOccupant);
 setModalName(cleanName);
 setModalPhone(cleanPhone);
 setModalEmail(cleanEmail);
 setModalAadhar(formatIdNumber(cleanAadhar || rawAadhar));
 setModalPaidAmount(parsedPaid);
 setModalGender(parsedGender);
 setIsModalEditing(false);
 setConfirmModalDelete(false);
 };

 const handleCloseOccupantModal = () => {
 setSelectedOccupantForModal(null);
 setIsModalEditing(false);
 setConfirmModalDelete(false);
 };

 const handleSaveModalEdit = async () => {
 if (!selectedOccupantForModal) return;
 const cleanName = modalName.trim();
 const cleanPhone = modalPhone.replace(/\D/g, '').slice(0, 10);
 const cleanAadhar = modalAadhar.replace(/\D/g, '').slice(0, 12);
 const parsedAmount = Number(modalPaidAmount) || 0;
 if (!cleanName) { showToast('Name required', 'error'); return; }
 if (cleanPhone.length !== 10) { showToast('10-digit phone required', 'error'); return; }
 setIsSavingModalOccupant(true);
 const targetId = selectedOccupantForModal.bookingId || selectedOccupantForModal._id || selectedOccupantForModal.bookingReferenceId;
 try {
 setGuests((prev) =>
 prev.map((g) => {
 const match = (g.bookingId || g._id) === targetId;
 return match
 ? {
 ...g,
 userName: cleanName,
 fullName: cleanName,
 phone: cleanPhone,
 userPhone: cleanPhone,
 email: modalEmail,
 aadhar: formatIdNumber(cleanAadhar),
 aadharNumber: formatIdNumber(cleanAadhar),
 guestAadhar: formatIdNumber(cleanAadhar),
 gender: modalGender,
 totalAmount: parsedAmount,
 }
 : g;
 })
 );
 setSelectedOccupantForModal((prev) => ({
 ...prev,
 name: cleanName,
 phone: cleanPhone,
 email: modalEmail,
 aadhar: formatIdNumber(cleanAadhar),
 aadharNumber: formatIdNumber(cleanAadhar),
 guestAadhar: formatIdNumber(cleanAadhar),
 gender: modalGender,
 totalAmount: parsedAmount,
 }));
 setIsModalEditing(false);
 showToast('Occupant details updated', 'success');
 refreshGuests();
 } catch {
 showToast('Failed to update details', 'error');
 } finally {
 setIsSavingModalOccupant(false);
 }
 };

 const handleRemoveOccupant = async (occupant) => {
 if (!occupant) return;
 setIsRemovingModalOccupant(true);
 const targetId = occupant.bookingId || occupant._id || occupant.bookingReferenceId;
 setGuests((prev) => prev.filter((g) => (g.bookingId || g._id) !== targetId));
 try {
 if (targetId && !String(targetId).startsWith('res_')) {
 await bookingsAPI.deleteBooking(targetId).catch(() => {});
 }
 showToast('Occupant removed', 'success');
 handleCloseOccupantModal();
 refreshGuests();
 } catch {
 showToast('Failed to remove occupant', 'error');
 } finally {
 setIsRemovingModalOccupant(false);
 }
 };

 const renderGuestCard = (g, idx) => {
 const isOnline = isOnlineGuest(g);
 const bookingId = g.bookingId || g._id || g.bookingReferenceId;
 const displayName = g.userName || g.fullName || g.guestName || 'Resident';
 const rawPhone = g.phone || g.userPhone || g.guestPhone || '';
 const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
 const initials = displayName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'RS';
 const st = String(g.status || '').toUpperCase();
 const isCheckedOut = st === 'CHECKED_OUT' || st === 'COMPLETED';
 const isCheckedIn = !isCheckedOut && (st === 'CHECKED_IN' || !isOnline);
 const rawIn = g.checkIn || g.checkInISO;
 const rawOut = g.checkOut || g.checkOutISO;
 let nightsCount = 1;
 if (rawIn && rawOut) {
 const d1 = new Date(rawIn);
 const d2 = new Date(rawOut);
 if (!isNaN(d1) && !isNaN(d2)) {
 nightsCount = Math.max(1, Math.ceil(Math.abs(d2 - d1) / 86400000));
 }
 }
 const paidAmount = Number(g.totalAmount || g.paidAmount || 0);
 const refCode = g.bookingReferenceId || g.bookingId || (isOnline ? 'ONLINE' : 'WALK-IN');

 return (
 <div
 key={bookingId || idx}
 className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_18px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200"
 >
 {/* Identity + Amount */}
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-center gap-3 min-w-0">
 <div className="relative shrink-0">
 <div
 className={`w-11 h-11 rounded-2xl flex items-center justify-center font-medium text-sm border shadow-xs ${
 isOnline
 ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
 : 'bg-teal-50 text-teal-700 border-teal-200/70'
 }`}
 >
 {initials}
 </div>
 <span
 className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center ring-2 ring-white ${
 isOnline ? 'bg-indigo-600' : 'bg-teal-600'
 }`}
 >
 {isOnline ? <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" /> : <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
 </span>
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-sm font-medium text-[#1f1b16] truncate">{displayName}</h3>
 {isCheckedIn ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />In-House
 </span>
 ) : isCheckedOut ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-purple-50 text-purple-700 border border-purple-200/70">
 <CheckCircle2 className="w-2.5 h-2.5" />Checked Out
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 " />Awaiting Check-in
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
 {cleanPhone && <span className="font-medium text-slate-500">+91 {cleanPhone}</span>}
 {refCode && (
 <>
 <span>·</span>
 <span className="font-mono text-[11px]">Ref: {refCode}</span>
 </>
 )}
 {(g.upiPayment?.transactionRef || g.transactionRef) && (
 <>
 <span>·</span>
 <span className="font-mono text-[11px] text-indigo-600 font-medium">
 UTR: {formatUtrNumber(g.upiPayment?.transactionRef || g.transactionRef)}
 </span>
 </>
 )}
 </div>
 </div>
 </div>
 <div className="text-right shrink-0">
 <div className="text-base font-medium text-emerald-600 font-mono">
 ₹{paidAmount.toLocaleString('en-IN')}
 </div>
 {isOnline ? (
 <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 mt-0.5">
 <ShieldCheck className="w-3 h-3" />Paid Online
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 mt-0.5">
 <Receipt className="w-3 h-3" />Counter Paid
 </span>
 )}
 </div>
 </div>

 {/* Stay details strip with premium typography and icons */}
 <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
 <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
 <BedDouble className="w-3.5 h-3.5 text-slate-400" />Room {g.roomNumber || '-'}
 </span>
 <span className="text-slate-300">·</span>
 <span className="text-xs text-slate-500">{g.roomType || 'Standard'}</span>
 <span className="text-slate-300">·</span>
 <span className="text-xs font-semibold text-purple-600">{nightsCount}N</span>
 {(rawIn || rawOut) && (
 <>
 <span className="text-slate-300">·</span>
 <span className="text-xs text-slate-500 flex items-center gap-1">
 <Calendar className="w-3 h-3 text-slate-400" />
 {formatDisplayDate(rawIn)} - {formatDisplayDate(rawOut)}
 </span>
 </>
 )}
 {g.personCount > 0 && (
 <>
 <span className="text-slate-300">·</span>
 <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-semibold">
 <Users className="w-3.5 h-3.5 text-slate-400" />
 <span>{g.personCount} {g.personCount === 1 ? 'Guest' : 'Guests'}</span>
 </span>
 </>
 )}
 </div>

 {/* Actions */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => handleOpenOccupantModal(g)}
 className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
 >
 <Eye className="w-3.5 h-3.5 text-slate-400" />
 <span>Invoice Pass</span>
 </button>
 {cleanPhone && (
 <a
 href={`tel:+91${cleanPhone}`}
 className="min-h-[44px] min-w-[44px] px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 flex items-center justify-center transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
 >
 <Phone className="w-3 h-3 text-slate-400" />
 <span className="hidden sm:inline">Call</span>
 </a>
 )}
 </div>
 <div>
 {isCheckedIn ? (
 confirmCheckoutId === bookingId ? (
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 disabled={actionLoadingId === bookingId}
 onClick={() => setConfirmCheckoutId(null)}
 className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer hover:bg-slate-200 transition-all"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={actionLoadingId === bookingId}
 onClick={() => handleMarkCheckOut(g)}
 className="px-3 py-1.5 rounded-lg bg-[#1f1b16] hover:bg-[#0f766e] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
 >
 {actionLoadingId === bookingId ? 'Checking out...' : 'Confirm Check-Out'}
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setConfirmCheckoutId(bookingId)}
 className="px-3 py-1.5 rounded-lg bg-[#1f1b16] text-white text-xs font-medium hover:bg-[#0f766e] transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
 >
 <LogOut className="w-3.5 h-3.5" />
 <span>Check-Out</span>
 </button>
 )
 ) : isCheckedOut ? (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80">
 <CheckCircle2 className="w-3.5 h-3.5" />
 <span>Stay Completed</span>
 </span>
 ) : (
 <button
 type="button"
 disabled={actionLoadingId === bookingId}
 onClick={() => handleMarkCheckIn(g)}
 className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#115e59] transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
 >
 {actionLoadingId === bookingId ? (
 <>
 <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 <span>Checking In...</span>
 </>
 ) : (
 <>
 <Key className="w-3.5 h-3.5" />
 <span>Mark Check-In</span>
 </>
 )}
 </button>
 )}
 </div>
 </div>
 </div>
 );
 };

 return (
 <div className="w-full flex-1 flex flex-col min-h-0 select-none antialiased font-body-md">
 {/* ────────────────── FULL-WIDTH PAID RESIDENTS CONTAINER ────────────────── */}
 <motion.div
 layout="position"
 transition={{
 layout: { duration: 0.36, ease: [0.25, 1, 0.5, 1] },
 }}
 className="w-full flex-1 flex flex-col bg-[#ebedf0] select-none"
 >
 {/* Top Header Banner - Clean text without pill backgrounds, with larger prominent Revenue font */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 border-b border-sky-200/80 bg-sky-100/85">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
            {/* Left: Back button + Large Revenue Text + Clean Unboxed Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0 sm:flex-1 justify-start order-1">
              {showBackButton && typeof onBack === 'function' && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-300/80 bg-white/95 hover:bg-white text-sky-900 text-xs font-medium transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                  title="Return to Check-in view"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-sky-700" />
                  <span>Back</span>
                </button>
              )}

              {/* Prominent Revenue Text (Bigger size, NO background box) */}
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-[11px] font-medium text-sky-950/70">
                  Revenue
                </span>
                <span className="text-xl sm:text-2xl font-medium text-emerald-700 font-mono tracking-tight leading-none">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Manual Reset to ₹0 Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  title="Manually reset revenue counter to ₹0"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight bg-[#1f1b16]/5 hover:bg-[#1f1b16] text-slate-700 hover:text-white border border-slate-300/70 hover:border-[#1f1b16] transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                  <span>Reset</span>
                </button>
                {isResetActive && (
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-[10px] font-semibold text-sky-900/80 underline underline-offset-2 hover:text-sky-950 cursor-pointer transition-colors"
                    title="Revenue counter is reset for this cycle. Click to view or restore all-time."
                  >
                    (Cycle Reset · All-Time ₹{rawTotalRevenue.toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              {/* Clean breakdown text (NO background boxes) */}
              <div className="hidden xl:flex items-center gap-2 text-xs shrink-0">
                <span className="text-sky-400/80 font-medium">|</span>
                <span className="inline-flex items-center gap-1 font-medium font-mono text-indigo-700">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>₹{onlineRevenue.toLocaleString('en-IN')}</span>
                </span>
                <span className="text-sky-400/80 font-medium">·</span>
                <span className="inline-flex items-center gap-1 font-medium font-mono text-teal-800">
                  <Store className="w-3.5 h-3.5 text-teal-600" />
                  <span>₹{offlineRevenue.toLocaleString('en-IN')}</span>
                </span>
              </div>

              {/* Clean in-house status indicator (NO background boxes) */}
              <div className="hidden 2xl:flex items-center gap-2 shrink-0 text-xs font-semibold">
                <span className="text-sky-400/80">|</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{checkedInCount} In-House</span>
                </span>
              </div>
            </div>

            {/* Center: High-Level Segmented Tabs Capsule (Online/Offline Console in Center) */}
            <div className="flex items-center justify-center w-full sm:w-auto shrink-0 order-3 sm:order-2">
              <div className="inline-flex items-center p-1 rounded-full bg-white/90 border border-slate-200/90 shadow-xs relative select-none shrink-0 gap-0.5">
                {/* Online Tab Button */}
                <button
                  type="button"
                  onClick={() => switchTab('ONLINE')}
                  className={`relative px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-colors duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                    sectionFilter === 'ONLINE'
                      ? 'text-white font-semibold'
                      : 'text-slate-600 hover:text-[#1f1b16] font-medium'
                  }`}
                >
                  {sectionFilter === 'ONLINE' && (
                    <motion.div
                      layoutId="paidUsersTabIndicator"
                      className="absolute inset-0 rounded-full bg-[#1f1b16] shadow-[0_2px_8px_rgba(31,27,22,0.25)] z-0 pointer-events-none"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <Globe className="relative z-10 w-3.5 h-3.5" />
                  <span className="relative z-10">Online</span>
                  <span
                    className={`relative z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-mono font-medium leading-none inline-flex items-center justify-center ${
                      sectionFilter === 'ONLINE'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {onlineGuests.length}
                  </span>
                </button>

                {/* Offline Tab Button */}
                <button
                  type="button"
                  onClick={() => switchTab('OFFLINE')}
                  className={`relative px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-colors duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                    sectionFilter === 'OFFLINE'
                      ? 'text-white font-semibold'
                      : 'text-slate-600 hover:text-[#1f1b16] font-medium'
                  }`}
                >
                  {sectionFilter === 'OFFLINE' && (
                    <motion.div
                      layoutId="paidUsersTabIndicator"
                      className="absolute inset-0 rounded-full bg-[#1f1b16] shadow-[0_2px_8px_rgba(31,27,22,0.25)] z-0 pointer-events-none"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <Store className="relative z-10 w-3.5 h-3.5" />
                  <span className="relative z-10">Offline</span>
                  <span
                    className={`relative z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-mono font-medium leading-none inline-flex items-center justify-center ${
                      sectionFilter === 'OFFLINE'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {offlineGuests.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Right: Date text (desktop) + Single Multi-Option Status Filter Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 sm:flex-1 justify-end order-2 sm:order-3">
              {/* Calendar date info matching Room page */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-sky-950 select-none">
                <Calendar className="w-3.5 h-3.5 text-[#3525CD]" />
                <span>Today: {todayFormatted}</span>
              </div>

              {/* Multi-option single-field Filter Dropdown */}
              <div className="relative" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isFilterOpen}
                  className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs ${
                    filterStatus !== 'ALL'
                      ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                      : 'bg-white/95 hover:bg-white text-[#1f1b16] border-sky-300/80'
                  }`}
                >
                  <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${filterStatus !== 'ALL' ? 'text-white' : 'text-sky-700'}`} />
                  <span className="truncate max-w-[110px]">{activeFilterOption.label}</span>
                  <span
                    className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-mono leading-none inline-flex items-center justify-center ${
                      filterStatus !== 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {activeFilterOption.count}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      role="listbox"
                      aria-label="Status filter options"
                      className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200/90 shadow-xl py-1.5 px-1.5 z-40"
                    >
                      {filterOptions.map((opt) => {
                        const selected = filterStatus === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setFilterStatus(opt.key);
                              setCurrentPage(0);
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#1f1b16] text-white font-semibold'
                                : 'text-slate-700 hover:bg-slate-100 font-medium'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <Check className={`w-3.5 h-3.5 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                              <span className="truncate">{opt.label}</span>
                            </span>
                            <span
                              className={`min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-mono leading-none inline-flex items-center justify-center ${
                                selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body - Clean #ebedf0 background for cards to elevate and pop */}
 <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-4 flex-1 min-h-0 bg-[#ebedf0]">
 {/* Full-Width Search Input */}
 <div className="relative w-full">
 <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setCurrentPage(0);
 }}
 placeholder="Search guest, phone, room..."
 className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs sm:text-sm bg-white text-[#1f1b16] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400 transition-all shadow-2xs"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 setCurrentPage(0);
 }}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 {/* Tab Content with Directional Framer-Motion Slide */}
 <AnimatePresence mode="wait" custom={direction}>
 <motion.div
 key={sectionFilter}
 custom={direction}
 variants={tabVariants}
 initial="enter"
 animate="center"
 exit="exit"
 className="flex-1"
 >
 {currentGuests.length === 0 ? (
 <div className="py-16 text-center rounded-3xl bg-white border border-slate-200/80 flex flex-col items-center justify-center shadow-xs">
 <div
 className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
 sectionFilter === 'ONLINE'
 ? 'bg-indigo-100/60 text-indigo-600'
 : 'bg-teal-100/60 text-teal-600'
 }`}
 >
 {sectionFilter === 'ONLINE' ? <Globe className="w-6 h-6" /> : <Store className="w-6 h-6" />}
 </div>
 <h3 className="text-sm font-medium text-slate-700">
 {searchQuery
 ? 'No matching guests found'
 : filterStatus === 'CHECKED_IN'
 ? 'No checked-in guests'
 : filterStatus === 'CHECKED_OUT'
 ? 'No checked-out guests'
 : filterStatus === 'CONFIRMED'
 ? 'No guests waiting for check-in'
 : sectionFilter === 'ONLINE'
 ? 'No online paid bookings yet'
 : 'No offline registered guests yet'}
 </h3>
 <p className="text-xs text-slate-400 max-w-sm mt-1">
 {searchQuery || filterStatus !== 'ALL'
 ? `No records match the current filter in ${
 sectionFilter === 'ONLINE' ? 'online' : 'offline'
 } guests.`
 : sectionFilter === 'ONLINE'
 ? 'Guests who pay online via Direct UPI will automatically appear here with their verified UTR transaction references.'
 : 'Walk-in residents or guests added manually via the schedule console will appear here.'}
 </p>
 {(searchQuery || filterStatus !== 'ALL') && (
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 setFilterStatus('ALL');
 setCurrentPage(0);
 }}
 className="mt-4 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
 >
 {searchQuery && filterStatus !== 'ALL'
 ? 'Clear Filters'
 : searchQuery
 ? 'Clear Search Filter'
 : 'Show All Guests'}
 </button>
 )}
 </div>
 ) : (
 <div className="flex flex-col gap-4">
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
 {currentGuests.map((g, idx) => {
 const bookingId = g.bookingId || g._id || g.bookingReferenceId;
 return (
 <VisitedGuestCard
 key={bookingId || idx}
 guest={g}
 subTab="paid"
 hostProperty={hostProperty}
 onOpenModal={handleOpenOccupantModal}
 onSelectSlot={(guestItem) => setSlotModalGuest(guestItem)}
 onSelectUserRequest={handleOpenOccupantModal}
 />
 );
 })}
 </div>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>
 </motion.div>

 {/* Reset Revenue Confirmation Modal */}
 {showResetModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 select-none">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
 <RotateCcw className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-medium text-[#1f1b16]">
 Reset Revenue Counter
 </h3>
 <p className="text-xs text-slate-500">
 Cycle baseline & payout settlement
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowResetModal(false)}
 className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
 <div className="flex justify-between items-center text-slate-700">
 <span className="font-medium">All-Time Host Revenue:</span>
 <span className="font-mono font-medium text-emerald-600 text-sm">
 ₹{rawTotalRevenue.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="flex justify-between items-center text-slate-500 text-[11.5px]">
 <span>• Online (Direct UPI):</span>
 <span className="font-mono font-semibold text-indigo-600">₹{rawOnlineRevenue.toLocaleString('en-IN')}</span>
 </div>
 <div className="flex justify-between items-center text-slate-500 text-[11.5px]">
 <span>• Offline (Counter / Cash):</span>
 <span className="font-mono font-semibold text-teal-600">₹{rawOfflineRevenue.toLocaleString('en-IN')}</span>
 </div>

 {isResetActive && (
 <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-600 font-medium">
 Currently active cycle reset (Baseline: ₹{(revenueReset.baselineTotal || 0).toLocaleString('en-IN')})
 </div>
 )}
 </div>

 <p className="text-xs text-slate-500 leading-relaxed">
 Resetting sets your active revenue display to ₹0 from this point onward. All guest bookings, past checked-out stays, transaction references, and invoices are permanently safe. You can restore your all-time earnings anytime.
 </p>

 <div className="flex flex-col sm:flex-row gap-2 pt-2">
 <button
 type="button"
 onClick={() => setShowResetModal(false)}
 disabled={isResettingRevenue}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
 >
 Cancel
 </button>

 {isResetActive && (
 <button
 type="button"
 onClick={handleRestoreAllTime}
 disabled={isResettingRevenue}
 className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-medium text-slate-800 transition-all cursor-pointer"
 >
 Restore All-Time (₹{rawTotalRevenue.toLocaleString('en-IN')})
 </button>
 )}

 <button
 type="button"
 onClick={handleResetRevenue}
 disabled={isResettingRevenue}
 className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#1f1b16] text-white text-base font-semibold hover:bg-[#0f766e] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
 >
 {isResettingRevenue ? (
 <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <RotateCcw className="w-3.5 h-3.5" />
 )}
 <span>Reset to ₹0</span>
 </button>
 </div>
 </motion.div>
 </div>
 )}

 {/* ResidentIdPassModal */}
 {selectedOccupantForModal && (
 <Suspense fallback={null}>
 <ResidentIdPassModal
 selectedOccupantForModal={selectedOccupantForModal}
 handleCloseOccupantModal={handleCloseOccupantModal}
 isModalEditing={isModalEditing}
 handleSaveModalEdit={handleSaveModalEdit}
 modalName={modalName}
 handleModalNameChange={(e) => setModalName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
 modalPhone={modalPhone}
 handleModalPhoneChange={(e) => setModalPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
 modalPaidAmount={modalPaidAmount}
 setModalPaidAmount={setModalPaidAmount}
 modalEmail={modalEmail}
 setModalEmail={setModalEmail}
 modalAadhar={modalAadhar}
 handleModalAadharChange={(e) => setModalAadhar(formatIdNumber(e.target.value))}
 isMonthly={false}
 modalGender={modalGender}
 setModalGender={setModalGender}
 modalAdults={1}
 setModalAdults={() => {}}
 modalChildren={0}
 setModalChildren={() => {}}
 handleCancelEditFromModal={() => setIsModalEditing(false)}
 isSavingModalOccupant={isSavingModalOccupant}
 roomDisplay={
 selectedOccupantForModal ? `Room-${selectedOccupantForModal.roomNumber || ''}` : ''
 }
 roomTypeDisplay={selectedOccupantForModal?.roomType || 'Room'}
 formatAadharNumber={formatIdNumber}
 modalStayInfo={null}
 confirmModalDelete={confirmModalDelete}
 setConfirmModalDelete={setConfirmModalDelete}
 isUpdatingSlot={isRemovingModalOccupant}
 handleRemoveOccupant={handleRemoveOccupant}
 handleStartEditFromModal={() => setIsModalEditing(true)}
 />
 </Suspense>
 )}

 <SlotScheduleModal
 isOpen={Boolean(slotModalGuest)}
 guest={slotModalGuest}
 hostProperty={hostProperty}
 allGuests={allGuests.length > 0 ? allGuests : guests}
 subTab="checkin"
 onClose={() => setSlotModalGuest(null)}
 />
 </div>
 );
}
export default PaidUsersList;
