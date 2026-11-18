import { GoogleLogin } from '@react-oauth/google';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { OtpVerificationForm } from './OtpVerificationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function LoginFormTab({
  isRegisterMode,
  isOtpMode,
  otpPurpose,
  isForgotMode,
  setIsForgotMode,
  accountType,
  setAccountType,
  promptMessage,
  errorMessage,
  setErrorMessage,
  successMessage,
  setSuccessMessage,
  forgotEmail,
  setForgotEmail,
  formData,
  handleInputChange,
  showLoginPassword,
  setShowLoginPassword,
  rememberDevice,
  setRememberDevice,
  isSubmitting,
  handleSubmit,
  handleForgotPasswordSubmit,
  handleGoogleSuccess,
  handleGoogleError,
  GOOGLE_CLIENT_ID,
  loginEmailRef,
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
      className={`w-1/2 px-1 ${isRegisterMode ? 'pointer-events-none' : ''}`}
      aria-hidden={isRegisterMode}
    >
      <div className="rounded-[30px] sm:rounded-[32px] p-5 sm:p-7 relative border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
        {/* Header */}
        <header className="text-center pt-2 pb-4">
          <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
            {isOtpMode
              ? 'Security Code'
              : isForgotMode
              ? 'Reset Password'
              : accountType === 'host'
              ? 'Host Login'
              : 'Login'}
          </h1>
        </header>

        {/* Prompt Notification Banner */}
        {promptMessage && (
          <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-medium text-center">
            {promptMessage}
          </div>
        )}

        {/* Error Banner */}
        {!isRegisterMode && errorMessage && (
          <div className="mb-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {/* Success Banner */}
        {!isRegisterMode && successMessage && (
          <div className="mb-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1 Body: OTP Form or Forgot Password or Standard Login */}
        {isOtpMode && otpPurpose === 'login' ? (
          <OtpVerificationForm
            email={otpEmail}
            purpose="login"
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
        ) : isForgotMode ? (
          <ForgotPasswordForm
            forgotEmail={forgotEmail}
            setForgotEmail={setForgotEmail}
            onSubmit={handleForgotPasswordSubmit}
            onBack={() => {
              setIsForgotMode(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            isSubmitting={isSubmitting}
          />
        ) : (
          <form onSubmit={(e) => handleSubmit(e, false)} noValidate className="space-y-3">
            {/* Email Input Field */}
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
                ref={loginEmailRef}
                type="email"
                autoComplete="username email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email address"
                required
                tabIndex={isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* Password Input Field */}
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
                type={showLoginPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Password (min. 8 characters)"
                required
                tabIndex={isRegisterMode ? -1 : 0}
                className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                aria-label="Toggle password visibility"
                tabIndex={isRegisterMode ? -1 : 0}
                className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2 transition-colors cursor-pointer"
              >
                {showLoginPassword ? (
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

            {/* Secondary Controls: Remember device & Forgot password */}
            <div className="flex items-center justify-between pt-1 pb-1 text-[13.5px] sm:text-sm font-medium">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-600 hover:text-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  tabIndex={isRegisterMode ? -1 : 0}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-[#059669] focus:ring-0 cursor-pointer accent-[#059669]"
                />
                <span>Remember device</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true);
                  setForgotEmail(formData.email || '');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                tabIndex={isRegisterMode ? -1 : 0}
                className="text-[#047857] hover:text-emerald-700 font-semibold transition-colors cursor-pointer text-[13.5px] sm:text-sm"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-1 flex justify-center w-full">
              <button
                type="submit"
                disabled={isSubmitting}
                tabIndex={isRegisterMode ? -1 : 0}
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
                    <span>{accountType === 'host' ? 'Host Sign In' : 'Sign In'}</span>
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

            {/* Google OAuth Action for Login */}
            <div className="flex justify-center w-full">
              <ErrorBoundary fallback={null}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  width="280"
                  text="signin_with"
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
                  tabIndex={isRegisterMode ? -1 : 0}
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
                  tabIndex={isRegisterMode ? -1 : 0}
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
