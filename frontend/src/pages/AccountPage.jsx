import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Login } from '../components/navbar/Login';

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
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
  });

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
        phone: user.phone || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // Handle updating user/host personal profile
  const handleUpdatePersonal = async (e) => {
    e.preventDefault();
    if (!personalForm.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.updateProfile({
        name: personalForm.name.trim(),
        phone: personalForm.phone.trim(),
        bio: personalForm.bio.trim(),
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

  // Handle changing password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.oldPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success(res.message || 'Password updated successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password. Check your old password.');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-8 sm:pb-12">
      {/* TOP NAVBAR (Matches Property Upload Layout) */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border-b border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between relative">
          {/* Left: Back Button */}
          <div className="flex items-center gap-2.5 z-10">
            <button
              type="button"
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/host/dashboard');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer active:scale-[0.98] shadow-2xs"
              title="Back"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Centered Badge Pill */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs z-10 select-none">
            <span>Account Details</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-extrabold">
              {isHost ? 'Host' : 'User'}
            </span>
          </div>

          {/* Right: Avatar / Login Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto z-10">
            <Login />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-7">
        {/* Navigation Tabs Header (Pill Capsule) */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1.5 rounded-full bg-white/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/15 shadow-sm max-w-xl mx-auto mb-4 sm:mb-7 backdrop-blur-xs overflow-hidden">
          {/* Tab 1: Profile Details */}
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none whitespace-nowrap min-w-0 transition-colors ${
              activeTab === 'details'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="truncate">Profile<span className="hidden min-[400px]:inline"> Details</span></span>
          </button>

          {/* Tab 2: Password */}
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none whitespace-nowrap min-w-0 transition-colors ${
              activeTab === 'password'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="truncate">Password</span>
          </button>

          {/* Tab 3: Delete Account */}
          <button
            type="button"
            onClick={() => setActiveTab('delete')}
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none whitespace-nowrap min-w-0 transition-colors ${
              activeTab === 'delete'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
            }`}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span className="truncate">Delete<span className="hidden min-[400px]:inline"> Account</span></span>
          </button>
        </div>

        {/* TAB 1: PROFILE DETAILS */}
        {activeTab === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-7 md:p-8 shadow-xs space-y-4 sm:space-y-6 transition-colors"
          >
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 sm:pb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-slate-900 dark:text-white tracking-tight">
                  {isHost ? 'Host Profile Details' : 'Personal Profile Details'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 sm:mt-1 leading-relaxed">
                  Manage your personal account credentials, contact information, and role.
                </p>
              </div>
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                {user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
              </div>
            </div>

            <form onSubmit={handleUpdatePersonal} className="space-y-3.5 sm:space-y-5">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                  placeholder="e.g. Happy Chhikara"
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                    Email Address (Registered)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={personalForm.email}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 cursor-not-allowed"
                  />
                  <span className="text-[9.5px] sm:text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
                    Email cannot be changed directly for security.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={personalForm.phone}
                    onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>

            {/* If Host: Property Management CTA Banner */}
            {isHost && (
              <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-emerald-500/10 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                <div>
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
                    Need to update your property details?
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Update room rates, photos, amenities, and location via the dedicated Property Form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/host/upload')}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 w-full sm:w-auto text-center"
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
              <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-slate-900 dark:text-white tracking-tight">
                Change Password
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 sm:mt-1 leading-relaxed">
                Ensure your account is using a strong, unique password to keep it secure.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5 sm:space-y-4">
              {/* Old Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[10.5px] sm:text-xs font-semibold cursor-pointer"
                  >
                    {showOldPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[10.5px] sm:text-xs font-semibold cursor-pointer"
                  >
                    {showNewPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 sm:mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter your new password"
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-[10.5px] sm:text-xs font-semibold cursor-pointer"
                  >
                    {showConfirmPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {loading ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
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
              <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 sm:gap-2 tracking-tight">
                <span>⚠️</span>
                <span>Delete Account Permanently</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 sm:mt-1 leading-relaxed">
                Permanently remove your account profile, credentials, and associated data from the database.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] sm:text-xs text-rose-800 dark:text-rose-300 space-y-1.5 sm:space-y-2 leading-relaxed">
              <p className="font-bold">Please note the following consequences:</p>
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
                className="w-full py-2.5 sm:py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
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
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Confirm Account Deletion
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
                  Are you absolutely sure you want to delete your account ({user?.email})? All your records will be wiped from the database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteAccount}
                  className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
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