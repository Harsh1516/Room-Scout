import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { computeDuration, formatBookedMonths, formatEntryPassCode, formatUtrNumber } from '../../../utils/bookingDetailsHelpers';
import { getBookingPaymentLedger } from '../../../utils/bookingExtension';
import { bookingsAPI } from '../../../services/api';

export function ResidentIdPassModal({
 selectedOccupantForModal,
 handleCloseOccupantModal,
 isModalEditing,
 handleSaveModalEdit,
 modalName,
 handleModalNameChange,
 modalPhone,
 handleModalPhoneChange,
 modalPaidAmount,
 setModalPaidAmount,
 modalEmail,
 setModalEmail,
 modalAadhar,
 handleModalAadharChange,
 isMonthly,
 modalGender,
 setModalGender,
 handleCancelEditFromModal,
 isSavingModalOccupant,
 roomDisplay,
 roomTypeDisplay,
 formatAadharNumber,
 modalStayInfo,
 confirmModalDelete,
 setConfirmModalDelete,
 isUpdatingSlot,
 handleRemoveOccupant,
 handleStartEditFromModal,
}) {
 const [previewAadharPhoto, setPreviewAadharPhoto] = useState('');
 const [fetchedPhotosById, setFetchedPhotosById] = useState({});
 const [isLoadingAadharPhoto, setIsLoadingAadharPhoto] = useState(false);
 const [aadharPhotoError, setAadharPhotoError] = useState('');

 const occForLookup = selectedOccupantForModal || {};
 const bookingLookupId =
 occForLookup._id ||
 occForLookup.bookingId ||
 occForLookup.bookingReferenceId ||
 occForLookup.id ||
 '';
 const directAadharPhoto =
 occForLookup.aadharPhoto ||
 occForLookup.guestAadharPhoto ||
 occForLookup.booking?.aadharPhoto ||
 occForLookup.booking?.guestAadharPhoto ||
 '';
 const isOnlineOccupant = Boolean(
 (occForLookup.isOnline === true ||
 occForLookup.bookingSource === 'ONLINE' ||
 occForLookup.bookingSource === 'ONLINE_USER' ||
 (occForLookup.source === 'booking' && occForLookup.bookingSource !== 'OFFLINE_HOST')) &&
 occForLookup.bookingSource !== 'OFFLINE_HOST' &&
 occForLookup.source !== 'offline' &&
 occForLookup.isOnline !== false
 );

 useEffect(() => {
 if (!selectedOccupantForModal || !isOnlineOccupant || directAadharPhoto || !bookingLookupId) return;
 if (fetchedPhotosById[bookingLookupId] !== undefined) return;
 let cancelled = false;
 bookingsAPI
 .getBookingById(bookingLookupId)
 .then((res) => {
 if (cancelled) return;
 const url =
 res?.booking?.aadharPhoto ||
 res?.booking?.guestAadharPhoto ||
 res?.aadharPhoto ||
 '';
 setFetchedPhotosById((prev) => ({ ...prev, [bookingLookupId]: url }));
 })
 .catch(() => {});
 return () => {
 cancelled = true;
 };
 }, [selectedOccupantForModal, isOnlineOccupant, directAadharPhoto, bookingLookupId, fetchedPhotosById]);

 if (!selectedOccupantForModal) return null;

 const rawStatus = String(selectedOccupantForModal.status || '').toUpperCase();
 const rawPaymentStatus = String(selectedOccupantForModal.paymentStatus || '').toUpperCase();
 const isOnline = Boolean(
 (selectedOccupantForModal.isOnline === true ||
 selectedOccupantForModal.bookingSource === 'ONLINE' ||
 selectedOccupantForModal.bookingSource === 'ONLINE_USER' ||
 (selectedOccupantForModal.source === 'booking' && selectedOccupantForModal.bookingSource !== 'OFFLINE_HOST')) &&
 selectedOccupantForModal.bookingSource !== 'OFFLINE_HOST' &&
 selectedOccupantForModal.source !== 'offline' &&
 selectedOccupantForModal.isOnline !== false
 );

 const isCheckedOut = rawStatus === 'CHECKED_OUT' || rawStatus === 'COMPLETED';
 const isCheckedIn = !isCheckedOut && (rawStatus === 'CHECKED_IN' || (!isOnline && rawStatus === 'CONFIRMED'));

 const isPendingApproval =
 (rawStatus.includes('PENDING') ||
 rawStatus.includes('APPROVAL') ||
 rawStatus === 'REQUESTED' ||
 rawStatus === 'DRAFT') &&
 !isCheckedIn &&
 !isCheckedOut &&
 rawStatus !== 'AWAITING_PAYMENT' &&
 rawStatus !== 'PAYMENT_PENDING';

 const isAwaitingPayment =
 rawStatus === 'AWAITING_PAYMENT' ||
 rawStatus === 'PAYMENT_PENDING' ||
 rawStatus === 'APPROVED - PAYMENT PENDING';

 const isUpiVerificationPending =
 selectedOccupantForModal.upiPayment?.verificationStatus === 'PENDING_VERIFICATION' ||
 rawPaymentStatus === 'PENDING_VERIFICATION';

 const isRejected = rawStatus === 'REJECTED' || rawStatus === 'CANCELLED';

 const isPaid =
 rawPaymentStatus === 'PAID' ||
 rawPaymentStatus === 'VERIFIED' ||
 rawPaymentStatus === 'COMPLETED' ||
 selectedOccupantForModal.isPaid === true ||
 isCheckedIn ||
 (!isOnline && !isPendingApproval && !isAwaitingPayment && !isRejected);

 // Clean phone digits for instant Call action
 const occupantRawPhone =
 selectedOccupantForModal.phone ||
 selectedOccupantForModal.userPhone ||
 selectedOccupantForModal.guestPhone ||
 modalPhone ||
 '';
 const cleanPhoneDigits = String(occupantRawPhone).replace(/\D/g, '').slice(-10);

 const occupantRawEmail =
 selectedOccupantForModal.email ||
 selectedOccupantForModal.userEmail ||
 selectedOccupantForModal.guestEmail ||
 modalEmail ||
 '';
 const cleanEmail =
 occupantRawEmail && !String(occupantRawEmail).toLowerCase().includes('@stayhub.local')
 ? String(occupantRawEmail).trim()
 : '';

 // Status badge styling
 let statusBadgeLabel = selectedOccupantForModal.status || 'CONFIRMED';
 let statusBadgeStyle =
 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

 if (isPendingApproval) {
 statusBadgeLabel = 'PENDING APPROVAL';
 statusBadgeStyle =
 'bg-amber-50 text-amber-700 border-amber-200/80';
 } else if (isUpiVerificationPending) {
 statusBadgeLabel = 'UPI VERIFY PENDING';
 statusBadgeStyle =
 'bg-violet-50 text-violet-700 border-violet-200/80';
 } else if (isAwaitingPayment) {
 statusBadgeLabel = 'AWAITING PAYMENT';
 statusBadgeStyle =
 'bg-amber-50 text-amber-700 border-amber-200/80';
 } else if (isCheckedIn) {
 statusBadgeLabel = 'CHECKED IN';
 statusBadgeStyle =
 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
 } else if (isCheckedOut) {
 statusBadgeLabel = 'CHECKED OUT';
 statusBadgeStyle =
 'bg-slate-100 text-slate-700 border-slate-200/80';
 } else if (isRejected) {
 statusBadgeLabel = 'REJECTED';
 statusBadgeStyle =
 'bg-rose-50 text-rose-700 border-rose-200/80';
 }

 // Amount field label & badge
 let amountFieldLabel = 'PAID AMOUNT';
 let amountTextColor = 'text-emerald-600';
 let amountStatusPill = (
 <span className="text-[11px] sm:text-[11.5px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
 PAID
 </span>
 );

 if (isPendingApproval) {
 amountFieldLabel = 'TOTAL PAYABLE (PENDING APPROVAL)';
 amountTextColor = 'text-amber-600';
 amountStatusPill = null;
 } else if (isAwaitingPayment) {
 amountFieldLabel = 'AMOUNT DUE (UNPAID)';
 amountTextColor = 'text-amber-600';
 amountStatusPill = (
 <span className="text-[11px] sm:text-[11.5px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
 AWAITING PAYMENT
 </span>
 );
 } else if (isUpiVerificationPending) {
 amountFieldLabel = 'UPI PAYMENT SUBMITTED';
 amountTextColor = 'text-violet-600';
 amountStatusPill = (
 <span className="text-[11px] sm:text-[11.5px] font-medium px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-200/80">
 VERIFY UPI
 </span>
 );
 } else if (isRejected) {
 amountFieldLabel = 'BOOKING TARIFF';
 amountTextColor = 'text-slate-400 line-through';
 amountStatusPill = (
 <span className="text-[11px] sm:text-[11.5px] font-medium px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80">
 REJECTED
 </span>
 );
 }

 const aadharPhotoUrl = directAadharPhoto || (bookingLookupId ? fetchedPhotosById[bookingLookupId] || '' : '');

 const handleViewAadharPic = async () => {
 setAadharPhotoError('');
 if (aadharPhotoUrl) {
 setPreviewAadharPhoto(aadharPhotoUrl);
 return;
 }
 if (!bookingLookupId) {
 setAadharPhotoError('No Aadhar photo uploaded by this user.');
 setPreviewAadharPhoto('__MISSING__');
 return;
 }
 setIsLoadingAadharPhoto(true);
 try {
 const res = await bookingsAPI.getBookingById(bookingLookupId);
 const url =
 res?.booking?.aadharPhoto ||
 res?.booking?.guestAadharPhoto ||
 res?.aadharPhoto ||
 '';
 setFetchedPhotosById((prev) => ({ ...prev, [bookingLookupId]: url }));
 if (url) {
 setPreviewAadharPhoto(url);
 } else {
 setAadharPhotoError('No Aadhar photo was uploaded for this booking.');
 setPreviewAadharPhoto('__MISSING__');
 }
 } catch {
 setAadharPhotoError('Unable to load Aadhar photo right now.');
 setPreviewAadharPhoto('__MISSING__');
 } finally {
 setIsLoadingAadharPhoto(false);
 }
 };

 const bookedSummaryText = (() => {
 const occ = selectedOccupantForModal;
 const isMonthlyOcc =
 Boolean(isMonthly) ||
 String(occ.rateUnit || '').toLowerCase().includes('month') ||
 (Array.isArray(occ.bookedMonths) && occ.bookedMonths.length > 0) ||
 Number(occ.durationMonths) > 0;

 const durationText =
 modalStayInfo?.durationLabel ||
 computeDuration(occ) ||
 (isMonthlyOcc ? '1 Month' : '1 Night');

 if (isMonthlyOcc) {
 let monthKeys = Array.isArray(occ.bookedMonths) && occ.bookedMonths.length > 0
 ? occ.bookedMonths
 : [];

 if (monthKeys.length === 0) {
 const rawIn = occ.checkInISO || occ.checkIn;
 const rawOut = occ.checkOutISO || occ.checkOut;
 if (rawIn) {
 const inD = new Date(rawIn);
 const outD = rawOut ? new Date(rawOut) : inD;
 if (!isNaN(inD.getTime())) {
 const endD = !isNaN(outD.getTime()) ? outD : inD;
 let curr = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
 const last = new Date(Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), 1));
 while (curr <= last && monthKeys.length < 24) {
 monthKeys.push(`${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, '0')}`);
 curr.setUTCMonth(curr.getUTCMonth() + 1);
 }
 }
 }
 }

 const formattedMonths = formatBookedMonths(monthKeys);
 if (formattedMonths) {
 return durationText ? `${formattedMonths} (${durationText})` : formattedMonths;
 }
 }

 // Nightly / daily booking formatting
 if (Array.isArray(occ.bookedDates) && occ.bookedDates.length > 0) {
 const formattedDays = occ.bookedDates
 .map((dStr) => {
 const d = new Date(dStr);
 if (isNaN(d.getTime())) return String(dStr);
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 timeZone: 'UTC',
 });
 })
 .filter(Boolean)
 .join(', ');
 if (formattedDays) {
 return durationText ? `${formattedDays} (${durationText})` : formattedDays;
 }
 }

 const rawIn = occ.checkInISO || occ.checkIn;
 if (rawIn) {
 const inD = new Date(rawIn);
 if (!isNaN(inD.getTime())) {
 const dayLabel = inD.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 timeZone: 'UTC',
 });
 return durationText ? `${dayLabel} (${durationText})` : dayLabel;
 }
 }

 if (modalStayInfo?.datesList) {
 return durationText ? `${modalStayInfo.datesList} (${durationText})` : modalStayInfo.datesList;
 }

 return durationText || '—';
 })();

 if (typeof document === 'undefined') return null;

 return createPortal(
 <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
 <div
 onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
 className="fixed inset-0 bg-black/20 backdrop-blur-xs cursor-pointer transition-opacity"
 style={{
 backdropFilter: 'blur(4px)',
 WebkitBackdropFilter: 'blur(4px)',
 }}
 />
 <div
 className="relative z-10 w-full max-w-[400px] bg-white text-[#1f1b16] rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] border border-slate-200/90 overflow-hidden my-auto select-none transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header: Exact style matching Pic 2 */}
 <div className="px-5 pt-4 pb-2.5 border-b border-slate-100 bg-white text-[#1f1b16] relative z-10">
 <div className="flex flex-col gap-1.5 w-full">
 {/* Row 1: Centered Title & Header Close Button */}
 <div className="relative flex items-center justify-center w-full">
 <h3 className="font-medium tracking-tight text-[16px] sm:text-[17px] text-center leading-none text-[#1f1b16]">
 {isPendingApproval ? 'Booking Request Pass' : 'Resident ID Pass'}
 </h3>
 
 </div>

 {/* Row 2: Room info */}
 <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-slate-100 text-xs leading-tight font-semibold">
 <span className="font-medium text-[10.5px] text-slate-600 truncate">
 {roomDisplay}{roomTypeDisplay ? ` (${roomTypeDisplay})` : ''}
 </span>
 </div>
 </div>
 </div>

 {isModalEditing ? (
 <form onSubmit={handleSaveModalEdit} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
 <div className="p-3 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-slate-600 text-xs sm:text-[13px] font-medium flex items-center gap-2.5">
 <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-slate-500 shrink-0">info</span>
 <span>Changes will immediately update database records.</span>
 </div>

 <div>
 <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1.5">Full Name *</label>
 <input
 type="text"
 required
 value={modalName}
 onChange={handleModalNameChange}
 className="w-full min-h-[52px] px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-base font-medium text-[#1f1b16] focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
 />
 </div>

 <div>
 <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1.5">Mobile Number *</label>
 <div className="flex items-center h-11 sm:h-12 rounded-xl bg-slate-100/90 border border-slate-200/90 overflow-hidden focus-within:border-slate-800 focus-within:bg-white transition-colors shadow-2xs">
 <div className="h-full px-3.5 bg-slate-200/70 border-r border-slate-200 text-[13px] sm:text-[14px] font-medium text-slate-700 flex items-center shrink-0">+91</div>
 <input
 type="tel"
 required
 maxLength={10}
 value={modalPhone}
 onChange={handleModalPhoneChange}
 className="w-full h-full px-3.5 bg-transparent text-[13.5px] sm:text-[14.5px] font-medium text-[#1f1b16] focus:outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1.5">
 {isPaid ? 'Paid Amount (₹)' : 'Booking / Payable Amount (₹)'}
 </label>
 <input
 type="text"
 value={modalPaidAmount}
 onChange={(e) => setModalPaidAmount(e.target.value.replace(/\D/g, ''))}
 className="w-full min-h-[52px] px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-base font-medium text-[#1f1b16] focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
 />
 </div>

 <div>
 <label className="block text-xs sm:text-[13px] font-medium text-slate-700 mb-1.5">Aadhar ID (12 digits) *</label>
 <input
 type="text"
 required
 maxLength={14}
 value={modalAadhar}
 onChange={handleModalAadharChange}
 className="w-full min-h-[52px] px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-base font-medium text-[#1f1b16] focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
 <button
 type="button"
 onClick={handleCancelEditFromModal}
 className="h-11 sm:h-12 px-5 rounded-full border border-slate-200 bg-white text-xs sm:text-[13px] font-medium text-slate-700 hover:bg-[#f7f4ee] cursor-pointer shadow-2xs active:scale-95 transition-all"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSavingModalOccupant}
 className="min-h-[48px] px-5 rounded-full bg-[#0f766e] hover:bg-emerald-500 text-white text-sm sm:text-base font-semibold cursor-pointer transition-all shadow-md active:scale-95"
 >
 {isSavingModalOccupant ? 'Updating...' : 'Update Database'}
 </button>
 </div>
 </form>
 ) : (
 <div className="p-4 sm:p-5 space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">
 {/* Occupant Header Card */}
 <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 flex items-center justify-between gap-2.5">
 <div className="min-w-0">
 <h4 className="text-[15px] sm:text-[16px] font-medium text-[#1f1b16] truncate leading-snug">
 {selectedOccupantForModal.name || 'Guest'}
 </h4>
 {cleanEmail && (
 <span className="text-[11.5px] sm:text-xs text-slate-500 block truncate mt-0.5">
 {cleanEmail}
 </span>
 )}
 </div>
 <span className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 ${
 isOnline ? 'text-purple-600' : 'text-[#9c6644]'
 }`}>
 {isOnline ? 'Online' : 'Offline'}
 </span>
 </div>

 {/* Details Grid */}
 <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs">
 <div>
 <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 block">
 Mobile Number
 </span>
 <span className="font-medium text-[#1f1b16] mt-0.5 block text-[13px] sm:text-[14px]">
 {selectedOccupantForModal.phone ? `+91 ${selectedOccupantForModal.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}
 </span>
 </div>

 <div>
 <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 block">
 Aadhar ID
 </span>
 <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
 <span className="font-medium text-[#1f1b16] text-[13px] sm:text-[14px]">
 {formatAadharNumber(selectedOccupantForModal.aadhar) || 'N/A'}
 </span>
 {(aadharPhotoUrl || isOnline) && (
 <button
 type="button"
 disabled={isLoadingAadharPhoto}
 onClick={handleViewAadharPic}
 className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-white/95 hover:bg-[#1f1b16] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#1f1b16] shadow-[0_1px_2px_rgba(15,23,42,0.06)] text-[10.5px] font-semibold tracking-wide transition-all duration-150 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
 title="View uploaded Aadhar photo"
 >
 {isLoadingAadharPhoto ? (
 <span className="w-2.5 h-2.5 border-[1.5px] border-slate-300 border-t-slate-700 rounded-full animate-spin shrink-0" />
 ) : (
 <svg
 className="w-2.5 h-2.5 shrink-0"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="1.9"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
 <circle cx="8.5" cy="8.5" r="1.4" />
 <polyline points="21 15 16 10 5 21" />
 </svg>
 )}
 <span>Pic</span>
 </button>
 )}
 </div>
 </div>

 <div>
 <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 block">
 Person Count
 </span>
 <span className="font-medium text-[#1f1b16] mt-0.5 block text-[13px] sm:text-[14px]">
 {selectedOccupantForModal.personCount || 1} Person{(Number(selectedOccupantForModal.personCount) || 1) > 1 ? 's' : ''}
 </span>
 </div>

 <div>
 <span className="text-[11.5px] sm:text-xs font-medium text-slate-400 block">
 {amountFieldLabel}
 </span>
 <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
 <span className={`font-medium block text-[13px] sm:text-[14px] ${amountTextColor}`}>
 {`₹${Number(selectedOccupantForModal.totalAmount || selectedOccupantForModal.paidAmount || 0).toLocaleString('en-IN')}`}
 </span>
 {amountStatusPill}
 </div>
 </div>
 </div>

 {/* Entry Pass Code Box for Check-In Verification (Online Guests Only) */}
 {isOnline && (() => {
 const code =
 selectedOccupantForModal.checkInCode ||
 selectedOccupantForModal.booking?.checkInCode ||
 selectedOccupantForModal.passCode;
 if (!code) return null;

 return (
 <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
 <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
 <span className="text-[11.5px] sm:text-xs font-medium text-emerald-800">
 Entry Pass Code:
 </span>
 <span className="text-[11.5px] sm:text-xs text-slate-500 whitespace-nowrap">
 (Verify face-)
 </span>
 </div>
 <span className="font-mono text-xs sm:text-[13px] font-semibold text-emerald-900 select-all shrink-0">
 {formatEntryPassCode(code)}
 </span>
 </div>
 );
 })()}

 {/* Booked Duration Info (Pic 2 format) */}
 {(bookedSummaryText || modalStayInfo) && (
 <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
 <div className="flex items-center justify-between gap-3">
 <span className="text-[11.5px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
 Booked:
 </span>
 <span className="text-[13.5px] sm:text-[15px] font-bold text-[#1f1b16] text-right">
 {bookedSummaryText}
 </span>
 </div>
 </div>
 )}

 {/* Monthly Payment Records Saved on Resident ID Pass (Room No., Month, Payment Price) */}
 {(() => {
   const paymentLedger = getBookingPaymentLedger(selectedOccupantForModal);
   if (!paymentLedger || paymentLedger.length === 0) return null;
   return (
     <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 space-y-2 shadow-2xs">
       <div className="flex items-center justify-between">
         <span className="text-[11.5px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
           Payment Records
         </span>
         <span className="text-[10.5px] font-semibold text-slate-500">
           {paymentLedger.length} {paymentLedger.length === 1 ? 'Month' : 'Months'}
         </span>
       </div>
       <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
         {paymentLedger.map((entry, idx) => (
           <div
             key={`${entry.monthKey || idx}-${entry.transactionRef || idx}`}
             className="px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
           >
             <div className="min-w-0">
               <div className="flex items-center gap-1.5 flex-wrap font-semibold text-[#1f1b16]">
                 <span>Room {entry.roomNumber || selectedOccupantForModal.roomNumber}</span>
                 <span className="text-slate-300">•</span>
                 <span>{entry.monthLabel}</span>
                 {entry.isExtension && (
                   <span className="px-1.5 py-[1px] rounded-full text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                     Extended
                   </span>
                 )}
               </div>
               {entry.transactionRef && (
                 <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                   UTR: {formatUtrNumber(entry.transactionRef)}
                 </span>
               )}
             </div>
             <span className="font-mono font-bold text-emerald-700 shrink-0">
               ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
             </span>
           </div>
         ))}
       </div>
     </div>
   );
 })()}

 {/* Modal Actions */}
 <div className="flex items-center justify-between gap-2.5 pt-3.5 border-t border-slate-100">
 {confirmModalDelete ? (
 <div className="flex items-center gap-2">
 <button
 type="button"
 disabled={isUpdatingSlot}
 onClick={() => setConfirmModalDelete(false)}
 className="min-h-[48px] px-5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm sm:text-base font-semibold cursor-pointer shadow-2xs hover:bg-[#f7f4ee] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={isUpdatingSlot}
 onClick={() => handleRemoveOccupant(selectedOccupantForModal)}
 className="min-h-[48px] px-5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/80 text-white text-sm sm:text-base font-semibold cursor-pointer shadow-md disabled:cursor-not-allowed flex items-center gap-1.5 transition-all active:scale-95"
 >
 {isUpdatingSlot ? (
 <>
 <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
 </svg>
 <span>Removing...</span>
 </>
 ) : (
 'Confirm Remove'
 )}
 </button>
 </div>
 ) : (
 <button
 type="button"
 disabled={isUpdatingSlot}
 onClick={() => setConfirmModalDelete(true)}
 className="min-h-[48px] px-5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm sm:text-base font-semibold cursor-pointer transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
 >
 Remove Occupant
 </button>
 )}

 <div className="flex items-center gap-2">
 {cleanPhoneDigits.length === 10 ? (
 <a
 href={`tel:+91${cleanPhoneDigits}`}
 className="min-h-[48px] px-5 rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-[#f7f4ee] text-sm sm:text-base font-semibold cursor-pointer transition-all shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 select-none"
 title={`Call +91 ${cleanPhoneDigits}`}
 >
 <svg className="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24">
 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
 </svg>
 <span>Call</span>
 </a>
 ) : (
 <button
 type="button"
 disabled
 className="min-h-[48px] px-5 rounded-full border border-slate-200 bg-slate-100 text-slate-400 text-sm sm:text-base font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
 title="No mobile number available"
 >
 <svg className="w-4 h-4 opacity-40 fill-current shrink-0" viewBox="0 0 24 24">
 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
 </svg>
 <span>Call</span>
 </button>
 )}
 <button
 type="button"
 disabled={isUpdatingSlot}
 onClick={handleStartEditFromModal}
 className="min-h-[48px] px-5 rounded-full bg-[#0f766e] hover:bg-emerald-500 text-white text-sm sm:text-base font-semibold cursor-pointer shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
 >
 Edit Details
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Fullscreen Aadhar Card Photo Lightbox */}
 {previewAadharPhoto && (
 <div
 onClick={() => setPreviewAadharPhoto('')}
 className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 sm:p-6 cursor-pointer"
 >
 <button
 type="button"
 onClick={() => setPreviewAadharPhoto('')}
 aria-label="Close Aadhar photo preview"
 className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 flex items-center justify-center cursor-pointer transition-all"
 >
 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
 <line x1="18" y1="6" x2="6" y2="18" />
 <line x1="6" y1="6" x2="18" y2="18" />
 </svg>
 </button>
 {previewAadharPhoto === '__MISSING__' ? (
 <div
 onClick={(e) => e.stopPropagation()}
 className="px-6 py-5 rounded-2xl bg-white text-slate-800 text-sm font-medium shadow-2xl border border-slate-200 cursor-default"
 >
 {aadharPhotoError || 'No Aadhar photo uploaded.'}
 </div>
 ) : (
 <img
 src={previewAadharPhoto}
 alt="Guest Aadhar Card Full View"
 onClick={(e) => e.stopPropagation()}
 className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-white/20 bg-white cursor-default"
 />
 )}
 </div>
 )}
 </div>,
 document.body
 );
}
