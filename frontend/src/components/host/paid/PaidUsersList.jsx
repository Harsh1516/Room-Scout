import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Eye, LogOut, Calendar, BedDouble, CheckCircle2,
  Sparkles, ShieldCheck, Globe, Store, Receipt,
  ArrowLeft, Search, X, Users, Key,
  ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';
import { bookingsAPI, staysAPI } from '../../../services/api';

const ResidentIdPassModal = lazy(() =>
  import('../schedule/ResidentIdPassModal').then((m) => ({ default: m.ResidentIdPassModal }))
);

export const isOnlineGuest = (g) => {
  if (!g) return false;
  if (
    g.bookingSource === 'OFFLINE_HOST' ||
    g.source === 'offline' ||
    g.paymentMethod === 'OFFLINE' ||
    g.paymentMethod === 'CASH'
  ) return false;
  if (
    g.bookingSource === 'ONLINE' ||
    g.bookingSource === 'ONLINE_USER' ||
    g.isOnline === true ||
    g.paymentMethod === 'UPI' ||
    g.upiPayment?.transactionRef ||
    g.paymentId
  ) return true;
  return false;
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
  showToast = () => {},
  refreshGuests = () => {},
  broadcastStayUpdate = () => {},
  onBack = () => {},
  onSelectUserRequest = () => {},
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ONLINE');
  const [direction, setDirection] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmCheckoutId, setConfirmCheckoutId] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResettingRevenue, setIsResettingRevenue] = useState(false);

  // Revenue Reset State with LocalStorage and Stay settings fallback
  const storageKey = `roomscout_rev_reset_${hostProperty?._id || 'default'}`;
  const [revenueReset, setRevenueReset] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
      if (hostProperty?.revenueResetSettings?.resetAt) {
        return hostProperty.revenueResetSettings;
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    if (hostProperty?.revenueResetSettings?.resetAt) {
      setRevenueReset(hostProperty.revenueResetSettings);
    }
  }, [hostProperty?.revenueResetSettings]);

  // Modal occupant state
  const [selectedOccupantForModal, setSelectedOccupantForModal] = useState(null);
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
    setCurrentPage(0);
  };

  const formatIdNumber = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12) return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
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
  // They are preserved here and must not be wiped out or reduced upon checkout.
  const activePaidGuests = useMemo(() => {
    const src = Array.isArray(allGuests) && allGuests.length > 0 ? allGuests : guests;
    return src.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      const ps = String(g.paymentStatus || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED') return false;
      const hasPaid =
        ps === 'PAID' ||
        ps === 'VERIFIED' ||
        ps === 'COMPLETED' ||
        g.isPaid === true ||
        Number(g.totalAmount || g.paidAmount) > 0 ||
        g.bookingSource === 'OFFLINE_HOST' ||
        g.source === 'offline' ||
        g.paymentMethod === 'OFFLINE';
      if (!hasPaid) return false;
      return (
        st === 'CONFIRMED' ||
        st === 'CHECKED_IN' ||
        st === 'CHECKED_OUT' ||
        st === 'COMPLETED' ||
        st === 'PAID' ||
        !st.includes('PENDING')
      );
    });
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
      showToast(`${booking.userName || booking.fullName || 'Guest'} checked in successfully!`, 'success');
      refreshGuests();
    } catch {
      showToast('Check-in update encountered an issue', 'error');
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
      showToast(`${booking.userName || booking.fullName || 'Guest'} checked out successfully!`, 'success');
      setConfirmCheckoutId(null);
      refreshGuests();
    } catch {
      showToast('Checkout update encountered an issue', 'error');
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
      setRevenueReset(resetData);
      showToast('Revenue counter reset to ₹0 for this cycle.', 'success');
      setShowResetModal(false);
    } catch (err) {
      console.error('Reset revenue error:', err);
      showToast('Failed to reset revenue counter.', 'error');
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
      setRevenueReset(null);
      showToast('All-time revenue counter restored.', 'success');
      setShowResetModal(false);
    } catch (err) {
      console.error('Restore all-time revenue error:', err);
      showToast('Failed to restore all-time revenue.', 'error');
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
    const rawAadhar = occupant.guestAadhar || occupant.aadharId || occupant.aadhar || occupant.nationalId || '';
    const cleanAadhar = String(rawAadhar).replace(/\D/g, '');
    const rawPaid = occupant.totalAmount || occupant.paidAmount || occupant.amount || '';
    const parsedPaid = rawPaid ? String(rawPaid).replace(/[^0-9.]/g, '') : '';
    const parsedGender = occupant.gender === 'Female' ? 'Female' : 'Male';

    setSelectedOccupantForModal(occupant);
    setModalName(cleanName);
    setModalPhone(cleanPhone);
    setModalEmail(cleanEmail);
    setModalAadhar(formatIdNumber(cleanAadhar));
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
    if (!cleanName) { showToast('Name is required.', 'error'); return; }
    if (cleanPhone.length !== 10) { showToast('10-digit phone required.', 'error'); return; }
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
        gender: modalGender,
        totalAmount: parsedAmount,
      }));
      setIsModalEditing(false);
      showToast('Occupant details updated successfully.', 'success');
      refreshGuests();
    } catch {
      showToast('Failed to update details.', 'error');
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
      showToast('Occupant removed successfully.', 'success');
      handleCloseOccupantModal();
      refreshGuests();
    } catch {
      showToast('Failed to remove occupant.', 'error');
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
        className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f1d2d] border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_18px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200"
      >
        {/* Identity + Amount */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-xs ${
                  isOnline
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60'
                    : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60'
                }`}
              >
                {initials}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0f1d2d] ${
                  isOnline ? 'bg-indigo-600' : 'bg-teal-600'
                }`}
              >
                {isOnline ? <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" /> : <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</h3>
                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />In-House
                  </span>
                ) : isCheckedOut ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
                    <CheckCircle2 className="w-2.5 h-2.5" />Checked Out
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Awaiting Check-in
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mt-1">
                {cleanPhone && <span className="font-medium text-slate-500 dark:text-zinc-400">+91 {cleanPhone}</span>}
                {refCode && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[11px]">Ref: {refCode}</span>
                  </>
                )}
                {(g.upiPayment?.transactionRef || g.transactionRef) && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      UTR: {g.upiPayment?.transactionRef || g.transactionRef}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{paidAmount.toLocaleString('en-IN')}
            </div>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                <ShieldCheck className="w-3 h-3" />Paid Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                <Receipt className="w-3 h-3" />Counter Paid
              </span>
            )}
          </div>
        </div>

        {/* Stay details strip with premium typography and icons */}
        <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <BedDouble className="w-3.5 h-3.5 text-slate-400" />Room {g.roomNumber || '-'}
          </span>
          <span className="text-slate-300 dark:text-zinc-700">·</span>
          <span className="text-xs text-slate-500 dark:text-zinc-400">{g.roomType || 'Standard'}</span>
          <span className="text-slate-300 dark:text-zinc-700">·</span>
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{nightsCount}N</span>
          {(rawIn || rawOut) && (
            <>
              <span className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formatDisplayDate(rawIn)} - {formatDisplayDate(rawOut)}
              </span>
            </>
          )}
          {g.personCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
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
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Invoice Pass</span>
            </button>
            {cleanPhone && (
              <a
                href={`tel:+91${cleanPhone}`}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
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
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === bookingId}
                    onClick={() => handleMarkCheckOut(g)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    {actionLoadingId === bookingId ? 'Checking out...' : 'Confirm Check-Out'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCheckoutId(bookingId)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check-Out</span>
                </button>
              )
            ) : isCheckedOut ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stay Completed</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={actionLoadingId === bookingId}
                onClick={() => handleMarkCheckIn(g)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
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
    <div className="w-full flex-1 flex flex-col min-h-0 select-none antialiased font-body-md py-1">
      {/* ────────────────── MAIN TAB CONTAINER (ROUNDED AS SAME LIKE PIC 2 DESIGN) ────────────────── */}
      <motion.div
        layout="position"
        transition={{
          layout: { duration: 0.36, ease: [0.25, 1, 0.5, 1] },
        }}
        className="w-full flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden select-none"
      >
        {/* Top Header Banner - Clean text without pill backgrounds, with larger prominent Revenue font */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 border-b border-sky-200/80 dark:border-sky-800/50 bg-sky-100/85 dark:bg-sky-950/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Back button + Large Revenue Text + Clean Unboxed Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-300/80 dark:border-sky-700/80 bg-white/95 dark:bg-sky-900/60 hover:bg-white text-sky-900 dark:text-sky-100 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Return to Check-in view"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
                <span>Back</span>
              </button>

              {/* Prominent Revenue Text (Bigger size, NO background box) */}
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-950/70 dark:text-sky-300/80">
                  Revenue
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight leading-none">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Manual Reset to ₹0 Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  title="Manually reset revenue counter to ₹0"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 dark:bg-sky-900/70 hover:bg-white text-sky-900 dark:text-sky-100 border border-sky-300/90 dark:border-sky-700/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3 h-3 text-sky-700 dark:text-sky-300" />
                  <span>Reset</span>
                </button>
                {isResetActive && (
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-[10px] font-semibold text-sky-900/80 dark:text-sky-300 underline underline-offset-2 hover:text-sky-950 dark:hover:text-white cursor-pointer transition-colors"
                    title="Revenue counter is reset for this cycle. Click to view or restore all-time."
                  >
                    (Cycle Reset · All-Time ₹{rawTotalRevenue.toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              {/* Clean breakdown text (NO background boxes) */}
              <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                <span className="text-sky-400/80 dark:text-sky-600 font-bold">|</span>
                <span className="inline-flex items-center gap-1 font-bold font-mono text-indigo-700 dark:text-indigo-300">
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>₹{onlineRevenue.toLocaleString('en-IN')}</span>
                </span>
                <span className="text-sky-400/80 dark:text-sky-600 font-bold">·</span>
                <span className="inline-flex items-center gap-1 font-bold font-mono text-teal-800 dark:text-teal-300">
                  <Store className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>₹{offlineRevenue.toLocaleString('en-IN')}</span>
                </span>
              </div>

              {/* Clean in-house status indicator (NO background boxes) */}
              <div className="hidden md:flex items-center gap-2 shrink-0 text-xs font-semibold">
                <span className="text-sky-400/80 dark:text-sky-600">|</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{checkedInCount} In-House</span>
                </span>
              </div>
            </div>

            {/* Right: Date text + Premium Capsule Tab Switcher */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Calendar date info matching Room page */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-sky-950 dark:text-sky-200 select-none">
                <Calendar className="w-3.5 h-3.5 text-[#3525CD] dark:text-[#818CF8]" />
                <span>Today: {todayFormatted}</span>
              </div>

              {/* High-Level Segmented Tabs Capsule matching VisitedSubNavbar */}
              <div className="inline-flex items-center p-1 rounded-full bg-white/90 dark:bg-[#111C2E] border border-sky-300/80 dark:border-[#1E2E48] shadow-inner relative select-none shrink-0">
                {/* Online Tab Button */}
                <button
                  type="button"
                  onClick={() => switchTab('ONLINE')}
                  className={`relative px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                    sectionFilter === 'ONLINE'
                      ? 'text-[#3525CD] dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  {sectionFilter === 'ONLINE' && (
                    <motion.div
                      layoutId="paidUsersTabIndicator"
                      className="absolute inset-0 rounded-full bg-white dark:bg-[#4F46E5] shadow-sm shadow-indigo-500/15 border border-slate-200/60 dark:border-indigo-400/30 -z-10 pointer-events-none"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}
                  {/* Dual-ring beacon dot */}
                  <span className="relative flex h-2 w-2 shrink-0">
                    {sectionFilter === 'ONLINE' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 dark:bg-white opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        sectionFilter === 'ONLINE'
                          ? 'bg-[#3525CD] dark:bg-white'
                          : 'bg-slate-400 dark:bg-slate-500'
                      }`}
                    />
                  </span>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Online</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none ${
                      sectionFilter === 'ONLINE'
                        ? 'bg-[#E2DFFF] text-[#3525CD] dark:bg-white/20 dark:text-white'
                        : 'bg-slate-200/70 text-slate-600 dark:bg-[#162238] dark:text-slate-400 dark:border dark:border-[#223554]'
                    }`}
                  >
                    {onlineGuests.length}
                  </span>
                </button>

                {/* Offline Tab Button */}
                <button
                  type="button"
                  onClick={() => switchTab('OFFLINE')}
                  className={`relative px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                    sectionFilter === 'OFFLINE'
                      ? 'text-teal-700 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  {sectionFilter === 'OFFLINE' && (
                    <motion.div
                      layoutId="paidUsersTabIndicator"
                      className="absolute inset-0 rounded-full bg-white dark:bg-teal-600 shadow-sm shadow-teal-500/15 border border-slate-200/60 dark:border-teal-400/30 -z-10 pointer-events-none"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}
                  {/* Dual-ring beacon dot */}
                  <span className="relative flex h-2 w-2 shrink-0">
                    {sectionFilter === 'OFFLINE' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 dark:bg-white opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        sectionFilter === 'OFFLINE'
                          ? 'bg-teal-600 dark:bg-white'
                          : 'bg-slate-400 dark:bg-slate-500'
                      }`}
                    />
                  </span>
                  <Store className="w-3.5 h-3.5" />
                  <span>Offline</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none ${
                      sectionFilter === 'OFFLINE'
                        ? 'bg-teal-100 text-teal-800 dark:bg-white/20 dark:text-white'
                        : 'bg-slate-200/70 text-slate-600 dark:bg-[#162238] dark:text-slate-400 dark:border dark:border-[#223554]'
                    }`}
                  >
                    {offlineGuests.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body - Crisp background for cards to elevate and pop */}
        <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-4 flex-1 min-h-0 bg-slate-50/70 dark:bg-[#071320]">
          {/* Sub-header with Channel Title + Revenue sub-pill and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                  sectionFilter === 'ONLINE'
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/20'
                    : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'
                }`}
              >
                {sectionFilter === 'ONLINE' ? <Globe className="w-4 h-4" /> : <Store className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {sectionFilter === 'ONLINE' ? 'Online Paid Bookings' : 'Offline Registered Guests'}
                  </h2>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                      sectionFilter === 'ONLINE'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/50'
                    }`}
                  >
                    ₹{currentRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {sectionFilter === 'ONLINE'
                    ? 'Verified bookings via Direct UPI / Bank credit'
                    : 'Walk-ins and counter registrations recorded by host'}
                </p>
              </div>
            </div>

            {/* Filter Pills & Search Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Status Filter Tabs: All, In-House, Checked Out */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 text-xs shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => { setFilterStatus('ALL'); setCurrentPage(0); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All ({listForSection.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterStatus('CHECKED_IN'); setCurrentPage(0); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatus === 'CHECKED_IN'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  In-House ({inHouseCountForSection})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterStatus('CHECKED_OUT'); setCurrentPage(0); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    filterStatus === 'CHECKED_OUT'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-purple-500" />
                  Checked Out ({checkedOutCountForSection})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Search guest, phone, room..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-600 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(0);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
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
                <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/70 flex flex-col items-center justify-center shadow-xs">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                      sectionFilter === 'ONLINE'
                        ? 'bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-600'
                        : 'bg-teal-100/60 dark:bg-teal-950/60 text-teal-600'
                    }`}
                  >
                    {sectionFilter === 'ONLINE' ? <Globe className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {searchQuery
                      ? 'No matching guests found'
                      : sectionFilter === 'ONLINE'
                      ? 'No online paid bookings yet'
                      : 'No offline registered guests yet'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1">
                    {searchQuery
                      ? `No records found matching "${searchQuery}". Clear your search to view all ${
                          sectionFilter === 'ONLINE' ? 'online' : 'offline'
                        } guests.`
                      : sectionFilter === 'ONLINE'
                      ? 'Guests who pay online via Direct UPI will automatically appear here with their verified UTR transaction references.'
                      : 'Walk-in residents or guests added manually via the schedule console will appear here.'}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(0);
                      }}
                      className="mt-4 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
                    >
                      Clear Search Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {paginatedGuests.map(renderGuestCard)}
                  </div>

                  {/* Horizontal Dots Carousel Pagination Bar */}
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between select-none shrink-0 mt-1">
                    <div className="w-16 hidden sm:block" />

                    {/* Dots Carousel Navigator */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={validPage === 0}
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                        aria-label="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Horizontal Dots */}
                      <div className="flex items-center gap-1.5 px-1 max-w-[240px] overflow-x-auto no-scrollbar">
                        {Array.from({ length: totalPages }).map((_, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setCurrentPage(pIdx)}
                            aria-label={`Go to page ${pIdx + 1}`}
                            className={`transition-all duration-300 rounded-full cursor-pointer shrink-0 ${
                              validPage === pIdx
                                ? sectionFilter === 'ONLINE'
                                  ? 'w-6 h-2 bg-indigo-600 dark:bg-indigo-400 shadow-xs'
                                  : 'w-6 h-2 bg-teal-600 dark:bg-teal-400 shadow-xs'
                                : 'w-2 h-2 bg-slate-200 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={validPage >= totalPages - 1}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                        aria-label="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-16 text-right">
                      Page {validPage + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Reset Revenue Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-white dark:bg-[#0c1825] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reset Revenue Counter
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cycle baseline & payout settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                <span className="font-medium">All-Time Host Revenue:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{rawTotalRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11.5px]">
                <span>• Online (Direct UPI):</span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">₹{rawOnlineRevenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11.5px]">
                <span>• Offline (Counter / Cash):</span>
                <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">₹{rawOfflineRevenue.toLocaleString('en-IN')}</span>
              </div>

              {isResetActive && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Currently active cycle reset (Baseline: ₹{(revenueReset.baselineTotal || 0).toLocaleString('en-IN')})
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Resetting sets your active revenue display to ₹0 from this point onward. All guest bookings, past checked-out stays, transaction references, and invoices are permanently safe. You can restore your all-time earnings anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResettingRevenue}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              {isResetActive && (
                <button
                  type="button"
                  onClick={handleRestoreAllTime}
                  disabled={isResettingRevenue}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                >
                  Restore All-Time (₹{rawTotalRevenue.toLocaleString('en-IN')})
                </button>
              )}

              <button
                type="button"
                onClick={handleResetRevenue}
                disabled={isResettingRevenue}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
    </div>
  );
}
export default PaidUsersList;
