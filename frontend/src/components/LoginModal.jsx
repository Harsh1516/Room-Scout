import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';

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

export function LoginModal({ isOpen, onClose, initialRole = 'user' }) {
  const { login, register } = useAuth();

  const [accountType, setAccountType] = useState(initialRole);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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
      setTimeout(() => firstInputRef.current?.focus(), 60);
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

  const validateSingleField = (field, value) => {
    const dataToValidate = { ...formData, [field]: value };
    const schema = isRegisterMode ? registerSchema : loginSchema;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const issue = result.error.issues.find((err) => err.path[0] === field);
      if (issue) {
        setFieldErrors((prev) => ({ ...prev, [field]: issue.message }));
        return;
      }
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const schema = isRegisterMode ? registerSchema : loginSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0]] = issue.message;
        }
      });
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleNameChange = (val) => {
    const lettersOnly = val.replace(/[^a-zA-Z\s]/g, '');
    handleInputChange('name', lettersOnly);
  };

  // Dynamic Theme-Aware Input Border Styling (Indigo for Guest, Emerald for Host, Rose for Error)
  const getFieldBorderClass = (field) => {
    if (fieldErrors[field]) {
      return 'border-rose-400 dark:border-rose-500 ring-2 ring-rose-500/15 focus-within:border-rose-500 focus-within:ring-rose-500/25';
    }
    return accountType === 'host'
      ? 'border-slate-200/90 dark:border-zinc-700/80 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20'
      : 'border-slate-200/90 dark:border-zinc-700/80 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20';
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
        const msg = res.message || 'Invalid email or password.';
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
      const msg = err.message || 'Invalid Credentials';
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your email address.');
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto pt-20 sm:pt-24 pb-8">
          {/* Backdrop Glassmorphic Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Top Console: Fixed at the VERY TOP of Website, Horizontally Centered, Completely Rounded ── */}
          {!isForgotMode && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[10001] bg-white dark:bg-white backdrop-blur-2xl p-1 sm:p-1.5 rounded-full border border-slate-200/90 dark:border-white shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(255,255,255,0.25)] flex items-center select-none ring-1 ring-black/[0.05] dark:ring-black/10"
              role="tablist"
            >
              {/* Subtle ambient aura behind capsule */}
              <div
                className={`absolute -inset-1 rounded-full blur-md opacity-35 pointer-events-none transition-colors duration-500 ${
                  accountType === 'host' ? 'bg-emerald-400/30' : 'bg-indigo-400/30'
                }`}
              />

              {/* Login Option */}
              <button
                type="button"
                role="tab"
                aria-selected={!isRegisterMode}
                onClick={() => switchMode(false)}
                className={`relative px-5 sm:px-6 py-2 rounded-full text-xs sm:text-[13px] font-semibold transition-colors duration-200 z-10 cursor-pointer text-center select-none ${
                  !isRegisterMode
                    ? 'text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-600 dark:hover:text-slate-900'
                }`}
              >
                {!isRegisterMode && (
                  <motion.div
                    layoutId="auth-liquid-pill-very-top"
                    className="absolute inset-0 rounded-full bg-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.22)] overflow-hidden"
                    transition={{
                      type: 'spring',
                      stiffness: 480,
                      damping: 32,
                      mass: 0.6,
                    }}
                  >
                    {/* Liquid Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-full" />
                    {/* Expanding droplet pulse */}
                    <motion.span
                      key="splash-top-login"
                      initial={{ scale: 0.2, opacity: 0.8 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white/20 pointer-events-none"
                    />
                  </motion.div>
                )}
                <span className="relative z-10">Login</span>
              </button>

              {/* Register Option */}
              <button
                type="button"
                role="tab"
                aria-selected={isRegisterMode}
                onClick={() => switchMode(true)}
                className={`relative px-5 sm:px-6 py-2 rounded-full text-xs sm:text-[13px] font-semibold transition-colors duration-200 z-10 cursor-pointer text-center select-none ${
                  isRegisterMode
                    ? 'text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-600 dark:hover:text-slate-900'
                }`}
              >
                {isRegisterMode && (
                  <motion.div
                    layoutId="auth-liquid-pill-very-top"
                    className="absolute inset-0 rounded-full bg-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.22)] overflow-hidden"
                    transition={{
                      type: 'spring',
                      stiffness: 480,
                      damping: 32,
                      mass: 0.6,
                    }}
                  >
                    {/* Liquid Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-full" />
                    {/* Expanding droplet pulse */}
                    <motion.span
                      key="splash-top-register"
                      initial={{ scale: 0.2, opacity: 0.8 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white/20 pointer-events-none"
                    />
                  </motion.div>
                )}
                <span className="relative z-10">Register</span>
              </button>
            </motion.div>
          )}

          {/* ── Main Modal Card: Centered on screen, fluidly expands/contracts only according to input field area ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{
              opacity: { duration: 0.18 },
              scale: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            }}
            className="relative z-10 w-full max-w-[370px] sm:max-w-[390px] bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl shadow-emerald-950/[0.08] dark:shadow-black/70 overflow-hidden text-slate-900 dark:text-white my-auto ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
            data-purpose="login-modal"
          >
            {/* Ambient Corner Glow */}
            <div
              className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${
                accountType === 'host'
                  ? 'bg-emerald-300/30 dark:bg-emerald-500/10'
                  : 'bg-indigo-300/30 dark:bg-indigo-500/10'
              }`}
            />

            {/* Close Button (Top Right of Card) */}
            <button
              aria-label="Close modal"
              onClick={onClose}
              type="button"
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-slate-200/60 dark:border-zinc-700/60 transition-all z-20 cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Modal Body */}
            <div className="px-5 py-5 sm:px-6 sm:py-5 relative z-10">
              {/* Header Title & Tagline */}
              <div className="text-center mb-3 pt-0.5">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {isForgotMode
                    ? 'Reset Password'
                    : isRegisterMode
                    ? accountType === 'host'
                      ? 'Host Registration'
                      : 'Create Account'
                    : accountType === 'host'
                    ? 'Host Login'
                    : 'Login'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  {isForgotMode
                    ? 'Enter your email to receive recovery instructions'
                    : isRegisterMode
                    ? accountType === 'host'
                      ? 'List your rooms directly without broker commissions'
                      : 'Explore verified rooms near your campus or office'
                    : accountType === 'host'
                    ? 'Access your listings, room rates, and bookings'
                    : 'Direct stays with zero brokerage'}
                </p>
              </div>

              {/* Success Notification Alert */}
              {successMessage && (
                <div className="mb-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
                  <span>✓</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Error Notification Alert */}
              {errorMessage && (
                <div className="mb-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold text-center flex items-center justify-center gap-1 flex-wrap">
                  <span>{errorMessage}</span>
                  {errorMessage.toLowerCase().includes('register first') && (
                    <button
                      type="button"
                      onClick={() => switchMode(true)}
                      className="underline hover:text-rose-700 dark:hover:text-rose-300 font-bold ml-1 cursor-pointer"
                    >
                      (Click to Register)
                    </button>
                  )}
                </div>
              )}

              {isForgotMode ? (
                /* Forgot Password Form */
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-2.5">
                  <div className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('forgotEmail')}`}>
                    <div className="pl-3 text-slate-500 dark:text-zinc-400">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter registered email"
                      className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-[38px] sm:h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs sm:text-[13px] font-semibold text-white shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Recovery Password'}
                  </button>

                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-2">
                  <div className="space-y-2">
                    {/* 1. Full Name (Animated Expand/Collapse for Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-name"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                            opacity: { duration: 0.16, ease: 'easeOut' },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="pb-0.5">
                            <div
                              className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('name')}`}
                            >
                              <div className="pl-3 text-slate-500 dark:text-zinc-400">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                              <input
                                ref={firstInputRef}
                                type="text"
                                autoComplete="name"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                onBlur={() => validateSingleField('name', formData.name)}
                                placeholder="Full name"
                                className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                              />
                            </div>
                            {fieldErrors.name && (
                              <p className="mt-0.5 text-[11px] text-rose-500 font-medium pl-1 leading-none">{fieldErrors.name}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 2. Email Address (Always visible) */}
                    <div>
                      <div
                        className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('email')}`}
                      >
                        <div className="pl-3 text-slate-500 dark:text-zinc-400">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        <input
                          ref={!isRegisterMode ? firstInputRef : null}
                          type="email"
                          autoComplete="username email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          onBlur={() => validateSingleField('email', formData.email)}
                          placeholder="Email address"
                          className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="mt-0.5 text-[11px] text-rose-500 font-medium pl-1 leading-none">{fieldErrors.email}</p>
                      )}
                    </div>

                    {/* 3. Contact Phone (Animated Expand/Collapse for Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-phone"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                            opacity: { duration: 0.16, ease: 'easeOut' },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="pb-0.5">
                            <div
                              className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('phone')}`}
                            >
                              <span className="pl-3 pr-2 text-xs font-bold text-slate-600 dark:text-zinc-300 select-none shrink-0">
                                +91
                              </span>
                              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-600 mr-2 shrink-0" />
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
                                onBlur={() => validateSingleField('phone', formData.phone)}
                                placeholder="Mobile number"
                                className="w-full bg-transparent pr-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                              />
                            </div>
                            {fieldErrors.phone && (
                              <p className="mt-0.5 text-[11px] text-rose-500 font-medium pl-1 leading-none">{fieldErrors.phone}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 4. Password Field (Always visible) */}
                    <div>
                      <div
                        className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('password')}`}
                      >
                        <div className="pl-3 text-slate-500 dark:text-zinc-400">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          onBlur={() => validateSingleField('password', formData.password)}
                          placeholder="Password (min. 8 characters)"
                          className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="pr-2.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {showPassword ? (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                              />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-0.5 text-[11px] text-rose-500 font-medium pl-1 leading-none">{fieldErrors.password}</p>
                      )}
                    </div>

                    {/* 5. Confirm Password (Animated Expand/Collapse for Register Mode Only) */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          key="field-confirm-password"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                            opacity: { duration: 0.16, ease: 'easeOut' },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="pb-0.5">
                            <div
                              className={`h-[38px] sm:h-[40px] login-input-container relative flex items-center rounded-xl border bg-slate-100/90 hover:bg-slate-100 dark:bg-zinc-800/80 focus-within:bg-white dark:focus-within:bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all ${getFieldBorderClass('confirmPassword')}`}
                            >
                              <div className="pl-3 text-slate-500 dark:text-zinc-400">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="off"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                onBlur={() => validateSingleField('confirmPassword', formData.confirmPassword)}
                                placeholder="Confirm password"
                                className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                className="pr-2.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                {showConfirmPassword ? (
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                                    />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                              <p className="mt-0.5 text-[11px] text-rose-500 font-medium pl-1 leading-none">{fieldErrors.confirmPassword}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 6. Helper Row: Remember Me & Forgot Password (Login Mode Only) */}
                    <AnimatePresence initial={false}>
                      {!isRegisterMode && (
                        <motion.div
                          key="login-helper-row"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                            opacity: { duration: 0.14, ease: 'easeOut' },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between pt-0.5 pb-0.5">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rememberDevice}
                                onChange={(e) => setRememberDevice(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-black dark:accent-emerald-500"
                              />
                              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">Remember device</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotMode(true);
                                setForgotEmail(formData.email || '');
                                setErrorMessage('');
                                setSuccessMessage('');
                              }}
                              className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-1.5">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full h-[38px] sm:h-[40px] group inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-xs sm:text-[13px] text-white shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                        accountType === 'host'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35'
                          : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <motion.span
                            key={isRegisterMode ? 'btn-label-reg' : 'btn-label-login'}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.15 }}
                          >
                            {isRegisterMode
                              ? accountType === 'host'
                                ? 'Host a Stay'
                                : 'Create Account'
                              : accountType === 'host'
                              ? 'Login to Host Portal'
                              : 'Login'}
                          </motion.span>
                          <svg
                            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Switch Role Link */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const nextRole = accountType === 'host' ? 'user' : 'host';
                    setAccountType(nextRole);
                    setErrorMessage('');
                    setFieldErrors({});
                  }}
                  className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {accountType === 'host' ? (
                    <>
                      Looking to explore stays?{' '}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Switch to Guest
                      </span>
                    </>
                  ) : (
                    <>
                      Are you a property owner?{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                        Switch to Host
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;