import { GoogleLogin } from '@react-oauth/google';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { OtpVerificationForm } from './OtpVerificationForm';

export function RegisterFormTab({
  isRegisterMode,
  isOtpMode,
  otpPurpose,
  accountType,
  setAccountType,
  errorMessage,
  setErrorMessage,
  successMessage,
  formData,
  handleInputChange,
  handleNameChange,
  showRegisterPassword,
  setShowRegisterPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isSubmitting,
  handleSubmit,
  handleGoogleSuccess,
  handleGoogleError,
  GOOGLE_CLIENT_ID,
  registerNameRef,
  // OTP props
  otpEmail,
  otpDigits,
  otpCountdown,
  isResending,
  isVerifyingOtp,
  handleVerifyOtp,
  handleResendOtp,
  handleOtpDigitChange,
  handleOtpKeyDown,
  handleOtpPaste,
  otpInputRefs,
  setIsOtpMode,
}) {
  return (
    <div
      className={`w-1/2 px-1 ${!isRegisterMode ? 'pointer-events-none' : ''}`}
      aria-hidden={!isRegisterMode}
    >
      <div className="rounded-[30px] sm:rounded-[32px] p-5 sm:p-7 relative border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
        {/* Header */}
        <header className="text-center pt-2 pb-4">
          <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
            {isOtpMode
              ? 'Security Code'
              : accountType === 'host'
              ? 'Host Account'
              : 'Create Account'}
          </h1>
        </header>

        {/* Error Banner */}
        {isRegisterMode && errorMessage && (
          <div className="mb-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {/* Success Banner */}
        {isRegisterMode && successMessage && (
          <div className="mb-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 2 Body: OTP Form or Standard Registration Form */}
        {isOtpMode && otpPurpose === 'register' ? (
          <OtpVerificationForm
            email={otpEmail}
            purpose="register"
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onBack={() => {
              setIsOtpMode(false);
              setErrorMessage('');
            }}
            isVerifying={isVerifyingOtp}
            isResending={isResending}
            countdown={otpCountdown}
            errorMessage={errorMessage}
            otpDigits={otpDigits}
            onDigitChange={handleOtpDigitChange}
            onKeyDown={handleOtpKeyDown}
            onPaste={handleOtpPaste}
            inputRefs={otpInputRefs}
          />
        ) : (
          <form onSubmit={(e) => handleSubmit(e, true)} noValidate className="space-y-3">
            {/* 1. Full Name */}
            <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
              <svg
                className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                ref={registerNameRef}
                type="text"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Full name"
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* 2. Mobile Number */}
            <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
              <span className="text-xs font-medium text-slate-600 select-none shrink-0 mr-1.5">+91</span>
              <div className="h-4 w-px bg-slate-300 mr-2 shrink-0" />
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const digits = raw.length > 10 && raw.startsWith('91') ? raw.slice(-10) : raw.slice(0, 10);
                  handleInputChange('phone', digits);
                }}
                placeholder="Mobile number (10 digits)"
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* 3. Email Address */}
            <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
              <svg
                className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email address"
                required
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* 4. Password */}
            <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
              <svg
                className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Password (min. 8 characters)"
                required
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                aria-label="Toggle password visibility"
                tabIndex={!isRegisterMode ? -1 : 0}
                className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2 transition-colors cursor-pointer"
              >
                {showRegisterPassword ? (
                  <svg
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* 5. Confirm Password */}
            <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
              <svg
                className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="off"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                required
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
                tabIndex={!isRegisterMode ? -1 : 0}
                className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Primary Submit Button */}
            <div className="pt-1 flex justify-center w-full">
              <button
                type="submit"
                disabled={isSubmitting}
                tabIndex={!isRegisterMode ? -1 : 0}
                className="w-[280px] h-[40px] min-h-[40px] bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-semibold text-[15px] flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{accountType === 'host' ? 'Host a Stay' : 'Create Account'}</span>
                    <svg className="w-4 h-4 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Divider with Text Pill */}
        {!isOtpMode && GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <span className="relative bg-white px-3 py-0.5 rounded-full border border-slate-100 text-[10px] font-medium text-slate-400 shadow-sm">
                Or continue with
              </span>
            </div>

            {/* Google OAuth Action for Register */}
            <div className="flex justify-center w-full">
              <ErrorBoundary fallback={null}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  width="280"
                  text="signup_with"
                  shape="pill"
                />
              </ErrorBoundary>
            </div>
          </>
        )}

        {/* Footnote: Switch between Guest and Host */}
        <footer className="mt-4 text-center">
          <p className="text-[13.5px] sm:text-sm text-slate-500 font-medium">
            {accountType === 'host' ? (
              <>
                Looking to explore stays?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('user');
                    setErrorMessage('');
                  }}
                  tabIndex={!isRegisterMode ? -1 : 0}
                  className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
                >
                  Switch to Guest
                </button>
              </>
            ) : (
              <>
                Are you a property owner?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('host');
                    setErrorMessage('');
                  }}
                  tabIndex={!isRegisterMode ? -1 : 0}
                  className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
                >
                  Switch to Host
                </button>
              </>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
