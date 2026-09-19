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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md transition-all overflow-y-auto"
      onClick={handleCloseOccupantModal}
    >
      <div
        className="relative w-full max-w-[440px] bg-white/85 backdrop-blur-2xl text-slate-900 rounded-3xl shadow-[0_24px_48px_rgba(31,38,135,0.15),_inset_0_1px_2px_rgba(255,255,255,0.95)] border border-white/80 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-slate-200 mx-auto mt-2 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/60 bg-white/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              RS
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-900 leading-tight">
                Resident ID Pass
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                RoomScout Verified Occupant
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase shadow-xs">
              {roomDisplay}
            </span>
            <button
              type="button"
              onClick={handleCloseOccupantModal}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {isModalEditing ? (
          <form onSubmit={handleSaveModalEdit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
            <div className="p-2.5 rounded-xl bg-white/70 border border-white/80 text-slate-600 text-[11px] flex items-center gap-2 shadow-xs">
              <span>ℹ️</span>
              <span>Changes will immediately update database records.</span>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={modalName}
                onChange={handleModalNameChange}
                className="w-full px-3 py-2 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Mobile Number *</label>
              <div className="flex items-center rounded-xl bg-white/80 border border-white/80 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white shadow-xs">
                <div className="px-3 py-2 bg-white/90 border-r border-white/80 text-xs font-semibold text-slate-700 shrink-0">+91</div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={modalPhone}
                  onChange={handleModalPhoneChange}
                  className="w-full px-3 py-2 bg-transparent text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Paid Amount (₹)</label>
              <input
                type="text"
                value={modalPaidAmount}
                onChange={(e) => setModalPaidAmount(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 rounded-xl bg-white/80 border border-white/80 text-xs font-semibold text-emerald-700 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>


            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Aadhar ID (12 digits) *</label>
              <input
                type="text"
                required
                maxLength={14}
                value={modalAadhar}
                onChange={handleModalAadharChange}
                className="w-full px-3 py-2 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 focus:outline-none tracking-wide focus:bg-white focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/60">
              <button
                type="button"
                onClick={handleCancelEditFromModal}
                className="px-3.5 py-2 rounded-xl border border-white/80 bg-white/70 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingModalOccupant}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {isSavingModalOccupant ? 'Updating...' : 'Update Database'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            {/* Occupant Header Card */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                {selectedOccupantForModal.name ? selectedOccupantForModal.name.slice(0, 2).toUpperCase() : 'RS'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {selectedOccupantForModal.name}
                  </h4>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase shadow-xs">
                    {selectedOccupantForModal.status || 'CONFIRMED'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {roomDisplay} • <span className="font-semibold text-slate-700">{roomTypeDisplay}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 border border-white/80 text-xs shadow-xs">
              <div>
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500 block">Mobile Number</span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs">
                  {selectedOccupantForModal.phone ? `+91 ${selectedOccupantForModal.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500 block">Aadhar ID</span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs tracking-wide">
                  {formatAadharNumber(selectedOccupantForModal.aadhar) || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500 block">Guests</span>
                <span className="font-semibold text-slate-800 mt-0.5 block text-xs">
                  {selectedOccupantForModal.adults || 1} Adult{(selectedOccupantForModal.adults || 1) > 1 ? 's' : ''}
                  {selectedOccupantForModal.children > 0 ? `, ${selectedOccupantForModal.children} Child` : ''}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-500 block">Paid Amount</span>
                <span className="font-semibold text-emerald-700 mt-0.5 block text-xs">
                  ₹{Number(selectedOccupantForModal.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Stay Duration Info */}
            {modalStayInfo && (
              <div className="p-3 rounded-2xl bg-white/70 border border-white/80 space-y-1.5 text-xs shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">Check-In</span>
                    <span className="font-semibold text-slate-800 text-xs">{modalStayInfo.checkInFormatted}</span>
                  </div>
                  <div className="text-center px-1">
                    <span className="text-[11px] font-semibold text-emerald-700">{modalStayInfo.durationLabel}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">Check-Out</span>
                    <span className="font-semibold text-slate-800 text-xs">{modalStayInfo.checkOutFormatted}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/60">
              {confirmModalDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModalDelete(false)}
                    className="px-2.5 py-1.5 rounded-xl border border-white/80 bg-white/80 text-slate-700 text-xs cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={() => handleRemoveOccupant(selectedOccupantForModal)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    {isUpdatingSlot ? 'Removing...' : 'Confirm Remove'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmModalDelete(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  Remove Occupant
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseOccupantModal}
                  className="px-3.5 py-1.5 rounded-xl border border-white/80 bg-white/70 text-slate-700 hover:bg-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartEditFromModal}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
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