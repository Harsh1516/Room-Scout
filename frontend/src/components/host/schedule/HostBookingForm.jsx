import React from 'react';

export function HostBookingForm({
  isPropertyApproved,
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
  hostAdults,
  setHostAdults,
  hostChildren,
  setHostChildren,
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
  requestedUserBooking = null,
  onClearRequestedBooking = null,
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/90 border border-emerald-200/80 dark:border-zinc-800 p-4 sm:p-5 space-y-3 shadow-md shadow-emerald-950/[0.03] text-slate-800 dark:text-zinc-200 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isUserRequestSelection
              ? 'bg-purple-600 text-white shadow-purple-600/20'
              : 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-600/20'
          }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
              {isUserRequestSelection ? 'Review & Approve Request' : 'Guest Details & Booking'}
            </h3>
          </div>
        </div>
        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs ${
          isUserRequestSelection
            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
        }`}>
          {isUserRequestSelection ? 'Online Request' : 'Step 3'}
        </span>
      </div>

      {isUserRequestSelection && (
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
              onClick={onClearRequestedBooking}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white transition-all cursor-pointer shrink-0 border border-purple-400"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleHostMarkSlotBooked(); }} className="space-y-3">
        <fieldset disabled={!isPropertyApproved} className="space-y-2.5 disabled:opacity-50">
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

          {isMonthly ? (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1">Gender *</label>
              <div className="grid grid-cols-2 gap-2">
                {['Male', 'Female'].map((g) => {
                  const isSelected = hostGender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!isPropertyApproved || isUserRequestSelection}
                      onClick={() => setHostGender(g)}
                      className={`h-[32px] rounded-xl text-xs font-semibold flex items-center justify-center transition-all border shadow-2xs ${
                        isUserRequestSelection
                          ? isSelected
                            ? 'bg-purple-600 text-white border-purple-600 cursor-not-allowed'
                            : 'bg-white/40 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 border-emerald-600 cursor-pointer'
                          : 'bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                <span>Guests (Adult &amp; Child)</span>
                {isUserRequestSelection && (
                  <span className="text-[10px] font-semibold text-purple-700 uppercase">Read-Only</span>
                )}
              </label>
              <div className={`flex items-center justify-between h-[34px] px-3 rounded-xl border text-xs shadow-2xs ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800 cursor-not-allowed'
                  : 'bg-slate-50/90 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">Adult</span>
                  <button
                    type="button"
                    onClick={() => setHostAdults((prev) => Math.max(1, prev - 1))}
                    disabled={hostAdults <= 1 || isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white w-5 text-center">{hostAdults}</span>
                  <button
                    type="button"
                    onClick={() => setHostAdults((prev) => Math.min(10, prev + 1))}
                    disabled={isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-2" />

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">Child</span>
                  <button
                    type="button"
                    onClick={() => setHostChildren((prev) => Math.max(0, prev - 1))}
                    disabled={hostChildren <= 0 || isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white w-5 text-center">{hostChildren}</span>
                  <button
                    type="button"
                    onClick={() => setHostChildren((prev) => Math.min(10, prev + 1))}
                    disabled={isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

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
              onClick={onClearRequestedBooking}
              className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 shadow-xs transition-all cursor-pointer"
            >
              Dismiss
            </button>
          ) : (
            <button
              type="button"
              onClick={clearForm}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!isPropertyApproved || isUpdatingSlot || sortedSelected.length === 0}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wide transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              isUserRequestSelection
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white shadow-emerald-600/25'
            }`}
          >
            {isUpdatingSlot && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>
              {!isPropertyApproved
                ? 'Slots Locked'
                : isUpdatingSlot
                ? (isUserRequestSelection ? 'Approving...' : 'Booking...')
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
  );
}