import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { GoogleLogin } from '@react-oauth/google';
import { ErrorBoundary } from './common/ErrorBoundary';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '206140766993-caova3o2u7mf54osrklq1d31p3ktq9v2.apps.googleusercontent.com';

// Zod Validation Schemas with 8-character password enforcement
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long'),
});

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'Full name must contain letters and spaces only'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    phone: z
      .string({ required_error: 'Mobile number is required' })
      .trim()
      .min(1, 'Mobile number is required')
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, '');
          return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
        },
        {
          message: 'Please enter a valid 10-digit mobile number',
        }
      ),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export function LoginModal({ isOpen, onClose, initialRole = 'user', promptMessage = '' }) {
  const { user, isAuthenticated, login, register, loginWithGoogle } = useAuth();

  const [accountType, setAccountType] = useState(initialRole);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // If already logged in with the requested role, auto-close the modal
  useEffect(() => {
    if (isOpen && isAuthenticated && user?.role === (initialRole || 'user')) {
      onClose();
    }
  }, [isOpen, isAuthenticated, user, initialRole, onClose]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [forgotEmail, setForgotEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginEmailRef = useRef(null);
  const registerNameRef = useRef(null);

  // Sync initial configuration
  useEffect(() => {
    if (isOpen) {
      setAccountType(initialRole || 'user');
      setErrorMessage('');
      setSuccessMessage('');
      setIsForgotMode(false);
      setIsRegisterMode(false);
    }
  }, [isOpen, initialRole]);

  // Escape key handler to close modal cleanly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const validateForm = (isReg = isRegisterMode) => {
    const schema = isReg ? registerSchema : loginSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const errorMsg = firstIssue?.message || 'Please fill in all required fields.';
      toast.error(errorMsg);
      return false;
    }

    return true;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleNameChange = (val) => {
    const lettersOnly = val.replace(/[^a-zA-Z\s]/g, '');
    handleInputChange('name', lettersOnly);
  };

  const handleSubmit = async (e, isReg = isRegisterMode) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const isValid = validateForm(isReg);
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      if (isReg) {
        const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);
        const formattedPhone = cleanDigits ? `+91 ${cleanDigits}` : '';
        const res = await register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formattedPhone,
          password: formData.password,
          role: accountType,
        });
        if (!res.success) {
          const msg = res.message || 'Registration failed.';
          setErrorMessage(msg);
          toast.error(msg);
          setIsSubmitting(false);
          return;
        }
        toast.success(`Welcome to RoomScout, ${formData.name.trim()}!`);
        setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
        setIsSubmitting(false);
        onClose();
        return;
      }

      const res = await login({
        email: formData.email.trim(),
        password: formData.password,
        requiredRole: accountType,
      });
      if (!res.success) {
        let msg = res.message || 'Invalid email or password.';
        if (
          msg.toLowerCase().includes('account not found') ||
          msg.toLowerCase().includes('register first') ||
          msg.toLowerCase().includes('not registered')
        ) {
          msg = 'Account not Found. Register First.';
        }
        setErrorMessage(msg);
        toast.error(msg);
        setIsSubmitting(false);
        return;
      }

      toast.success(`Welcome back, ${res.data?.name || 'User'}!`);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setSuccessMessage('');
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      let msg = err.message || 'Invalid Credentials';
      if (
        msg.toLowerCase().includes('account not found') ||
        msg.toLowerCase().includes('register first') ||
        msg.toLowerCase().includes('not registered')
      ) {
        msg = 'Account not Found. Register First.';
      } else if (msg === 'Failed to fetch' || msg.includes('Failed to fetch')) {
        msg = 'Server connection error. Please ensure the backend is running.';
      }
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google Sign-In failed: No credential received.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await loginWithGoogle({
        credential: credentialResponse.credential,
        role: accountType,
      });

      if (!res.success) {
        let msg = res.message || 'Google sign-in failed.';
        if (
          msg.toLowerCase().includes('account not found') ||
          msg.toLowerCase().includes('register first') ||
          msg.toLowerCase().includes('not registered')
        ) {
          msg = 'Account not Found. Register First.';
        }
        setErrorMessage(msg);
        toast.error(msg);
        setIsSubmitting(false);
        return;
      }

      toast.success(`Welcome${res.data?.name ? `, ${res.data.name}` : ''}!`);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      const msg = err.message || 'Google sign-in error';
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google Sign-In was cancelled or failed.');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authAPI.forgotPassword({
        email: forgotEmail.trim(),
        role: accountType,
      });

      const successMsg = res.message || `A temporary password has been sent to ${forgotEmail}.`;
      setSuccessMessage(successMsg);
      toast.success(successMsg);
      setIsSubmitting(false);
      setFormData((prev) => ({ ...prev, email: forgotEmail.trim() }));
      setTimeout(() => {
        setIsForgotMode(false);
      }, 2500);
    } catch (err) {
      const msg = err.message || 'Failed to send reset password.';
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const switchMode = (toRegister) => {
    setIsForgotMode(false);
    if (toRegister === isRegisterMode) return;
    setIsRegisterMode(toRegister);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start p-3 sm:p-4 overflow-y-auto pt-2.5 sm:pt-5 pb-12">
          {/* Complete Solid Black Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Main Mobile / Modal Container (Anchored at Navbar Search Position) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-[420px] flex flex-col items-center z-10 text-slate-800 antialiased select-none"
            data-purpose="mobile-viewport"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Fixed Position Console: Matches Exact Navbar Search Position ── */}
            <header className="relative z-30 pb-3 sm:pb-3.5 flex flex-col items-center shrink-0">
              {!isForgotMode ? (
                <nav
                  aria-label="Portal Mode Selection"
                  className="p-1.5 sm:p-2 rounded-full flex items-center shadow-2xl bg-white border-2 border-slate-200/90"
                >
                  {/* Login Pill */}
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`relative py-3 px-8 sm:py-3.5 sm:px-10 rounded-full text-base sm:text-lg font-bold tracking-tight transition-all duration-200 cursor-pointer z-10 select-none ${
                      !isRegisterMode
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {!isRegisterMode && (
                      <motion.div
                        layoutId="portalModeActivePill"
                        className="absolute inset-0 rounded-full bg-slate-900 shadow-md z-0 pointer-events-none"
                        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <span className="relative z-10">Login</span>
                  </button>

                  {/* Register Pill */}
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className={`relative py-3 px-8 sm:py-3.5 sm:px-10 rounded-full text-base sm:text-lg font-bold tracking-tight transition-all duration-200 cursor-pointer z-10 select-none ${
                      isRegisterMode
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isRegisterMode && (
                      <motion.div
                        layoutId="portalModeActivePill"
                        className="absolute inset-0 rounded-full bg-slate-900 shadow-md z-0 pointer-events-none"
                        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <span className="relative z-10">Register</span>
                  </button>
                </nav>
              ) : (
                <div className="py-3 px-8 sm:py-3.5 sm:px-10 rounded-full text-base sm:text-lg font-bold bg-white text-[#1f1b16] shadow-xl border-2 border-slate-200">
                  Password Recovery
                </div>
              )}
            </header>

            {/* ── Sliding Track Viewport (Natural full height, no expand/collapse) ── */}
            <div className="relative w-full overflow-hidden py-3 px-1 -my-3 -mx-1">
              {/* ── 2-Panel Horizontal Sliding Track with Liquid Butter Slide ── */}
              <motion.div
                className="flex w-[200%] items-start will-change-transform"
                animate={{ x: isRegisterMode ? '-50%' : '0%' }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* ════════════════════════════════════════════════════════════
                    TAB 1: LOGIN TAB CARD
                    ════════════════════════════════════════════════════════════ */}
                <div
                  className={`w-1/2 px-1 ${
                    isRegisterMode ? 'pointer-events-none' : ''
                  }`}
                  aria-hidden={isRegisterMode}
                >
                  <div className="rounded-[30px] sm:rounded-[32px] p-5 sm:p-7 relative border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
                    {/* Header */}
                    <header className="text-center pt-2 pb-4">
                      <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
                        {isForgotMode
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

                    {/* Forgot Password Mode Form */}
                    {isForgotMode ? (
                      <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                        <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
                          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeLinecap="round" strokeLinejoin="round" />
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
                            onClick={() => {
                              setIsForgotMode(false);
                              setErrorMessage('');
                              setSuccessMessage('');
                            }}
                            className="text-xs text-[#047857] hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                          >
                            ← Back to Login
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Standard Login Form */
                      <form onSubmit={(e) => handleSubmit(e, false)} noValidate className="space-y-3">
                        {/* Email Input Field */}
                        <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
                          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeLinecap="round" strokeLinejoin="round" />
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
                          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
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
                              <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
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
                                <span>
                                  {accountType === 'host' ? 'Login to Host Portal' : 'Login'}
                                </span>
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
                    {!isForgotMode && GOOGLE_CLIENT_ID && (
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

                {/* ════════════════════════════════════════════════════════════
                    TAB 2: REGISTER TAB CARD
                    ════════════════════════════════════════════════════════════ */}
                <div
                  className={`w-1/2 px-1 ${
                    !isRegisterMode ? 'pointer-events-none' : ''
                  }`}
                  aria-hidden={!isRegisterMode}
                >
                  <div className="rounded-[30px] sm:rounded-[32px] p-5 sm:p-7 relative border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
                    {/* Header */}
                    <header className="text-center pt-2 pb-4">
                      <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
                        {accountType === 'host' ? 'Host Registration' : 'Create Account'}
                      </h1>
                    </header>

                    {/* Prompt Notification Banner */}
                    {promptMessage && (
                      <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-medium text-center">
                        {promptMessage}
                      </div>
                    )}

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

                    {/* Standard Register Form */}
                    <form onSubmit={(e) => handleSubmit(e, true)} noValidate className="space-y-3">
                      {/* 1. Full Name */}
                      <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
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
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeLinecap="round" strokeLinejoin="round" />
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
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
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
                            <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* 5. Confirm Password */}
                      <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
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
                            <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
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
                              <span>
                                {accountType === 'host' ? 'Host a Stay' : 'Create Account'}
                              </span>
                              <svg className="w-4 h-4 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Divider with Text Pill */}
                    {GOOGLE_CLIENT_ID && (
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
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;
