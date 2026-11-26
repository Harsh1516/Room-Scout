import { memo } from 'react';
import {
  User,
  Bed,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldCheck,
  Check,
  Key,
  LogOut,
} from 'lucide-react';
import { formatUtrNumber } from '../../../utils/bookingDetailsHelpers';

function formatCleanDate(rawDate) {
  if (!rawDate) return '';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return String(rawDate).slice(0, 15);
}

function getStayDurationText(guest) {
  const isMonthly =
    (Array.isArray(guest?.bookedMonths) && guest.bookedMonths.length > 0) ||
    Number(guest?.durationMonths) > 0 ||
    String(guest?.durationDisplay || '').toLowerCase().includes('month') ||
    String(guest?.duration || '').toLowerCase().includes('month') ||
    String(guest?.rateUnit || '').toLowerCase().includes('month');

  if (isMonthly) {
    if (Array.isArray(guest?.bookedMonths) && guest.bookedMonths.length > 0) {
      const count = guest.bookedMonths.length;
      return `(${count} ${count === 1 ? 'Month' : 'Months'})`;
    }
    if (Number(guest?.durationMonths) > 0) {
      const count = Number(guest.durationMonths);
      return `(${count} ${count === 1 ? 'Month' : 'Months'})`;
    }
    const rawIn = guest?.checkInISO || guest?.checkIn;
    const rawOut = guest?.checkOutISO || guest?.checkOut;
    if (rawIn && rawOut) {
      const inD = new Date(rawIn);
      const outD = new Date(rawOut);
      if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
        const months = Math.max(
          1,
          (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 +
            (outD.getUTCMonth() - inD.getUTCMonth()) +
            1
        );
        return `(${months} ${months === 1 ? 'Month' : 'Months'})`;
      }
    }
    return '(1 Month)';
  }

  // Nightly
  if (guest?.durationDisplay && !String(guest.durationDisplay).includes('undefined')) {
    const d = String(guest.durationDisplay).trim();
    return d.startsWith('(') ? d : `(${d})`;
  }
  const rawIn = guest?.checkInISO || guest?.checkIn;
  const rawOut = guest?.checkOutISO || guest?.checkOut;
  if (rawIn && rawOut) {
    const inD = new Date(rawIn);
    const outD = new Date(rawOut);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const nights = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
      return `(${nights} ${nights === 1 ? 'Night' : 'Nights'})`;
    }
  }
  return '(1 Night)';
}

