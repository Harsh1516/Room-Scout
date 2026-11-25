import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function getOccupantStayMonths(occ) {
 if (!occ) return '1 Month';

 if (Array.isArray(occ.bookedMonths) && occ.bookedMonths.length > 0) {
 const count = occ.bookedMonths.length;
 return `${count} ${count === 1 ? 'Month' : 'Months'}`;
 }

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

 if (occ.durationLabel && occ.durationLabel.toLowerCase().includes('month')) {
 return occ.durationLabel;
 }
 if (occ.monthsCount || occ.durationMonths) {
 const count = Number(occ.monthsCount || occ.durationMonths);
 if (count > 0) return `${count} ${count === 1 ? 'Month' : 'Months'}`;
 }

 return '1 Month';
}

function formatOccupantMonthsRange(occ) {
 if (Array.isArray(occ.bookedMonths) && occ.bookedMonths.length > 0) {
 const sorted = [...occ.bookedMonths].sort();
 const parseM = (k) => {
 const [y, m] = k.split('-');
 const d = new Date(Number(y), Number(m) - 1, 1);
 return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
 };
 if (sorted.length === 1) return `${parseM(sorted[0])} (1 Month)`;
 return `${parseM(sorted[0])} – ${parseM(sorted[sorted.length - 1])} (${sorted.length} Months)`;
 }

 const rawIn = occ.checkInISO || occ.checkIn;
 const rawOut = occ.checkOutISO || occ.checkOut;
 if (rawIn && rawOut) {
 const inD = new Date(rawIn);
 const outD = new Date(rawOut);
 if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
 const inStr = inD.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
 const outStr = outD.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
 const nights = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
 return `${inStr} – ${outStr} (${nights} ${nights === 1 ? 'Night' : 'Nights'})`;
 }
 }

 return getOccupantStayMonths(occ);
}

