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

const CONSOLE_THEME = {
  cardBg: 'bg-[#E2E7FF]/70 hover:bg-[#E2E7FF]/90 dark:bg-[#111C2E] dark:hover:bg-[#142238] backdrop-blur-xl',
  border: 'border-slate-200/80 hover:border-[#3525CD]/40 dark:border-[#1E2E48] dark:hover:border-[#374c70]',
  shadow: 'shadow-[0_4px_20px_-4px_rgba(53,37,205,0.08),0_2px_6px_rgba(0,0,0,0.02)]',
  avatarBg: 'bg-[#E2DFFF] text-[#3525CD] dark:bg-[#4F46E5] dark:text-white border border-[#3525CD]/20 dark:border-transparent',
  roomBoxBg: 'bg-white dark:bg-[#162238] border border-slate-200/80 dark:border-[#1E2E48] shadow-xs',
  accentText: 'text-[#3525CD] dark:text-[#818CF8]',
  badgeWalkin: 'bg-[#E2DFFF] text-[#3525CD] dark:bg-white/20 dark:text-white border border-[#3525CD]/20 dark:border-white/10 font-bold',
  badgeStatus: 'bg-[#E2DFFF] text-[#3525CD] dark:bg-white/20 dark:text-white border border-[#3525CD]/20 dark:border-white/10 font-bold',
  primaryBtn: 'bg-transparent hover:bg-black hover:text-white dark:bg-transparent dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-all duration-500 ease-in-out hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)] active:translate-y-0 active:scale-[0.98]',
  secondaryBtn: 'bg-transparent hover:bg-black hover:text-white dark:bg-transparent dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-all duration-500 ease-in-out hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)] active:translate-y-0 active:scale-[0.98]',
  slotBtn: 'bg-[#E2DFFF]/70 hover:bg-[#E2DFFF] text-[#3525CD] dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#C7D2FE] border border-[#c7d2fe]/60 dark:border-white/10',
};

const SOFT_PALETTES = [
  { name: 'orange', ...CONSOLE_THEME },
  { name: 'mint', ...CONSOLE_THEME },
  { name: 'sky', ...CONSOLE_THEME },
  { name: 'warmCream', ...CONSOLE_THEME },
  { name: 'lavender', ...CONSOLE_THEME },
  { name: 'rose', ...CONSOLE_THEME },
  { name: 'teal', ...CONSOLE_THEME },
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

  const displayCheckInCode = useMemo(() => {
    if (guest.checkInCode && String(guest.checkInCode).trim()) {
      return String(guest.checkInCode).trim();
    }
    const digits = String(guest.bookingReferenceId || guest._id || '').replace(/\D/g, '');
    if (digits.length >= 8) {
      return digits.slice(-8);
    }
    return (digits + '84920153').slice(0, 8);
  }, [guest.checkInCode, guest.bookingReferenceId, guest._id]);

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
          ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-2 ring-[#3525CD] dark:ring-[#4F46E5]'
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3525CD] dark:bg-[#818CF8] ring-2 ring-[#3525CD]/30 dark:ring-[#818CF8]/30" />
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

          {/* Dates & Guests OR 8-Digit Entry Code for Check-In page */}
          {subTab === 'checkin' ? (
            <div className="flex items-center justify-between gap-1.5 py-0.5">
              <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                Entry Pass Code:
              </span>
              <span className="font-mono text-xs sm:text-[12.5px] font-black tracking-widest text-[#3525CD] dark:text-[#C7D2FE] bg-[#E2DFFF] dark:bg-[#4F46E5]/25 px-2 py-0.5 rounded-md border border-[#3525CD]/20 dark:border-[#4F46E5]/40 select-all shrink-0">
                {displayCheckInCode}
              </span>
            </div>
          ) : (
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
          )}

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
                  ? 'bg-[#3525CD] hover:bg-[#281ca5] text-white border-[#3525CD] dark:bg-[#4F46E5] dark:text-white shadow-xs shadow-indigo-600/30'
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
      <div className="flex items-center gap-1.5 pt-1.5 shrink-0 w-full" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal(guest);
          }}
          className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.primaryBtn}`}
        >
          <Eye className="w-3 h-3 stroke-[2.2] shrink-0" />
          <span>Pass</span>
        </button>

        {cleanPhone && (
          <a
            href={`tel:+91${cleanPhone}`}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.secondaryBtn}`}
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
            className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.primaryBtn}`}
          >
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>{isLoading ? '...' : 'Approve'}</span>
          </button>
        )}

        {/* Requests: Awaiting Payment indicator when approved but guest hasn't submitted UPI ref yet */}
        {subTab === 'requests' && !isCheckedIn && isAwaitingPayment && guest.upiPayment?.verificationStatus !== 'PENDING_VERIFICATION' && (
          <span
            className="flex-1 min-w-0 min-h-[36px] px-2 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 text-[10px] sm:text-[10.5px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
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
            className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.primaryBtn}`}
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
            className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.primaryBtn}`}
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
            className={`flex-1 min-w-0 min-h-[36px] py-1.5 px-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${palette.primaryBtn}`}
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