export const VisitedGuestCard = memo(function VisitedGuestCard({
  guest,
  subTab = 'requests',
  isLoading = false,
  onOpenModal,
  onSelectUserRequest,
  onSelectSlot,
  onOpenSlotModal,
  onApproveRequest,
  onAcceptUtr,
  onRejectRequest,
  onMarkCheckIn,
  onMarkCheckOut,
  onVerifyPayment,
  isSlotSelected = false,
  hostProperty,
}) {
  if (!guest) return null;

  const rawStatus = String(guest.status || '').toUpperCase();
  const isOnline = guest.bookingSource === 'ONLINE' || guest.isOnline === true;
  const isCheckedOut = rawStatus === 'CHECKED_OUT' || rawStatus === 'COMPLETED';
  const isCheckedIn = !isCheckedOut && (rawStatus === 'CHECKED_IN' || (!isOnline && rawStatus === 'CONFIRMED'));
  const isAwaitingPayment = rawStatus === 'AWAITING_PAYMENT' || rawStatus === 'PAYMENT_PENDING';
  const submittedUtr = String(guest.upiPayment?.transactionRef || guest.transactionRef || '').trim();
  const isPendingVerification = guest.upiPayment?.verificationStatus === 'PENDING_VERIFICATION';
  const hasPendingUtr = isPendingVerification && Boolean(submittedUtr);
  const isPending =
    (rawStatus.includes('PENDING') || guest.status === 'Pending Host Approval' || rawStatus === 'DRAFT') &&
    !isCheckedIn &&
    !isCheckedOut &&
    !isAwaitingPayment &&
    rawStatus !== 'CONFIRMED' &&
    rawStatus !== 'REJECTED';

  // 1. User Identity
  const displayName =
    guest.userName ||
    guest.fullName ||
    guest.guestName ||
    guest.name ||
    'Rohit Sharma';

  // 2. Room & Property Info
  const roomType = guest.roomType || 'Deluxe Room';
  const roomNumber = guest.roomNumber ? String(guest.roomNumber).replace(/\D/g, '') : '';
  const roomTitle = roomNumber ? `Room ${roomNumber} • ${roomType}` : roomType;
  const propertyTitle =
    hostProperty?.title ||
    hostProperty?.name ||
    hostProperty?.address ||
    guest.propertyName ||
    guest.stayTitle ||
    'Sunrise PG, Bhimtal';

  // 3. Date & Duration Info
  let dateLabel = 'Check-in';
  let targetDate = guest.checkInISO || guest.checkIn || guest.createdAt || new Date();
  if (subTab === 'checkout') {
    dateLabel = 'Check-out';
    targetDate = guest.checkOutISO || guest.checkOut || guest.checkInISO || guest.checkIn || new Date();
  }
  const formattedDateStr = formatCleanDate(targetDate) || '25 Nov 2026';
  const durationStr = getStayDurationText(guest);

  // 4. Status Badge matching user mockup
  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf8ee] text-[#1e8346] border border-[#c7efd3]">
      <CheckCircle2 className="w-4 h-4 text-[#1e8346] fill-[#1e8346] text-white" />
      <span>Room Booked</span>
    </span>
  );

  if (hasPendingUtr) {
    const formattedUtr = formatUtrNumber(submittedUtr);
    statusBadge = (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300"
        title={`Submitted 12-digit UTR: ${formattedUtr}`}
      >
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-mono tracking-wide">UTR: {formattedUtr}</span>
      </span>
    );
  } else if (isOnline && (isAwaitingPayment || isPendingVerification)) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <ShieldCheck className="w-4 h-4 text-violet-600" />
        <span>UPI Pending</span>
      </span>
    );
  } else if (isAwaitingPayment) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-4 h-4 text-amber-600" />
        <span>Awaiting Payment</span>
      </span>
    );
  } else if (subTab === 'requests' && isPending) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-4 h-4 text-amber-600" />
        <span>Pending Approval</span>
      </span>
    );
  } else if (isCheckedOut) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <CheckCircle2 className="w-4 h-4 text-purple-600" />
        <span>Checked Out</span>
      </span>
    );
  } else if (isCheckedIn) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf8ee] text-[#1e8346] border border-[#c7efd3]">
        <CheckCircle2 className="w-4 h-4 text-[#1e8346] fill-[#1e8346] text-white" />
        <span>Room Booked</span>
      </span>
    );
  }

  const handleCardClick = () => {
    if (typeof onSelectSlot === 'function') {
      onSelectSlot(guest);
    } else if (typeof onSelectUserRequest === 'function') {
      onSelectUserRequest(guest);
    }
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    if (typeof onOpenModal === 'function') {
      onOpenModal(guest);
    } else if (typeof onSelectUserRequest === 'function') {
      onSelectUserRequest(guest);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`w-full flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-all duration-200 gap-3.5 sm:gap-4 select-none cursor-pointer ${
        hasPendingUtr
          ? 'border border-yellow-400'
          : 'border border-slate-200/90'
      } ${
        isSlotSelected
          ? `ring-2 ring-blue-500/80 bg-blue-50/10 ${hasPendingUtr ? '' : 'border-blue-400'}`
          : ''
      }`}
    >
      {/* ── Top Row: User Avatar + Name & Room/Category on Left, Status Badge on Right ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        {/* Left: User Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#dbeafe] text-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-6 h-6 text-[#3b82f6]" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-[15.5px] sm:text-[16.5px] font-bold text-slate-900 tracking-tight leading-tight truncate">
              {displayName}
            </h3>
            <span className="text-xs sm:text-[13px] text-slate-500 font-medium leading-tight mt-1 truncate">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Right: Status Pill */}
        <div className="shrink-0">{statusBadge}</div>
      </div>

      {/* ── Middle Info Row: Property & Check-in Dates ── */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap min-w-0 pt-0.5">
        {/* Bed Icon & Property */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#eff4fc] text-[#3b82f6] flex items-center justify-center shrink-0">
            <Bed className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#3b82f6]" />
          </div>
          <span className="text-xs sm:text-[13px] font-medium text-slate-700 leading-tight truncate">
            {propertyTitle}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />

        {/* Calendar & Check-in info */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs sm:text-[13px] font-medium text-slate-800 leading-tight whitespace-nowrap">
            {dateLabel}: {formattedDateStr}{' '}
            <span className="text-slate-500 font-normal">{durationStr}</span>
          </span>
        </div>
      </div>

      {/* ── Bottom Row: Slot Button (Bottom Left) + Quick Actions (Bottom Right) ── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/90">
        {/* Bottom Left Corner: Slot Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onOpenSlotModal === 'function') {
              onOpenSlotModal(guest);
            } else {
              handleCardClick();
            }
          }}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap border shrink-0 ${
            isSlotSelected
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Slot</span>
        </button>

        {/* Bottom Right Corner: Quick Action + View Details > Button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Quick Action: Accept UTR (once UTR is submitted) OR Approve Request */}
          {subTab === 'requests' && !isCheckedIn && (
            hasPendingUtr && onAcceptUtr ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptUtr(guest);
                }}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoading ? '...' : 'Accept UTR'}</span>
              </button>
            ) : isPending && !isAwaitingPayment && !isPendingVerification && onApproveRequest ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveRequest(guest);
                }}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoading ? '...' : 'Approve'}</span>
              </button>
            ) : null
          )}

          {/* Quick Action: Check In */}
          {subTab === 'checkin' && !isCheckedIn && onMarkCheckIn && (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onMarkCheckIn(guest);
              }}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Key className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isLoading ? '...' : 'Check In'}</span>
            </button>
          )}

          {/* Quick Action: Check Out */}
          {subTab === 'checkout' && !isCheckedOut && onMarkCheckOut && (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onMarkCheckOut(guest);
              }}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isLoading ? '...' : 'Check Out'}</span>
            </button>
          )}

          {/* Signature 'View Details >' Button from Mockup */}
          <button
            type="button"
            onClick={handleDetailsClick}
            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50/70 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default VisitedGuestCard;
