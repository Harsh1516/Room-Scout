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
  return (
    <section className="flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_10px_35px_rgb(0,0,0,0.09)] transition-all overflow-hidden">
      {/* Header: Month Pill Green Background (#00e599) matching Pic 1 */}
      <div className="px-5 py-3 border-b border-[#00c984] dark:border-[#00b577] flex items-center justify-center bg-[#00e599] text-[#071320] shadow-xs">
        <h3 className="text-[15px] font-black text-[#071320] tracking-tight text-center">
          {isExpiredRequest ? 'Booking Request Expired' : isUserRequestSelection ? 'Review & Approve Request' : 'Guest Details'}
        </h3>
      </div>

      <div className="p-4 flex flex-col gap-3">

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
        <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/80 text-orange-800 dark:text-orange-200 text-xs flex items-center gap-2 shadow-2xs">
          <span className="text-sm">🔒</span>
          <span>Room not updated in database yet. Click <strong className="font-bold text-orange-950 dark:text-orange-100">"Update"</strong> on the category tab to unlock booking.</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleHostMarkSlotBooked(); }} className="space-y-3">
        <fieldset disabled={!isPropertyApproved || !isRoomSavedToDb} className="space-y-2.5 disabled:opacity-50">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
              <span>Full Name *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-700 uppercase">Read-Only</span>
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
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium placeholder:text-slate-400 placeholder:font-normal shadow-2xs transition-all ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 text-slate-800 dark:text-zinc-200 cursor-not-allowed select-none font-semibold'
                  : 'bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
              <span>Mobile Number *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-700 uppercase">Read-Only</span>
              )}
            </label>
            <div className={`flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800 cursor-not-allowed'
                : 'bg-slate-50/90 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-zinc-800'
            }`}>
              <div className={`px-3 py-1.5 border-r text-xs font-semibold select-none shrink-0 ${
                isUserRequestSelection
                  ? 'bg-purple-100/80 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                  : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
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
                className={`w-full px-2.5 py-1.5 bg-transparent text-xs font-medium focus:outline-none placeholder:text-slate-400 placeholder:font-normal ${
                  isUserRequestSelection ? 'text-slate-800 dark:text-zinc-200 cursor-not-allowed font-semibold' : 'text-slate-900 dark:text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300">
                Person Count *
              </label>
              <div className="flex items-center gap-1.5">
                {isUserRequestSelection && (
                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase">
                    Read-Only
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  Max: {maxAllowedPersons} {maxAllowedPersons === 1 ? 'person' : 'persons'} (Capacity: {roomCapacity})
                </span>
              </div>
            </div>

            <div className={`flex items-center justify-between h-[36px] px-3 rounded-xl border text-xs shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800 cursor-not-allowed'
                : 'bg-slate-50/90 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80'
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[11.5px] text-slate-700 dark:text-zinc-300 font-medium">
                  {hostPersonCount} {hostPersonCount === 1 ? 'Person' : 'Persons'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHostPersonCount?.((prev) => Math.max(1, prev - 1))}
                  disabled={hostPersonCount <= 1 || isUserRequestSelection || !isPropertyApproved}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                  title="Decrease person count"
                >
                  −
                </button>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-5 text-center select-none">
                  {hostPersonCount}
                </span>
                <button
                  type="button"
                  onClick={() => setHostPersonCount?.((prev) => Math.min(maxAllowedPersons, prev + 1))}
                  disabled={hostPersonCount >= maxAllowedPersons || isUserRequestSelection || !isPropertyApproved}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                  title="Increase person count"
                >
                  +
                </button>
              </div>
            </div>

            {hostPersonCount > 1 && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                ✓ Occupies {hostPersonCount} of {roomCapacity} spaces in Room {roomDisplay}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
              <span>Aadhar ID *</span>
              {isUserRequestSelection && (
                <span className="text-[10px] font-semibold text-purple-700 uppercase">Read-Only</span>
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
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium placeholder:text-slate-400 placeholder:font-normal shadow-2xs transition-all tracking-wide ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 text-slate-800 dark:text-zinc-200 cursor-not-allowed select-none font-semibold'
                  : 'bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
              <span>Paid Amount (₹) *</span>
              <span className={`text-[10px] font-semibold uppercase ${
                isUserRequestSelection
                  ? 'text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200'
                  : 'text-emerald-700'
              }`}>
                {isUserRequestSelection ? '🔒 Locked (Online User)' : 'editable'}
              </span>
            </label>
            <div className={`relative flex items-center rounded-xl border shadow-2xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800 cursor-not-allowed'
                : 'bg-slate-50/90 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-zinc-800'
            }`}>
              <span className={`pl-3 text-xs font-semibold select-none ${
                isUserRequestSelection ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-zinc-500'
              }`}>₹</span>
              <input
                type="text"
                required
                readOnly={isUserRequestSelection}
                disabled={!isPropertyApproved || isUserRequestSelection}
                value={hostPaidAmount}
                onChange={(e) => setHostPaidAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className={`w-full px-2 py-1.5 bg-transparent text-xs font-semibold focus:outline-none ${
                  isUserRequestSelection ? 'text-purple-700 dark:text-purple-300 cursor-not-allowed font-bold' : 'text-emerald-700 dark:text-emerald-400'
                }`}
              />
            </div>
          </div>
        </fieldset>

        {isUserRequestSelection && (
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-[11px] flex items-center gap-2 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Guest details are locked for online requests. As host, you have approve-only permission.</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {isUserRequestSelection && onClearRequestedBooking ? (
            <button
              type="button"
              onClick={() => onClearRequestedBooking(requestedUserBooking)}
              className="px-3.5 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 shadow-2xs transition-all cursor-pointer"
            >
              Dismiss
            </button>
          ) : (
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-outline-variant/40 bg-slate-50/80 dark:bg-surface-container hover:bg-slate-100 dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!isPropertyApproved || !isRoomSavedToDb || isUpdatingSlot || sortedSelected.length === 0 || isExpiredRequest}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
              isExpiredRequest
                ? 'bg-slate-200 dark:bg-surface-container text-slate-500 dark:text-outline cursor-not-allowed'
                : 'bg-[#00e599] hover:bg-[#00d68f] text-[#071320] font-black shadow-sm shadow-[#00e599]/25'
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