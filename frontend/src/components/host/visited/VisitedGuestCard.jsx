import React from 'react';

export function VisitedGuestCard({
  guest,
  subTab,
  isLoading,
  onOpenModal,
  onSelectUserRequest,
  onApproveRequest,
  onRejectRequest,
  onMarkCheckIn,
  onMarkCheckOut,
  formatIdNumber,
  formatModalDate,
}) {
  const isCheckedIn = guest.status === 'CHECKED_IN';
  const isCheckedOut = guest.status === 'CHECKED_OUT';
  const rawStatus = String(guest.status || '').toUpperCase();

  // A guest is only truly pending if their status indicates pending and they aren't already confirmed, checked in, or rejected
  const isPending =
    (rawStatus.includes('PENDING') || guest.status === 'Pending Host Approval' || rawStatus === 'DRAFT') &&
    !isCheckedIn &&
    !isCheckedOut &&
    rawStatus !== 'CONFIRMED' &&
    rawStatus !== 'REJECTED';

  const isOnline = guest.bookingSource === 'ONLINE';
  const isMonthly = String(guest.rateUnit || '').toLowerCase().includes('month');

  const cleanPhone = (guest.userPhone || guest.phone || guest.guestPhone || '').replace(/\D/g, '').slice(-10);
  const displayName = guest.userName || guest.fullName || guest.guestName || 'Guest User';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'GU';

  // Clicking anywhere on the card opens that specific room slot directly in the room schedule calendar
  const handleCardClick = () => {
    if (onSelectUserRequest) {
      onSelectUserRequest(guest);
    } else {
      onOpenModal(guest);
    }
  };

  const rawCheckIn = guest.checkIn || guest.checkInISO;
  const rawCheckOut = guest.checkOut || guest.checkOutISO;
  const formattedIn = rawCheckIn && formatModalDate ? formatModalDate(rawCheckIn, isMonthly ? '12:00 AM' : '12:00 PM') : null;
  const formattedOut = rawCheckOut && formatModalDate ? formatModalDate(rawCheckOut, isMonthly ? '11:59 PM' : '11:59 AM') : null;

  return (
    <div
      onClick={handleCardClick}
      className="group relative p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-purple-300 hover:bg-purple-50/50 dark:hover:border-slate-700 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3.5 select-none"
    >
      {/* Top Row: User Identity, Heading Name, Badges, and Top-Right Cross Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with initials */}
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-purple-200/70 dark:border-purple-800/60 shadow-2xs">
            {initials}
          </div>

          <div className="min-w-0">
            {/* Heading: User Name */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                {displayName}
              </h4>

              {/* Status Badge */}
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Request
                </span>
              ) : isCheckedIn ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Checked In
                </span>
              ) : isCheckedOut ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Checked Out
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                  Confirmed
                </span>
              )}

              {/* Online Badge */}
              {isOnline && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                  <svg className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                  Online
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{guest.durationDisplay || (isMonthly ? 'Monthly Stay' : 'Nightly Stay')}</span>
              {(guest.adults > 0 || guest.children > 0) && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>
                    {guest.adults || 1} Adult{(guest.adults || 1) > 1 ? 's' : ''}
                    {guest.children > 0 ? `, ${guest.children} Child` : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Cross Icon Button to Delete Request / Reject Approval */}
        {onRejectRequest && (
          <button
            type="button"
            title="Reject & Delete Request"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onRejectRequest(guest);
            }}
            className="w-8 h-8 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:border-rose-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-90 shrink-0"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Middle Row: Minimal Room, Price, and Slot Info (replaces repetitive 4 boxes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold shadow-2xs">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <span>Room {guest.roomNumber || '—'}</span>
            <span className="text-slate-400 font-normal">({guest.roomType || 'Standard'})</span>
          </span>

          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
            ₹{Number(guest.totalAmount || 0).toLocaleString('en-IN')}
          </span>

          {(formattedIn || formattedOut) && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              • {formattedIn ? formattedIn.split('(')[0].trim() : ''} → {formattedOut ? formattedOut.split('(')[0].trim() : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 group-hover:underline">
          <span>Open Room Slot</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>

      {/* Bottom Actions Row: Left = View Pass / Details; Right = Check sign to approve */}
      <div
        className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom Left Corner: View Pass / Details button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(guest);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="View User Pass & Full Details"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Pass / Details</span>
          </button>

          {cleanPhone && (
            <a
              href={`tel:+91${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title={`Call +91 ${cleanPhone}`}
            >
              <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span className="hidden sm:inline">Call</span>
            </a>
          )}
        </div>

        {/* Bottom Right Corner: Check sign to approve user */}
        <div>
          {subTab === 'requests' || isPending ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                if (onApproveRequest) onApproveRequest(guest);
              }}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              title="Approve User Request"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{isLoading ? 'Approving...' : 'Approve'}</span>
            </button>
          ) : subTab === 'checkin' ? (
            <div>
              {!isCheckedIn && !isCheckedOut ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkCheckIn) onMarkCheckIn(guest);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                  title="Mark Checked In"
                >
                  <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>{isLoading ? 'Updating...' : 'Mark Checked In'}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Checked In</span>
                </span>
              )}
            </div>
          ) : subTab === 'checkout' ? (
            <div>
              {!isCheckedOut ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkCheckOut) onMarkCheckOut(guest);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                  title="Complete Check-Out"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{isLoading ? 'Updating...' : 'Complete Check-Out'}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span>Checked Out</span>
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}