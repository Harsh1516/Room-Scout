import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';

// Zod Validation Schemas
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address (e.g. name@example.com)'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
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
      .email('Please enter a valid email address (e.g. name@example.com)'),
    phone: z
      .string({ required_error: 'Contact phone number is required' })
      .trim()
      .min(1, 'Contact phone number is required')
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
      .min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export function LoginModal({ isOpen, onClose, initialRole = 'user', promptMessage = '' }) {
  const { login, register } = useAuth();

  // Role Type: 'user' (Student / Guest) | 'host' (Property Owner)
  const [accountType, setAccountType] = useState(initialRole);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

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

  const [currentPrompt, setCurrentPrompt] = useState(promptMessage);

  // Sync initialRole and promptMessage when modal opens
  useEffect(() => {
    if (isOpen) {
      setAccountType(initialRole || 'user');
      setCurrentPrompt(promptMessage || '');
      setErrorMessage('');
      setSuccessMessage('');
      setIsForgotMode(false);
    }
  }, [isOpen, initialRole, promptMessage]);

  const handleRoleChange = (newRole) => {
    setAccountType(newRole);
    setErrorMessage('');
    setSuccessMessage('');
    // Reset initial prompt when user explicitly switches between Guest and Property Host
    setCurrentPrompt('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const isValid = validateForm();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        // Register account in backend with explicit separation role (user vs host)
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

        // Registration successful
        const successMsg = `${accountType === 'host' ? 'Host' : 'Guest'} account created successfully! Please login with your password.`;
        setSuccessMessage(successMsg);
        toast.success(successMsg);
        setIsRegisterMode(false);
        setFormData((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
        }));
        setFieldErrors({});
        setIsSubmitting(false);
        return;
      }

      // Login Mode with strict role verification
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

      // Reset form and close modal
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

  // Handle Forgot Password Reset via Email
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -24, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[540px] p-6 sm:p-7 rounded-[2rem] bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.8)] text-slate-900 dark:text-white relative z-10 my-auto"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold cursor-pointer p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              ✕
            </button>

            {/* Apple iOS Liquid Glass Role Switch (Guest vs Property Host) */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative grid grid-cols-2 p-1 rounded-full bg-slate-200/50 dark:bg-white/[0.08] backdrop-blur-2xl border border-white/80 dark:border-white/12 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.4)] w-full max-w-[280px] select-none">
                {/* Active Sliding Liquid Glass Pill */}
                <motion.div
                  className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-black/[0.04] dark:border-white/20 z-0 pointer-events-none"
                  animate={{ x: accountType === 'host' ? '100%' : '0%' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />

                <button
                  type="button"
                  onClick={() => handleRoleChange('user')}
                  className={`relative z-10 py-1.5 px-3 rounded-full text-xs tracking-tight transition-colors duration-200 cursor-pointer text-center select-none ${
                    accountType === 'user'
                      ? 'text-slate-950 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-neutral-400 font-medium hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  Guest
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('host')}
                  className={`relative z-10 py-1.5 px-3 rounded-full text-xs tracking-tight transition-colors duration-200 cursor-pointer text-center select-none ${
                    accountType === 'host'
                      ? 'text-slate-950 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-neutral-400 font-medium hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  Property Host
                </button>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isForgotMode
                  ? 'Reset Password'
                  : isRegisterMode
                  ? accountType === 'host'
                    ? 'Register Host Account'
                    : 'Register Guest Account'
                  : accountType === 'host'
                  ? 'Property Owner Login'
                  : 'Student / Guest Login'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isForgotMode
                  ? 'Enter your email to receive a fresh login password.'
                  : currentPrompt ||
                    (accountType === 'host'
                      ? (isRegisterMode
                          ? 'Host Registration: Create your host account to start listing your properties.'
                          : 'Host Authentication: Please login with your unique Host account or register as a Host.')
                      : (isRegisterMode
                          ? 'Guest Registration: Create your guest account to explore and book verified stays.'
                          : 'Guest Authentication: Please login with your unique Guest account or register as a Guest.'))}
              </p>
            </div>

            {/* Success Message Alert */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 flex-wrap">
                <span>{errorMessage}</span>
                {errorMessage.toLowerCase().includes('register first') && (
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className="underline hover:text-rose-700 dark:hover:text-rose-300 font-bold ml-1 cursor-pointer"
                  >
                    (Click here to Register)
                  </button>
                )}
              </div>
            )}

            {/* If in Forgot Password Mode */}
            {isForgotMode ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none">
                    Registered Email *
                  </label>
                  <div className="min-w-0">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isSubmitting ? 'Sending Password...' : 'Send Password to Email'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition-colors cursor-pointer"
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Mode Switch Tabs with Smooth Apple iOS Sliding Pill */}
                <div className="relative grid grid-cols-2 p-1 mb-5 rounded-full bg-slate-200/50 dark:bg-white/[0.08] backdrop-blur-2xl border border-white/80 dark:border-white/12 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.4)] select-none overflow-hidden">
                  <motion.div
                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-black/[0.04] dark:border-white/20 z-0 pointer-events-none"
                    animate={{ x: isRegisterMode ? '100%' : '0%' }}
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />

                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`relative z-10 py-1.5 rounded-full transition-colors duration-200 cursor-pointer text-center select-none text-xs ${
                      !isRegisterMode
                        ? 'text-slate-950 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-neutral-400 font-medium hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className={`relative z-10 py-1.5 rounded-full transition-colors duration-200 cursor-pointer text-center select-none text-xs ${
                      isRegisterMode
                        ? 'text-slate-950 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-neutral-400 font-medium hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  {/* Full Name field (Register only) */}
                  {isRegisterMode && (
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none leading-snug">
                        {accountType === 'host' ? 'Host Full Name *' : 'Full Name *'}
                      </label>
                      <div className="min-w-0">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder={accountType === 'host' ? 'e.g. Vikram Sharma' : 'e.g. Harsh Kumar'}
                          className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                            fieldErrors.name
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email Address field */}
                  <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none leading-snug">
                      Email Address *
                    </label>
                    <div className="min-w-0">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder={accountType === 'host' ? 'host@example.com' : 'user@example.com'}
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                          fieldErrors.email
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                        }`}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Phone (Required on register) */}
                  {isRegisterMode && (
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none leading-snug">
                        Contact Phone *
                      </label>
                      <div className="min-w-0">
                        <div
                          className={`flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm transition-colors overflow-hidden focus-within:border-emerald-500 ${
                            fieldErrors.phone
                              ? 'border-rose-500 focus-within:border-rose-500'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-600 dark:text-zinc-300 select-none bg-slate-200/60 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 shrink-0 flex items-center">
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={10}
                            value={formData.phone}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              const digits = raw.length > 10 && raw.startsWith('91') ? raw.slice(-10) : raw.slice(0, 10);
                              handleInputChange('phone', digits);
                            }}
                            placeholder="10-digit number"
                            className="w-full px-3 py-2.5 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                        {fieldErrors.phone && (
                          <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.phone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Password field */}
                  <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none leading-snug">
                      Password *
                    </label>
                    <div className="min-w-0">
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Enter password (min. 6 characters)"
                          className={`w-full px-3.5 py-2.5 pr-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                            fieldErrors.password
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {fieldErrors.password ? (
                          <p className="text-xs text-rose-500 font-medium">{fieldErrors.password}</p>
                        ) : <span />}
                        {!isRegisterMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotMode(true);
                              setForgotEmail(formData.email || '');
                              setErrorMessage('');
                              setSuccessMessage('');
                            }}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-auto"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password field (Register only) */}
                  {isRegisterMode && (
                    <div className="grid grid-cols-[115px_1fr] sm:grid-cols-[145px_1fr] items-center gap-2.5 sm:gap-3.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left sm:text-right select-none leading-snug">
                        Confirm Password *
                      </label>
                      <div className="min-w-0">
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            placeholder="Re-enter password"
                            className={`w-full px-3.5 py-2.5 pr-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                              fieldErrors.confirmPassword
                                ? 'border-rose-500 focus:border-rose-500'
                                : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <p className="mt-1 text-xs text-rose-500 font-medium">
                            {fieldErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98 ${
                        accountType === 'host'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                          : 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-slate-900/20'
                      }`}
                    >
                      {isSubmitting
                        ? 'Processing...'
                        : isRegisterMode
                        ? accountType === 'host'
                          ? 'Create Host Account'
                          : 'Create Guest Account'
                        : accountType === 'host'
                        ? 'Sign In to Host Portal'
                        : 'Sign In to Guest Account'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;