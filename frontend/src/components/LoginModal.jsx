import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authAPI, adminAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { LoginFormTab } from './auth/LoginFormTab';
import { RegisterFormTab } from './auth/RegisterFormTab';

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
  const {
    user,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    verifyLoginOtp,
    verifyRegisterOtp,
    resendOtp,
  } = useAuth();

  const navigate = useNavigate();

  const handlePostAuthNavigation = async (authenticatedData, explicitRole) => {
    const effectiveRole = explicitRole || authenticatedData?.role || accountType;
    if (effectiveRole === 'host') {
      const email = authenticatedData?.email || formData.email.trim() || otpEmail.trim();
      let hasProp = Boolean(authenticatedData?.hasProperty);

      if (!hasProp && email) {
        try {
          const check = await adminAPI.getHostByEmail(email);
          if (check?.hasProperty) {
            hasProp = true;
          }
        } catch {
          hasProp = false;
        }
      }

      if (hasProp) {
        navigate('/host/dashboard');
      } else {
        navigate('/host/upload');
      }
    }
  };

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

  // OTP Verification States
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState('login'); // 'login' | 'register'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputRefs = useRef([]);

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
      setIsOtpMode(false);
      setOtpDigits(['', '', '', '', '', '']);
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

  // OTP Countdown timer
  useEffect(() => {
    if (!isOtpMode || otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOtpMode, otpCountdown]);

  // Focus first OTP input when entering OTP mode
  useEffect(() => {
    if (isOtpMode) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOtpMode]);

  const handleOtpDigitChange = (index, value) => {
    const numericChar = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = numericChar;
    setOtpDigits(updated);
    setErrorMessage('');

    if (numericChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = updated.join('');
    if (fullCode.length === 6 && !updated.includes('')) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      updated[i] = pasteData[i];
    }
    setOtpDigits(updated);
    const nextIdx = Math.min(5, pasteData.length);
    otpInputRefs.current[nextIdx]?.focus();

    if (pasteData.length === 6) {
      handleVerifyOtp(pasteData);
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    const fullCode = (codeToVerify || otpDigits.join('')).trim();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMessage('');
    setIsVerifyingOtp(true);

    try {
      if (otpPurpose === 'register') {
        const res = await verifyRegisterOtp({
          email: otpEmail,
          otp: fullCode,
        });
        if (!res.success) {
          setErrorMessage(res.message || 'Verification failed. Please check your code.');
          setIsVerifyingOtp(false);
          return;
        }
        toast.success(`Welcome, ${formData.name.trim() || 'Guest'}!`);
        setIsVerifyingOtp(false);
        setIsOtpMode(false);
        onClose();
        handlePostAuthNavigation(res.data, accountType);
        return;
      }

      const res = await verifyLoginOtp({
        email: otpEmail,
        otp: fullCode,
        requiredRole: accountType,
      });
      if (!res.success) {
        setErrorMessage(res.message || 'Verification failed. Please check your code.');
        setIsVerifyingOtp(false);
        return;
      }
      toast.success(`Welcome, ${res.data?.name || 'User'}!`);
      setIsVerifyingOtp(false);
      setIsOtpMode(false);
      onClose();
      handlePostAuthNavigation(res.data, accountType);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed.');
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');

    const res = await resendOtp({
      email: otpEmail,
      purpose: otpPurpose,
      role: accountType,
    });

    setIsResending(false);
    if (!res.success) {
      setErrorMessage(res.message || 'Failed to resend code.');
      return;
    }

    toast.success('New code sent to email');
    setOtpCountdown(45);
    setOtpDigits(['', '', '', '', '', '']);
    otpInputRefs.current[0]?.focus();
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
          setIsSubmitting(false);
          return;
        }
        if (res.requiresOtp) {
          setIsOtpMode(true);
          setOtpPurpose('register');
          setOtpEmail(res.email || formData.email.trim());
          setOtpCountdown(45);
          setOtpDigits(['', '', '', '', '', '']);
          setIsSubmitting(false);
          toast.success('Code sent to email');
          return;
        }
        toast.success(`Welcome, ${formData.name.trim() || 'Guest'}!`);
        setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
        setIsSubmitting(false);
        onClose();
        handlePostAuthNavigation(res.data, accountType);
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
        setIsSubmitting(false);
        return;
      }

      if (res.requiresOtp) {
        setIsOtpMode(true);
        setOtpPurpose('login');
        setOtpEmail(res.email || formData.email.trim());
        setOtpCountdown(45);
        setOtpDigits(['', '', '', '', '', '']);
        setIsSubmitting(false);
        toast.success('Security code sent');
        return;
      }

      toast.success(`Welcome, ${res.data?.name || 'User'}!`);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setSuccessMessage('');
      setIsSubmitting(false);
      onClose();
      handlePostAuthNavigation(res.data, accountType);
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
        setIsSubmitting(false);
        return;
      }

      toast.success(`Welcome, ${res.data?.name || 'User'}!`);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setIsSubmitting(false);
      onClose();
      handlePostAuthNavigation(res.data, accountType);
    } catch (err) {
      const msg = err.message || 'Google sign-in error';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in cancelled');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Enter your email address');
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
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-[420px] flex flex-col items-center z-10 text-slate-800 antialiased select-none"
            data-purpose="mobile-viewport"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Capsule Bar */}
            <header className="relative z-30 pb-3 sm:pb-3.5 flex flex-col items-center shrink-0">
              {isOtpMode ? (
                <div className="py-2.5 px-6 sm:py-3 sm:px-8 rounded-full text-base sm:text-lg font-bold bg-white text-[#1f1b16] shadow-xl border-2 border-slate-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Email Verification</span>
                </div>
              ) : !isForgotMode ? (
                <nav
                  aria-label="Portal Mode Selection"
                  className="p-1.5 sm:p-2 rounded-full flex items-center shadow-2xl bg-white border-2 border-slate-200/90"
                >
                  {/* Login Pill */}
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`relative py-3 px-8 sm:py-3.5 sm:px-10 rounded-full text-base sm:text-lg font-bold tracking-tight transition-all duration-200 cursor-pointer z-10 select-none ${
                      !isRegisterMode ? 'text-white' : 'text-slate-600 hover:text-slate-900'
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
                      isRegisterMode ? 'text-white' : 'text-slate-600 hover:text-slate-900'
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

            {/* Sliding Track Viewport */}
            <div className="relative w-full overflow-hidden py-3 px-1 -my-3 -mx-1">
              <motion.div
                className="flex w-[200%] items-start will-change-transform"
                animate={{ x: isRegisterMode ? '-50%' : '0%' }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* TAB 1: LOGIN */}
                <LoginFormTab
                  isRegisterMode={isRegisterMode}
                  isOtpMode={isOtpMode}
                  otpPurpose={otpPurpose}
                  isForgotMode={isForgotMode}
                  setIsForgotMode={setIsForgotMode}
                  accountType={accountType}
                  setAccountType={setAccountType}
                  promptMessage={promptMessage}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                  successMessage={successMessage}
                  setSuccessMessage={setSuccessMessage}
                  forgotEmail={forgotEmail}
                  setForgotEmail={setForgotEmail}
                  formData={formData}
                  handleInputChange={handleInputChange}
                  showLoginPassword={showLoginPassword}
                  setShowLoginPassword={setShowLoginPassword}
                  rememberDevice={rememberDevice}
                  setRememberDevice={setRememberDevice}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                  handleForgotPasswordSubmit={handleForgotPasswordSubmit}
                  handleGoogleSuccess={handleGoogleSuccess}
                  handleGoogleError={handleGoogleError}
                  GOOGLE_CLIENT_ID={GOOGLE_CLIENT_ID}
                  loginEmailRef={loginEmailRef}
                  otpEmail={otpEmail}
                  otpDigits={otpDigits}
                  otpCountdown={otpCountdown}
                  isResending={isResending}
                  isVerifyingOtp={isVerifyingOtp}
                  handleVerifyOtp={handleVerifyOtp}
                  handleResendOtp={handleResendOtp}
                  handleOtpDigitChange={handleOtpDigitChange}
                  handleOtpKeyDown={handleOtpKeyDown}
                  handleOtpPaste={handleOtpPaste}
                  otpInputRefs={otpInputRefs}
                  setIsOtpMode={setIsOtpMode}
                />

                {/* TAB 2: REGISTER */}
                <RegisterFormTab
                  isRegisterMode={isRegisterMode}
                  isOtpMode={isOtpMode}
                  otpPurpose={otpPurpose}
                  accountType={accountType}
                  setAccountType={setAccountType}
                  errorMessage={errorMessage}
                  setErrorMessage={setErrorMessage}
                  successMessage={successMessage}
                  formData={formData}
                  handleInputChange={handleInputChange}
                  handleNameChange={handleNameChange}
                  showRegisterPassword={showRegisterPassword}
                  setShowRegisterPassword={setShowRegisterPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                  handleGoogleSuccess={handleGoogleSuccess}
                  handleGoogleError={handleGoogleError}
                  GOOGLE_CLIENT_ID={GOOGLE_CLIENT_ID}
                  registerNameRef={registerNameRef}
                  otpEmail={otpEmail}
                  otpDigits={otpDigits}
                  otpCountdown={otpCountdown}
                  isResending={isResending}
                  isVerifyingOtp={isVerifyingOtp}
                  handleVerifyOtp={handleVerifyOtp}
                  handleResendOtp={handleResendOtp}
                  handleOtpDigitChange={handleOtpDigitChange}
                  handleOtpKeyDown={handleOtpKeyDown}
                  handleOtpPaste={handleOtpPaste}
                  otpInputRefs={otpInputRefs}
                  setIsOtpMode={setIsOtpMode}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;
