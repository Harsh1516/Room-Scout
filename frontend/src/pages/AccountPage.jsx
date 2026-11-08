import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Login } from '../components/navbar/Login';

// Helper to extract raw 10-digit phone number without +91 prefix
const extractRawPhoneNumber = (phoneStr = '') => {
  if (!phoneStr) return '';
  const digits = String(phoneStr).replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 11) && digits.startsWith('91')) {
    return digits.slice(2, 12);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1, 11);
  }
  return digits.slice(-10);
};

// Zod Schema for Personal / Host Profile Details (Enforces Genuine Details)
const profileDetailsSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name cannot exceed 60 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name must contain letters and spaces only')
    .refine((val) => val.replace(/[^a-zA-Z]/g, '').length >= 2, {
      message: 'Full name must contain at least 2 alphabetic letters',
    }),
  phone: z
    .string({ required_error: 'Phone number is compulsory' })
    .trim()
    .min(1, 'Phone number is compulsory')
    .refine(
      (val) => {
        if (!val || val.trim() === '') return false;
        const digits = val.replace(/\D/g, '');
        const raw10 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
        if (raw10.length !== 10) return false;
        if (!/^[6-9]/.test(raw10)) return false;
        if (/^(\d)\1{9}$/.test(raw10)) return false;
        if (raw10 === '1234567890' || raw10 === '0123456789') return false;
        return true;
      },
      {
        message: 'Please enter a genuine 10-digit mobile number starting with 6, 7, 8, or 9',
      }
    ),
});

