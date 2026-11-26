import { formatCountdown } from '../../utils/bookingPayment';
import { formatUtrNumber } from '../../utils/bookingDetailsHelpers';

export function BookingPaymentSection({
  booking,
  upiDetails,
  statusMeta,
  isFirstPaymentExpired,
  isPermanentlyTimedOut,
  isMaxAttemptsExceeded,
  countdownSec,
  totalAmount,
  recipientUpiId,
  recipientPayee,
  copiedUpi,
  onCopyUpi,
  transactionRef,
  setTransactionRef,
  receiptImage,
  setReceiptImage,
  setReceiptPreview,
  isSubmittingPayment,
  onSubmitPayment,
  isReRequesting,
  onReRequestPayment,
  onReceiptFileChange,
}) {
  if (statusMeta.step < 2) return null;

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Black horizontal line dividing Requested data from Payment */}
      <hr className="border-black border-t" />

      <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
        # Step 2. Payment
      </span>

      {/* Alert: Host Re-request for Correct UTR */}
      {statusMeta.type === 'upi_rejected' && (
        <div className="rounded-3xl p-6 sm:p-7 border-2 border-rose-300 bg-rose-50/70 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-rose-900">
                  Host Requested Correct Payment Details
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                  {isMaxAttemptsExceeded ? 'Attempts Exceeded' : 'Final Chance (Attempt 2 of 2)'}
                </span>
              </div>
              <p className="text-xs text-rose-700/90 mt-1 font-medium leading-relaxed">
                The host reviewed your payment reference and could not verify the credit in their bank statement.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 space-y-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Reason Given by Host:
            </span>
            <p className="text-sm font-semibold text-[#1f1b16] italic">
              &ldquo;{booking?.upiPayment?.rejectionReason || upiDetails?.rejectionReason || 'UPI reference did not match host bank records'}&rdquo;
            </p>
            {booking?.upiPayment?.transactionRef && (
              <p className="text-xs text-slate-500 pt-1 font-medium">
                Previously submitted reference: <span className="font-mono font-bold text-slate-700">{formatUtrNumber(booking.upiPayment.transactionRef)}</span>
              </p>
            )}
          </div>

          {!isMaxAttemptsExceeded ? (
            <p className="text-xs text-slate-600 font-medium">
              Please open your UPI app (Google Pay, PhonePe, Paytm, BHIM) and locate the <strong>12-digit UTR or Bank Reference ID (RRN)</strong>. Enter it below and attach your payment receipt screenshot.
            </p>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-600/10 text-rose-700 text-xs font-semibold">
              Maximum submission attempts reached. If you have already paid, please contact the host directly via phone/WhatsApp to confirm manually.
            </div>
          )}
        </div>
      )}

      {/* Re-Request Payment Card (First Expiration - Final 5 Min Chance) */}
      {isFirstPaymentExpired && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  Payment Expired
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  Final Chance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Re-open your payment window for a final 5 minutes to complete this booking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReRequestPayment}
            disabled={isReRequesting}
            className="w-full h-11 py-2.5 px-5 rounded-full font-bold text-sm bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isReRequesting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Re-opening Window...</span>
              </>
            ) : (
              <>
                <span>Re-Open Payment QR (5 Mins)</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Permanent Timeout Card */}
      {isPermanentlyTimedOut && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-rose-950">
                Payment Window Closed
              </h3>
              <p className="text-xs sm:text-sm text-rose-800/90 font-medium mt-0.5">
                The payment deadline has elapsed and this booking slot has been released.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Payment Box (QR + UTR Input Form) */}
      {(statusMeta.type === 'awaiting_payment' || (statusMeta.type === 'upi_rejected' && !isMaxAttemptsExceeded)) && (
        <div className="rounded-3xl border-2 border-[#1f1b16] bg-white p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                # Step 2. Payment
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#1f1b16] mt-0.5">
                Pay Host via UPI QR or ID
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Scan the host QR code or send payment to the host UPI ID below.
              </p>
            </div>

            {countdownSec !== null && countdownSec > 0 && !isFirstPaymentExpired && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800">
                <svg className="w-4 h-4 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className="text-left">
                  <span className="text-[10px] block font-bold uppercase tracking-wider text-amber-600">Time to Pay</span>
                  <span className="font-mono text-sm font-black">{formatCountdown(countdownSec)}</span>
                </div>
              </div>
            )}
          </div>

          {booking?.paymentReRequested && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-semibold flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Final 5-Minute Window Active: Enter your 12-digit UTR and click &ldquo;Send for Verification&rdquo; before the timer ends.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center p-5 sm:p-6 rounded-3xl bg-[#fbfaf8] border border-slate-200/80">
            <div className="flex flex-col items-center text-center p-2">
              {upiDetails?.qrCodeDataUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-2xs border border-slate-200/90">
                  <img
                    decoding="async"
                    loading="lazy"
                    src={upiDetails.qrCodeDataUrl}
                    alt="Scan Host UPI QR Code to Pay"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
                  <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  </svg>
                  <span className="text-xs text-slate-500 font-semibold">QR Code Unavailable</span>
                  <span className="text-[11px] text-slate-400 mt-1">Please use the UPI ID below to pay directly</span>
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-3">
                Scan with any UPI App
              </span>
              <span className="text-xs text-slate-400 font-medium">GPay • PhonePe • Paytm • BHIM</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount to Pay</span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-0.5">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payee Name</span>
                <div className="text-sm font-bold text-[#1f1b16] truncate">{recipientPayee}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Host UPI ID</span>
                  <button
                    type="button"
                    onClick={onCopyUpi}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    {copiedUpi ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-sm font-black text-[#1f1b16] break-all select-all">
                  {recipientUpiId || 'UPI ID not provided by host'}
                </div>
              </div>
            </div>
          </div>

          {/* Submission Form for 12-digit UTR */}
          <form onSubmit={onSubmitPayment} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                12-Digit UPI Transaction Reference (UTR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                required
                value={formatUtrNumber(transactionRef)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setTransactionRef(val);
                }}
                onKeyDown={(e) => {
                  if (
                    !/^\d$/.test(e.key) &&
                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter 12-digit UPI reference (e.g. 430219882711)"
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/90 bg-white text-[#1f1b16] font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-all"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Found in your UPI app receipt under &ldquo;UPI Transaction ID&rdquo; or &ldquo;UTR&rdquo;.</span>
                <span className={`font-mono font-bold ${transactionRef.length === 12 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {transactionRef.length}/12
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingPayment || transactionRef.trim().length !== 12}
                className={`w-full min-h-[48px] py-3.5 px-6 rounded-full font-bold text-sm sm:text-base text-white shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                  statusMeta.type === 'upi_rejected'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#1f1b16] hover:bg-[#0f766e]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmittingPayment ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Sending for Verification...</span>
                  </>
                ) : statusMeta.type === 'upi_rejected' ? (
                  <>
                    <span>Submit Corrected UTR (Final Attempt)</span>
                    <span>→</span>
                  </>
                ) : (
                  <>
                    <span>Send for Verification</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Case: Payment Submitted • Awaiting Verification */}
      {statusMeta.type === 'verifying' && (
        <div className="rounded-3xl border border-teal-200/90 bg-teal-50/60 p-6 sm:p-8 space-y-5 shadow-2xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                # Step 2. Payment
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#1f1b16] mt-0.5">
                Payment Reference Submitted — Host is Verifying
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed font-medium">
                Thank you! Your UPI reference number has been delivered to the host. The host is checking their bank statement and will approve your booking shortly.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-teal-200/80 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Submitted Reference (UTR):</span>
              <span className="font-mono font-bold text-[#1f1b16]">
                {formatUtrNumber(booking?.upiPayment?.transactionRef || transactionRef) || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Submitted At:</span>
              <span className="text-slate-800 font-bold">
                {booking?.upiPayment?.submittedAt ? new Date(booking.upiPayment.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Host Notification:</span>
              <span className="text-emerald-700 font-bold">Sent via Email & Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <svg className="w-4 h-4 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Most hosts verify within 15–30 minutes. You can leave this page safely.</span>
          </div>
        </div>
      )}

      {/* Case: Payment Confirmed (Step >= 3) */}
      {statusMeta.step >= 3 && (
        <div className="w-full space-y-3 px-1 py-1">
          <div className="flex items-center justify-between">
            <div className="text-base sm:text-lg font-bold text-[#1f1b16]">
              Payment Verified by Host
            </div>
            <span className="text-sm sm:text-base font-bold text-emerald-600">
              Paid
            </span>
          </div>
          {(booking?.upiPayment?.transactionRef || transactionRef) && (
            <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200/80">
              <span className="text-slate-500 font-medium">Submitted Reference (UTR):</span>
              <span className="font-mono font-bold text-slate-800">{formatUtrNumber(booking.upiPayment?.transactionRef || transactionRef)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
