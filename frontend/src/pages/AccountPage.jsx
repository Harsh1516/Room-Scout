import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const { isDark } = useTheme();

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 host-page-scope host-font-scope font-body-md antialiased pb-8 sm:pb-12">
      {/* TOP NAVBAR (Matches Property Upload Layout) */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border-b border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-1.5 sm:gap-4 relative">
          {/* Left: Back Button */}
          <div className="flex items-center gap-2 z-10 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/host/dashboard');
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-manrope font-bold tracking-tight transition-colors cursor-pointer active:scale-[0.98] shadow-2xs"
              title="Back"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="hidden min-[380px]:inline">Back</span>
            </button>
          </div>

          {/* Center: Navigation Tabs Capsule Console */}
          <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 shadow-2xs z-10 select-none overflow-x-auto no-scrollbar max-w-[calc(100vw-120px)] sm:max-w-none">
            {/* Tab 1: Profile Details */}
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-1 sm:py-1.5 px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-manrope font-bold tracking-tight cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none active:scale-95 focus:outline-none whitespace-nowrap transition-colors shrink-0 ${
                activeTab === 'details'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="truncate">Profile<span className="hidden sm:inline"> Details</span></span>
            </button>

            {/* Tab 2: Password */}
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`py-1 sm:py-1.5 px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-manrope font-bold tracking-tight cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none active:scale-95 focus:outline-none whitespace-nowrap transition-colors shrink-0 ${
                activeTab === 'password'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="truncate">Password</span>
            </button>

            {/* Tab 3: Delete Account */}
            <button
              type="button"
              onClick={() => setActiveTab('delete')}
              className={`py-1 sm:py-1.5 px-2 sm:px-3.5 rounded-full text-[11px] sm:text-xs md:text-[13px] font-manrope font-bold tracking-tight cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none active:scale-95 focus:outline-none whitespace-nowrap transition-colors shrink-0 ${
                activeTab === 'delete'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span className="truncate">Delete<span className="hidden sm:inline"> Account</span></span>
            </button>
          </div>

          {/* Right: Avatar / Login Dropdown */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            <Login />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-7">

        {/* TAB 1: PROFILE DETAILS */}
        {activeTab === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 p-3.5 sm:p-7 md:p-8 shadow-xs space-y-3.5 sm:space-y-6 transition-colors"
          >
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-2.5 sm:pb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl md:text-3xl font-manrope font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isHost ? 'Host Profile Details' : 'Personal Profile Details'}
                </h2>
                <p className="text-[11px] sm:text-xs md:text-[13px] text-slate-500 dark:text-zinc-400 mt-0.5 sm:mt-1 font-normal leading-relaxed">
                  Manage your personal account credentials, contact information, and role.
                </p>
              </div>
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-manrope font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0 select-none">
                {user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
              </div>
            </div>

            <form onSubmit={handleUpdatePersonal} className="space-y-3.5 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                  className={`w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                    personalErrors.name
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                />
                {personalErrors.name && (
                  <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{personalErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
                    Email Address (Registered)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={personalForm.email}
                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 cursor-not-allowed shadow-xs"
                  />
                  <span className="text-[10px] sm:text-[11px] font-normal text-slate-400 dark:text-zinc-500 mt-1 block">
                    Email cannot be changed directly for security.
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
                    Phone Number *
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border overflow-hidden transition-all shadow-xs composite-input-console ${
                      personalErrors.phone
                        ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
                        : 'border-slate-300 dark:border-zinc-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
                    }`}
                  >
                    {/* Left: Country Code Prefix */}
                    <span className="pl-3.5 sm:pl-4 pr-2.5 text-xs sm:text-sm font-manrope font-bold text-slate-700 dark:text-zinc-300 select-none shrink-0 bg-transparent">
                      +91
                    </span>

                    {/* Vertical Divider */}
                    <div className={`h-4 sm:h-5 w-px ${personalErrors.phone ? 'bg-rose-300 dark:bg-rose-800' : 'bg-slate-300 dark:bg-zinc-700'} shrink-0`} />

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
                      className="w-full flex-1 bg-transparent px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none rounded-r-xl sm:rounded-r-2xl"
                    />
                  </div>
                  {personalErrors.phone ? (
                    <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{personalErrors.phone}</span>
                    </p>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-normal text-slate-400 dark:text-zinc-500 mt-1 block">
                      Compulsory for host communications and WhatsApp booking alerts.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={!canSaveProfile || loading}
                  className={`w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-manrope font-extrabold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    !canSaveProfile || loading
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95'
                  }`}
                  title={!canSaveProfile ? 'Please fill your 10-digit phone number to enable saving' : 'Save Profile Changes'}
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>

            {/* If Host: Property Management CTA Banner */}
            {isHost && (
              <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-emerald-500/10 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                <div>
                  <h4 className="text-xs sm:text-sm font-manrope font-bold text-slate-900 dark:text-white tracking-tight">
                    Need to update your property details?
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-normal leading-relaxed">
                    Update room rates, photos, amenities, and location via the dedicated Property Form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/host/upload')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-manrope font-bold tracking-tight transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 w-full sm:w-auto text-center"
                >
                  Property Form →
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: PASSWORD */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-7 md:p-8 shadow-xs space-y-4 sm:space-y-6 transition-colors"
          >
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-manrope font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user?.hasPassword ? 'Change Password' : 'Set Account Password'}
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 mt-1 font-normal leading-relaxed">
                {user?.hasPassword
                  ? 'Ensure your account is using a strong, unique password to keep it secure.'
                  : 'Create a password for your account so you can log in using either Google or your email and password.'}
              </p>
            </div>

            {/* If user does not have a password yet (Signed in with Google) */}
            {!user?.hasPassword ? (
              <div className="space-y-4 sm:space-y-5">
                <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
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
                      <h3 className="text-sm font-manrope font-bold text-slate-900 dark:text-white">
                        Google Linked Account
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Signed in with {user?.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Your account currently signs in through Google. Setting a password allows you to sign in directly with your email and password from any browser or device, while keeping Google Sign-In fully active.
                  </p>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-3.5 sm:space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                        className={`w-full pl-3.5 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                          passwordErrors.newPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[11px] sm:text-xs font-manrope font-semibold cursor-pointer"
                      >
                        {showNewPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{passwordErrors.newPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                        className={`w-full pl-3.5 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                          passwordErrors.confirmPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[11px] sm:text-xs font-manrope font-semibold cursor-pointer"
                      >
                        {showConfirmPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{passwordErrors.confirmPassword}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-1 sm:pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 font-manrope font-extrabold text-xs sm:text-sm tracking-tight shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      {loading ? 'Setting Password...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSavePassword} className="space-y-3.5 sm:space-y-4">
                {(user?.authProvider === 'google' || user?.googleId) && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300">
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
                      Google account linked (<strong className="font-semibold text-slate-800 dark:text-zinc-100">{user?.email}</strong>). You can sign in using either Google or your password.
                    </span>
                  </div>
                )}

                {/* Old Password */}
                <div>
                  <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                      className={`w-full pl-3.5 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                        passwordErrors.oldPassword
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[11px] sm:text-xs font-manrope font-semibold cursor-pointer"
                    >
                      {showOldPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {passwordErrors.oldPassword && (
                    <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{passwordErrors.oldPassword}</span>
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                      className={`w-full pl-3.5 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                        passwordErrors.newPassword
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[11px] sm:text-xs font-manrope font-semibold cursor-pointer"
                    >
                      {showNewPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{passwordErrors.newPassword}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs sm:text-[13px] font-manrope font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5 tracking-tight">
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
                      className={`w-full pl-3.5 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border ${
                        passwordErrors.confirmPassword
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      } text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none transition-colors shadow-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[11px] sm:text-xs font-manrope font-semibold cursor-pointer"
                    >
                      {showConfirmPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{passwordErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>

                <div className="pt-1 sm:pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 font-manrope font-extrabold text-xs sm:text-sm tracking-tight shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    {loading ? 'Updating Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* TAB 3: DELETE ACCOUNT */}
        {activeTab === 'delete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-rose-500/30 p-4 sm:p-7 md:p-8 shadow-xs space-y-4 sm:space-y-6 transition-colors"
          >
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-manrope font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 sm:gap-2 tracking-tight">
                <span>⚠️</span>
                <span>Delete Account Permanently</span>
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 mt-1 font-normal leading-relaxed">
                Permanently remove your account profile, credentials, and associated data from the database.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs sm:text-[13px] font-medium text-rose-800 dark:text-rose-300 space-y-1.5 sm:space-y-2 leading-relaxed">
              <p className="font-manrope font-bold tracking-tight">Please note the following consequences:</p>
              <ul className="list-disc pl-4 space-y-0.5 sm:space-y-1">
                <li>Your profile and login access will be immediately terminated.</li>
                <li>{isHost ? 'Your listed property and host record will be permanently deleted.' : 'Your active bookings and wishlist history will be removed.'}</li>
                <li>This action is irreversible and cannot be undone.</li>
              </ul>
            </div>

            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-manrope font-extrabold text-xs sm:text-sm tracking-tight shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                Permanently Delete My Account
              </button>
            </div>
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
              className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-sm sm:max-w-md w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 sm:space-y-5"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto">
                ⚠️
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-manrope font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 font-normal leading-relaxed">
                  Are you absolutely sure you want to delete your account ({user?.email})? All your records will be wiped from the database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2.5 px-3 sm:px-4 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-manrope font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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