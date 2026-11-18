export function OtpVerificationForm({
  email,
  purpose,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  isResending,
  countdown,
  errorMessage,
  otpDigits,
  onDigitChange,
  onKeyDown,
  onPaste,
  inputRefs,
}) {
  const isFilled = otpDigits.join('').length === 6;

  return (
    <div className="space-y-4 pt-1 pb-2 select-none animate-in fade-in duration-200">
      {/* Icon & Description */}
      <div className="text-center space-y-2">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-xs sm:text-[13.5px] text-slate-600 max-w-xs mx-auto leading-relaxed">
          We sent a 6-digit code to
          <span className="font-bold text-slate-900 block truncate max-w-[260px] mx-auto mt-0.5">
            {email}
          </span>
        </p>
      </div>

      {/* 6 Digit Input Boxes */}
      <div className="flex justify-center items-center gap-1.5 sm:gap-2" onPaste={onPaste}>
        {otpDigits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => onDigitChange(idx, e.target.value)}
            onKeyDown={(e) => onKeyDown(idx, e)}
            className="w-10 h-12 sm:w-11 sm:h-13 text-center font-mono text-xl sm:text-2xl font-bold bg-[#f7f4ee]/80 border-2 border-slate-200 rounded-xl focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all select-none text-slate-900 shadow-2xs"
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 animate-in fade-in">
          <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
          </svg>
          <span className="font-medium leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-1 flex justify-center w-full">
        <button
          type="button"
          disabled={isVerifying || !isFilled}
          onClick={() => onVerify()}
          className="w-[280px] h-[40px] min-h-[40px] bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-semibold text-[15px] flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>{purpose === 'register' ? 'Verify & Create Account' : 'Verify & Sign In'}</span>
          )}
        </button>
      </div>

      {/* Resend & Back Controls */}
      <div className="flex flex-col items-center gap-1.5 text-xs pt-1 text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>Didn&apos;t receive code?</span>
          {countdown > 0 ? (
            <span className="font-mono font-semibold text-slate-600">Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              disabled={isResending}
              onClick={onResend}
              className="font-bold text-[#059669] hover:text-emerald-700 hover:underline cursor-pointer disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium pt-0.5"
        >
          ← Back to {purpose === 'register' ? 'Registration' : 'Login'}
        </button>
      </div>
    </div>
  );
}
