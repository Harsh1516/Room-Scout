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
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-4 sm:p-5 space-y-3 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] text-slate-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/60 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
            isUserRequestSelection
              ? 'bg-purple-600 text-white border-purple-500'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 truncate">
              {isUserRequestSelection ? 'Review & Approve Request' : 'Guest Details & Booking'}
            </h3>
          </div>
        </div>
        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border shadow-xs ${
          isUserRequestSelection
            ? 'bg-purple-100 text-purple-700 border-purple-200'
            : 'bg-white/80 border-white/80 text-slate-700'
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
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium placeholder:text-slate-400 placeholder:font-normal shadow-xs transition-all ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 border border-purple-200/80 text-slate-800 cursor-not-allowed select-none font-semibold'
                  : 'bg-white/80 border border-white/80 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500'
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
            <div className={`flex items-center rounded-xl border overflow-hidden shadow-xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-50/70 border-purple-200/80 cursor-not-allowed'
                : 'bg-white/80 border-white/80 focus-within:border-emerald-500 focus-within:bg-white'
            }`}>
              <div className={`px-3 py-1.5 border-r text-xs font-semibold select-none shrink-0 ${
                isUserRequestSelection
                  ? 'bg-purple-100/80 border-purple-200 text-purple-700'
                  : 'bg-white/90 border-white/80 text-slate-700'
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
                  isUserRequestSelection ? 'text-slate-800 cursor-not-allowed font-semibold' : 'text-slate-900'
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
                      className={`h-[32px] rounded-xl text-xs font-semibold flex items-center justify-center transition-all border shadow-xs ${
                        isUserRequestSelection
                          ? isSelected
                            ? 'bg-purple-600 text-white border-purple-600 cursor-not-allowed'
                            : 'bg-white/40 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 cursor-pointer'
                          : 'bg-white/70 text-slate-700 border-white/80 hover:bg-white cursor-pointer'
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
              <div className={`flex items-center justify-between h-[34px] px-3 rounded-xl border text-xs shadow-xs ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 border-purple-200/80 cursor-not-allowed'
                  : 'bg-white/80 border-white/80'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 font-medium">Adult</span>
                  <button
                    type="button"
                    onClick={() => setHostAdults((prev) => Math.max(1, prev - 1))}
                    disabled={hostAdults <= 1 || isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-slate-900 w-5 text-center">{hostAdults}</span>
                  <button
                    type="button"
                    onClick={() => setHostAdults((prev) => Math.min(10, prev + 1))}
                    disabled={isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 mx-2" />

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 font-medium">Child</span>
                  <button
                    type="button"
                    onClick={() => setHostChildren((prev) => Math.max(0, prev - 1))}
                    disabled={hostChildren <= 0 || isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-slate-900 w-5 text-center">{hostChildren}</span>
                  <button
                    type="button"
                    onClick={() => setHostChildren((prev) => Math.min(10, prev + 1))}
                    disabled={isUserRequestSelection || !isPropertyApproved}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
              className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium placeholder:text-slate-400 placeholder:font-normal shadow-xs transition-all tracking-wide ${
                isUserRequestSelection
                  ? 'bg-purple-50/70 border border-purple-200/80 text-slate-800 cursor-not-allowed select-none font-semibold'
                  : 'bg-white/80 border border-white/80 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500'
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
            <div className={`relative flex items-center rounded-xl border shadow-xs transition-all ${
              isUserRequestSelection
                ? 'bg-purple-50/70 border-purple-200/80 cursor-not-allowed'
                : 'bg-white/80 border-white/80 focus-within:border-emerald-500 focus-within:bg-white'
            }`}>
              <span className={`pl-3 text-xs font-semibold select-none ${
                isUserRequestSelection ? 'text-purple-600' : 'text-slate-400'
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
                  isUserRequestSelection ? 'text-purple-700 cursor-not-allowed font-bold' : 'text-emerald-700'
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
              className="px-3.5 py-2 rounded-xl border border-white/80 bg-white/70 text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 shadow-xs transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={!isPropertyApproved || isUpdatingSlot || sortedSelected.length === 0}
            className={`flex-1 py-2 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
              isUserRequestSelection
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-1.5'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {!isPropertyApproved
              ? 'Slots Locked'
              : isUpdatingSlot
              ? (isUserRequestSelection ? 'Approving...' : 'Booking...')
              : isUserRequestSelection
              ? '✓ Approve & Confirm Slot'
              : isMonthly
              ? 'Confirm & Book Month(s)'
              : 'Confirm & Book Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}