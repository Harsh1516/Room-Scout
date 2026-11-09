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
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const firstInputRef = useRef(null);

  // Sync initial configuration & Auto-focus first field
  useEffect(() => {
    if (isOpen) {
      setAccountType(initialRole || 'user');
      setErrorMessage('');
      setSuccessMessage('');
      setIsForgotMode(false);
      setIsRegisterMode(false);
      setFieldErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 80);
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

  const validateForm = () => {
    const schema = isRegisterMode ? registerSchema : loginSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const errorMsg = firstIssue?.message || 'Please fill in all required fields.';
      toast.error(errorMsg);
      return false;
    }

    setFieldErrors({});
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const isValid = validateForm();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
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
        setFieldErrors({});
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
      setFieldErrors({});
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
      setFieldErrors({});
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
    setFieldErrors({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Complete Solid Black Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Main Mobile / Modal Container (Matches Luxury Hospitality Design) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-[420px] max-h-[92vh] overflow-y-auto no-scrollbar rounded-[36px] sm:rounded-[44px] flex flex-col justify-between shadow-2xl bg-black border border-white/10 z-10 my-auto text-slate-800 antialiased select-none"
            data-purpose="mobile-viewport"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Atmospheric Pure Black Background ── */}
            <div className="absolute inset-0 bg-black pointer-events-none" data-purpose="ambient-lighting" />

            {/* ── Top Bar: Segmented Switcher (Login / Register) ── */}
            <header className="relative z-20 pt-7 sm:pt-8 px-6 flex flex-col items-center gap-3 pb-0 shrink-0">
              {!isForgotMode ? (
                <nav
                  aria-label="Portal Mode Selection"
                  className="p-1 rounded-full flex items-center shadow-xl bg-white border border-slate-200/90"
                >
                  {/* Login Pill */}
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`relative py-1.5 px-6 rounded-full text-xs transition-all duration-200 cursor-pointer z-10 select-none ${
                      !isRegisterMode
                        ? 'text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {!isRegisterMode && (
                      <motion.div
                        layoutId="portalModeActivePill"
                        className="absolute inset-0 rounded-full bg-slate-900 shadow-sm -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span>Login</span>
                  </button>

                  {/* Register Pill */}
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className={`relative py-1.5 px-6 rounded-full text-xs transition-all duration-200 cursor-pointer z-10 select-none ${
                      isRegisterMode
                        ? 'text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {isRegisterMode && (
                      <motion.div
                        layoutId="portalModeActivePill"
                        className="absolute inset-0 rounded-full bg-slate-900 shadow-sm -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span>Register</span>
                  </button>
                </nav>
              ) : (
                <div className="py-1.5 px-6 rounded-full text-xs font-semibold bg-white text-slate-900 shadow-md border border-slate-200">
                  Password Recovery
                </div>
              )}
            </header>

            {/* ── Floating White Card / Tab ── */}
            <section aria-labelledby="modal-heading" className="relative z-20 px-3.5 sm:px-4 py-4 w-full">
              <div className="rounded-[30px] sm:rounded-[32px] p-5 sm:p-7 relative border border-slate-100 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
                {/* Dismiss / Close Button */}
                <button
                  aria-label="Dismiss login modal"
                  onClick={onClose}
                  type="button"
                  className="absolute top-4 right-4 sm:top-5 sm:right-5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer z-20"
                >
                  <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>

                {/* Card Header: Title & Subtitle */}
                <header className="text-center pt-1 pb-4">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900" id="modal-heading">
                    {isForgotMode
                      ? 'Reset Password'
                      : isRegisterMode
                      ? accountType === 'host'
                        ? 'Host Registration'
                        : 'Create Account'
                      : accountType === 'host'
                      ? 'Host Login'
                      : 'Login'}
                  </h1>
                  <p className="text-[12.5px] text-slate-500 font-normal mt-1 leading-snug">
                    {isForgotMode
                      ? 'Enter your registered email to receive recovery instructions'
                      : isRegisterMode
                      ? accountType === 'host'
                        ? 'List your rooms directly without broker commissions'
                        : 'Explore verified rooms near your campus or office'
                      : accountType === 'host'
                      ? 'Access your listings, room rates, and bookings'
                      : 'Direct stays with zero brokerage'}
                  </p>
                </header>

                {/* Prompt Notification Banner */}
                {promptMessage && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-medium text-center">
                    {promptMessage}
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold text-center">
                    {errorMessage}
                  </div>
                )}

                {/* Success Banner */}
                {successMessage && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                    <span>✓</span>
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Form Elements */}
                {isForgotMode ? (
                  /* Forgot Password Form */
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                    <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
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
                        className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                      />
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white py-3 px-5 font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/25 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"
                      >
                        <span>{isSubmitting ? 'Sending...' : 'Send Recovery Password'}</span>
                        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <form onSubmit={handleSubmit} noValidate className="space-y-3">
                    {/* 1. Full Name (Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-name"
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ height: { duration: 0.22 }, opacity: { duration: 0.16 } }}
                        >
                          <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
                            <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                              ref={firstInputRef}
                              type="text"
                              autoComplete="name"
                              value={formData.name}
                              onChange={(e) => handleNameChange(e.target.value)}
                              placeholder="Full name"
                              className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 2. Email Input Field (Always visible) */}
                    <div data-purpose="field-email">
                      <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                          ref={!isRegisterMode ? firstInputRef : null}
                          type="email"
                          autoComplete="username email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="Email address"
                          required
                          className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* 3. Mobile Number (Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-phone"
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ height: { duration: 0.22 }, opacity: { duration: 0.16 } }}
                        >
                          <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
                            <span className="text-xs font-bold text-slate-600 select-none shrink-0 mr-1.5">+91</span>
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
                              className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 4. Password Input Field with Toggle */}
                    <div data-purpose="field-password">
                      <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
                        <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Password (min. 8 characters)"
                          required
                          className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                          className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2 transition-colors cursor-pointer"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 5. Confirm Password (Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-confirm-password"
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ height: { duration: 0.22 }, opacity: { duration: 0.16 } }}
                        >
                          <div className="flex items-center bg-slate-50/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15">
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
                              className="w-full bg-transparent p-0 border-0 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label="Toggle confirm password visibility"
                              className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2 transition-colors cursor-pointer"
                            >
                              {showConfirmPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Secondary Controls: Remember device & Forgot password (Login Mode Only) */}
                    <AnimatePresence initial={false}>
                      {!isRegisterMode && (
                        <motion.div
                          key="login-secondary-controls"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ height: { duration: 0.2 }, opacity: { duration: 0.14 } }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between pt-0.5 pb-1 text-xs">
                            <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-600 font-medium">
                              <input
                                type="checkbox"
                                checked={rememberDevice}
                                onChange={(e) => setRememberDevice(e.target.checked)}
                                className="w-4 h-4 rounded-full border-slate-300 text-[#059669] focus:ring-0 cursor-pointer accent-[#059669]"
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
                              className="text-[#047857] hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Primary Submit Button */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white py-3 px-5 font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/25 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"
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
                              {isRegisterMode
                                ? accountType === 'host'
                                  ? 'Host a Stay'
                                  : 'Create Account'
                                : accountType === 'host'
                                ? 'Login to Host Portal'
                                : 'Login'}
                            </span>
                            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <span className="relative bg-white px-3 py-0.5 rounded-full border border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400 shadow-sm">
                        Or continue with
                      </span>
                    </div>

                    {/* Google OAuth Action */}
                    <div className="flex justify-center w-full">
                      <div className="w-full flex justify-center">
                        <ErrorBoundary fallback={null}>
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="outline"
                            size="large"
                            width="280"
                            text={isRegisterMode ? 'signup_with' : 'signin_with'}
                            shape="pill"
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                  </>
                )}

                {/* Footnote: Switch between Guest and Host */}
                <footer className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    {accountType === 'host' ? (
                      <>
                        Looking to explore stays?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAccountType('user');
                            setErrorMessage('');
                            setFieldErrors({});
                          }}
                          className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors cursor-pointer"
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
                            setFieldErrors({});
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                        >
                          Switch to Host
                        </button>
                      </>
                    )}
                  </p>
                </footer>
              </div>
            </section>

            {/* Mobile Home Indicator Bar */}
            <div className="relative z-20 pb-2.5 flex justify-center shrink-0">
              <div className="w-28 h-1 bg-white/20 rounded-full" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;