// Zod Schema for Password Change
const passwordChangeSchema = z
  .object({
    oldPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your new password' })
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Zod Schema for Setting Password (for users who signed up with Google and haven't created a password yet)
const passwordSetSchema = z
  .object({
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your new password' })
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export function AccountPage() {
  const navigate = useNavigate();
  const { user, isHost, updateUserSession, logout } = useAuth();
  
  // Top tabs: 'details' | 'password' | 'delete'
  const [activeTab, setActiveTab] = useState('details');

  // Personal details state
  const [personalForm, setPersonalForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: extractRawPhoneNumber(user?.phone || ''),
    avatar: user?.avatar || '',
  });

  // Validation errors state
  const [personalErrors, setPersonalErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Pre-fill user details on mount or user change
  useEffect(() => {
    if (user) {
      setPersonalForm({
        name: user.name || '',
        email: user.email || '',
        phone: extractRawPhoneNumber(user.phone || ''),
        avatar: user.avatar || '',
      });
      setPersonalErrors({});
    }
  }, [user]);

  // Real-time / onBlur validation for personal fields
  const validatePersonalField = (field, value) => {
    const dataToValidate = {
      name: field === 'name' ? value : personalForm.name,
      phone: field === 'phone' ? value : personalForm.phone,
    };
    const result = profileDetailsSchema.safeParse(dataToValidate);
    if (!result.success) {
      const issue = result.error.issues.find((err) => err.path[0] === field);
      if (issue) {
        setPersonalErrors((prev) => ({ ...prev, [field]: issue.message }));
        return;
      }
    }
    setPersonalErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Real-time / onBlur validation for password fields
  const validatePasswordField = (field, value) => {
    const dataToValidate = {
      ...passwordForm,
      [field]: value,
    };
    const schema = user?.hasPassword ? passwordChangeSchema : passwordSetSchema;
    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      const issue = result.error.issues.find((err) => err.path[0] === field);
      if (issue) {
        setPasswordErrors((prev) => ({ ...prev, [field]: issue.message }));
        return;
      }
    }
    setPasswordErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Handle updating user/host personal profile
  const handleUpdatePersonal = async (e) => {
    e.preventDefault();

    const result = profileDetailsSchema.safeParse({
      name: personalForm.name.trim(),
      phone: personalForm.phone.trim(),
    });

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setPersonalErrors(errors);
      toast.error(result.error.issues[0]?.message || 'Please fix the validation errors');
      return;
    }
    setPersonalErrors({});

    const rawDigits = personalForm.phone ? personalForm.phone.replace(/\D/g, '') : '';
    const formattedPhone = rawDigits ? `+91 ${rawDigits.slice(-10)}` : '';

    setLoading(true);
    try {
      const res = await authAPI.updateProfile({
        name: personalForm.name.trim(),
        phone: formattedPhone,
      });

      if (res.user) {
        updateUserSession(res.user, res.token);
      }
      toast.success(res.message || 'Personal details updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update personal details.');
    } finally {
      setLoading(false);
    }
  };

  // Phone validation for compulsory state (ensures host enters genuine 10-digit number)
  const rawPhoneDigits = (personalForm.phone || '').replace(/\D/g, '');
  const clean10Phone = rawPhoneDigits.length === 12 && rawPhoneDigits.startsWith('91') ? rawPhoneDigits.slice(2) : rawPhoneDigits;
  const isPhoneValid = clean10Phone.length === 10 && /^[6-9]/.test(clean10Phone) && !/^(\d)\1{9}$/.test(clean10Phone) && clean10Phone !== '1234567890' && clean10Phone !== '0123456789';
  const isNameValid = Boolean(personalForm.name && personalForm.name.trim().length >= 2);
  const canSaveProfile = isNameValid && isPhoneValid && !personalErrors.name && !personalErrors.phone;

  // Handle setting or changing password
  const handleSavePassword = async (e) => {
    e.preventDefault();

    const isSettingPassword = !user?.hasPassword;
    const schema = isSettingPassword ? passwordSetSchema : passwordChangeSchema;

    const result = schema.safeParse(passwordForm);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setPasswordErrors(errors);
      toast.error(result.error.issues[0]?.message || 'Please fix password errors');
      return;
    }
    setPasswordErrors({});

    setLoading(true);
    try {
      if (isSettingPassword) {
        const res = await authAPI.setPassword({
          newPassword: passwordForm.newPassword,
        });

        if (res.user) {
          updateUserSession(res.user, res.token);
        } else {
          updateUserSession((prev) => ({ ...prev, hasPassword: true }), res.token);
        }

        toast.success(
          res.message || 'Password created successfully! You can now log in with either Google or your email and password.'
        );
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
      } else {
        const res = await authAPI.changePassword({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        });

        toast.success(res.message || 'Password updated successfully!');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
      }
    } catch (err) {
      toast.error(err.message || (isSettingPassword ? 'Failed to set password.' : 'Failed to update password.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle permanent account deletion
  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await authAPI.deleteAccount();
      toast.info(res.message || 'Your account has been deleted.');
      setShowDeleteModal(false);
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isHost ? '/host/dashboard' : '/explore');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-slate-900 transition-colors duration-300 font-body-md antialiased pb-8 sm:pb-12">
      {/* ── TOP FLOATING NAVIGATION CAPSULES (MATCHING PIC 1 SETTING) ── */}
      <header className="relative w-full h-14 sm:h-20 pointer-events-none select-none z-50 font-body-md antialiased">
        {/* 1. Left Island: Back button */}
        <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-8 sm:h-[46px]">
          <button
            type="button"
            onClick={handleBack}
            data-no-hover="true"
            className="inline-flex items-center justify-center h-8 sm:h-[46px] px-3.5 sm:px-5 gap-1.5 sm:gap-2 rounded-full bg-white text-slate-700 text-xs sm:text-[14px] font-semibold shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
            title="Return"
          >
            <svg
              className="w-3.5 h-3.5 text-slate-600 stroke-[2.2] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="flex items-center justify-center leading-none tracking-tight">Back</span>
          </button>
        </div>

        {/* 2. Center Island: Floating Liquid Glass Segmented Tabs (matching Pic 1 positioning) */}
        <div className="fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center pointer-events-auto max-w-[calc(100vw-130px)] sm:max-w-none h-9 sm:h-[46px] select-none">
          <nav className="apple-liquid-nav relative flex items-center h-9 sm:h-[46px] p-1 sm:p-1.5 rounded-full border border-slate-200/90 bg-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.1),0_2px_6px_-1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] select-none">
            {/* Tab 1: Profile Details */}
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`relative z-10 h-full py-0 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 select-none shrink-0 ${
                activeTab === 'details'
                  ? 'text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile<span className="hidden sm:inline"> Details</span></span>
              {activeTab === 'details' && (
                <motion.div
                  layoutId="accountTabActivePill"
                  className="absolute inset-0 bg-slate-950 rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            {/* Tab 2: Password */}
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`relative z-10 h-full py-0 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 select-none shrink-0 ${
                activeTab === 'password'
                  ? 'text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Password</span>
              {activeTab === 'password' && (
                <motion.div
                  layoutId="accountTabActivePill"
                  className="absolute inset-0 bg-slate-950 rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            {/* Tab 3: Delete Account */}
            <button
              type="button"
              onClick={() => setActiveTab('delete')}
              className={`relative z-10 h-full py-0 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 select-none shrink-0 ${
                activeTab === 'delete'
                  ? 'text-white font-bold'
                  : 'text-rose-600 hover:text-rose-700 font-medium'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span>Delete<span className="hidden sm:inline"> Account</span></span>
              {activeTab === 'delete' && (
                <motion.div
                  layoutId="accountTabActivePill"
                  className="absolute inset-0 bg-rose-600 rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          </nav>
        </div>

        {/* 3. Right Island: Profile / Login Avatar Button */}
        <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto select-none h-8 sm:h-[46px]">
          <div className="relative flex items-center justify-center h-8 sm:h-[46px]">
            <Login />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-16 sm:pt-22 lg:pt-26 pb-12 sm:pb-16 min-h-[calc(100vh-4rem)]">

        {/* ── TAB 1: PROFILE DETAILS (GREEN THEMED CARD ON MOBILE) ── */}
        {activeTab === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-md:bg-[#0b291b] max-md:rounded-[32px] sm:max-md:rounded-[36px] max-md:border max-md:border-emerald-400/20 max-md:p-4 sm:max-md:p-6 max-md:shadow-[0_12px_36px_rgba(11,41,27,0.45)] md:bg-white md:rounded-3xl md:border md:border-slate-200 md:p-8 md:shadow-xs space-y-4 sm:space-y-6 transition-all duration-300"
          >
            {/* Desktop Header */}
            <div className="hidden md:flex border-b border-slate-100 pb-4 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl lg:text-3xl font-manrope font-extrabold text-slate-900 tracking-tight">
                  {isHost ? 'Host Profile Details' : 'Personal Profile Details'}
                </h2>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-manrope font-black text-sm flex items-center justify-center shadow-xs shrink-0 select-none">
                {user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
              </div>
            </div>

            {/* Mobile Centered Title (Matches Pic 1 style) */}
            <div className="md:hidden flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
              <h2 className="text-xl sm:text-2xl font-bold font-black text-white tracking-normal text-center">
                {isHost ? 'Host Profile Details' : 'Personal Profile Details'}
              </h2>
            </div>

            {/* Inner Section Card Covering Input Fields (Matches Pic 1 style) */}
            <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#14422b] max-md:border-emerald-300/20 max-md:p-4 sm:max-md:p-5 max-md:shadow-black/20 md:bg-transparent md:border-none md:p-0 md:shadow-none space-y-4 relative overflow-hidden">
              <form onSubmit={handleUpdatePersonal} className="space-y-3.5 sm:space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={personalForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPersonalForm((prev) => ({ ...prev, name: val }));
                      if (personalErrors.name) validatePersonalField('name', val);
                    }}
                    onBlur={(e) => validatePersonalField('name', e.target.value)}
                    placeholder="e.g. Happy Chhikara"
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                      personalErrors.name
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                    }`}
                  />
                  {personalErrors.name && (
                    <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{personalErrors.name}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Email (Readonly) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                      Email Address (Registered)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={personalForm.email}
                      className="w-full h-11 px-4 rounded-xl border max-md:bg-white/5 max-md:border-white/10 max-md:text-white/60 md:bg-slate-100 md:border-slate-200 md:text-slate-500 text-sm font-medium cursor-not-allowed shadow-xs"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                      Phone Number *
                    </label>
                    <div
                      className={`relative flex items-center h-11 rounded-xl border overflow-hidden transition-all shadow-xs ${
                        personalErrors.phone
                          ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
                          : 'max-md:bg-white/10 max-md:border-white/20 max-md:focus-within:border-white/60 max-md:focus-within:ring-2 max-md:focus-within:ring-white/20 md:bg-slate-50 md:border-slate-300 md:focus-within:border-emerald-500 md:focus-within:ring-2 md:focus-within:ring-emerald-500/20'
                      }`}
                    >
                      {/* Left: Country Code Prefix */}
                      <span className="pl-3.5 sm:pl-4 pr-2.5 text-xs sm:text-sm font-bold max-md:text-emerald-200 md:text-slate-700 select-none shrink-0 bg-transparent">
                        +91
                      </span>

                      {/* Vertical Divider */}
                      <div className={`h-4 sm:h-5 w-px ${personalErrors.phone ? 'bg-rose-400' : 'max-md:bg-white/20 md:bg-slate-300'} shrink-0`} />

                      {/* Right: Phone Input Field */}
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        autoComplete="tel-national"
                        value={personalForm.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          let clean = digits;
                          if ((clean.length === 12 || clean.length === 11) && clean.startsWith('91')) {
                            clean = clean.slice(2);
                          } else if (clean.length === 11 && clean.startsWith('0')) {
                            clean = clean.slice(1);
                          }
                          const updated = clean.slice(0, 10);
                          setPersonalForm((prev) => ({ ...prev, phone: updated }));
                          if (personalErrors.phone) validatePersonalField('phone', updated);
                        }}
                        onBlur={(e) => validatePersonalField('phone', personalForm.phone)}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm font-medium max-md:text-white max-md:placeholder:text-emerald-200/40 md:text-slate-900 md:placeholder:text-slate-400 focus:outline-none rounded-r-xl"
                      />
                    </div>
                    {personalErrors.phone && (
                      <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{personalErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 sm:pt-3">
                  <button
                    type="submit"
                    disabled={!canSaveProfile || loading}
                    className={`w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl font-extrabold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 ${
                      !canSaveProfile || loading
                        ? 'max-md:bg-white/10 max-md:text-white/40 md:bg-slate-200 md:text-slate-400 cursor-not-allowed opacity-60'
                        : 'max-md:bg-emerald-400 max-md:hover:bg-emerald-300 max-md:text-emerald-950 max-md:shadow-lg max-md:shadow-emerald-950/40 md:bg-emerald-600 md:hover:bg-emerald-500 md:text-white md:shadow-md md:shadow-emerald-600/20 cursor-pointer active:scale-95'
                    }`}
                    title={!canSaveProfile ? 'Please fill your 10-digit phone number to enable saving' : 'Save Profile Changes'}
                  >
                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>

              {/* If Host: Property Management CTA Banner */}
              {isHost && (
                <div className="pt-3.5 sm:pt-4 border-t max-md:border-white/15 md:border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 max-md:bg-white/10 max-md:border max-md:border-white/15 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl md:bg-emerald-500/10 md:border md:border-emerald-500/20">
                  <h4 className="text-xs sm:text-sm font-bold max-md:text-white md:text-slate-900 tracking-tight">
                    Need to update your property details?
                  </h4>
                  <button
                    type="button"
                    onClick={() => navigate('/host/upload')}
                    className="px-3.5 py-2 rounded-xl max-md:bg-white max-md:hover:bg-emerald-50 max-md:text-emerald-950 md:bg-emerald-600 md:hover:bg-emerald-500 md:text-white text-xs font-extrabold tracking-tight transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 w-full sm:w-auto text-center"
                  >
                    Property Form →
                  </button>
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* ── TAB 2: PASSWORD (GREEN THEMED CARD ON MOBILE) ── */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-md:bg-[#0b291b] max-md:rounded-[32px] sm:max-md:rounded-[36px] max-md:border max-md:border-emerald-400/20 max-md:p-4 sm:max-md:p-6 max-md:shadow-[0_12px_36px_rgba(11,41,27,0.45)] md:bg-white md:rounded-3xl md:border md:border-slate-200 md:p-8 md:shadow-xs space-y-4 sm:space-y-6 transition-all duration-300"
          >
            {/* Desktop Header */}
            <div className="hidden md:block border-b border-slate-100 pb-4">
              <h2 className="text-2xl lg:text-3xl font-manrope font-extrabold text-slate-900 tracking-tight">
                {user?.hasPassword ? 'Change Password' : 'Set Account Password'}
              </h2>
            </div>

            {/* Mobile Centered Title (Matches Pic 1 style) */}
            <div className="md:hidden flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
              <h2 className="text-xl sm:text-2xl font-bold font-black text-white tracking-normal text-center">
                {user?.hasPassword ? 'Change Password' : 'Set Account Password'}
              </h2>
            </div>

            {/* Inner Section Card Covering Password Fields (Matches Pic 1 style) */}
            <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#14422b] max-md:border-emerald-300/20 max-md:p-4 sm:max-md:p-5 max-md:shadow-black/20 md:bg-transparent md:border-none md:p-0 md:shadow-none space-y-4 relative overflow-hidden">
              {/* If user does not have a password yet (Signed in with Google) */}
              {!user?.hasPassword ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl max-md:bg-white/10 max-md:border max-md:border-white/15 md:bg-slate-50 md:border md:border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold max-md:text-white md:text-slate-900">
                          Google Linked Account
                        </h3>
                        <p className="text-xs max-md:text-emerald-200/80 md:text-slate-500">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSavePassword} className="space-y-3.5">
                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                        Create Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passwordForm.newPassword}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPasswordForm((prev) => ({ ...prev, newPassword: val }));
                            if (passwordErrors.newPassword) validatePasswordField('newPassword', val);
                          }}
                          onBlur={(e) => validatePasswordField('newPassword', e.target.value)}
                          placeholder="Minimum 6 characters"
                          className={`w-full h-11 pl-4 pr-12 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                            passwordErrors.newPassword
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 max-md:text-emerald-200 hover:max-md:text-white md:text-slate-400 hover:md:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          {showNewPass ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{passwordErrors.newPassword}</span>
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPasswordForm((prev) => ({ ...prev, confirmPassword: val }));
                            if (passwordErrors.confirmPassword) validatePasswordField('confirmPassword', val);
                          }}
                          onBlur={(e) => validatePasswordField('confirmPassword', e.target.value)}
                          placeholder="Re-enter your password"
                          className={`w-full h-11 pl-4 pr-12 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                            passwordErrors.confirmPassword
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 max-md:text-emerald-200 hover:max-md:text-white md:text-slate-400 hover:md:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          {showConfirmPass ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{passwordErrors.confirmPassword}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl max-md:bg-emerald-400 max-md:hover:bg-emerald-300 max-md:text-emerald-950 max-md:shadow-lg max-md:shadow-emerald-950/40 md:bg-emerald-600 md:hover:bg-emerald-500 md:text-white font-extrabold text-xs sm:text-sm tracking-tight md:shadow-md md:shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Setting Password...' : 'Set Password'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleSavePassword} className="space-y-3.5">
                  {(user?.authProvider === 'google' || user?.googleId) && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl max-md:bg-white/10 max-md:border max-md:border-white/15 max-md:text-emerald-100 md:bg-slate-50 md:border md:border-slate-200 text-xs md:text-slate-600">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        Google account linked (<strong className="font-semibold max-md:text-white md:text-slate-800">{user?.email}</strong>)
                      </span>
                    </div>
                  )}

                  {/* Old Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        required
                        value={passwordForm.oldPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm((prev) => ({ ...prev, oldPassword: val }));
                          if (passwordErrors.oldPassword) validatePasswordField('oldPassword', val);
                        }}
                        onBlur={(e) => validatePasswordField('oldPassword', e.target.value)}
                        placeholder="Enter your current password"
                        className={`w-full h-11 pl-4 pr-12 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                          passwordErrors.oldPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 max-md:text-emerald-200 hover:max-md:text-white md:text-slate-400 hover:md:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        {showOldPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordErrors.oldPassword && (
                      <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{passwordErrors.oldPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm((prev) => ({ ...prev, newPassword: val }));
                          if (passwordErrors.newPassword) validatePasswordField('newPassword', val);
                        }}
                        onBlur={(e) => validatePasswordField('newPassword', e.target.value)}
                        placeholder="Minimum 6 characters"
                        className={`w-full h-11 pl-4 pr-12 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                          passwordErrors.newPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 max-md:text-emerald-200 hover:max-md:text-white md:text-slate-400 hover:md:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        {showNewPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{passwordErrors.newPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider max-md:text-emerald-200 md:text-slate-700 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: val }));
                          if (passwordErrors.confirmPassword) validatePasswordField('confirmPassword', val);
                        }}
                        onBlur={(e) => validatePasswordField('confirmPassword', e.target.value)}
                        placeholder="Re-enter your new password"
                        className={`w-full h-11 pl-4 pr-12 rounded-xl border text-sm font-medium focus:outline-none transition-all shadow-xs ${
                          passwordErrors.confirmPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'max-md:bg-white/10 max-md:border-white/20 max-md:text-white max-md:placeholder:text-emerald-200/40 max-md:focus:border-white/60 max-md:focus:ring-2 max-md:focus:ring-white/20 md:bg-slate-50 md:border-slate-300 md:text-slate-900 md:focus:border-emerald-500 md:focus:ring-2 md:focus:ring-emerald-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 max-md:text-emerald-200 hover:max-md:text-white md:text-slate-400 hover:md:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        {showConfirmPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-[11px] sm:text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{passwordErrors.confirmPassword}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl max-md:bg-emerald-400 max-md:hover:bg-emerald-300 max-md:text-emerald-950 max-md:shadow-lg max-md:shadow-emerald-950/40 md:bg-emerald-600 md:hover:bg-emerald-500 md:text-white font-extrabold text-xs sm:text-sm tracking-tight md:shadow-md md:shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Updating Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </motion.div>
        )}

        {/* ── TAB 3: DELETE ACCOUNT (CRIMSON RED THEMED CARD ON MOBILE) ── */}
        {activeTab === 'delete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-md:bg-[#310c0c] max-md:rounded-[32px] sm:max-md:rounded-[36px] max-md:border max-md:border-rose-400/25 max-md:p-4 sm:max-md:p-6 max-md:shadow-[0_12px_36px_rgba(49,12,12,0.5)] md:bg-white md:rounded-3xl md:border md:border-rose-500/30 md:p-8 md:shadow-xs space-y-4 sm:space-y-6 transition-all duration-300"
          >
            {/* Desktop Header */}
            <div className="hidden md:block border-b border-slate-100 pb-4">
              <h2 className="text-2xl lg:text-3xl font-manrope font-extrabold text-rose-600 flex items-center gap-2 tracking-tight">
                <span>⚠️</span>
                <span>Delete Account Permanently</span>
              </h2>
            </div>

            {/* Mobile Centered Title (Matches Pic 1 style) */}
            <div className="md:hidden flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
              <h2 className="text-xl sm:text-2xl font-bold font-black text-white tracking-normal text-center flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>Delete Account Permanently</span>
              </h2>
            </div>

            {/* Inner Section Card Covering Consequences Box (Matches Pic 1 style) */}
            <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#481212] max-md:border-rose-300/20 max-md:p-4 sm:max-md:p-5 max-md:shadow-black/20 md:bg-transparent md:border-none md:p-0 md:shadow-none space-y-4 relative overflow-hidden">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border max-md:border-white/15 max-md:text-rose-100 md:bg-rose-500/10 md:border md:border-rose-500/20 md:text-rose-800 text-xs sm:text-[13px] font-medium space-y-2 leading-relaxed">
                <p className="font-bold tracking-tight max-md:text-white md:text-rose-900">Please note the following consequences:</p>
                <ul className="list-disc pl-4 space-y-1 max-md:text-rose-200 md:text-rose-800">
                  <li>Your profile and login access will be immediately terminated.</li>
                  <li>{isHost ? 'Your listed property and host record will be permanently deleted.' : 'Your active bookings and wishlist history will be removed.'}</li>
                  <li>This action is irreversible and cannot be undone.</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl max-md:bg-rose-500 max-md:hover:bg-rose-400 max-md:text-white max-md:shadow-lg max-md:shadow-rose-950/40 md:bg-rose-600 md:hover:bg-rose-700 md:text-white font-black text-xs sm:text-sm tracking-tight md:shadow-md md:shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                >
                  Permanently Delete My Account
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </main>

      {/* Confirmation Modal for Delete */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-sm sm:max-w-md w-full border border-slate-200 shadow-2xl space-y-4 sm:space-y-5"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto">
                ⚠️
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base sm:lg font-manrope font-extrabold text-slate-900 tracking-tight">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed">
                  Are you absolutely sure you want to delete your account ({user?.email})? All your records will be wiped from the database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2.5 px-3 sm:px-4 rounded-xl border border-slate-300 text-xs font-manrope font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteAccount}
                  className="py-2.5 px-3 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-manrope font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountPage;