export function MonthOccupantsListModal({
 monthData,
 roomDisplay,
 roomTypeDisplay,
 onClose,
 onSelectOccupant,
 onBookOpenSlot,
 isOccupantModalOpen = false,
}) {
 const [currentPage, setCurrentPage] = useState(1);

 const monthKey = monthData?.monthKey;
 useEffect(() => {
 setCurrentPage(1);
 }, [monthKey]);

 if (!monthData || isOccupantModalOpen) return null;
 if (typeof document === 'undefined') return null;

 const {
 occupiedCount = 0,
 roomCapacity = 1,
 occupants = [],
 } = monthData;

 const ITEMS_PER_PAGE = 5;
 const totalPages = Math.ceil(occupants.length / ITEMS_PER_PAGE) || 1;
 const safePage = Math.min(currentPage, totalPages);
 const displayedOccupants = occupants.slice(
 (safePage - 1) * ITEMS_PER_PAGE,
 safePage * ITEMS_PER_PAGE
 );

 const remainingSlots = Math.max(0, roomCapacity - occupiedCount);

 const cleanRoomName = roomDisplay
 ? roomDisplay.startsWith('Room')
 ? roomDisplay
 : `Room ${roomDisplay}`
 : '';

 return createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
 <div
 onClick={onClose}
 className="fixed inset-0 bg-black/20 backdrop-blur-xs cursor-pointer transition-opacity"
 />
 <div
 className="relative z-10 w-full max-w-[400px] bg-white text-[#1f1b16] rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] border border-slate-200/90 overflow-hidden my-auto select-none transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="px-5 pt-4 pb-2.5 border-b border-slate-100 bg-white text-[#1f1b16] relative z-10">
 <div className="flex flex-col gap-1.5 w-full">
 <div className="flex items-center justify-center w-full">
 <h3 className="font-medium tracking-tight text-[16px] sm:text-[17px] text-center leading-none text-[#1f1b16]">
 Occupants
 </h3>
 </div>
 <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-slate-100 text-xs leading-tight font-semibold">
 <span className="font-medium text-[10.5px] text-slate-600 truncate">
 {cleanRoomName || 'Room'}{roomTypeDisplay ? ` (${roomTypeDisplay})` : ''}
 </span>
 <span className="text-[10.5px] font-medium px-2.5 py-0.5 rounded-full border border-black bg-black text-white tracking-wide shrink-0 shadow-xs">
 {occupants.length} {occupants.length === 1 ? 'Guest' : 'Guests'}
 </span>
 </div>
 </div>
 </div>

 {/* Occupants List Body — no max-height, no scroll */}
 <div className="p-4 sm:p-5 pb-5 sm:pb-6 space-y-2.5">
 {occupants.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 space-y-1">
 <div>No occupants booked for this room yet.</div>
 </div>
 ) : (
 <div className="space-y-2.5">
 {displayedOccupants.map((occ, idx) => {
 const name = occ.name || occ.userName || occ.guestName || 'Guest';
 const stayMonths = formatOccupantMonthsRange(occ);
 const paid = Number(occ.totalAmount || occ.paidAmount || 0);
 const isOnline = Boolean(
 occ.isOnline === true ||
 occ.bookingSource === 'ONLINE_USER' ||
 (occ.source === 'booking' && occ.bookingSource !== 'OFFLINE_HOST')
 );

 return (
 <div
 key={occ.bookingId || occ._id || `occ_${idx}`}
 onClick={() => {
 if (typeof onSelectOccupant === 'function') {
 onSelectOccupant(occ);
 }
 }}
 className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 hover:border-slate-300 transition-all duration-150 ease-out cursor-pointer group select-none active:scale-[0.99]"
 title={`Click to open Resident ID Pass for ${name}`}
 >
 <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
 <h4 className="text-[14.5px] sm:text-[15.5px] font-medium text-[#1f1b16] group-hover:text-[#1f1b16] transition-colors truncate leading-snug">
 {name}
 </h4>
 <div className="flex items-center justify-center px-1">
 <span className={`text-[10px] sm:text-[10.5px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
 isOnline
 ? 'text-purple-600 bg-purple-50/80 border-purple-200/80'
 : 'text-[#9c6644] bg-[#9c6644]/10 border-[#9c6644]/25'
 }`}>
 {isOnline ? 'Online' : 'Offline'}
 </span>
 </div>
 <div className="flex justify-end items-center">
 {paid > 0 ? (
 <span className="text-[13.5px] sm:text-[14.5px] font-medium text-emerald-600 tracking-tight leading-none">
 {`₹${paid.toLocaleString('en-IN')}`}
 </span>
 ) : (
 <span />
 )}
 </div>
 </div>

 <div className="flex items-center justify-between gap-2 mt-1.5">
 <div className="text-[11.5px] sm:text-xs font-medium text-slate-500 truncate min-w-0">
 {stayMonths}
 </div>
 <span className="text-[13.5px] sm:text-[14.5px] font-medium text-sky-600 flex items-center transition-colors group-hover:text-sky-700 leading-none whitespace-nowrap shrink-0">
 <span>View Pass</span>
 <span className="text-[16px] sm:text-[17px] font-medium ml-0.5 leading-none">›</span>
 </span>
 </div>
 </div>
 );
 })}

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between pt-3 px-1 select-none">
 <button
 type="button"
 disabled={safePage <= 1}
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f7f4ee] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 p-0"
 title="Previous Page"
 >
 <span className="material-symbols-outlined text-[24px] sm:text-[26px] select-none leading-none inline-flex items-center justify-center">
 chevron_left
 </span>
 </button>

 <span className="text-[15px] sm:text-base font-normal text-slate-700 tracking-normal">
 Page {safePage} of {totalPages}
 </span>

 <button
 type="button"
 disabled={safePage >= totalPages}
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f7f4ee] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 p-0"
 title="Next Page"
 >
 <span className="material-symbols-outlined text-[24px] sm:text-[26px] select-none leading-none inline-flex items-center justify-center">
 chevron_right
 </span>
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer: Book Bed button */}
 {remainingSlots > 0 && typeof onBookOpenSlot === 'function' && (
 <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-end">
 <button
 type="button"
 onClick={onBookOpenSlot}
 className="w-auto shrink-0 h-13 sm:h-14 px-6 sm:px-7 rounded-full font-medium text-[15px] sm:text-[16px] shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#0f766e] hover:bg-emerald-500 text-white shadow-emerald-700/25"
 >
 Book Bed
 </button>
 </div>
 )}
 </div>
 </div>,
 document.body
 );
}

export default MonthOccupantsListModal;
