import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Calculates total months of stay for a given monthly booking occupant record.
 */
function getOccupantStayMonths(occ) {
  if (!occ) return '1 Month';

  // 1. Direct bookedMonths array (used for monthly bookings)
  if (Array.isArray(occ.bookedMonths) && occ.bookedMonths.length > 0) {
    const count = occ.bookedMonths.length;
    return `${count} ${count === 1 ? 'Month' : 'Months'}`;
  }

  // 2. Check checkIn and checkOut dates
  const rawIn = occ.checkInISO || occ.checkIn;
  const rawOut = occ.checkOutISO || occ.checkOut;
  if (rawIn && rawOut) {
    const inD = new Date(rawIn);
    const outD = new Date(rawOut);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const inYear = inD.getUTCFullYear();
      const inMonth = inD.getUTCMonth();
      const outYear = outD.getUTCFullYear();
      const outMonth = outD.getUTCMonth();
      const count = Math.max(1, (outYear - inYear) * 12 + (outMonth - inMonth) + 1);
      return `${count} ${count === 1 ? 'Month' : 'Months'}`;
    }
  }

  // 3. Fallback to durationLabel or months properties
  if (occ.durationLabel && occ.durationLabel.toLowerCase().includes('month')) {
    return occ.durationLabel;
  }
  if (occ.monthsCount || occ.durationMonths) {
    const count = Number(occ.monthsCount || occ.durationMonths);
    if (count > 0) return `${count} ${count === 1 ? 'Month' : 'Months'}`;
  }

  return '1 Month';
}

/**
 * MonthOccupantsListModal
 * Displays a premium, minimalist list of all occupants booked for a specific month.
 * Uses createPortal into document.body so the modal covers the entire viewport properly.
 * Clicking on any occupant opens their Resident ID Pass.
 */
export function MonthOccupantsListModal({
  monthData,
  roomDisplay,
  roomTypeDisplay,
  onClose,
  onSelectOccupant,
  onBookOpenSlot,
  isOccupantModalOpen = false,
}) {
  if (!monthData || isOccupantModalOpen) return null;
  if (typeof document === 'undefined') return null;

  const {
    monthKey,
    monthShort,
    year,
    occupiedCount = 0,
    roomCapacity = 1,
    occupants = [],
    isFullyBooked = false,
  } = monthData;

  const remainingSlots = Math.max(0, roomCapacity - occupiedCount);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md transition-all overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl text-slate-900 dark:text-zinc-100 rounded-3xl shadow-[0_24px_48px_rgba(31,38,135,0.15),_inset_0_1px_2px_rgba(255,255,255,0.95)] border border-white/80 dark:border-zinc-800 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-zinc-700 mx-auto mt-2 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#6594B1]/15 text-[#2c536e] dark:text-sky-200 flex items-center justify-center text-xs font-bold shrink-0 border border-[#6594B1]/25 shadow-2xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 leading-tight truncate">
                Month Occupants
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                {monthShort} {year} • {roomDisplay} {roomTypeDisplay ? `(${roomTypeDisplay})` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider shadow-2xs ${
              isFullyBooked
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/70'
                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700/60'
            }`}>
              {isFullyBooked ? 'Completely Booked' : `${occupiedCount}/${roomCapacity} Booked`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Occupancy Status & Dots Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-zinc-950/40 border-b border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-semibold text-slate-700 dark:text-zinc-300">
              {occupiedCount} of {roomCapacity} Bed{roomCapacity > 1 ? 's' : ''} Occupied
            </span>
            {/* 5 5 proportion dots preview */}
            <div className="flex items-center gap-1 shrink-0">
              {Array.from({ length: roomCapacity }).map((_, dIdx) => (
                <span
                  key={dIdx}
                  className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                    dIdx < occupiedCount
                      ? 'bg-black dark:bg-white ring-1 ring-black/20 dark:ring-white/20'
                      : 'border-[1.5px] border-slate-900 dark:border-white/80 bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            {isFullyBooked
              ? 'No open slots'
              : `${remainingSlots} open slot${remainingSlots > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Occupants List Body */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 px-1">
            Click an occupant below to view and manage their Resident ID Pass:
          </div>

          {occupants.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-xs text-slate-400 dark:text-zinc-500 space-y-1">
              <div>No occupants booked for {monthShort} {year} yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {occupants.map((occ, idx) => {
                const name = occ.name || occ.userName || occ.guestName || 'Guest';
                const phone = occ.phone || occ.userPhone || '—';
                const stayMonths = getOccupantStayMonths(occ);
                const paid = Number(occ.totalAmount || occ.paidAmount || 0);
                const isOnline = Boolean(
                  occ.isOnline === true ||
                  occ.bookingSource === 'ONLINE_USER' ||
                  (occ.source === 'booking' && occ.bookingSource !== 'OFFLINE_HOST')
                );

                // Initials for avatar
                const initials = name
                  .trim()
                  .split(/\s+/)
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'RS';

                return (
                  <div
                    key={occ.bookingId || occ.id || occ._id || `occ_${idx}`}
                    onClick={() => {
                      if (typeof onSelectOccupant === 'function') {
                        onSelectOccupant(occ);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 hover:border-[#6594B1]/60 hover:bg-slate-50/70 dark:hover:bg-zinc-800/95 hover:shadow-xs transition-all duration-150 ease-out cursor-pointer group flex items-center justify-between gap-3 select-none active:scale-[0.99]"
                    title={`Click to open Resident ID Pass for ${name}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Initials Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6594B1]/20 to-[#6594B1]/10 text-[#2c536e] dark:text-sky-200 font-black text-sm flex items-center justify-center border border-[#6594B1]/25 shrink-0 shadow-2xs">
                        {initials}
                      </div>

                      {/* Name & Booking Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-[#6594B1] transition-colors truncate">
                            {name}
                          </h4>
                          <span className={`text-[9.5px] font-semibold px-2 py-0.2 rounded-md uppercase tracking-wider ${
                            isOnline
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {isOnline ? 'Online User' : 'Confirmed'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex-wrap">
                          {phone !== '—' && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{phone}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                            <svg className="w-3.5 h-3.5 text-[#6594B1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{stayMonths}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Price & Click Hint */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {paid > 0 && (
                        <span className="text-xs sm:text-[13px] font-black text-emerald-700 dark:text-emerald-400">
                          ₹{paid.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-[#6594B1] dark:text-sky-300 flex items-center gap-0.5 transition-colors group-hover:text-[#4f7791] dark:group-hover:text-sky-200">
                        <span>View Pass</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* If there are open slots, show quick option to book remaining bed */}
          {remainingSlots > 0 && typeof onBookOpenSlot === 'function' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBookOpenSlot}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>Book Remaining Bed ({remainingSlots} Slot{remainingSlots > 1 ? 's' : ''} Open)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
