import React from 'react';

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
}) {
  const cleanRoomName = roomDisplay ? (roomDisplay.startsWith('Room') ? roomDisplay : `Room ${roomDisplay}`) : '';

  return (
    <section className="w-full flex flex-col rounded-[26px] overflow-hidden transition-all bg-white dark:bg-[#0c1825] border border-[#54ACBF]/40 dark:border-[#54ACBF]/40 shadow-sm shadow-[#023859]/30 select-none relative text-white">
      {/* Header: Exactly matching Mid Tab (HostScheduleCalendar) Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#54ACBF]/30 dark:border-[#54ACBF]/30 bg-[#023859] dark:bg-[#023859] text-white relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[19px] sm:text-[21px] text-white">person</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white truncate font-extrabold tracking-tight text-base sm:text-lg lg:text-[18px] leading-normal pb-0.5">
                  {isExpiredRequest ? 'Request Expired' : isUserRequestSelection ? 'Review Request' : 'Guest Details'}
                </h3>
                {cleanRoomName && (
                  <span className="h-6 px-2.5 text-[11px] rounded-full bg-white/20 border border-white/30 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs">
                    {cleanRoomName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A7EBF2]/80 mt-0.5 font-medium leading-normal truncate">
                {isUserRequestSelection
                  ? 'Online Guest Lead • Verification'
                  : `${roomTypeDisplay ? `${roomTypeDisplay} • ` : ''}Manual / Walk-in Booking`}
              </p>
            </div>
          </div>

          {roomTypeDisplay && (
            <div className="shrink-0 text-right">
              <span className="h-6 px-2.5 text-[11px] rounded-full bg-white/10 border border-white/20 text-[#A7EBF2] font-semibold shadow-2xs select-none flex items-center justify-center leading-normal">
                {roomTypeDisplay}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-2.5 sm:pt-3 flex flex-col gap-3 relative z-10">

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
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shadow-2xs">
          <span className="text-sm">🔒</span>
          <span>Room not updated in database yet. Click <strong className="font-bold text-white">"Update"</strong> on the category tab to unlock booking.</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleHostMarkSlotBooked(); }} className="space-y-3">
        <fieldset disabled={!isPropertyApproved || !isRoomSavedToDb} className="space-y-2.5 disabled:opacity-50">
          <div>
            <label className="block text-[11.5px] font-medium text-[#A7EBF2]/90 mb-1 flex items-center justify-between">
              <span>Full Name *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-300 uppercase">Read-Only</span>
              )}
            </label>
            <input
              type="text"
              required
              readOnly={isUserRequestSelection}
              disabled={!isPropertyApproved || isUserRequestSelection}
              value={hostUserName}
              onChange={handleHostNameChange}
              placeholder="Guest full name"
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium placeholder:text-[#54ACBF]/40 shadow-2xs transition-all ${
                isUserRequestSelection
                  ? 'bg-purple-950/40 border border-purple-500/50 text-white cursor-not-allowed select-none font-semibold'
                  : 'bg-[#011C40]/70 border border-[#54ACBF]/30 text-white focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-[#A7EBF2]/90 mb-1 flex items-center justify-between">
              <span>Mobile Number *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-300 uppercase">Read-Only</span>
              )}
            </label>
            <div className={`flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-950/40 border-purple-500/50 cursor-not-allowed'
                : 'bg-[#011C40]/70 border-[#54ACBF]/30 focus-within:border-[#54ACBF] focus-within:ring-1 focus-within:ring-[#54ACBF]/20'
            }`}>
              <div className={`px-3 py-2 border-r text-xs font-semibold select-none shrink-0 ${
                isUserRequestSelection
                  ? 'bg-purple-900/50 border-purple-500/40 text-purple-300'
                  : 'bg-[#011C40] border-[#54ACBF]/30 text-[#A7EBF2]'
              }`}>
                +91
              </div>
              <input
                type="tel"
                required
                maxLength={10}
                readOnly={isUserRequestSelection}
                disabled={!isPropertyApproved || isUserRequestSelection}
                value={hostUserPhone}
                onChange={handleHostPhoneChange}
                placeholder="10-digit mobile number"
                className={`w-full px-2.5 py-2 bg-transparent text-xs font-medium focus:outline-none placeholder:text-[#54ACBF]/40 ${
                  isUserRequestSelection ? 'text-zinc-200 cursor-not-allowed font-semibold' : 'text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11.5px] font-medium text-[#A7EBF2]/90">
                Person Count *
              </label>
              <div className="flex items-center gap-1.5">
                {isUserRequestSelection && (
                  <span className="text-[10px] font-semibold text-purple-300 uppercase">
                    Read-Only
                  </span>
                )}
                <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-md bg-[#011C40] text-[#A7EBF2] border border-[#54ACBF]/30">
                  Max: {maxAllowedPersons} {maxAllowedPersons === 1 ? 'person' : 'persons'} (Capacity: {roomCapacity})
                </span>
              </div>
            </div>

            <div className={`flex items-center justify-between h-[38px] px-3 rounded-xl border text-xs shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-950/40 border-purple-500/50 cursor-not-allowed'
                : 'bg-[#011C40]/70 border-[#54ACBF]/30'
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#A7EBF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[11.5px] text-[#A7EBF2] font-medium">
                  {hostPersonCount} {hostPersonCount === 1 ? 'Person' : 'Persons'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHostPersonCount?.((prev) => Math.max(1, prev - 1))}
                  disabled={hostPersonCount <= 1 || isUserRequestSelection || !isPropertyApproved}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-[#023859] hover:bg-[#26658C] border border-[#54ACBF]/40 text-[#A7EBF2] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs active:scale-95"
                  title="Decrease person count"
                >
                  −
                </button>
                <span className="text-xs font-bold text-white w-5 text-center select-none font-mono">
                  {hostPersonCount}
                </span>
                <button
                  type="button"
                  onClick={() => setHostPersonCount?.((prev) => Math.min(maxAllowedPersons, prev + 1))}
                  disabled={hostPersonCount >= maxAllowedPersons || isUserRequestSelection || !isPropertyApproved}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-[#023859] hover:bg-[#26658C] border border-[#54ACBF]/40 text-[#A7EBF2] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs active:scale-95"
                  title="Increase person count"
                >
                  +
                </button>
              </div>
            </div>

            {hostPersonCount > 1 && (
              <p className="text-[10px] text-[#A7EBF2] mt-1 font-medium">
                ✓ Occupies {hostPersonCount} of {roomCapacity} spaces in Room {roomDisplay}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-[#A7EBF2]/90 mb-1 flex items-center justify-between">
              <span>Aadhar ID *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-300 uppercase">Read-Only</span>
              )}
            </label>
            <input
              type="text"
              required
              maxLength={14}
              readOnly={isUserRequestSelection}
              disabled={!isPropertyApproved || isUserRequestSelection}
              value={hostUserAadhar}
              onChange={(e) => setHostUserAadhar(formatAadharNumber(e.target.value))}
              placeholder="12-digit number"
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium placeholder:text-[#54ACBF]/40 shadow-2xs transition-all tracking-wider ${
                isUserRequestSelection
                  ? 'bg-purple-950/40 border border-purple-500/50 text-white cursor-not-allowed select-none font-semibold'
                  : 'bg-[#011C40]/70 border border-[#54ACBF]/30 text-white focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-[#A7EBF2]/90 mb-1 flex items-center justify-between">
              <span>{isUserRequestSelection ? 'Booking Amount (₹)' : 'Paid Amount (₹) *'}</span>
              <span className={`text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isUserRequestSelection
                  ? 'text-purple-300 bg-purple-950/60 border border-purple-500/40'
                  : 'text-[#A7EBF2] bg-[#023859] border border-[#54ACBF]/40'
              }`}>
                {isUserRequestSelection ? '🔒 Locked (Online User)' : 'editable'}
              </span>
            </label>
            <div className={`relative flex items-center rounded-xl border shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-950/40 border-purple-500/50 cursor-not-allowed'
                : 'bg-[#011C40]/70 border-[#54ACBF]/30 focus-within:border-[#54ACBF] focus-within:ring-1 focus-within:ring-[#54ACBF]/20'
            }`}>
              <span className={`pl-3 text-xs font-bold select-none ${
                isUserRequestSelection ? 'text-purple-400' : 'text-[#A7EBF2]'
              }`}>₹</span>
              <input
                type="text"
                required
                readOnly={isUserRequestSelection}
                disabled={!isPropertyApproved || isUserRequestSelection}
                value={hostPaidAmount}
                onChange={(e) => setHostPaidAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className={`w-full px-2 py-2 bg-transparent text-xs font-bold focus:outline-none placeholder:text-[#54ACBF]/40 ${
                  isUserRequestSelection ? 'text-purple-300 cursor-not-allowed font-bold' : 'text-white'
                }`}
              />
            </div>
          </div>
        </fieldset>

        {isUserRequestSelection && (
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-[11px] flex items-center gap-2 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Guest details are locked for online requests. As host, you have approve-only permission.</span>
          </div>
        )}

        <div className="pt-3 pb-0.5 border-t border-[#54ACBF]/30 dark:border-[#54ACBF]/30 flex items-center justify-between gap-2.5">
          {isUserRequestSelection && onClearRequestedBooking ? (
            <button
              type="button"
              onClick={() => onClearRequestedBooking(requestedUserBooking)}
              className="h-9 px-4 rounded-xl border border-purple-500/40 bg-purple-950/40 text-xs font-bold text-purple-300 hover:bg-purple-900/50 shadow-2xs transition-all cursor-pointer"
            >
              Dismiss
            </button>
          ) : (
            <button
              type="button"
              onClick={clearForm}
              className="h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs leading-none shrink-0 border border-[#54ACBF]/30 bg-[#011C40] hover:bg-[#023859] text-[#A7EBF2] hover:text-white active:scale-95"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!isPropertyApproved || !isRoomSavedToDb || isUpdatingSlot || sortedSelected.length === 0 || isExpiredRequest}
            className={`flex-1 h-9 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              isExpiredRequest
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-[#011C40] dark:bg-white dark:hover:bg-slate-100 dark:text-[#011C40] cursor-pointer'
            }`}
          >
            {isUpdatingSlot && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                ? '✓ Approve & Confirm Slot'
                : isMonthly
                ? 'Confirm & Book Month(s)'
                : 'Confirm & Book Slot'}
            </span>
          </button>
        </div>
      </form>
      </div>
    </section>
  );
}