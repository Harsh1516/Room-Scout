import React from 'react';
import { createPortal } from 'react-dom';

export function HostBookingForm({
  isPropertyApproved,
  isRoomSavedToDb = true,
  isMonthly,
  roomDisplay,
  roomTypeDisplay,
  reservationDetails,
  hostUserName,
  handleHostNameChange,
  hostUserPhone,
  handleHostPhoneChange,
  hostGender,
  setHostGender,
  hostPersonCount = 1,
  setHostPersonCount,
  maxAllowedPersons = 1,
  roomCapacity = 1,
  hostUserEmail,
  setHostUserEmail,
  hostUserAadhar,
  setHostUserAadhar,
  formatAadharNumber,
  hostPaidAmount,
  setHostPaidAmount,
  isUpdatingSlot,
  sortedSelected = [],
  handleHostMarkSlotBooked,
  clearForm,
  isUserRequestSelection = false,
  isExpiredRequest = false,
  requestedUserBooking = null,
  onClearRequestedBooking = null,
  onBackToOccupants = null,
  isModal = false,
  onClose = null,
  theme = 'white', // 'white' | 'black' | 'teal'
}) {
  const cleanRoomName = roomDisplay
    ? roomDisplay.startsWith('Room')
      ? roomDisplay
      : `Room ${roomDisplay}`
    : '';

  const isWhite = theme === 'white' || isModal;
  const isBlack = theme === 'black' && !isModal;

  const formContent = (
    <section className={`w-full flex flex-col overflow-hidden transition-all select-none relative ${
      isModal
        ? 'rounded-[28px] bg-white text-slate-900 border border-slate-200/90 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] max-w-[400px] w-full my-auto'
        : isWhite
        ? 'rounded-[28px] bg-white text-slate-900 border border-slate-200/80 shadow-xl'
        : isBlack
        ? 'rounded-[28px] bg-black text-white border border-neutral-800 shadow-2xl'
        : 'max-xl:rounded-t-[28px] max-xl:sm:rounded-t-[36px] max-xl:rounded-b-none xl:rounded-[26px] max-xl:bg-gradient-to-b max-xl:from-[#064e3b] max-xl:to-[#022c22] max-xl:backdrop-blur-2xl max-xl:border-t max-xl:border-x max-xl:border-emerald-500/30 max-xl:border-b-0 max-xl:text-white max-xl:min-h-[560px] max-xl:pb-32 sm:max-xl:pb-36 bg-white border border-slate-200/90 shadow-[0_16px_40px_rgba(2,44,34,0.35)] text-slate-900'
    }`}>
      {/* Header */}
      <div className={`px-5 pt-4 pb-2.5 border-b relative z-10 ${
        isWhite
          ? 'bg-white border-slate-100 text-slate-900'
          : isBlack
          ? 'bg-black border-neutral-800 text-white'
          : 'max-xl:border-emerald-500/20 max-xl:bg-black/15 max-xl:backdrop-blur-xl max-xl:text-white border-slate-200/90 bg-white text-slate-900'
      }`}>
        <div className="flex flex-col gap-1.5 w-full">
          {/* Row 1: Centered "Guest Details" Title */}
          <div className="flex items-center justify-center w-full">
            <h3 className={`font-black tracking-tight text-[16px] sm:text-[17px] text-center leading-none ${
              isWhite ? 'text-slate-900' : isBlack ? 'text-white' : 'max-xl:text-white text-slate-900'
            }`}>
              {isExpiredRequest ? 'Request Expired' : isUserRequestSelection ? 'Review Request' : 'Guest Details'}
            </h3>
          </div>

          {/* Row 2: Room info on Left, Date status on Right */}
          <div className={`flex items-center justify-between gap-2 w-full pt-1.5 border-t text-xs leading-tight font-semibold ${
            isWhite
              ? 'border-slate-100 text-slate-500'
              : isBlack
              ? 'border-neutral-800 text-neutral-400'
              : 'max-xl:border-emerald-500/20 border-slate-100 max-xl:text-emerald-200/90 text-slate-500'
          }`}>
            <span className={`font-bold text-[10.5px] uppercase tracking-wider ${
              isWhite ? 'text-slate-600' : isBlack ? 'text-neutral-400' : 'max-xl:text-white'
            }`}>
              {cleanRoomName || 'Room'} {isUserRequestSelection ? '• Online' : '• Offline Entry'}
            </span>

            <span className={`text-[10.5px] font-bold text-right px-2 py-0.5 rounded-full ${
              sortedSelected.length > 0
                ? isWhite
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                  : 'text-emerald-400 bg-emerald-950/70 border border-emerald-500/40'
                : isWhite
                ? 'text-slate-400 bg-slate-100'
                : 'text-neutral-400 bg-neutral-900 border border-neutral-800'
            }`}>
              {sortedSelected.length > 0
                ? `${sortedSelected.length} ${isMonthly ? 'Month' : 'Night'}${sortedSelected.length > 1 ? 's' : ''} Selected`
                : 'Select dates first'}
            </span>
          </div>
        </div>
      </div>

      <div className={`px-5 pb-5 pt-3 flex flex-col gap-2.5 relative z-10 ${
        isWhite ? 'bg-white' : isBlack ? 'bg-black' : 'max-xl:bg-transparent bg-white'
      }`}>
        {/* Request Expired Banner */}
        {isUserRequestSelection && isExpiredRequest && (
          <div className="p-3 rounded-2xl bg-rose-600 text-white border border-rose-400 flex items-center justify-between gap-2.5 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>Online Booking Request</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-800 text-white uppercase tracking-wider font-semibold">
                    Request Expired
                  </span>
                </p>
                <p className="text-[10.5px] text-rose-100 truncate">
                  Check-in date arrived before host approval • Request is now dismissed.
                </p>
              </div>
            </div>
            {onClearRequestedBooking && (
              <button
                type="button"
                onClick={() => onClearRequestedBooking(requestedUserBooking)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-900 text-white transition-all cursor-pointer shrink-0 border border-rose-400"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Awaiting Approval Banner */}
        {isUserRequestSelection && !isExpiredRequest && (
          <div className="p-3 rounded-2xl bg-purple-600 text-white border border-purple-400 flex items-center justify-between gap-2.5 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-200 shrink-0 animate-pulse" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>Online Booking Request</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-700 text-white uppercase tracking-wider font-semibold">
                    Awaiting Approval
                  </span>
                </p>
                <p className="text-[10.5px] text-purple-100 truncate">
                  {requestedUserBooking?.userName || requestedUserBooking?.fullName || 'Guest'} • {roomDisplay} ({roomTypeDisplay})
                </p>
              </div>
            </div>
            {onClearRequestedBooking && (
              <button
                type="button"
                onClick={() => onClearRequestedBooking(requestedUserBooking)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white transition-all cursor-pointer shrink-0 border border-purple-400"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Unsaved Room Warning */}
        {!isRoomSavedToDb && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs border ${
            isBlack
              ? 'bg-amber-950/40 border-amber-600/40 text-amber-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-700'
          }`}>
            <span className="text-sm">🔒</span>
            <span>Room not updated in database yet. Click <strong className="font-bold">"Update"</strong> on category tab first.</span>
          </div>
        )}

        {/* No months selected hint */}
        {sortedSelected.length === 0 && (
          <div className={`p-2 rounded-xl text-[11px] leading-snug flex items-center gap-2 border ${
            isBlack
              ? 'bg-[#222429] border-[#3a3e47] text-zinc-300'
              : isWhite
              ? 'bg-slate-50 border-slate-200/60 text-slate-600'
              : 'bg-emerald-900/40 border-emerald-500/30 text-emerald-200'
          }`}>
            <span className={`material-symbols-outlined text-[15px] shrink-0 ${isBlack ? 'text-zinc-400' : isWhite ? 'text-slate-400' : 'text-amber-400'}`}>info</span>
            <span>Tip: Select available {isMonthly ? 'month(s)' : 'date(s)'} on the schedule before confirming.</span>
          </div>
        )}

        {/* Form Container */}
        <div className={`space-y-2.5 ${
          isBlack || isWhite
            ? ''
            : 'max-xl:bg-black/25 max-xl:border max-xl:border-emerald-400/20 max-xl:backdrop-blur-xl bg-slate-50/50 border border-slate-200/80 shadow-xs p-3 sm:p-3.5 rounded-2xl'
        }`}>
          <form onSubmit={(e) => { e.preventDefault(); handleHostMarkSlotBooked(); }} className="space-y-2.5">
            <fieldset disabled={!isPropertyApproved || !isRoomSavedToDb} className="space-y-2 sm:space-y-2.5 disabled:opacity-50">
              {/* Field 1: Guest Full Name */}
              <div className={`relative flex items-center h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isUserRequestSelection
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : isWhite
                  ? 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
                  : 'bg-[#26282e] hover:bg-[#2d3038] focus-within:bg-[#222429] border border-[#3a3e47] focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-white/10'
              }`}>
                <input
                  type="text"
                  required
                  readOnly={isUserRequestSelection}
                  disabled={!isPropertyApproved || isUserRequestSelection}
                  value={hostUserName}
                  onChange={handleHostNameChange}
                  placeholder="Guest full name"
                  className={`w-full bg-transparent text-[13px] sm:text-[14px] font-medium placeholder:font-normal focus:outline-none ${
                    isWhite
                      ? 'text-slate-900 placeholder:text-slate-400'
                      : 'text-white placeholder:text-zinc-400'
                  }`}
                />
                {isUserRequestSelection && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 border border-purple-400/30 shrink-0">
                    Read-Only
                  </span>
                )}
              </div>

              {/* Field 2: Mobile Number */}
              <div className={`relative flex items-center h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isUserRequestSelection
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : isWhite
                  ? 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
                  : 'bg-[#26282e] hover:bg-[#2d3038] focus-within:bg-[#222429] border border-[#3a3e47] focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-white/10'
              }`}>
                <span className={`text-[12px] font-bold pr-2.5 mr-2.5 border-r select-none shrink-0 ${
                  isWhite
                    ? 'text-slate-700 border-slate-300'
                    : 'text-zinc-300 border-[#3a3e47]'
                }`}>
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  readOnly={isUserRequestSelection}
                  disabled={!isPropertyApproved || isUserRequestSelection}
                  value={hostUserPhone}
                  onChange={handleHostPhoneChange}
                  placeholder="10-digit mobile number"
                  className={`w-full bg-transparent text-[13px] sm:text-[14px] font-medium placeholder:font-normal focus:outline-none ${
                    isWhite
                      ? 'text-slate-900 placeholder:text-slate-400'
                      : 'text-white placeholder:text-zinc-400'
                  }`}
                />
              </div>

              {/* Field 3: Person Count */}
              <div className={`relative flex items-center justify-between h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isUserRequestSelection
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : isWhite
                  ? 'bg-slate-100/90 border border-slate-200/90'
                  : 'bg-[#26282e] border border-[#3a3e47]'
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[13px] sm:text-[14px] font-semibold truncate ${
                    isWhite ? 'text-slate-900' : 'text-white'
                  }`}>
                    {hostPersonCount} {hostPersonCount === 1 ? 'Person' : 'Persons'}
                  </span>
                  <span className={`text-[11px] font-medium shrink-0 ml-0.5 select-none ${
                    isWhite ? 'text-slate-400' : 'text-zinc-400'
                  }`}>
                    (Max {maxAllowedPersons})
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 select-none -mr-1">
                  <button
                    type="button"
                    onClick={() => setHostPersonCount?.((prev) => Math.max(1, prev - 1))}
                    disabled={hostPersonCount <= 1 || isUserRequestSelection || !isPropertyApproved}
                    className={`w-11 h-10 sm:w-12 sm:h-11 flex items-center justify-center text-2xl sm:text-3xl font-black leading-none cursor-pointer select-none disabled:opacity-20 disabled:cursor-not-allowed ${
                      isWhite
                        ? 'text-slate-800 hover:text-black'
                        : 'text-zinc-200 hover:text-white'
                    }`}
                    title="Decrease person count"
                  >
                    −
                  </button>
                  <span className={`min-w-[24px] sm:min-w-[28px] text-center text-lg sm:text-xl font-black font-mono select-none leading-none ${
                    isWhite ? 'text-slate-900' : 'text-white'
                  }`}>
                    {hostPersonCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHostPersonCount?.((prev) => Math.min(maxAllowedPersons, prev + 1))}
                    disabled={hostPersonCount >= maxAllowedPersons || isUserRequestSelection || !isPropertyApproved}
                    className={`w-11 h-10 sm:w-12 sm:h-11 flex items-center justify-center text-2xl sm:text-3xl font-black leading-none cursor-pointer select-none disabled:opacity-20 disabled:cursor-not-allowed ${
                      isWhite
                        ? 'text-slate-800 hover:text-black'
                        : 'text-zinc-200 hover:text-white'
                    }`}
                    title="Increase person count"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Field 4: Aadhar ID */}
              <div className={`relative flex items-center h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isUserRequestSelection
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : isWhite
                  ? 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
                  : 'bg-[#26282e] hover:bg-[#2d3038] focus-within:bg-[#222429] border border-[#3a3e47] focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-white/10'
              }`}>
                <input
                  type="text"
                  required
                  maxLength={14}
                  readOnly={isUserRequestSelection}
                  disabled={!isPropertyApproved || isUserRequestSelection}
                  value={hostUserAadhar}
                  onChange={(e) => setHostUserAadhar(typeof formatAadharNumber === 'function' ? formatAadharNumber(e.target.value) : e.target.value)}
                  placeholder="12-digit Aadhar number"
                  className={`w-full bg-transparent text-[13px] sm:text-[14px] font-medium placeholder:font-normal focus:outline-none tracking-wide ${
                    isWhite
                      ? 'text-slate-900 placeholder:text-slate-400'
                      : 'text-white placeholder:text-zinc-400'
                  }`}
                />
              </div>

              {/* Field 5: Paid Amount */}
              <div className={`relative flex items-center justify-between h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isUserRequestSelection
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : isWhite
                  ? 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
                  : 'bg-[#26282e] hover:bg-[#2d3038] focus-within:bg-[#222429] border border-[#3a3e47] focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-white/10'
              }`}>
                <div className="flex items-center flex-1 min-w-0">
                  <input
                    type="text"
                    required
                    readOnly={isUserRequestSelection}
                    disabled={!isPropertyApproved || isUserRequestSelection}
                    value={hostPaidAmount}
                    onChange={(e) => setHostPaidAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Paid Amount (₹)"
                    className={`w-full bg-transparent text-[13px] sm:text-[14px] font-medium placeholder:font-normal focus:outline-none ${
                      isWhite
                        ? 'text-slate-900 placeholder:text-slate-400'
                        : 'text-white placeholder:text-zinc-400'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider select-none shrink-0 ${
                  isWhite
                    ? 'text-slate-400'
                    : 'text-zinc-400'
                }`}>
                  {isUserRequestSelection ? 'Locked' : 'Editable'}
                </span>
              </div>
            </fieldset>

            {/* Bottom Action Bar */}
            <div className={`pt-3.5 sm:pt-4 border-t flex items-center justify-between gap-3 ${
              isBlack
                ? 'border-neutral-800'
                : isWhite
                ? 'border-slate-100'
                : 'max-xl:border-emerald-500/20 border-slate-200/80'
            }`}>
              {isUserRequestSelection && onClearRequestedBooking ? (
                <button
                  type="button"
                  onClick={() => onClearRequestedBooking(requestedUserBooking)}
                  className="h-13 sm:h-14 px-6 rounded-full text-[14px] sm:text-[15px] font-bold text-purple-400 hover:bg-purple-950/50 active:scale-95 transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearForm}
                  className={`h-13 sm:h-14 px-6 sm:px-7 rounded-full text-[14px] sm:text-[15px] font-bold active:scale-95 transition-all cursor-pointer border ${
                    isBlack
                      ? 'bg-[#26282e] hover:bg-[#30333b] text-zinc-300 border-[#3a3e47] shadow-2xs'
                      : isWhite
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/90 shadow-2xs'
                      : 'max-xl:bg-white/10 max-xl:hover:bg-white/20 max-xl:text-white max-xl:border-white/20 bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={!isPropertyApproved || !isRoomSavedToDb || isUpdatingSlot || sortedSelected.length === 0 || isExpiredRequest}
                className={`w-auto shrink-0 h-13 sm:h-14 px-6 sm:px-7 rounded-full font-black text-[15px] sm:text-[16px] shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isBlack
                    ? sortedSelected.length > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_4px_16px_rgba(16,185,129,0.3)]'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                    : isWhite
                    ? sortedSelected.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/25'
                      : 'bg-slate-200 text-slate-400 border border-slate-300/40 cursor-not-allowed'
                    : 'max-xl:bg-emerald-400 max-xl:hover:bg-emerald-300 max-xl:text-slate-950 max-xl:shadow-[0_4px_16px_rgba(16,185,129,0.35)] bg-emerald-500 hover:bg-emerald-400 text-white'
                }`}
              >
                {isUpdatingSlot && (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                <span>
                  {!isPropertyApproved
                    ? 'Slots Locked'
                    : !isRoomSavedToDb
                    ? 'Save Room to Book'
                    : isUpdatingSlot
                    ? (isUserRequestSelection ? 'Approving...' : 'Booking...')
                    : isExpiredRequest
                    ? 'Request Expired'
                    : isUserRequestSelection
                    ? 'Approve'
                    : 'Book'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  if (isModal && typeof document !== 'undefined') {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm transition-all overflow-y-auto"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] my-auto">
          {formContent}
        </div>
      </div>,
      document.body
    );
  }

  return formContent;
}

export default HostBookingForm;
