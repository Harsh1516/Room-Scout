import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { AdminHostsTable } from '../components/admin/AdminHostsTable';
import { AdminUsersTable } from '../components/admin/AdminUsersTable';

export function AdminPage() {
  const navigate = useNavigate();
  const { user, updateUserSession } = useAuth();

  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return Boolean(adminAPI.getAdminKey() || (user && (user.role === 'admin' || user.isAdmin)));
  });
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);

  const [activeTab, setActiveTab] = useState('users');
  const [userSubTab, setUserSubTab] = useState('online'); // 'online' | 'offline' | 'all'

  const [users, setUsers] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name_asc' | 'name_desc'

  const [deletingUserId, setDeletingUserId] = useState(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);

  const [deletingHostId, setDeletingHostId] = useState(null);
  const [confirmDeleteHostId, setConfirmDeleteHostId] = useState(null);
  const [approvingHostId, setApprovingHostId] = useState(null);

  const formatDateTime = useCallback((dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const day = String(d.getDate()).padStart(2, '0');
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

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [usersRes, hostsRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getHosts(),
      ]);

      setIsAdminAuthorized(true);
      const fetchedUsers = Array.isArray(usersRes) ? usersRes : usersRes?.users || usersRes?.data || [];
      setUsers(fetchedUsers);

      const fetchedHosts = Array.isArray(hostsRes) ? hostsRes : hostsRes?.hosts || hostsRes?.data || [];
      setHosts(fetchedHosts);
    } catch (err) {
      if (err.status === 403 || err.status === 401) {
        setIsAdminAuthorized(false);
      }
      if (!isBackground) {
        console.error('Error fetching admin data:', err.message);
      }
    } finally {
      if (!isBackground) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminAuthorized) return;

    fetchData();

    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 3500);

    const handleFocus = () => fetchData(true);
    window.addEventListener('focus', handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleStorage = (e) => {
      if (e.key && (e.key.startsWith('stayhub_') || e.key === 'stayhub_auth_user')) {
        fetchData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleCustomSync = () => fetchData(true);
    window.addEventListener('stayhub_admin_sync', handleCustomSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
    };
  }, [fetchData, isAdminAuthorized]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  const broadcastUpdate = () => {
    try {
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
      window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'HOST_APPROVED' });
        bc.close();
      }
    } catch (e) {
      console.warn('Broadcast sync error:', e);
    }
  };

  const handleOpenUserPortal = async (targetUser) => {
    if (targetUser.isOffline) {
      toast.error('Offline users cannot be logged into as they do not have login credentials.');
      return;
    }

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
      console.warn('Impersonate API error:', err.message);
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
      console.warn('Impersonate API error:', err.message);
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
    } else if (type === 'success' || msg.toLowerCase().includes('approved') || msg.toLowerCase().includes('deleted')) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    try {
      setDeletingUserId(userId);
      await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => String(u._id || u.id) !== String(userId)));
      setConfirmDeleteUserId(null);
      broadcastUpdate();
      showToast(`User ${userName || ''} deleted`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(`Error deleting user: ${err.message}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleApproveHost = async (hostId, hostName) => {
    try {
      setApprovingHostId(hostId);
      await adminAPI.approveHost(hostId);
      setHosts((prev) =>
        prev.map((h) =>
          String(h.id || h._id) === String(hostId)
            ? { ...h, status: 'Approved' }
            : h
        )
      );
      broadcastUpdate();
      showToast(`Property for ${hostName || 'Host'} approved & published live!`);
    } catch (err) {
      console.error('Failed to approve host:', err);
      showToast(`Error approving host: ${err.message}`);
    } finally {
      setApprovingHostId(null);
    }
  };

  const handleDeleteHost = async (hostId, hostName) => {
    try {
      setDeletingHostId(hostId);
      await adminAPI.deleteHost(hostId);
      setHosts((prev) => prev.filter((h) => String(h.id || h._id) !== String(hostId)));
      setConfirmDeleteHostId(null);
      broadcastUpdate();
      showToast(`Host ${hostName || ''} deleted`);
    } catch (err) {
      console.error('Failed to delete host:', err);
      showToast(`Error deleting host: ${err.message}`);
    } finally {
      setDeletingHostId(null);
    }
  };

  const onlineUsersList = useMemo(() => users.filter((u) => !u.isOffline), [users]);
  const offlineUsersList = useMemo(() => users.filter((u) => Boolean(u.isOffline)), [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let sourceList;
    if (userSubTab === 'online') {
      sourceList = onlineUsersList;
    } else if (userSubTab === 'offline') {
      sourceList = offlineUsersList;
    } else {
      sourceList = users;
    }

    const filtered = sourceList.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.stayTitle?.toLowerCase().includes(q) ||
        u.propertyName?.toLowerCase().includes(q) ||
        u.roomNumber?.toLowerCase().includes(q) ||
        u.aadharNumber?.toLowerCase().includes(q)
    );

    // Apply Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });
  }, [onlineUsersList, offlineUsersList, users, userSubTab, searchQuery, sortBy]);

  const filteredHosts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = hosts.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q) ||
        h.propertyName?.toLowerCase().includes(q) ||
        h.propertyType?.toLowerCase().includes(q) ||
        h.location?.toLowerCase().includes(q) ||
        h.status?.toLowerCase().includes(q)
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.joinedDate || 0) - new Date(a.createdAt || a.joinedDate || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || a.joinedDate || 0) - new Date(b.createdAt || b.joinedDate || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });
  }, [hosts, searchQuery, sortBy]);

  const handleExportCSV = (dataList, filename = 'roomscout-users.csv') => {
    if (!dataList || dataList.length === 0) {
      toast.info('No records available to export.');
      return;
    }
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Date Added'];
    const rows = dataList.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.isOffline ? 'Offline Guest' : u.role || 'User').replace(/"/g, '""')}"`,
      `"${(u.status || 'Active').replace(/"/g, '""')}"`,
      `"${formatDateTime(u.createdAt).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataList.length} records to CSV!`);
  };

  const handleVerifyPasskey = async (e) => {
    e.preventDefault();
    if (!passkeyInput.trim()) return;
    setIsVerifyingKey(true);
    setPasskeyError('');
    try {
      adminAPI.setAdminKey(passkeyInput.trim());
      await adminAPI.getUsers();
      setIsAdminAuthorized(true);
      fetchData();
    } catch (err) {
      adminAPI.setAdminKey(null);
      setPasskeyError(err.message || 'Invalid Master Admin Passkey. Access Denied.');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 shadow-inner">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Administrator Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6 font-medium">
            This management console requires verified admin credentials or your master security passkey.
          </p>

          <form onSubmit={handleVerifyPasskey} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={passkeyInput}
              onChange={(e) => {
                setPasskeyInput(e.target.value);
                setPasskeyError('');
              }}
              placeholder="Enter Master Admin Passkey..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              autoFocus
            />

            {passkeyError && (
              <p className="text-xs text-rose-500 font-semibold text-left px-1">
                ⚠️ {passkeyError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingKey || !passkeyInput.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-purple-600/20 mt-1"
            >
              {isVerifyingKey ? 'Verifying Credentials...' : 'Unlock Dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            ← Return to Explore
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/70 dark:bg-zinc-950 text-slate-800 dark:text-slate-200 antialiased min-h-screen flex flex-col selection:bg-purple-500 selection:text-white transition-colors duration-200 font-sans">
      {/* BEGIN: TopHeader */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 transition-all" data-purpose="admin-main-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/explore');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all text-xs font-medium group cursor-pointer"
              title="Go back"
            >
              <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform group-hover:-translate-x-0.5 group-hover:text-purple-600 dark:group-hover:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate('/data')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer transition-all"
                title="View Database Records"
              >
                <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                <span>Database</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2.5 ml-2 pl-3 border-l border-slate-200/80 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-zinc-800 flex items-center justify-center text-white shadow-2xs ring-1 ring-slate-800 dark:ring-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                RoomScout
                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 px-1.5 py-0.2 rounded-md">
                  Admin
                </span>
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs: Users / Hosts */}
          <nav aria-label="Audience Type" className="flex items-center bg-slate-100/90 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('users');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/70 dark:border-slate-700 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Users</span>
              <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-full ${
                activeTab === 'users'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60'
                  : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
              }`}>
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('hosts');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'hosts'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/70 dark:border-slate-700 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Hosts</span>
              <span className={`text-[11px] font-medium px-1.5 py-0.2 rounded-full ${
                activeTab === 'hosts'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60 font-semibold'
                  : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
              }`}>
                {hosts.length}
              </span>
            </button>
          </nav>

          {/* Right Utility Cluster */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 text-xs font-medium shadow-2xs select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Sync</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Refresh Live Data"
            >
              <motion.svg
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.8, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </button>

            <div className="flex items-center pl-1">
              <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center border border-slate-700 dark:border-slate-600 shadow-2xs select-none">
                {user?.name?.slice(0, 2).toUpperCase() || 'HC'}
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* END: TopHeader */}

      {/* BEGIN: MainContent */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {activeTab === 'users' && (
          <>
            {/* BEGIN: FilterAndSearchToolbar */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4" data-purpose="toolbar">
              <div className="flex items-center flex-wrap gap-2">
                {/* Online Users Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('online');
                    setSearchQuery('');
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                    userSubTab === 'online'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/80'
                      : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                  <span>Online Users</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold shadow-2xs border ${
                    userSubTab === 'online'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700'
                  }`}>
                    {onlineUsersList.length}
                  </span>
                </button>

                {/* Offline Users Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('offline');
                    setSearchQuery('');
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer ${
                    userSubTab === 'offline'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold hover:bg-amber-100/80'
                      : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300/50" />
                  <span>Offline Users</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-medium border ${
                    userSubTab === 'offline'
                      ? 'bg-white dark:bg-zinc-800 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50 font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700'
                  }`}>
                    {offlineUsersList.length}
                  </span>
                </button>

                {/* All Accounts Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('all');
                    setSearchQuery('');
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer ${
                    userSubTab === 'all'
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-800 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  <span>All Accounts</span>
                  <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded-md text-[11px] font-medium">
                    {users.length}
                  </span>
                </button>
              </div>

              {/* Search, Filter & Export */}
              <div className="flex items-center gap-2 flex-1 max-w-lg lg:justify-end">
                <div className="relative w-full max-w-md group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      userSubTab === 'online'
                        ? 'Search online name, email, or phone...'
                        : userSubTab === 'offline'
                        ? 'Search offline guest, phone, stay...'
                        : 'Search all users...'
                    }
                    className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50/70 hover:bg-slate-50 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-slate-400 shadow-2xs"
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterMenu((prev) => !prev)}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all shrink-0 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer active:scale-95"
                    title="Apply Custom Filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showFilterMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs"
                      >
                        <div className="px-3 py-1 font-semibold text-slate-400 uppercase text-[10px]">Sort by</div>
                        <button
                          type="button"
                          onClick={() => { setSortBy('newest'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer ${
                            sortBy === 'newest' ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>Newest First</span>
                          {sortBy === 'newest' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('oldest'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer ${
                            sortBy === 'oldest' ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>Oldest First</span>
                          {sortBy === 'oldest' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('name_asc'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer ${
                            sortBy === 'name_asc' ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>Name (A - Z)</span>
                          {sortBy === 'name_asc' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('name_desc'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer ${
                            sortBy === 'name_desc' ? 'font-bold text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>Name (Z - A)</span>
                          {sortBy === 'name_desc' && <span>✓</span>}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCSV(filteredUsers, 'roomscout-users.csv')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all shrink-0 active:scale-95 cursor-pointer"
                  title="Export as CSV"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Export</span>
                </button>
              </div>
            </section>
            {/* END: FilterAndSearchToolbar */}

            {/* BEGIN: UsersTableContainer */}
            <AdminUsersTable
              users={filteredUsers}
              loading={loading}
              isOfflineView={userSubTab === 'offline'}
              formatDateTime={formatDateTime}
              onOpenUserPortal={handleOpenUserPortal}
              onDeleteUser={handleDeleteUser}
              deletingUserId={deletingUserId}
              confirmDeleteUserId={confirmDeleteUserId}
              setConfirmDeleteUserId={setConfirmDeleteUserId}
            />
            {/* END: UsersTableContainer */}
          </>
        )}

        {activeTab === 'hosts' && (
          <div className="space-y-4 w-full">
            {/* Toolbar for Hosts */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredHosts.length}</strong> of <strong className="text-slate-900 dark:text-white font-bold">{hosts.length}</strong> property hosts
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-72 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search host, property, status..."
                    className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50/70 hover:bg-slate-50 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-slate-400 shadow-2xs"
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

                <button
                  type="button"
                  onClick={() => handleExportCSV(filteredHosts, 'roomscout-hosts.csv')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all shrink-0 active:scale-95 cursor-pointer"
                  title="Export Hosts as CSV"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Export</span>
                </button>
              </div>
            </section>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
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
          </div>
        )}
      </main>
      {/* END: MainContent */}
    </div>
  );
}

export default AdminPage;