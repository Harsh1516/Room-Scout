import React from 'react';
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
  const isOnline =
    selectedOccupantForModal.bookingSource === 'ONLINE' ||
    selectedOccupantForModal.isOnline === true ||
    Boolean(selectedOccupantForModal.bookingReferenceId);

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
    'bg-emerald-100 text-emerald-800 border-emerald-200';

  if (isPendingApproval) {
    statusBadgeLabel = 'PENDING APPROVAL';
    statusBadgeStyle =
      'bg-amber-100 text-amber-800 border-amber-300';
  } else if (isUpiVerificationPending) {
    statusBadgeLabel = 'UPI VERIFY PENDING';
    statusBadgeStyle =
      'bg-violet-100 text-violet-800 border-violet-300';
  } else if (isAwaitingPayment) {
    statusBadgeLabel = 'AWAITING PAYMENT';
    statusBadgeStyle =
      'bg-amber-100 text-amber-800 border-amber-300';
  } else if (isCheckedIn) {
    statusBadgeLabel = 'CHECKED IN';
    statusBadgeStyle =
      'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (isCheckedOut) {
    statusBadgeLabel = 'CHECKED OUT';
    statusBadgeStyle =
      'bg-slate-100 text-slate-700 border-slate-300';
  } else if (isRejected) {
    statusBadgeLabel = 'REJECTED';
    statusBadgeStyle =
      'bg-rose-100 text-rose-800 border-rose-300';
  }

  // Amount field label & badge
  let amountFieldLabel = 'PAID AMOUNT';
  let amountTextColor = 'text-emerald-600';
  let amountStatusPill = (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300/80">
      PAID
    </span>
  );

  if (isPendingApproval) {
    amountFieldLabel = 'TOTAL PAYABLE (PENDING APPROVAL)';
    amountTextColor = 'text-amber-600';
    amountStatusPill = (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300/80">
        UNPAID • NOT APPROVED
      </span>
    );
  } else if (isAwaitingPayment) {
    amountFieldLabel = 'AMOUNT DUE (UNPAID)';
    amountTextColor = 'text-amber-600';
    amountStatusPill = (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300/80">
        AWAITING PAYMENT
      </span>
    );
  } else if (isUpiVerificationPending) {
    amountFieldLabel = 'UPI PAYMENT SUBMITTED';
    amountTextColor = 'text-violet-600';
    amountStatusPill = (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-300/80">
        VERIFY UPI
      </span>
    );
  } else if (isRejected) {
    amountFieldLabel = 'BOOKING TARIFF';
    amountTextColor = 'text-slate-400 line-through';
    amountStatusPill = (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300/80">
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-all overflow-y-auto"
      onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
    >
      <div
        className="relative w-full max-w-[420px] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-2 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-md ${
                isPendingApproval
                  ? 'bg-amber-500'
                  : isUpiVerificationPending
                  ? 'bg-violet-600'
                  : 'bg-emerald-600'
              } text-white flex items-center justify-center text-[11px] font-bold shadow-xs`}
            >
              RS
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight">
                {isPendingApproval ? 'Booking Request Pass' : 'Resident ID Pass'}
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                {isPendingApproval
                  ? 'Online Booking Request • Pending Host Approval'
                  : isAwaitingPayment
                  ? 'Approved • Awaiting Payment'
                  : isUpiVerificationPending
                  ? 'UPI Verification Required'
                  : 'RoomScout Verified Occupant'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                isPendingApproval
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isUpiVerificationPending
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              } uppercase shadow-xs`}
            >
              {roomDisplay}
            </span>
            <button
              type="button"
              disabled={isUpdatingSlot}
              onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isModalEditing ? (
          <form onSubmit={handleSaveModalEdit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2 shadow-xs">
              <span>ℹ️</span>
              <span>Changes will immediately update database records.</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={modalName}
                onChange={handleModalNameChange}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Mobile Number *</label>
              <div className="flex items-center rounded-lg bg-slate-50 border border-slate-200 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white shadow-xs">
                <div className="px-2.5 py-1.5 bg-slate-100 border-r border-slate-200 text-xs font-semibold text-slate-700 shrink-0">+91</div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={modalPhone}
                  onChange={handleModalPhoneChange}
                  className="w-full px-2.5 py-1.5 bg-transparent text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                {isPaid ? 'Paid Amount (₹)' : 'Booking / Payable Amount (₹)'}
              </label>
              <input
                type="text"
                value={modalPaidAmount}
                onChange={(e) => setModalPaidAmount(e.target.value.replace(/\D/g, ''))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Aadhar ID (12 digits) *</label>
              <input
                type="text"
                required
                maxLength={14}
                value={modalAadhar}
                onChange={handleModalAadharChange}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none tracking-wide focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleCancelEditFromModal}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingModalOccupant}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {isSavingModalOccupant ? 'Updating...' : 'Update Database'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-3.5">
            {/* Occupant Header Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-xs">
              <div
                className={`w-10 h-10 rounded-lg ${
                  isPendingApproval
                    ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                    : isUpiVerificationPending
                    ? 'bg-violet-500/15 text-violet-700 border-violet-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                } border flex items-center justify-center text-xs font-bold shrink-0`}
              >
                {selectedOccupantForModal.name ? selectedOccupantForModal.name.slice(0, 2).toUpperCase() : 'RS'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                    {selectedOccupantForModal.name}
                  </h4>
                  <span
                    className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full uppercase shadow-xs border ${statusBadgeStyle}`}
                  >
                    {statusBadgeLabel}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                  {roomDisplay} • <span className="font-semibold text-slate-700">{roomTypeDisplay}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs shadow-xs">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                  Mobile Number
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs">
                  {selectedOccupantForModal.phone ? `+91 ${selectedOccupantForModal.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                  Aadhar ID
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs tracking-wide">
                  {formatAadharNumber(selectedOccupantForModal.aadhar) || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                  Person Count
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs">
                  {selectedOccupantForModal.personCount || 1} Person{(Number(selectedOccupantForModal.personCount) || 1) > 1 ? 's' : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                  {amountFieldLabel}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`font-semibold block text-xs ${amountTextColor}`}>
                    ₹{Number(selectedOccupantForModal.totalAmount || selectedOccupantForModal.paidAmount || 0).toLocaleString('en-IN')}
                  </span>
                  {amountStatusPill}
                </div>
              </div>
            </div>

            {/* Entry Pass Code Box for Check-In Verification */}
            {(() => {
              const code =
                selectedOccupantForModal.checkInCode ||
                selectedOccupantForModal.booking?.checkInCode ||
                selectedOccupantForModal.passCode ||
                (selectedOccupantForModal.bookingReferenceId
                  ? String(selectedOccupantForModal.bookingReferenceId).replace(/\D/g, '').slice(-8)
                  : '');
              if (!code) return null;

              return (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Entry Pass Code:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Verify face-to-face)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black tracking-widest text-emerald-800 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 select-all">
                      {code}
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      title="Download Official Resident Entry Pass PDF"
                      className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1 text-xs shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-500 block">
                        Check-In
                      </span>
                      <span className="font-semibold text-slate-800 text-xs block leading-tight mt-0.5">
                        {inInfo.date}
                      </span>
                      {inInfo.timing && (
                        <span className="text-[10px] text-slate-500 font-medium block leading-tight mt-0.5">
                          ({inInfo.timing})
                        </span>
                      )}
                    </div>

                    <div className="text-center px-1 shrink-0">
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                          isPendingApproval
                            ? 'text-amber-700 bg-amber-50 border-amber-200/60'
                            : isUpiVerificationPending
                            ? 'text-violet-700 bg-violet-50 border-violet-200/60'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-200/60'
                        }`}
                      >
                        {modalStayInfo.durationLabel}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-500 block">
                        Check-Out
                      </span>
                      <span className="font-semibold text-slate-800 text-xs block leading-tight mt-0.5">
                        {outInfo.date}
                      </span>
                      {outInfo.timing && (
                        <span className="text-[10px] text-slate-500 font-medium block leading-tight mt-0.5">
                          ({outInfo.timing})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80">
              {confirmModalDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={() => setConfirmModalDelete(false)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={() => handleRemoveOccupant(selectedOccupantForModal)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/80 text-white text-xs font-semibold cursor-pointer shadow-xs disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
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
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Occupant
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdatingSlot}
                  onClick={handleCloseOccupantModal}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isUpdatingSlot}
                  onClick={handleStartEditFromModal}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
