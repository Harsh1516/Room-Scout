export function ForgotPasswordForm({
  forgotEmail,
  setForgotEmail,
  onSubmit,
  onBack,
  isSubmitting,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
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
          required
          autoComplete="email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          placeholder="Enter registered email"
          className="w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
      </div>

      <div className="pt-1 flex justify-center w-full">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-[280px] h-[40px] min-h-[40px] bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-semibold text-[15px] flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Sending...' : 'Send Recovery Password'}</span>
          <svg className="w-4 h-4 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#047857] hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
        >
          ← Back to Login
        </button>
      </div>
    </form>
  );
}
