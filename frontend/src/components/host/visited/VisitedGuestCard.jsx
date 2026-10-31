import { useState, useMemo, memo } from 'react';
import { 
  Phone, 
  Eye, 
  LogOut, 
  Key, 
  Check, 
  X, 
  ArrowRight,
  ShieldCheck 
} from 'lucide-react';

const SOFT_PALETTES = [
  {
    name: 'orange',
    cardBg: 'bg-[#FCA058] dark:bg-[#381602]',
    border: 'border-orange-500/80 hover:border-orange-600 dark:border-orange-500/80 dark:hover:border-orange-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(234,88,12,0.25),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#EA580C] to-[#C2410C] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#251204] border border-orange-300/80 dark:border-orange-700/80 shadow-xs',
    accentText: 'text-orange-900 dark:text-orange-300',
    badgeWalkin: 'bg-white/60 dark:bg-orange-950/60 text-orange-950 dark:text-orange-200 border-orange-600/30 font-bold',
    badgeStatus: 'bg-white/70 dark:bg-orange-950/70 text-orange-950 dark:text-orange-100 border-orange-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-800/25 border border-orange-500/60',
    secondaryBtn: 'bg-white hover:bg-orange-50/90 dark:bg-[#2C1405] dark:hover:bg-[#3D1D09] text-orange-800 dark:text-orange-300 border-2 border-orange-500/60 dark:border-orange-500/50 shadow-xs hover:shadow-sm font-bold',
    slotBtn: 'bg-orange-600/15 hover:bg-orange-600/25 text-orange-950 dark:text-orange-200 border-orange-500/40 dark:border-orange-500/40 hover:border-orange-600/60',
  },
  {
    name: 'mint',
    cardBg: 'bg-[#6FE0A3] dark:bg-[#052e20]',
    border: 'border-emerald-500/80 hover:border-emerald-600 dark:border-emerald-500/80 dark:hover:border-emerald-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(0,108,74,0.25),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#006C4A] to-[#009A6A] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#041d16] border border-emerald-300/80 dark:border-emerald-700/80 shadow-xs',
    accentText: 'text-emerald-900 dark:text-emerald-300',
    badgeWalkin: 'bg-white/60 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-600/30 font-bold',
    badgeStatus: 'bg-white/70 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-emerald-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-800/25 border border-emerald-500/60',
    secondaryBtn: 'bg-white hover:bg-emerald-50/90 dark:bg-[#07241D] dark:hover:bg-[#0A3329] text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500/60 dark:border-emerald-500/50 shadow-xs hover:shadow-sm font-bold',
    slotBtn: 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-950 dark:text-emerald-200 border-emerald-500/40 dark:border-emerald-500/40 hover:border-emerald-600/60',
  },
  {
    name: 'sky',
    cardBg: 'bg-[#60C3FA] dark:bg-[#08294a]',
    border: 'border-sky-500/80 hover:border-sky-600 dark:border-sky-500/80 dark:hover:border-sky-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(2,132,199,0.25),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#0284C7] to-[#2563EB] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#051c33] border border-sky-300/80 dark:border-sky-700/80 shadow-xs',
    accentText: 'text-sky-900 dark:text-sky-300',
    badgeWalkin: 'bg-white/60 dark:bg-sky-950/60 text-sky-950 dark:text-sky-200 border-sky-600/30 font-bold',
    badgeStatus: 'bg-white/70 dark:bg-sky-950/70 text-sky-950 dark:text-sky-100 border-sky-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 hover:from-sky-700 hover:to-blue-800 text-white shadow-md shadow-sky-800/25 border border-sky-500/60',
    secondaryBtn: 'bg-white hover:bg-sky-50/90 dark:bg-[#0A223B] dark:hover:bg-[#0F3155] text-sky-800 dark:text-sky-300 border-2 border-sky-500/60 dark:border-sky-500/50 shadow-xs hover:shadow-sm font-bold',
    slotBtn: 'bg-sky-600/15 hover:bg-sky-600/25 text-sky-950 dark:text-sky-200 border-sky-500/40 dark:border-sky-500/40 hover:border-sky-600/60',
  },
  {
    name: 'warmCream',
    cardBg: 'bg-[#FCA058] dark:bg-[#381602]',
    border: 'border-orange-500/80 hover:border-orange-600 dark:border-orange-500/80 dark:hover:border-orange-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(234,88,12,0.25),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#EA580C] to-[#C2410C] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#251204] border border-orange-300/80 dark:border-orange-700/80 shadow-xs',
    accentText: 'text-orange-900 dark:text-orange-300',
    badgeWalkin: 'bg-white/60 dark:bg-orange-950/60 text-orange-950 dark:text-orange-200 border-orange-600/30 font-bold',
    badgeStatus: 'bg-white/70 dark:bg-orange-950/70 text-orange-950 dark:text-orange-100 border-orange-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-800/25 border border-orange-500/60',
    secondaryBtn: 'bg-white hover:bg-orange-50/90 dark:bg-[#2C1405] dark:hover:bg-[#3D1D09] text-orange-800 dark:text-orange-300 border-2 border-orange-500/60 dark:border-orange-500/50 shadow-xs hover:shadow-sm font-bold',
    slotBtn: 'bg-orange-600/15 hover:bg-orange-600/25 text-orange-950 dark:text-orange-200 border-orange-500/40 dark:border-orange-500/40 hover:border-orange-600/60',
  },
  {
    name: 'lavender',
    cardBg: 'bg-[#EEDFFE] dark:bg-[#251347]',
    border: 'border-purple-400/80 hover:border-purple-600 dark:border-purple-600/80 dark:hover:border-purple-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(126,34,206,0.18),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#7E22CE] to-[#6366F1] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#180b30] border border-purple-300/80 dark:border-purple-700/80 shadow-xs',
    accentText: 'text-purple-800 dark:text-purple-300',
    badgeWalkin: 'bg-purple-600/15 text-purple-950 dark:text-purple-200 border-purple-600/30 font-bold',
    badgeStatus: 'bg-purple-600/20 text-purple-950 dark:text-purple-100 border-purple-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-md shadow-purple-800/25 border border-purple-500/60',
    secondaryBtn: 'bg-white hover:bg-purple-50/90 dark:bg-[#1E1136] dark:hover:bg-[#2B184D] text-purple-800 dark:text-purple-300 border-2 border-purple-500/60 dark:border-purple-500/50 shadow-xs hover:shadow-sm font-bold',
  },
  {
    name: 'rose',
    cardBg: 'bg-[#FDD8E0] dark:bg-[#38111e]',
    border: 'border-rose-400/80 hover:border-rose-600 dark:border-rose-600/80 dark:hover:border-rose-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(225,29,72,0.18),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#E11D48] to-[#BE123C] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#260913] border border-rose-300/80 dark:border-rose-700/80 shadow-xs',
    accentText: 'text-rose-800 dark:text-rose-300',
    badgeWalkin: 'bg-rose-600/15 text-rose-950 dark:text-rose-200 border-rose-600/30 font-bold',
    badgeStatus: 'bg-rose-600/20 text-rose-950 dark:text-rose-100 border-rose-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-700 hover:to-pink-800 text-white shadow-md shadow-rose-800/25 border border-rose-500/60',
    secondaryBtn: 'bg-white hover:bg-rose-50/90 dark:bg-[#2C0E18] dark:hover:bg-[#3D1422] text-rose-800 dark:text-rose-300 border-2 border-rose-500/60 dark:border-rose-500/50 shadow-xs hover:shadow-sm font-bold',
  },
  {
    name: 'teal',
    cardBg: 'bg-[#C6F5EE] dark:bg-[#072c27]',
    border: 'border-teal-400/80 hover:border-teal-600 dark:border-teal-600/80 dark:hover:border-teal-400',
    shadow: 'shadow-[0_8px_24px_-4px_rgba(13,148,136,0.18),0_2px_6px_rgba(0,0,0,0.06)]',
    avatarBg: 'bg-gradient-to-tr from-[#0D9488] to-[#047857] text-white',
    roomBoxBg: 'bg-white/95 dark:bg-[#041d1a] border border-teal-300/80 dark:border-teal-700/80 shadow-xs',
    accentText: 'text-teal-800 dark:text-teal-300',
    badgeWalkin: 'bg-teal-600/15 text-teal-950 dark:text-teal-200 border-teal-600/30 font-bold',
    badgeStatus: 'bg-teal-600/20 text-teal-950 dark:text-teal-100 border-teal-600/40 font-bold',
    primaryBtn: 'bg-gradient-to-r from-teal-600 via-emerald-700 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white shadow-md shadow-teal-800/25 border border-teal-500/60',
    secondaryBtn: 'bg-white hover:bg-teal-50/90 dark:bg-[#062421] dark:hover:bg-[#0A332F] text-teal-800 dark:text-teal-300 border-2 border-teal-500/60 dark:border-teal-500/50 shadow-xs hover:shadow-sm font-bold',
  },
];

