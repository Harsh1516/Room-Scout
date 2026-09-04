import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { AdminHostsTable } from '../components/admin/AdminHostsTable';
import { AdminUsersTable } from '../components/admin/AdminUsersTable';

export function AdminPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { updateUserSession } = useAuth();

  // Active View Tab: 'hosts' | 'users'
  const [activeTab, setActiveTab] = useState('hosts');

  // Data States
  const [users, setUsers] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User Deletion States
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);

  // Host Action States
  const [deletingHostId, setDeletingHostId] = useState(null);
  const [confirmDeleteHostId, setConfirmDeleteHostId] = useState(null);
  const [approvingHostId, setApprovingHostId] = useState(null);

  // Helper to format exact date and time strictly as "25 Aug 2026, 04:00 PM"
  const formatDateTime = useCallback((dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  }, []);

  // Fetch admin dashboard data with background/silent support (No reload/flicker)
  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [usersRes, hostsRes] = await Promise.all([
        adminAPI.getUsers().catch(() => ({ users: [] })),
        adminAPI.getHosts().catch(() => ({ hosts: [] })),
      ]);

      const fetchedUsers = Array.isArray(usersRes) ? usersRes : usersRes?.users || usersRes?.data || [];
      setUsers(fetchedUsers);

      const fetchedHosts = Array.isArray(hostsRes) ? hostsRes : hostsRes?.hosts || hostsRes?.data || [];
      setHosts(fetchedHosts);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (!isBackground) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Real-Time Live-Sync System: Auto-fetch without manual page refresh
  useEffect(() => {
    // Initial fetch
    fetchData();

    // 1. Silent Background Polling every 3.5 seconds
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 3500);

    // 2. Immediate fetch when window regains focus (e.g. switching back from host or user portal)
    const handleFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', handleFocus);

    // 3. Immediate fetch when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Cross-tab storage synchronization
    const handleStorage = (e) => {
      if (e.key && (e.key.startsWith('stayhub_') || e.key === 'stayhub_auth_user')) {
        fetchData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 5. Custom event for immediate same-tab updates
    const handleCustomSync = () => {
      fetchData(true);
    };
    window.addEventListener('stayhub_admin_sync', handleCustomSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  // Broadcast data update across tabs and components
  const broadcastUpdate = (key = 'stayhub_hosts_updated') => {
    try {
      localStorage.setItem(key, Date.now().toString());
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
    } catch (e) {
      console.warn('Broadcast sync error:', e);
    }
  };

  // Handle Instant Direct Login to User Portal (Admin Privilege)
  const handleOpenUserPortal = async (targetUser) => {
    try {
      const res = await adminAPI.impersonate({
        email: targetUser.email,
        role: 'user',
        id: targetUser._id || targetUser.id,
      });
      if (res?.token && res?.user) {
        updateUserSession(res.user, res.token);
        toast.success(`Admin accessed User Portal: ${res.user.name}`);
        navigate('/explore');
        return;
      }
    } catch (err) {
      console.warn('Impersonate API failed, fallback active:', err.message);
    }
    const fallbackUser = {
      _id: targetUser._id || targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      avatar: targetUser.avatar || targetUser.name?.slice(0, 2).toUpperCase(),
      role: 'user',
    };
    updateUserSession(fallbackUser, 'admin_impersonate_token');
    toast.success(`Admin accessed User Portal: ${targetUser.name}`);
    navigate('/explore');
  };

  // Handle Instant Direct Login to Host Portal (Admin Privilege)
  const handleOpenHostPortal = async (targetHost) => {
    try {
      const res = await adminAPI.impersonate({
        email: targetHost.email,
        role: 'host',
        id: targetHost._id || targetHost.id,
      });
      if (res?.token && res?.user) {
        updateUserSession(res.user, res.token);
        toast.success(`Admin accessed Host Portal: ${res.user.name}`);
        navigate('/host/dashboard');
        return;
      }
    } catch (err) {
      console.warn('Impersonate API failed, fallback active:', err.message);
    }
    const fallbackHost = {
      _id: targetHost._id || targetHost.id,
      name: targetHost.name,
      email: targetHost.email,
      phone: targetHost.phone,
      avatar: targetHost.avatar || targetHost.name?.slice(0, 2).toUpperCase(),
      role: 'host',
    };
    updateUserSession(fallbackHost, 'admin_impersonate_token');
    toast.success(`Admin accessed Host Portal: ${targetHost.name}`);
    navigate('/host/dashboard');
  };

  const showToast = (msg, type = 'info') => {
    if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
      toast.error(msg);
    } else if (
      type === 'success' ||
      msg.toLowerCase().includes('approved') ||
      msg.toLowerCase().includes('deleted') ||
      msg.toLowerCase().includes('success')
    ) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId, userName) => {
    try {
      setDeletingUserId(userId);
      await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => String(u._id) !== String(userId) && String(u.id) !== String(userId)));
      setConfirmDeleteUserId(null);
      broadcastUpdate('stayhub_users_updated');
      showToast(`User ${userName || ''} deleted`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(`Error deleting user: ${err.message}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // Handle Approve Host Property Request
  const handleApproveHost = async (hostId, hostName) => {
    try {
      setApprovingHostId(hostId);
      await adminAPI.approveHost(hostId);
      setHosts((prev) =>
        prev.map((h) =>
          String(h.id) === String(hostId) || String(h._id) === String(hostId)
            ? { ...h, status: 'Approved' }
            : h
        )
      );
      broadcastUpdate('stayhub_hosts_updated');
      showToast(`Property for ${hostName || 'Host'} approved & published live!`);
    } catch (err) {
      console.error('Failed to approve host:', err);
      showToast(`Error approving host: ${err.message}`);
    } finally {
      setApprovingHostId(null);
    }
  };

  // Handle Delete Host
  const handleDeleteHost = async (hostId, hostName) => {
    try {
      setDeletingHostId(hostId);
      await adminAPI.deleteHost(hostId);
      setHosts((prev) => prev.filter((h) => String(h.id) !== String(hostId) && String(h._id) !== String(hostId)));
      setConfirmDeleteHostId(null);
      broadcastUpdate('stayhub_hosts_updated');
      showToast(`Host ${hostName || ''} deleted`);
    } catch (err) {
      console.error('Failed to delete host:', err);
      showToast(`Error deleting host: ${err.message}`);
    } finally {
      setDeletingHostId(null);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Filtered Hosts
  const filteredHosts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return hosts.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q) ||
        h.propertyName?.toLowerCase().includes(q) ||
        h.propertyType?.toLowerCase().includes(q) ||
        h.location?.toLowerCase().includes(q) ||
        h.status?.toLowerCase().includes(q)
    );
  }, [hosts, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 flex flex-col font-sans font-normal w-full overflow-x-hidden">
      {/* TOP ADMIN HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-300">
        <div className="w-full px-2.5 sm:px-8 h-13 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left-Most: Back Button */}
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
              className="apple-liquid-nav flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-200/80 dark:border-white/15 hover:border-purple-500/40 hover:bg-white/40 dark:hover:bg-white/10 text-slate-950 dark:text-white text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Go Back"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 shrink-0"
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
              <span>Back</span>
            </button>
          </div>

          {/* Center: Users & Hosts Navigation Capsule with Ultra-Smooth Spring Sliding Pill */}
          <div className="relative apple-liquid-nav flex items-center p-0.5 sm:p-1 rounded-full border border-slate-200/80 dark:border-white/15 text-[10px] sm:text-xs shadow-xs select-none">
            {/* Tab 1: Users */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('users');
                setSearchQuery('');
              }}
              className={`relative px-2 py-0.5 sm:px-5 sm:py-1.5 rounded-full transition-colors duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 font-bold text-[10px] sm:text-xs z-10 select-none active:scale-95 focus:outline-none focus:ring-0 ${
                activeTab === 'users'
                  ? 'text-cyan-900 dark:text-cyan-200 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeTab === 'users' && (
                <motion.div
                  layoutId="adminSwitchPill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                  className="absolute inset-0 rounded-full bg-cyan-500/20 dark:bg-cyan-500/25 border border-cyan-500/40 dark:border-cyan-400/30 shadow-[0_2px_10px_rgba(6,182,212,0.25)] -z-10"
                />
              )}
              <span>Users</span>
              <span className={`text-[8.5px] sm:text-[10px] transition-opacity duration-200 ${activeTab === 'users' ? 'opacity-90 font-bold' : 'opacity-60 font-normal'}`}>
                ({users.length})
              </span>
            </button>

            {/* Tab 2: Hosts */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('hosts');
                setSearchQuery('');
              }}
              className={`relative px-2 py-0.5 sm:px-5 sm:py-1.5 rounded-full transition-colors duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 font-bold text-[10px] sm:text-xs z-10 select-none active:scale-95 focus:outline-none focus:ring-0 ${
                activeTab === 'hosts'
                  ? 'text-cyan-900 dark:text-cyan-200 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeTab === 'hosts' && (
                <motion.div
                  layoutId="adminSwitchPill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                  className="absolute inset-0 rounded-full bg-cyan-500/20 dark:bg-cyan-500/25 border border-cyan-500/40 dark:border-cyan-400/30 shadow-[0_2px_10px_rgba(6,182,212,0.25)] -z-10"
                />
              )}
              <span>Hosts</span>
              <span className={`text-[8.5px] sm:text-[10px] transition-opacity duration-200 ${activeTab === 'hosts' ? 'opacity-90 font-bold' : 'opacity-60 font-normal'}`}>
                ({hosts.length})
              </span>
            </button>
          </div>

          {/* Right: Live Sync Badge, Refresh & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Live Sync Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold shadow-2xs select-none"
              title="Real-time live sync connected without requiring page refresh"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="apple-liquid-nav w-9 h-9 rounded-full border border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
              title="Refresh database records"
            >
              <motion.span
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.8, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              >
                ↻
              </motion.span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="apple-liquid-nav w-9 h-9 rounded-full border border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: USERS VIEW (GUEST & STUDENT ACCOUNTS) */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Showing {filteredUsers.length} of {users.length} registered users
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-normal transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Component-Level Users Table */}
            <AdminUsersTable
              users={filteredUsers}
              loading={loading}
              formatDateTime={formatDateTime}
              onOpenUserPortal={handleOpenUserPortal}
              onDeleteUser={handleDeleteUser}
              deletingUserId={deletingUserId}
              confirmDeleteUserId={confirmDeleteUserId}
              setConfirmDeleteUserId={setConfirmDeleteUserId}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HOSTS VIEW (APPROVAL WORKFLOW & PROPERTY DETAILS) */}
        {/* ========================================================================= */}
        {activeTab === 'hosts' && (
          <div className="space-y-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Showing {filteredHosts.length} of {hosts.length} property hosts
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search host, property, status..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 font-normal transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Component-Level Hosts Table with Arranged Columns */}
            <AdminHostsTable
              hosts={filteredHosts}
              loading={loading}
              formatDateTime={formatDateTime}
              onOpenHostPortal={handleOpenHostPortal}
              onApproveHost={handleApproveHost}
              onDeleteHost={handleDeleteHost}
              approvingHostId={approvingHostId}
              deletingHostId={deletingHostId}
              confirmDeleteHostId={confirmDeleteHostId}
              setConfirmDeleteHostId={setConfirmDeleteHostId}
            />
          </div>
        )}
      </main>
    </div>
  );
}
export default AdminPage;
