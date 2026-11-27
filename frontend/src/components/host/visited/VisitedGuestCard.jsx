import { memo } from 'react';
import {
  User,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldCheck,
  Check,
  Key,
  LogOut,
  RefreshCw,
  X,
} from 'lucide-react';
import { formatUtrNumber } from '../../../utils/bookingDetailsHelpers';
import { isPaidGuest } from '../../../utils/guestFilters';
import { LivePaymentTimer } from '../../common/LivePaymentTimer';

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
}) {
  if (!guest) return null;

  const rawStatus = String(guest.status || '').toUpperCase();
  const isOnline = guest.bookingSource === 'ONLINE' || guest.isOnline === true;
  const isExtensionPending =
    subTab === 'requests' && guest.activeExtension?.status === 'PENDING_VERIFICATION';
  const extInfo = isExtensionPending ? guest.activeExtension : null;
  const isCheckedOut = rawStatus === 'CHECKED_OUT' || rawStatus === 'COMPLETED';
  const isCheckedIn = !isCheckedOut && (rawStatus === 'CHECKED_IN' || (!isOnline && rawStatus === 'CONFIRMED'));
  const isAwaitingPayment = rawStatus === 'AWAITING_PAYMENT' || rawStatus === 'PAYMENT_PENDING';
  const submittedUtr = isExtensionPending
    ? String(extInfo?.transactionRef || '').trim()
    : String(guest.upiPayment?.transactionRef || guest.transactionRef || '').trim();
  const isPendingVerification =
    isExtensionPending || guest.upiPayment?.verificationStatus === 'PENDING_VERIFICATION';
  const hasPendingUtr = isPendingVerification && Boolean(submittedUtr);
  const showPaymentTimer = Boolean(
    !isExtensionPending &&
    isOnline &&
    isAwaitingPayment &&
    !isPendingVerification &&
    !hasPendingUtr &&
    !isCheckedIn &&
    !isCheckedOut &&
    guest.paymentDeadline
  );
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

  // 2. Room & Payment Info
  const roomType = (isExtensionPending ? extInfo?.targetRoomType : null) || guest.roomType || 'Deluxe Room';
  const rawRoomVal = (isExtensionPending ? extInfo?.targetRoomNumber : null) || guest.roomNumber;
  const roomNumber = rawRoomVal ? String(rawRoomVal).replace(/\D/g, '') : '';
  const roomTitle = roomNumber ? `Room ${roomNumber} • ${roomType}` : roomType;
  const amountValue = isExtensionPending
    ? Number(extInfo?.amount ?? 0)
    : Number(guest.totalAmount ?? guest.paidAmount ?? guest.price ?? 0) || 0;
  const isPaid =
    !isExtensionPending &&
    (isPaidGuest(guest) ||
      guest.isPaid === true ||
      String(guest.paymentStatus || '').toUpperCase() === 'PAID');
  const amountLabel = isExtensionPending ? 'Extend Payable' : isPaid ? 'Paid' : 'Payable';
  const formattedAmount = `₹${amountValue.toLocaleString('en-IN')}`;

  // 3. Date & Duration Info
  let dateLabel = 'Check-in';
  let targetDate = guest.checkInISO || guest.checkIn || guest.createdAt || new Date();
  if (isExtensionPending) {
    dateLabel = 'Extending';
    targetDate = extInfo?.targetCheckIn || targetDate;
  } else if (subTab === 'checkout' || (subTab === 'paid' && isCheckedOut)) {
    dateLabel = 'Check-out';
    targetDate = guest.checkOutISO || guest.checkOut || guest.checkInISO || guest.checkIn || new Date();
  }
  const formattedDateStr =
    isExtensionPending && extInfo?.targetMonthLabel
      ? extInfo.targetMonthLabel
      : formatCleanDate(targetDate) || '25 Nov 2026';
  const durationStr = isExtensionPending ? '(1 Month)' : getStayDurationText(guest);

  // 4. Status Badge matching user mockup
  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eaf8ee] text-[#1e8346] border border-[#c7efd3]">
      <CheckCircle2 className="w-4 h-4 text-[#1e8346] fill-[#1e8346] text-white" />
      <span>Room Booked</span>
    </span>
  );

  if (subTab === 'paid') {
    if (isCheckedOut) {
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
          <span>Checked In</span>
        </span>
      );
    } else {
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Waiting for Check-in</span>
        </span>
      );
    }
  } else if (isExtensionPending) {
    const formattedUtr = formatUtrNumber(submittedUtr);
    statusBadge = (
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <RefreshCw className="w-3 h-3 shrink-0" />
          <span>Extending Validity</span>
        </span>
        {submittedUtr && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300"
            title={`Submitted 12-digit UTR: ${formattedUtr}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-mono">UTR: {formattedUtr}</span>
          </span>
        )}
      </div>
    );
  } else if (hasPendingUtr) {
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
      {/* ── Top Row: User Avatar + Name & Room/Category on Left, Live Timer in Center, Status Badge on Right ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: User Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#dbeafe] text-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#3b82f6]" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-[15px] sm:text-[16.5px] font-bold text-slate-900 tracking-tight leading-tight truncate">
              {displayName}
            </h3>
            <span className="text-xs sm:text-[13px] text-slate-500 font-medium leading-tight mt-0.5 sm:mt-1 truncate">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Live Payment Timer (heading center when awaiting online payment) */}
        {showPaymentTimer && (
          <div className="shrink-0 flex items-center justify-center">
            <LivePaymentTimer deadline={guest.paymentDeadline} />
          </div>
        )}

        {/* Right: Status Pill */}
        <div className="shrink-0">{statusBadge}</div>
      </div>

      {/* ── Middle Info Row: Check-in Dates & Paid Amount ── */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap sm:flex-nowrap min-w-0 pt-0.5">
        {/* Left: Calendar & Check-in info */}
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs sm:text-[13px] font-medium text-slate-800 leading-tight whitespace-nowrap">
            {dateLabel}: {formattedDateStr}{' '}
            <span className="text-slate-500 font-normal">{durationStr}</span>
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />

        {/* Right: Paid / Payable Amount */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs sm:text-[13px] font-medium text-slate-500 leading-tight whitespace-nowrap">
            {amountLabel}:
          </span>
          <span
            className={`text-xs sm:text-[13px] font-semibold font-mono leading-tight whitespace-nowrap ${
              isPaid ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {formattedAmount}
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
          {subTab === 'requests' && (!isCheckedIn || isExtensionPending) && (
            hasPendingUtr && onAcceptUtr ? (
              <div className="flex items-center gap-1.5">
                {isExtensionPending && onRejectRequest && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectRequest(guest);
                    }}
                    className="px-2.5 py-1.5 sm:py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-60"
                    title="Flag incorrect extension UTR"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flag UTR</span>
                  </button>
                )}
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
              </div>
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
