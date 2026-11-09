import React from 'react';
import { createPortal } from 'react-dom';
import { generateEntryPassPdf } from '../../../utils/entryPassPdf';

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
    <span className="text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
      PAID
    </span>
  );

  if (isPendingApproval) {
    amountFieldLabel = 'TOTAL PAYABLE (PENDING APPROVAL)';
    amountTextColor = 'text-amber-600';
    amountStatusPill = (
      <span className="text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
        UNPAID • NOT APPROVED
      </span>
    );
  } else if (isAwaitingPayment) {
    amountFieldLabel = 'AMOUNT DUE (UNPAID)';
    amountTextColor = 'text-amber-600';
    amountStatusPill = (
      <span className="text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
        AWAITING PAYMENT
      </span>
    );
  } else if (isUpiVerificationPending) {
    amountFieldLabel = 'UPI PAYMENT SUBMITTED';
    amountTextColor = 'text-violet-600';
    amountStatusPill = (
      <span className="text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-200/80">
        VERIFY UPI
      </span>
    );
  } else if (isRejected) {
    amountFieldLabel = 'BOOKING TARIFF';
    amountTextColor = 'text-slate-400 line-through';
    amountStatusPill = (
      <span className="text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80">
        REJECTED
      </span>
    );
  }

  const handleDownloadPdf = () => {
    try {
      generateEntryPassPdf({
        booking: selectedOccupantForModal,
        stay: modalStayInfo || {
          title: selectedOccupantForModal?.stayTitle || selectedOccupantForModal?.propertyName,
          location: selectedOccupantForModal?.location || selectedOccupantForModal?.address,
        },
        host: {
          name: selectedOccupantForModal?.hostName,
          phone: selectedOccupantForModal?.hostPhone,
          email: selectedOccupantForModal?.hostEmail,
        },
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm transition-all overflow-y-auto"
      onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
    >
      <div
        className="relative w-full max-w-[400px] bg-white text-slate-900 rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] border border-slate-200/90 overflow-hidden my-auto select-none transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Exact style matching Pic 2 */}
        <div className="px-5 pt-4 pb-2.5 border-b border-slate-100 bg-white text-slate-900 relative z-10">
          <div className="flex flex-col gap-1.5 w-full">
            {/* Row 1: Centered Title */}
            <div className="flex items-center justify-center w-full">
              <h3 className="font-black tracking-tight text-[16px] sm:text-[17px] text-center leading-none text-slate-900">
                {isPendingApproval ? 'Booking Request Pass' : 'Resident ID Pass'}
              </h3>
            </div>

            {/* Row 2: Room info */}
            <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-slate-100 text-xs leading-tight font-semibold">
              <span className="font-bold text-[10.5px] uppercase tracking-wider text-slate-600 truncate">
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
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={modalName}
                onChange={handleModalNameChange}
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">Mobile Number *</label>
              <div className="flex items-center h-11 sm:h-12 rounded-xl bg-slate-100/90 border border-slate-200/90 overflow-hidden focus-within:border-slate-800 focus-within:bg-white transition-colors shadow-2xs">
                <div className="h-full px-3.5 bg-slate-200/70 border-r border-slate-200 text-[13px] sm:text-[14px] font-bold text-slate-700 flex items-center shrink-0">+91</div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={modalPhone}
                  onChange={handleModalPhoneChange}
                  className="w-full h-full px-3.5 bg-transparent text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                {isPaid ? 'Paid Amount (₹)' : 'Booking / Payable Amount (₹)'}
              </label>
              <input
                type="text"
                value={modalPaidAmount}
                onChange={(e) => setModalPaidAmount(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">Aadhar ID (12 digits) *</label>
              <input
                type="text"
                required
                maxLength={14}
                value={modalAadhar}
                onChange={handleModalAadharChange}
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800 transition-colors shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelEditFromModal}
                className="h-11 sm:h-12 px-5 rounded-full border border-slate-200 bg-white text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingModalOccupant}
                className="h-11 sm:h-12 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-[13px] font-bold cursor-pointer transition-all shadow-md active:scale-95"
              >
                {isSavingModalOccupant ? 'Updating...' : 'Update Database'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 sm:p-5 space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Occupant Header Card */}
            <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 flex items-center justify-between gap-2.5">
              <h4 className="text-[15px] sm:text-[16px] font-black text-slate-900 truncate leading-snug">
                {selectedOccupantForModal.name || 'Guest'}
              </h4>
              <span className={`text-[10px] sm:text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wider uppercase whitespace-nowrap ${
                isOnline
                  ? 'text-purple-600 bg-purple-50/80 border-purple-200/80'
                  : 'text-[#9c6644] bg-[#9c6644]/10 border-[#9c6644]/25'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs">
              <div>
                <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Mobile Number
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block text-[13px] sm:text-[14px]">
                  {selectedOccupantForModal.phone ? `+91 ${selectedOccupantForModal.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Aadhar ID
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block text-[13px] sm:text-[14px]">
                  {formatAadharNumber(selectedOccupantForModal.aadhar) || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Person Count
                </span>
                <span className="font-bold text-slate-900 mt-0.5 block text-[13px] sm:text-[14px]">
                  {selectedOccupantForModal.personCount || 1} Person{(Number(selectedOccupantForModal.personCount) || 1) > 1 ? 's' : ''}
                </span>
              </div>

              <div>
                <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {amountFieldLabel}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`font-black block text-[13px] sm:text-[14px] ${amountTextColor}`}>
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
                    <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Entry Pass Code:
                    </span>
                    <span className="text-[11.5px] sm:text-xs text-slate-500 whitespace-nowrap">
                      (Verify face-to-face)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs sm:text-[13px] font-black tracking-widest text-emerald-900 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/40 select-all">
                      {code}
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      title="Download Official Resident Entry Pass PDF"
                      className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Stay Duration Info */}
            {modalStayInfo && (() => {
              const parseDateAndTiming = (val, explicitTime) => {
                if (explicitTime) {
                  return {
                    date: typeof val === 'string' ? val.replace(/\s*\([^)]*\)/, '').trim() : String(val || ''),
                    timing: explicitTime,
                  };
                }
                if (!val) return { date: '', timing: '' };
                const str = String(val).trim();
                const match = str.match(/^(.*?)(?:\s*\((.*?)\))$/);
                if (match && match[2]) {
                  return {
                    date: match[1].trim(),
                    timing: match[2].trim(),
                  };
                }
                return { date: str, timing: '' };
              };

              const inInfo = parseDateAndTiming(
                modalStayInfo.checkInDate || modalStayInfo.checkInFormatted,
                modalStayInfo.checkInTime
              );
              const outInfo = parseDateAndTiming(
                modalStayInfo.checkOutDate || modalStayInfo.checkOutFormatted,
                modalStayInfo.checkOutTime
              );

              return (
                <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Check-In
                      </span>
                      <span className="font-bold text-slate-900 text-[13px] sm:text-[14px] block leading-tight mt-0.5">
                        {inInfo.date}
                      </span>
                      {inInfo.timing && (
                        <span className="text-[11.5px] sm:text-xs text-slate-500 font-medium block leading-tight mt-0.5">
                          ({inInfo.timing})
                        </span>
                      )}
                    </div>

                    <div className="text-center px-1 shrink-0">
                      <span
                        className={`text-[11px] sm:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPendingApproval
                            ? 'text-amber-700 bg-amber-50 border-amber-200/80'
                            : isUpiVerificationPending
                            ? 'text-violet-700 bg-violet-50 border-violet-200/80'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                        }`}
                      >
                        {modalStayInfo.durationLabel}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Check-Out
                      </span>
                      <span className="font-bold text-slate-900 text-[13px] sm:text-[14px] block leading-tight mt-0.5">
                        {outInfo.date}
                      </span>
                      {outInfo.timing && (
                        <span className="text-[11.5px] sm:text-xs text-slate-500 font-medium block leading-tight mt-0.5">
                          ({outInfo.timing})
                        </span>
                      )}
                    </div>
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
                    className="h-11 sm:h-12 px-4.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs sm:text-[13px] font-bold cursor-pointer shadow-2xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={() => handleRemoveOccupant(selectedOccupantForModal)}
                    className="h-11 sm:h-12 px-5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/80 text-white text-xs sm:text-[13px] font-bold cursor-pointer shadow-md disabled:cursor-not-allowed flex items-center gap-1.5 transition-all active:scale-95"
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
                  className="h-11 sm:h-12 px-4.5 sm:px-5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs sm:text-[13px] font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Remove Occupant
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdatingSlot}
                  onClick={handleCloseOccupantModal}
                  className="h-11 sm:h-12 px-5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-[13px] font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isUpdatingSlot}
                  onClick={handleStartEditFromModal}
                  className="h-11 sm:h-12 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-[13px] font-bold cursor-pointer shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
