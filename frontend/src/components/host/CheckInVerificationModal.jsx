import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Copy,
  Check,
  X,
  ExternalLink,
  ZoomIn,
  Users,
  Building,
  ArrowRight,
  Sparkles,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { bookingsAPI, paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { broadcastBookingChange } from '../../utils/bookingPayment';

function parseCleanDate(rawStr) {
  if (!rawStr) return null;
  if (rawStr instanceof Date) {
    if (isNaN(rawStr.getTime())) return null;
    const year = rawStr.getFullYear() < 2025 ? 2026 : rawStr.getFullYear();
    return new Date(year, rawStr.getMonth(), rawStr.getDate(), 12, 0, 0);
  }
  if (typeof rawStr === 'string') {
    const trimmed = rawStr.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]);
      const d = Number(isoMatch[3]);
      const year = y < 2025 ? 2026 : y;
      return new Date(year, m - 1, d, 12, 0, 0);
    }
  }
  const parsed = new Date(rawStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear() < 2025 ? 2026 : parsed.getFullYear();
    return new Date(year, parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  }
  return null;
}

function formatDisplayDate(rawDateStr, fallback = '—') {
  if (!rawDateStr || rawDateStr === '—') return fallback;
  const d = parseCleanDate(rawDateStr);
  if (!d) return String(rawDateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPhoneDisplay(rawPhone) {
  if (!rawPhone) return 'N/A';
  const clean = String(rawPhone).replace(/\D/g, '').slice(-10);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return String(rawPhone);
}

function formatAadharDisplay(rawAadhar) {
  if (!rawAadhar) return 'Check upon arrival';
  const clean = String(rawAadhar).replace(/\D/g, '');
  if (clean.length >= 4) {
    return `XXXX-XXXX-${clean.slice(-4)}`;
  }
  return String(rawAadhar);
}

export function CheckInVerificationModal({
  isOpen,
  onClose,
  booking,
  hostProperty,
  onCheckInSuccess,
}) {
  const [localBooking, setLocalBooking] = useState(booking);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [isRejectingUpi, setIsRejectingUpi] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Copy feedback states
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBookingRef, setCopiedBookingRef] = useState(false);

  // Lightbox for receipt screenshot
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!isOpen || !booking) return null;

  const currentBooking = localBooking || booking;
  const bookingId = currentBooking._id || currentBooking.bookingId;
  const rawStatus = String(currentBooking.status || '').toUpperCase();
  const rawPaymentStatus = String(currentBooking.paymentStatus || '').toUpperCase();
  const isOnline =
    currentBooking.bookingSource === 'ONLINE' ||
    currentBooking.bookingSource === 'ONLINE_USER' ||
    currentBooking.isOnline === true ||
    Boolean(currentBooking.bookingReferenceId);

  const isConfirmed = rawStatus === 'CONFIRMED' || rawStatus === 'CHECKED_IN';
  const isPaid =
    rawPaymentStatus === 'PAID' ||
    rawPaymentStatus === 'VERIFIED' ||
    rawPaymentStatus === 'COMPLETED' ||
    currentBooking.isPaid === true ||
    currentBooking.paymentMethod === 'PAY_ON_ARRIVAL' ||
    currentBooking.paymentMethod === 'OFFLINE' ||
    currentBooking.paymentMethod === 'CASH';

  const isUpiVerified =
    currentBooking.paymentMethod !== 'UPI' ||
    currentBooking.upiPayment?.verificationStatus === 'VERIFIED';

  const canCheckIn = isConfirmed && isPaid && isUpiVerified;

  const guestName =
    currentBooking.fullName ||
    currentBooking.userName ||
    currentBooking.guestName ||
    (isOnline ? 'Online Guest' : 'Walk-in Guest');

  const guestInitials = guestName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GS';

  const rawPhone = currentBooking.phone || currentBooking.guestPhone || currentBooking.userPhone || '';
  const guestEmail = currentBooking.email || currentBooking.guestEmail || currentBooking.userEmail || '';
  const aadhar = currentBooking.aadharNumber || currentBooking.guestAadhar || currentBooking.aadhar || '';

  const roomNumber = currentBooking.roomNumber || currentBooking.room?.roomNumber || '—';
  const roomType = currentBooking.roomType || currentBooking.room?.type || currentBooking.roomCategory || '';
  const stayTitle =
    currentBooking.stayTitle ||
    currentBooking.propertyName ||
    currentBooking.propertyTitle ||
    hostProperty?.title ||
    hostProperty?.name ||
    '';

  const bookingRefCode =
    currentBooking.bookingReferenceId ||
    currentBooking.bookingReference ||
    currentBooking.bookingId ||
    currentBooking._id ||
    '';

  const totalGuests =
    currentBooking.guestsCount ||
    currentBooking.totalGuests ||
    (Number(currentBooking.adults || 0) + Number(currentBooking.children || 0)) ||
    1;

  const rawCheckIn = currentBooking.checkIn || currentBooking.checkInISO || currentBooking.startDate;
  const rawCheckOut = currentBooking.checkOut || currentBooking.checkOutISO || currentBooking.endDate;

  const formattedIn = formatDisplayDate(rawCheckIn, 'Arrival Day');
  const formattedOut = formatDisplayDate(rawCheckOut, 'Departure Day');

  const durationText = (() => {
    if (currentBooking.durationDisplay && !String(currentBooking.durationDisplay).includes('undefined')) {
      return currentBooking.durationDisplay;
    }
    if (currentBooking.duration && !String(currentBooking.duration).includes('undefined')) {
      return currentBooking.duration;
    }
    const inD = parseCleanDate(rawCheckIn);
    const outD = parseCleanDate(rawCheckOut);
    if (inD && outD) {
      const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
      return `${diffDays} ${diffDays === 1 ? 'Night' : 'Nights'}`;
    }
    return '1 Night';
  })();

  const totalAmount = Number(currentBooking.totalAmount || currentBooking.paidAmount || currentBooking.price || 0);
  const transactionRef = currentBooking.upiPayment?.transactionRef || currentBooking.transactionRef || '';
  const receiptUrl = currentBooking.upiPayment?.receiptUrl || currentBooking.receiptUrl || '';
  const verificationStatus =
    currentBooking.upiPayment?.verificationStatus || (isPaid ? 'VERIFIED' : 'UNVERIFIED');

  const submissionCount = Number(
    localBooking?.upiPayment?.submissionCount || currentBooking?.upiPayment?.submissionCount || 1
  );
  const canGuestResubmit = submissionCount < 2;

  // Keyboard shortcut listener (Esc closes Lightbox first, then Modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, onClose]);

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'ref') {
      setCopiedRef(true);
      toast.success('UPI Reference (UTR) copied to clipboard');
      setTimeout(() => setCopiedRef(false), 2000);
    } else if (type === 'phone') {
      setCopiedPhone(true);
      toast.success('Phone number copied to clipboard');
      setTimeout(() => setCopiedPhone(false), 2000);
    } else if (type === 'email') {
      setCopiedEmail(true);
      toast.success('Email address copied to clipboard');
      setTimeout(() => setCopiedEmail(false), 2000);
    } else if (type === 'bookingRef') {
      setCopiedBookingRef(true);
      toast.success('Booking Reference copied to clipboard');
      setTimeout(() => setCopiedBookingRef(false), 2000);
    }
  };

  const handleVerifyUpi = async () => {
    setIsVerifyingUpi(true);
    try {
      const res = await paymentsAPI.verifyReference({
        bookingId,
        action: 'VERIFY',
        verificationNote: 'Verified in host bank/UPI statement',
      });
      toast.success(`🎉 UPI Payment verified! Booking for Room ${roomNumber} is CONFIRMED.`);
      setLocalBooking((prev) => ({
        ...(prev || currentBooking),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        upiPayment: {
          ...((prev || currentBooking)?.upiPayment || {}),
          verificationStatus: 'VERIFIED',
          transactionRef,
          receiptUrl,
        },
      }));
      broadcastBookingChange({
        bookingId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        verificationStatus: 'VERIFIED',
        sender: 'HostVerifyPayment',
      });
      if (onCheckInSuccess) onCheckInSuccess(res.booking || res);
    } catch (err) {
      console.error('Verify error:', err);
      toast.error(err.message || 'Failed to verify UPI payment.');
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleRejectUpi = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsRejectingUpi(true);
    try {
      const res = await paymentsAPI.verifyReference({
        bookingId,
        action: canGuestResubmit ? 'REQUEST_RECHECK' : 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      toast.info(
        res.message ||
          (canGuestResubmit
            ? 'Re-request sent to guest to provide correct UTR (final chance).'
            : 'Payment reference rejected.')
      );
      setLocalBooking((prev) => ({
        ...(prev || currentBooking),
        paymentStatus: 'FAILED',
        upiPayment: {
          ...((prev || currentBooking)?.upiPayment || {}),
          verificationStatus: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          isRecheckRequested: canGuestResubmit,
        },
      }));
      broadcastBookingChange({
        bookingId,
        status: canGuestResubmit ? 'AWAITING_PAYMENT' : 'REJECTED',
        verificationStatus: 'REJECTED',
        isRecheckRequested: canGuestResubmit,
        rejectionReason: rejectionReason.trim(),
        sender: 'HostRejectUpi',
      });
      setShowRejectInput(false);
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err.message || 'Failed to reject UPI reference.');
    } finally {
      setIsRejectingUpi(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!canCheckIn) {
      toast.error('Check-in cannot be authorized: booking must be confirmed and payment verified first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'CHECKED_IN' });
      toast.success(`🎉 Guest ${guestName} successfully CHECKED IN to Room ${roomNumber}!`);
      broadcastBookingChange({
        bookingId,
        status: 'CHECKED_IN',
        sender: 'HostCheckIn',
      });

      if (onCheckInSuccess) onCheckInSuccess(currentBooking);
      onClose();
    } catch (err) {
      console.error('Check-In Error:', err);
      toast.error(err.message || 'Failed to update check-in status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-[28px] bg-white dark:bg-[#0c1420] border border-slate-200/90 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden my-6 host-font-scope font-body-md antialiased text-slate-900 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Pill */}
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 mx-auto mt-2.5 mb-0.5 shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
                <Key className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-manrope font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                    Resident Check-In Verification
                  </h3>
                  {bookingRefCode && (
                    <button
                      type="button"
                      onClick={() => handleCopy(bookingRefCode, 'bookingRef')}
                      title="Click to copy booking reference"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300/80 dark:hover:bg-white/20 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <span>{bookingRefCode}</span>
                      {copiedBookingRef ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.8]" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-400 stroke-[2]" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify guest identity, reservation record, and payment status
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* ── Status Banner ── */}
            {canCheckIn ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/12 via-teal-500/10 to-emerald-500/12 border border-emerald-500/35 text-emerald-950 dark:text-emerald-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-manrope font-bold text-xs sm:text-[13px] leading-tight text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 flex-wrap">
                      <span>Booking Confirmed & Payment Verified</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      Ready to check in guest and issue room access.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-600/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                  Ready
                </span>
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/12 via-rose-500/10 to-amber-500/12 border border-amber-500/35 text-amber-950 dark:text-amber-200 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-600/30 mt-0.5">
                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-manrope font-bold text-xs sm:text-[13px] leading-tight text-amber-900 dark:text-amber-200">
                    Check-In Authorization Pending
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                    This reservation cannot be checked in yet. The booking must be in <strong>CONFIRMED</strong> status and direct UPI payment verified in your account statement before room access can be issued.
                  </p>
                </div>
              </div>
            )}

            {/* ── Section 1: Guest Profile & Identification ── */}
            <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/10 p-4 space-y-3 shadow-xs">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                  <span className="font-manrope text-[11px] font-extrabold uppercase tracking-wider">
                    1. Guest & Identification
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOnline ? (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                      Online Guest
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-white/10">
                      Walk-in Guest
                    </span>
                  )}
                </div>
              </div>

              {/* Guest Profile Banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-manrope font-bold text-xs tracking-tight shrink-0 shadow-xs">
                  {guestInitials}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-manrope font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                    {guestName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}</span>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Primary Resident
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                {/* Phone */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Phone Number</span>
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white select-all">
                      {formatPhoneDisplay(rawPhone)}
                    </span>
                    {rawPhone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(rawPhone, 'phone')}
                          title="Copy phone number"
                          className="p-1 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {copiedPhone ? (
                            <Check className="w-3 h-3 text-emerald-600 stroke-[2.8]" />
                          ) : (
                            <Copy className="w-3 h-3 stroke-[2]" />
                          )}
                        </button>
                        <a
                          href={`tel:${rawPhone}`}
                          title="Call guest"
                          className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Phone className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Call</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Email Address</span>
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate select-all" title={guestEmail || 'N/A'}>
                      {guestEmail || 'N/A'}
                    </span>
                    {guestEmail && (
                      <button
                        type="button"
                        onClick={() => handleCopy(guestEmail, 'email')}
                        title="Copy email address"
                        className="p-1 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedEmail ? (
                          <Check className="w-3 h-3 text-emerald-600 stroke-[2.8]" />
                        ) : (
                          <Copy className="w-3 h-3 stroke-[2]" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Government ID / Aadhar */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Government ID / Aadhar</span>
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white select-all">
                      {formatAadharDisplay(aadhar)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 text-[9px] font-extrabold uppercase shrink-0">
                      ID Protected
                    </span>
                  </div>
                </div>

                {/* Guest Occupancy Status */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span>Resident Allocation</span>
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-manrope font-bold text-xs text-slate-900 dark:text-white">
                      {totalGuests} {totalGuests === 1 ? 'Registered Resident' : 'Registered Residents'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[9px] font-bold uppercase shrink-0">
                      Slot Booked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Room & Reservation Schedule ── */}
            <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/10 p-4 space-y-3 shadow-xs">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                  <span className="font-manrope text-[11px] font-extrabold uppercase tracking-wider">
                    2. Room & Reservation Schedule
                  </span>
                </div>

                <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                  Ref: <span className="font-bold text-slate-800 dark:text-slate-200">{bookingRefCode}</span>
                </div>
              </div>

              {/* Room Card Banner */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-manrope font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        Room {roomNumber}
                      </span>
                      {roomType && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10.5px] border border-emerald-200 dark:border-emerald-800">
                          {roomType}
                        </span>
                      )}
                    </div>
                    {stayTitle && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                        {stayTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Duration
                  </span>
                  <span className="font-manrope font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {durationText}
                  </span>
                </div>
              </div>

              {/* Timeline Schedule Visual */}
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-center">
                  {/* Check-In */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>Check-In / Arrival</span>
                    </span>
                    <div className="font-manrope font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white">
                      {formattedIn}
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>12:00 PM (Standard)</span>
                    </div>
                  </div>

                  {/* Middle Arrow / Duration Pill */}
                  <div className="hidden sm:flex flex-col items-center justify-center px-2">
                    <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[10.5px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-2xs">
                      <span>{durationText}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>

                  {/* Check-Out */}
                  <div className="space-y-1 sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1 sm:justify-end">
                      <Calendar className="w-3 h-3 text-rose-500" />
                      <span>Check-Out / Departure</span>
                    </span>
                    <div className="font-manrope font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white">
                      {formattedOut}
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 sm:justify-end">
                      <Clock className="w-3 h-3" />
                      <span>11:59 AM (Standard)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Financial & Payment Record ── */}
            <div className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/10 p-4 space-y-3.5 shadow-xs">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                  <span className="font-manrope text-[11px] font-extrabold uppercase tracking-wider">
                    3. Financial & Payment Record
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                    isUpiVerified
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                  <span>{verificationStatus}</span>
                </span>
              </div>

              {/* Amount & Method Summary Tile */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Booking Tariff
                  </span>
                  <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payment Method
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-manrope font-bold text-xs">
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {currentBooking.paymentMethod === 'UPI'
                        ? 'Direct Host UPI'
                        : currentBooking.paymentMethod === 'PAY_ON_ARRIVAL'
                        ? 'Pay on Arrival'
                        : currentBooking.paymentMethod === 'CASH'
                        ? 'Cash at Property'
                        : currentBooking.paymentMethod || 'Walk-in'}
                    </span>
                  </span>
                </div>
              </div>

              {/* UTR / Transaction Reference Box */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-slate-400" />
                    <span>Submitted UPI Ref (UTR / RRN)</span>
                  </span>

                  <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                    Host Verification:{' '}
                    <strong className={isUpiVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                      {verificationStatus}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10">
                  <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-wider select-all truncate">
                    {transactionRef || 'N/A (Cash / Pay at Property)'}
                  </span>

                  {transactionRef && (
                    <button
                      type="button"
                      onClick={() => handleCopy(transactionRef, 'ref')}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      {copiedRef ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 stroke-[2.8]" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 stroke-[2]" />
                          <span>Copy UTR</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Guest Uploaded Receipt / Screenshot */}
              {receiptUrl && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-manrope font-bold text-xs text-slate-800 dark:text-slate-200">
                      Guest Uploaded Receipt / Screenshot
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="text-[10.5px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>View Full Size</span>
                    </button>
                  </div>

                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900/5 dark:bg-black/40 cursor-zoom-in max-h-52 flex items-center justify-center p-1.5 transition-all hover:border-emerald-500/50 hover:shadow-md"
                  >
                    <img
                      src={receiptUrl}
                      alt="UPI Payment Receipt"
                      className="max-h-48 w-full object-contain rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                      <div className="px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 flex items-center gap-2 shadow-lg">
                        <ZoomIn className="w-4 h-4 stroke-[2.5]" />
                        <span>Click to enlarge on screen</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    <span>Click to view full screenshot ↗</span>
                  </button>
                </div>
              )}

              {/* Quick Direct Verify / Reject Action for Host if UPI is not yet verified */}
              {!isUpiVerified && transactionRef && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2.5">
                  <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    Verify ₹{totalAmount.toLocaleString('en-IN')} in your UPI/bank statement under UTR reference{' '}
                    <strong className="font-mono font-bold">{transactionRef}</strong> before authorizing check-in.
                  </div>

                  {showRejectInput ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                      <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        {canGuestResubmit
                          ? 'Request Correct UTR / Payment Proof (Guest gets 1 final chance)'
                          : 'Final Rejection (Guest has reached maximum submission attempts)'}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'UTR not found in bank statement',
                          'Incorrect payment amount received',
                          'Receipt screenshot unreadable',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRejectionReason(preset)}
                            className="text-[10px] px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer font-medium"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (e.g. UTR not found in bank statement)"
                        className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRejectInput(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isRejectingUpi || !rejectionReason.trim()}
                          onClick={handleRejectUpi}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                        >
                          {isRejectingUpi
                            ? 'Submitting...'
                            : canGuestResubmit
                            ? 'Send Re-request to Guest'
                            : 'Confirm Final Rejection'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        {canGuestResubmit ? 'Request Correct UTR' : 'Reject UTR'}
                      </button>
                      <button
                        type="button"
                        disabled={isVerifyingUpi}
                        onClick={handleVerifyUpi}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isVerifyingUpi ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying in Bank...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 stroke-[2.4]" />
                            <span>Verify UPI & Confirm Booking</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Action Buttons Footer ── */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl font-bold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Close
              </button>

              <button
                type="button"
                disabled={!canCheckIn || isSubmitting}
                onClick={handleConfirmCheckIn}
                className={`flex-1 py-3 px-4 rounded-2xl font-manrope font-bold text-xs sm:text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  canCheckIn
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                }`}
                title={
                  !canCheckIn
                    ? 'Booking must be CONFIRMED and UPI payment verified before check-in can proceed.'
                    : 'Confirm check-in and issue keys'
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authorizing Check-In...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 stroke-[2.4]" />
                    <span>Confirm Guest Check-In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Receipt Full Lightbox Modal (Blurred Background & Centered Image) ── */}
        <AnimatePresence>
          {isLightboxOpen && receiptUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900/95 dark:bg-[#080d16]/98 rounded-3xl p-3 sm:p-5 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Lightbox Header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 text-white text-xs font-bold shrink-0 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-manrope font-extrabold text-sm text-white block">
                        Payment Screenshot / Receipt
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block font-normal">
                        UTR: <strong className="text-white">{transactionRef || 'N/A'}</strong> • Amount:{' '}
                        <strong className="text-emerald-400">₹{totalAmount.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Open original file in new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open in New Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(false)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 transition-colors cursor-pointer"
                      title="Close (Esc)"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Center Image Container */}
                <div className="relative flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto rounded-2xl bg-black/60 border border-white/5">
                  <img
                    src={receiptUrl}
                    alt="Payment Receipt Screenshot"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl select-none"
                  />
                </div>

                {/* Footer Controls */}
                <div className="pt-3 px-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                  <span>Click outside image or press <strong>Esc</strong> to close</span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

export default CheckInVerificationModal;
