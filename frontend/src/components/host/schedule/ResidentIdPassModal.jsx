import React from 'react';

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
  modalAdults,
  setModalAdults,
  modalChildren,
  setModalChildren,
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-all overflow-y-auto"
      onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
    >
      <div
        className="relative w-full max-w-[420px] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-zinc-700 mx-auto mt-2 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
              RS
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Resident ID Pass
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
                RoomScout Verified Occupant
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 uppercase shadow-xs">
              {roomDisplay}
            </span>
            <button
              type="button"
              disabled={isUpdatingSlot}
              onClick={() => !isUpdatingSlot && handleCloseOccupantModal()}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isModalEditing ? (
          <form onSubmit={handleSaveModalEdit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-[11px] flex items-center gap-2 shadow-xs">
              <span>ℹ️</span>
              <span>Changes will immediately update database records.</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={modalName}
                onChange={handleModalNameChange}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Mobile Number *</label>
              <div className="flex items-center rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-zinc-800 shadow-xs">
                <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-750 border-r border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 shrink-0">+91</div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={modalPhone}
                  onChange={handleModalPhoneChange}
                  className="w-full px-2.5 py-1.5 bg-transparent text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Paid Amount (₹)</label>
              <input
                type="text"
                value={modalPaidAmount}
                onChange={(e) => setModalPaidAmount(e.target.value.replace(/\D/g, ''))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Aadhar ID (12 digits) *</label>
              <input
                type="text"
                required
                maxLength={14}
                value={modalAadhar}
                onChange={handleModalAadharChange}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none tracking-wide focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleCancelEditFromModal}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer shadow-xs"
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                {selectedOccupantForModal.name ? selectedOccupantForModal.name.slice(0, 2).toUpperCase() : 'RS'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {selectedOccupantForModal.name}
                  </h4>
                  <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 uppercase shadow-xs">
                    {selectedOccupantForModal.status || 'CONFIRMED'}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                  {roomDisplay} • <span className="font-semibold text-slate-700 dark:text-zinc-200">{roomTypeDisplay}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs shadow-xs">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Mobile Number</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block text-xs">
                  {selectedOccupantForModal.phone ? `+91 ${selectedOccupantForModal.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Aadhar ID</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block text-xs tracking-wide">
                  {formatAadharNumber(selectedOccupantForModal.aadhar) || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Guests</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block text-xs">
                  {selectedOccupantForModal.adults || 1} Adult{(selectedOccupantForModal.adults || 1) > 1 ? 's' : ''}
                  {selectedOccupantForModal.children > 0 ? `, ${selectedOccupantForModal.children} Child` : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Paid Amount</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block text-xs">
                  ₹{Number(selectedOccupantForModal.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Stay Duration Info */}
            {modalStayInfo && (
              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 space-y-1 text-xs shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Check-In</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 text-xs">{modalStayInfo.checkInFormatted}</span>
                  </div>
                  <div className="text-center px-1">
                    <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">{modalStayInfo.durationLabel}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Check-Out</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 text-xs">{modalStayInfo.checkOutFormatted}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80 dark:border-zinc-800">
              {confirmModalDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={() => setConfirmModalDelete(false)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Occupant
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdatingSlot}
                  onClick={handleCloseOccupantModal}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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