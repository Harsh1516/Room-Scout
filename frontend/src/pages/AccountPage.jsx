import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Left } from '../components/navbar/Left';

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
      {/* Top Header - Floating Glass Aesthetics Matching Homepage Console */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/10 shadow-xs transition-colors">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 md:px-8 h-15 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left-Most: Back Button with Brand Accent */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/explore');
                }
              }}
              className="apple-liquid-nav flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-200/80 dark:border-white/15 hover:border-cyan-500/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.25)] text-slate-950 dark:text-white text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 shrink-0 group"
              title="Go Back"
            >
              <div className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center transition-transform duration-200 group-hover:-translate-x-0.5">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </div>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Elevated Console Capsule Matching Homepage Aesthetic */}
          <div className="console-clear-capsule flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full border border-slate-200/80 dark:border-white/15 shadow-sm select-none">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-950 dark:text-white tracking-tight whitespace-nowrap">
              Account Center
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold border whitespace-nowrap shrink-0 ${
                isHost
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
              }`}
            >
              {isHost ? '🏡 Host Account' : '🎓 Guest Member'}
            </span>
          </div>

          {/* Right-Most: Profile Identity Capsule */}
          <div className="apple-liquid-nav flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-1.5 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs hover:border-emerald-500/40 transition-all select-none shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-xs shrink-0">
              {user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:inline truncate max-w-[130px]">
              {user?.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-7">
        {/* Navigation Tabs Header (Crystal Glass Pill Capsule) */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1.5 rounded-full bg-white/8 dark:bg-slate-900/10 border border-slate-200/80 dark:border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] max-w-xl mx-auto mb-4 sm:mb-7 backdrop-blur-[2px] overflow-hidden">
          {/* Tab 1: Profile Details */}
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold transition-none cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none focus:ring-0 whitespace-nowrap min-w-0 ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.45)]'
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
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold transition-none cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none focus:ring-0 whitespace-nowrap min-w-0 ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.45)]'
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
            className={`flex-1 py-1 sm:py-2 px-1 sm:px-3.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold sm:font-bold transition-none cursor-pointer flex items-center justify-center gap-0.5 sm:gap-2 select-none active:scale-95 focus:outline-none focus:ring-0 whitespace-nowrap min-w-0 ${
              activeTab === 'delete'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.45)]'
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
            className="bg-white/10 dark:bg-slate-900/15 backdrop-blur-[2px] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/15 p-4 sm:p-7 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-4 sm:space-y-6"
          >
            <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 sm:pb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-slate-900 dark:text-white tracking-tight">
                  {isHost ? 'Host Profile Details' : 'Personal Profile Details'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-relaxed">
                  Manage your personal account credentials, contact information, and role.
                </p>
              </div>
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                {user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
              </div>
            </div>

            <form onSubmit={handleUpdatePersonal} className="space-y-3.5 sm:space-y-5">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                  placeholder="e.g. Harsh Chhikara"
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/8 dark:bg-white/5 border border-slate-200/70 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                    Email Address (Registered)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={personalForm.email}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/4 dark:bg-white/2 border border-slate-200/50 dark:border-white/10 text-xs sm:text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <span className="text-[9.5px] sm:text-[10px] text-slate-400 mt-1 block">
                    Email cannot be changed directly for security.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={personalForm.phone}
                    onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/8 dark:bg-white/5 border border-slate-200/70 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
                  />
                </div>
              </div>

              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3.5 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] sm:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-none cursor-pointer active:scale-95 focus:outline-none focus:ring-0 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>

            {/* If Host: Property Management CTA Banner */}
            {isHost && (
              <div className="pt-3 sm:pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-emerald-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                <div>
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
                    Need to update your property details?
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Update room rates, photos, amenities, and location via the dedicated Property Form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/host/upload')}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold transition-none shadow-xs shrink-0 cursor-pointer active:scale-95 focus:outline-none focus:ring-0 w-full sm:w-auto text-center"
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
            className="bg-white/10 dark:bg-slate-900/15 backdrop-blur-[2px] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/15 p-4 sm:p-7 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-4 sm:space-y-6"
          >
            <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 sm:pb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-slate-900 dark:text-white tracking-tight">
                Change Password
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-relaxed">
                Ensure your account is using a strong, unique password to keep it secure.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5 sm:space-y-4">
              {/* Old Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/8 dark:bg-white/5 border border-slate-200/70 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10.5px] sm:text-xs font-semibold"
                  >
                    {showOldPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
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
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/8 dark:bg-white/5 border border-slate-200/70 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10.5px] sm:text-xs font-semibold"
                  >
                    {showNewPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
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
                    className="w-full pl-3 pr-9 py-2 sm:pl-4 sm:pr-10 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/8 dark:bg-white/5 border border-slate-200/70 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10.5px] sm:text-xs font-semibold"
                  >
                    {showConfirmPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3.5 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] sm:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-none cursor-pointer active:scale-95 focus:outline-none focus:ring-0 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
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
            className="bg-white/10 dark:bg-slate-900/15 backdrop-blur-[2px] rounded-2xl sm:rounded-3xl border border-rose-500/30 p-4 sm:p-7 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-4 sm:space-y-6"
          >
            <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 sm:pb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 sm:gap-2 tracking-tight">
                <span>⚠️</span>
                <span>Delete Account Permanently</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-relaxed">
                Permanently remove your account profile, credentials, and associated data from the database.
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] sm:text-xs text-rose-800 dark:text-rose-300 space-y-1.5 sm:space-y-2 leading-relaxed">
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
                className="w-full py-2.5 sm:py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(225,29,72,0.3)] sm:shadow-[0_0_20px_rgba(225,29,72,0.35)] transition-none cursor-pointer active:scale-95 focus:outline-none focus:ring-0"
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
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-sm sm:max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 sm:space-y-5"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg sm:text-xl font-bold mx-auto">
                ⚠️
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Confirm Account Deletion
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Are you absolutely sure you want to delete your account ({user?.email})? All your records will be wiped from the database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteAccount}
                  className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
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