export const VisitedGuestCard = memo(function VisitedGuestCard({
  guest,
  subTab,
  isLoading,
  onOpenModal,
  onSelectUserRequest,
  onSelectSlot,
  onApproveRequest,
  onRejectRequest,
  onMarkCheckIn,
  onMarkCheckOut,
  onVerifyPayment,
  formatModalDate,
  paletteIndex = 0,
  isFocused = false,
  onFocusCard,
  onCloseFocus,
  isSlotSelected = false,
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Exact page color scheme:
  // - Request page -> orange only
  // - Check in page -> green only
  // - Check out page -> blue only
  const palette = useMemo(() => {
    if (subTab === 'requests') {
      return SOFT_PALETTES.find((p) => p.name === 'orange') || SOFT_PALETTES[0];
    }
    if (subTab === 'checkin') {
      return SOFT_PALETTES.find((p) => p.name === 'mint') || SOFT_PALETTES[1];
    }
    if (subTab === 'checkout') {
      return SOFT_PALETTES.find((p) => p.name === 'sky') || SOFT_PALETTES[2];
    }
    return SOFT_PALETTES[Math.abs(paletteIndex) % SOFT_PALETTES.length] || SOFT_PALETTES[0];
  }, [subTab, paletteIndex]);

  const rawStatus = String(guest.status || '').toUpperCase();
  const isOnline = guest.bookingSource === 'ONLINE' || guest.isOnline === true;
  const isCheckedOut = rawStatus === 'CHECKED_OUT' || rawStatus === 'COMPLETED';
  // Offline walk-in guests added by host are automatically approved and in-house (Checked In)
  const isCheckedIn = !isCheckedOut && (rawStatus === 'CHECKED_IN' || (!isOnline && rawStatus === 'CONFIRMED'));

  const isAwaitingPayment = rawStatus === 'AWAITING_PAYMENT' || rawStatus === 'PAYMENT_PENDING';
  const isPending =
    (rawStatus.includes('PENDING') || guest.status === 'Pending Host Approval' || rawStatus === 'DRAFT') &&
    !isCheckedIn &&
    !isCheckedOut &&
    !isAwaitingPayment &&
    rawStatus !== 'CONFIRMED' &&
    rawStatus !== 'REJECTED';

  const isMonthly = useMemo(() => {
    if (Array.isArray(guest.bookedMonths) && guest.bookedMonths.length > 0) return true;
    if (Number(guest.durationMonths) > 0) return true;
    if (String(guest.durationDisplay || '').toLowerCase().includes('month')) return true;
    if (String(guest.duration || '').toLowerCase().includes('month')) return true;
    const u = String(guest.rateUnit || '').toLowerCase().trim();
    if (u.includes('night') || u.includes('day')) return false;
    return true; // Default rental unit in Hostels / PG is monthly
  }, [guest.rateUnit, guest.bookedMonths, guest.durationMonths, guest.durationDisplay, guest.duration]);

  const cleanPhone = (guest.userPhone || guest.phone || guest.guestPhone || '').replace(/\D/g, '').slice(-10);
  const displayName = guest.userName || guest.fullName || guest.guestName || (isOnline ? 'Online Guest' : 'Walk-in Guest');
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (isOnline ? 'OG' : 'WK');

  const refCode = guest.bookingReferenceId || guest.bookingId || (isOnline ? '#RES-ONLINE' : '#RES-WALKIN');

  // Clicking an inactive card lifts it upward. Clicking an already lifted card body lowers it.
  const handleCardClick = () => {
    if (!isFocused) {
      if (onFocusCard) onFocusCard(guest);
      return;
    }
    if (onCloseFocus) {
      onCloseFocus();
    }
  };

  const rawCheckIn = guest.checkIn || guest.checkInISO;
  const rawCheckOut = guest.checkOut || guest.checkOutISO;
  const formattedIn = rawCheckIn && formatModalDate ? formatModalDate(rawCheckIn, isMonthly ? '12:00 AM' : '12:00 PM') : null;
  const formattedOut = rawCheckOut && formatModalDate ? formatModalDate(rawCheckOut, isMonthly ? '11:59 PM' : '11:59 AM') : null;

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl p-2.5 sm:p-3 border transition-colors select-none flex flex-col justify-between w-full h-full min-h-[195px] ${
        onFocusCard ? 'cursor-pointer' : 'cursor-default'
      } ${palette.cardBg} ${palette.border} ${
        isFocused
          ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-2 ring-emerald-500/50'
          : palette.shadow
      }`}
    >
      {/* ── Top Header: Avatar + Name + Source Tag + Code + Status Pill ── */}
      <div>
        <div className="flex items-start justify-between gap-1.5">
          {/* Avatar + Guest Name & Code */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full ${palette.avatarBg} flex items-center justify-center font-bold text-[11px] sm:text-xs shrink-0 shadow-xs tracking-tight`}>
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                  {displayName}
                </h3>
                {isOnline ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[9px] font-semibold border border-purple-200 dark:border-purple-800 shrink-0">
                    Online
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0 ${palette.badgeWalkin}`}>
                    Walk-In Guest
                  </span>
                )}
              </div>
              <span className="text-[9px] font-mono text-slate-600/90 dark:text-slate-400 block truncate mt-0.5">
                {refCode}
              </span>
            </div>
          </div>

          {/* Top-Right Status Badge / Delete confirmation */}
          <div className="shrink-0 flex items-center gap-1">
            {isConfirmingDelete ? (
              <div
                className="flex items-center gap-1 p-1 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 shadow-sm shrink-0 animate-in fade-in duration-150 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(false);
                  }}
                  className="px-1.5 py-0.5 rounded-lg bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-semibold border border-slate-200 dark:border-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (onRejectRequest) await onRejectRequest(guest);
                    setIsConfirmingDelete(false);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs cursor-pointer flex items-center gap-1 active:scale-[0.98] transition-all duration-150 ease-out"
                >
                  Delete
                </button>
              </div>
            ) : (
              <>
                {guest.upiPayment?.verificationStatus === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 text-[9.5px] font-bold border border-rose-300 dark:border-rose-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    <span>UPI Rejected</span>
                  </span>
                ) : guest.upiPayment?.verificationStatus === 'PENDING_VERIFICATION' || guest.paymentStatus === 'PENDING_VERIFICATION' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-900 dark:bg-violet-950/70 dark:text-violet-200 text-[9.5px] font-bold border border-violet-400/80 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 ring-2 ring-violet-400/40" />
                    <span>UPI Pending</span>
                  </span>
                ) : isAwaitingPayment ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[9.5px] font-semibold border border-amber-300/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-400/40" />
                    <span>Awaiting Payment</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[9.5px] font-semibold border border-amber-300/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-400/40" />
                    <span>Pending</span>
                  </span>
                ) : isCheckedIn ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${palette.badgeStatus}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 ring-2 ring-emerald-500/30" />
                    <span>Checked In</span>
                  </span>
                ) : isCheckedOut ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[9.5px] font-semibold border border-slate-200 dark:border-slate-700">
                    <span>Checked Out</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${palette.badgeStatus}`}>
                    <span>Confirmed</span>
                  </span>
                )}

                {/* Subtle Delete trigger on hover */}
                {onRejectRequest && !isFocused && (
                  <button
                    type="button"
                    title="Cancel booking and delete record"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsConfirmingDelete(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all duration-150 ease-out cursor-pointer shadow-2xs ml-0.5 shrink-0 active:scale-95"
                  >
                    <X className="w-2.5 h-2.5 stroke-[2.5]" />
                  </button>
                )}

                {/* Focus Close Button when Focused */}
                {isFocused && (
                  <button
                    type="button"
                    title="Close focus view (Esc)"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCloseFocus) onCloseFocus();
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 bg-white/95 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all duration-150 ease-out cursor-pointer shadow-xs ml-0.5 shrink-0 active:scale-95"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Middle Room & Stay Details (White/Glass Box matching Mockup) ── */}
        <div className={`rounded-xl p-2 sm:p-2.5 border shadow-2xs space-y-1 my-1.5 ${palette.roomBoxBg}`}>
          {/* Room Name & Total Price */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Key className={`w-3 h-3 shrink-0 ${palette.accentText}`} />
              <span className="text-[11.5px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">
                Room {guest.roomNumber || '—'} {guest.roomType ? `(${guest.roomType})` : ''}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                ₹{Number(guest.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Dates & Guests */}
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[10.5px] text-slate-500 dark:text-slate-400">
            {(() => {
              const durationText = (() => {
                if (isMonthly) {
                  if (Array.isArray(guest.bookedMonths) && guest.bookedMonths.length > 0) {
                    const count = guest.bookedMonths.length;
                    return `${count} ${count === 1 ? 'Month' : 'Months'}`;
                  }
                  if (Number(guest.durationMonths) > 0) {
                    const count = Number(guest.durationMonths);
                    return `${count} ${count === 1 ? 'Month' : 'Months'}`;
                  }
                  if (
                    guest.durationDisplay &&
                    !String(guest.durationDisplay).includes('undefined') &&
                    !String(guest.durationDisplay).toLowerCase().includes('night')
                  ) {
                    return guest.durationDisplay;
                  }
                  if (
                    guest.duration &&
                    !String(guest.duration).includes('undefined') &&
                    !String(guest.duration).toLowerCase().includes('night')
                  ) {
                    return guest.duration;
                  }
                  const inD = rawCheckIn ? new Date(rawCheckIn) : null;
                  const outD = rawCheckOut ? new Date(rawCheckOut) : null;
                  if (inD && outD && !isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
                    const months = Math.max(
                      1,
                      (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 +
                      (outD.getUTCMonth() - inD.getUTCMonth()) + 1
                    );
                    return `${months} ${months === 1 ? 'Month' : 'Months'}`;
                  }
                  return '1 Month';
                }
                if (guest.durationDisplay && !String(guest.durationDisplay).includes('undefined')) {
                  return guest.durationDisplay;
                }
                if (guest.duration && !String(guest.duration).includes('undefined')) {
                  return guest.duration;
                }
                const inD = rawCheckIn ? new Date(rawCheckIn) : null;
                const outD = rawCheckOut ? new Date(rawCheckOut) : null;
                if (inD && outD && !isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
                  const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
                  return `${diffDays} ${diffDays === 1 ? 'Night' : 'Nights'}`;
                }
                return '1 Night';
              })();

              return (
                <span className="truncate">
                  {formattedIn ? formattedIn.split('(')[0].trim() : '5 Oct'} - {formattedOut ? formattedOut.split('(')[0].trim() : '7 Oct'} • {durationText}
                </span>
              );
            })()}
            {(() => {
              const count = Math.max(
                Number(guest.personCount) || 0,
                Number(guest.guestCount) || 0,
                Number(guest.numberOfGuests) || 0,
                Number(guest.persons) || 0,
                Array.isArray(guest.occupants) ? guest.occupants.length : 0,
                Array.isArray(guest.guests) ? guest.guests.length : (Number(guest.guests) || 0),
                1
              );
              return (
                <span className="shrink-0 font-medium">
                  {count} {count === 1 ? 'Guest' : 'Guests'}
                </span>
              );
            })()}
          </div>

          {/* Phone and Slot button */}
          <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
            <span className="font-semibold tracking-tight text-slate-700 dark:text-slate-300">
              {cleanPhone ? `+91 ${cleanPhone}` : (guest.bookingReferenceId || '')}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectSlot) {
                  onSelectSlot(guest);
                } else if (onSelectUserRequest) {
                  onSelectUserRequest(guest);
                }
              }}
              className={`group/slot inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border transition-all duration-150 ease-out cursor-pointer select-none active:scale-[0.97] shadow-2xs ${
                isSlotSelected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/90 shadow-xs shadow-emerald-600/30'
                  : (palette.slotBtn || 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300/80')
              }`}
              title={isSlotSelected ? 'Click to reset slot' : 'Click to view slot in calendar'}
            >
              {isSlotSelected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white ring-2 ring-emerald-300/60 shrink-0" />
                  <span>Slot</span>
                  <Check className="w-2.5 h-2.5 stroke-[3] text-white shrink-0" />
                </>
              ) : (
                <>
                  <span className="w-1 h-1 rounded-full bg-current opacity-60 group-hover/slot:opacity-100 shrink-0" />
                  <span>Slot</span>
                  <ArrowRight className="w-2.5 h-2.5 stroke-[2.2] shrink-0 opacity-70 group-hover/slot:opacity-100 group-hover/slot:translate-x-0.5 transition-all duration-150" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Buttons Row ── */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 pt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal(guest);
          }}
          className={`flex-1 min-h-[36px] py-1.5 px-2.5 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all duration-150 ease-out cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] hover:brightness-105 shadow-sm whitespace-nowrap ${palette.primaryBtn}`}
        >
          <Eye className="w-3 h-3 stroke-[2.2] shrink-0" />
          <span>Pass / Details</span>
        </button>

        {cleanPhone && (
          <a
            href={`tel:+91${cleanPhone}`}
            onClick={(e) => e.stopPropagation()}
            className={`min-h-[36px] py-1.5 px-3 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all duration-150 ease-out cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] hover:brightness-95 dark:hover:brightness-110 whitespace-nowrap shrink-0 ${palette.secondaryBtn}`}
          >
            <Phone className="w-3 h-3 stroke-[2.2] shrink-0" />
            <span>Call</span>
          </a>
        )}

        {/* Requests: Approve CTA (Only when pending initial approval) */}
        {subTab === 'requests' && !isCheckedIn && !isAwaitingPayment && guest.upiPayment?.verificationStatus !== 'PENDING_VERIFICATION' && onApproveRequest && (
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onApproveRequest(guest);
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[10.5px] sm:text-[11px] font-bold shadow-md shadow-amber-600/20 cursor-pointer active:scale-[0.98] transition-all duration-150 ease-out flex items-center gap-1 hover:brightness-105 whitespace-nowrap shrink-0"
          >
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>{isLoading ? '...' : 'Approve'}</span>
          </button>
        )}

        {/* Requests: Awaiting Payment indicator when approved but guest hasn't submitted UPI ref yet */}
        {subTab === 'requests' && !isCheckedIn && isAwaitingPayment && guest.upiPayment?.verificationStatus !== 'PENDING_VERIFICATION' && (
          <span
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] sm:text-[10.5px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Waiting for guest to complete UPI payment"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Awaiting Payment</span>
          </span>
        )}

        {/* Verify UPI Payment CTA */}
        {onVerifyPayment && (guest.upiPayment?.verificationStatus === 'PENDING_VERIFICATION' || (guest.upiPayment?.transactionRef && guest.upiPayment?.verificationStatus !== 'VERIFIED')) && (
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onVerifyPayment(guest);
            }}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[10.5px] sm:text-[11px] font-bold shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.98] transition-all duration-150 ease-out flex items-center gap-1 hover:brightness-105 whitespace-nowrap shrink-0 animate-pulse"
            title="Verify direct UPI bank credit"
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Verify UPI</span>
          </button>
        )}

        {/* Check-in CTA */}
        {subTab === 'checkin' && !isCheckedIn && onMarkCheckIn && (
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onMarkCheckIn(guest);
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10.5px] sm:text-[11px] font-bold shadow-md shadow-emerald-600/20 cursor-pointer active:scale-[0.98] transition-all duration-150 ease-out flex items-center gap-1 hover:brightness-105 whitespace-nowrap shrink-0"
            title="Review verification details and check in guest"
          >
            <Key className="w-3 h-3 stroke-[2.5]" />
            <span>Check In</span>
          </button>
        )}

        {/* Checkout: Check Out CTA */}
        {subTab === 'checkout' && !isCheckedOut && onMarkCheckOut && (
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onMarkCheckOut(guest);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-[10.5px] sm:text-[11px] font-bold shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.98] transition-all duration-150 ease-out flex items-center gap-1 hover:brightness-105 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3 h-3 stroke-[2.5]" />
            <span>Check Out</span>
          </button>
        )}
      </div>
    </div>
  );
});

export default VisitedGuestCard;