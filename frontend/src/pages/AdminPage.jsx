import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { AdminHostsTable } from '../components/admin/AdminHostsTable';
import { AdminUsersTable } from '../components/admin/AdminUsersTable';
import PlatformPaymentSettingsPage from './PlatformPaymentSettingsPage';
import { AdminSubscriptionsView } from '../components/admin/AdminSubscriptionsView';

// Instant local cache helpers to avoid any reload, flash, or blank state
const getStoredAdminSubscriptions = () => {
  try {
    const raw = localStorage.getItem('stayhub_admin_subscriptions_cache');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getStoredAdminSubCounts = () => {
  try {
    const raw = localStorage.getItem('stayhub_admin_sub_counts_cache');
    return raw ? JSON.parse(raw) : { pending: 0, verified: 0, rejected: 0, total: 0 };
  } catch {
    return { pending: 0, verified: 0, rejected: 0, total: 0 };
  }
};

const saveStoredAdminSubscriptions = (list, counts) => {
  try {
    if (list) localStorage.setItem('stayhub_admin_subscriptions_cache', JSON.stringify(list));
    if (counts) localStorage.setItem('stayhub_admin_sub_counts_cache', JSON.stringify(counts));
  } catch (e) {
    console.warn('Failed to cache admin subscriptions:', e);
  }
};

export function AdminPage() {
  const navigate = useNavigate();
  const { user, updateUserSession } = useAuth();

  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return Boolean(adminAPI.getAdminKey() || (user && (user.role === 'admin' || user.isAdmin)));
  });
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);

  // Tab persistence: sync tab with URL query parameter & localStorage without router re-renders
  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    const storedTab = typeof window !== 'undefined' ? localStorage.getItem('stayhub_admin_active_tab') : null;
    return ['users', 'hosts', 'subscriptions', 'upi'].includes(urlTab)
      ? urlTab
      : ['users', 'hosts', 'subscriptions', 'upi'].includes(storedTab)
      ? storedTab
      : 'users';
  });

  const setActiveTab = useCallback((newTab) => {
    setActiveTabState(newTab);
    try {
      localStorage.setItem('stayhub_admin_active_tab', newTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== newTab) {
        url.searchParams.set('tab', newTab);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    } catch (e) {
      console.warn('Failed to persist admin tab:', e);
    }
  }, []);

  // Sync tab if user presses browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const currentParam = new URLSearchParams(window.location.search).get('tab');
      if (currentParam && ['users', 'hosts', 'subscriptions', 'upi'].includes(currentParam)) {
        setActiveTabState(currentParam);
        localStorage.setItem('stayhub_admin_active_tab', currentParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [userSubTab, setUserSubTab] = useState('online'); // 'online' | 'offline' | 'all'

  const [users, setUsers] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [hostStatusFilter, setHostStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending'
  const [selectedHostIds, setSelectedHostIds] = useState([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [subscriptions, setSubscriptions] = useState(getStoredAdminSubscriptions);
  const [subscriptionCounts, setSubscriptionCounts] = useState(getStoredAdminSubCounts);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchSubscriptions = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground && subscriptions.length === 0) setLoadingSubscriptions(true);
      const subRes = await adminAPI.getSubscriptionRequests('ALL');
      if (subRes && subRes.success) {
        const reqs = subRes.requests || [];
        const cnts = subRes.counts || { pending: 0, verified: 0, rejected: 0, total: 0 };
        setSubscriptions(reqs);
        setSubscriptionCounts(cnts);
        saveStoredAdminSubscriptions(reqs, cnts);

      }
    } catch (err) {
      if (!isBackground) console.warn('Failed to load subscriptions in admin:', err);
    } finally {
      if (!isBackground) setLoadingSubscriptions(false);
    }
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

      fetchSubscriptions(isBackground);
    } catch (err) {
      if (err.status === 403 || err.status === 401) {
        setIsAdminAuthorized(false);
      }
      if (!isBackground) {
        console.error('Error fetching admin data:', err.message);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (!isAdminAuthorized) return;

    fetchData();

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
          window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
    };
  }, [fetchData, isAdminAuthorized]);

  const broadcastUpdate = () => {
    try {
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
      window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_host_approved'));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
      localStorage.setItem('stayhub_host_approved_ts', String(Date.now()));
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
        _id: targetUser._id,
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
      __id: targetUser._id,
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
        id: targetHost._id,
        _id: targetHost._id,
      });
      if (res?.token && res?.user) {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem('roomscout_host_active_tab');
        }
        updateUserSession(res.user, res.token);
        toast.success(`Admin accessed Host Portal: ${res.user.name}`);
        navigate('/host/dashboard', {
          state: {
            updatedHost: targetHost,
            targetEmail: targetHost.email,
          },
        });
        return;
      }
    } catch (err) {
      console.warn('Impersonate API error:', err.message);
    }

    const fallbackHost = {
      _id: targetHost._id,
      id: targetHost._id,
      name: targetHost.name,
      email: targetHost.email,
      phone: targetHost.phone,
      avatar: targetHost.avatar || targetHost.name?.slice(0, 2).toUpperCase(),
      role: 'host',
      status: targetHost.status,
      isApproved: targetHost.status === 'Approved',
    };
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('roomscout_host_active_tab');
    }
    updateUserSession(fallbackHost, 'admin_impersonate_token');
    toast.success(`Admin accessed Host Portal: ${targetHost.name}`);
    navigate('/host/dashboard', {
      state: {
        updatedHost: targetHost,
        targetEmail: targetHost.email,
      },
    });
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
      setUsers((prev) => prev.filter((u) => String(u._id) !== String(userId)));
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
          String(h._id) === String(hostId)
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

  const handleToggleSelectHost = (hostId) => {
    setSelectedHostIds((prev) =>
      prev.includes(hostId) ? prev.filter((id) => id !== hostId) : [...prev, hostId]
    );
  };

  const handleSelectAllHosts = (hostIdsToSelect) => {
    setSelectedHostIds(hostIdsToSelect);
  };

  const handleClearHostSelection = () => {
    setSelectedHostIds([]);
  };

  const handleBulkApproveHosts = async () => {
    if (selectedHostIds.length === 0) {
      toast.info('Please select at least one host to approve.');
      return;
    }

    const pendingSelectedIds = selectedHostIds.filter((id) => {
      const host = hosts.find((h) => String(h._id) === String(id));
      return host && host.status !== 'Approved';
    });

    const idsToApprove = pendingSelectedIds.length > 0 ? pendingSelectedIds : selectedHostIds;

    try {
      setIsBulkApproving(true);
      try {
        await adminAPI.bulkApproveHosts(idsToApprove);
      } catch (err) {
        // Fallback to individual requests if needed
        await Promise.all(idsToApprove.map((id) => adminAPI.approveHost(id)));
      }

      setHosts((prev) =>
        prev.map((h) =>
          idsToApprove.map(String).includes(String(h._id))
            ? { ...h, status: 'Approved', isApproved: true }
            : h
        )
      );
      setSelectedHostIds([]);
      broadcastUpdate();
      toast.success(`Successfully approved ${idsToApprove.length} property host${idsToApprove.length === 1 ? '' : 's'}!`);
    } catch (err) {
      console.error('Failed to bulk approve hosts:', err);
      toast.error(`Error approving hosts: ${err.message || 'Something went wrong'}`);
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleVerifySubscription = async (id, payload) => {
    const res = await adminAPI.verifySubscriptionRequest(id, payload);
    toast.success(res.message || 'Subscription plan verified and activated!');
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleRejectSubscription = async (id, payload) => {
    const res = await adminAPI.verifySubscriptionRequest(id, payload);
    toast.success(res.message || 'Subscription request rejected.');
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleManualActivateHostSubscription = async (hostId, payload) => {
    const res = await adminAPI.manualActivateHostSubscription(hostId, payload);
    toast.success(res.message || 'Subscription plan granted successfully!');
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleDeleteSubscription = async (id) => {
    try {
      const res = await adminAPI.deleteSubscriptionRequest(id);
      toast.success(res.message || 'Subscription payment entry deleted.');
      setSubscriptions((prev) => prev.filter((s) => String(s._id) !== String(id)));
      fetchSubscriptions(true);
      fetchData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to delete subscription entry.');
      throw err;
    }
  };

  const handleDeleteAllSubscriptions = async () => {
    try {
      const res = await adminAPI.deleteAllSubscriptionRequests();
      toast.success(res.message || 'All subscription payment records deleted.');
      setSubscriptions([]);
      setSubscriptionCounts({ pending: 0, verified: 0, rejected: 0, total: 0 });
      fetchSubscriptions(true);
      fetchData(true);
      return res;
    } catch (err) {
      toast.error(err.message || 'Failed to delete all subscription records.');
      throw err;
    }
  };

  const handleBulkRejectSubscriptions = async (payload) => {
    try {
      const res = await adminAPI.bulkRejectSubscriptions(payload);
      toast.success(res.message || 'Bulk rejection of underpaid requests complete.');
      fetchSubscriptions(true);
      fetchData(true);
      return res;
    } catch (err) {
      toast.error(err.message || 'Bulk rejection failed.');
      throw err;
    }
  };

  const handleBulkVerifySubscriptions = async (payload) => {
    try {
      const res = await adminAPI.bulkVerifySubscriptions(payload);
      toast.success(res.message || 'Bulk verification successful!');
      fetchSubscriptions(true);
      fetchData(true);
      return res;
    } catch (err) {
      toast.error(err.message || 'Bulk verification failed.');
      throw err;
    }
  };

  const handleDeleteHost = async (hostId, hostName) => {
    try {
      setDeletingHostId(hostId);
      await adminAPI.deleteHost(hostId);
      setHosts((prev) => prev.filter((h) => String(h._id) !== String(hostId)));
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

  const approvedHostsCount = useMemo(() => hosts.filter((h) => h.status === 'Approved').length, [hosts]);
  const pendingHostsCount = useMemo(() => hosts.filter((h) => h.status !== 'Approved').length, [hosts]);

  const filteredHosts = useMemo(() => {
    let list = hosts;
    if (hostStatusFilter === 'approved') {
      list = list.filter((h) => h.status === 'Approved');
    } else if (hostStatusFilter === 'pending') {
      list = list.filter((h) => h.status !== 'Approved');
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (h) =>
          h.name?.toLowerCase().includes(q) ||
          h.email?.toLowerCase().includes(q) ||
          h.phone?.toLowerCase().includes(q) ||
          h.propertyName?.toLowerCase().includes(q) ||
          h.propertyType?.toLowerCase().includes(q) ||
          h.location?.toLowerCase().includes(q) ||
          h.status?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
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
  }, [hosts, hostStatusFilter, searchQuery, sortBy]);

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
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 mb-4 shadow-inner">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-normal text-slate-900 mb-2">
            Administrator Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 font-normal">
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
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-normal focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
              autoFocus
            />

            {passkeyError && (
              <p className="text-xs text-rose-500 font-normal text-left px-1">
                ⚠️ {passkeyError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingKey || !passkeyInput.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-normal transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-purple-600/20 mt-1"
            >
              {isVerifyingKey ? 'Verifying credentials...' : 'Unlock dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="mt-4 text-xs font-normal text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ← Return to Explore
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-purple-500 selection:text-white transition-colors duration-200 font-sans overflow-x-hidden">
      {/* ── AMBIENT RADIANT MESH GLOW BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top Center Radiant Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl rounded-full" />
        {/* Top Left Subtle Cyan/Blue Aura */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/[0.07] blur-[120px] rounded-full" />
        {/* Bottom Right Soft Violet Aura */}
        <div className="absolute top-2/3 -right-48 w-96 h-96 bg-purple-600/[0.08] blur-[120px] rounded-full" />
        {/* Subtle Micro-Dot Matrix Overlay for Depth */}
        <div className="absolute inset-0 bg-[radial-gradient(#0000000d_1px,transparent_1px)](#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
      </div>

      {/* ===================================================================== */}
      {/* 🧭 FLOATING LIQUID GLASS ADMIN NAVBAR                                 */}
      {/* ===================================================================== */}
      <header className="relative w-full select-none z-50">
        {/* 1. LEFT: Brand & Quick Navigation Capsules */}
        <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex items-center gap-2 select-none">
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="apple-liquid-nav flex items-center justify-center p-2 sm:px-3 sm:py-1.5 gap-2 rounded-full border border-slate-200/80 bg-white/70 backdrop-blur-2xl shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] focus:outline-none focus:ring-0"
            title="Return to Explore Stays"
            aria-label="RoomScout Brand Home"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center transition-transform duration-200 hover:rotate-12 shrink-0 shadow-xs">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
            </div>
            <span className="hidden sm:inline tracking-tight font-normal text-slate-900 text-xs sm:text-sm">
              RoomScout
            </span>
            <span className="hidden md:inline-flex text-[10px] font-normal px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-700 border border-purple-500/30">
              Admin
            </span>
          </button>

          {/* Database Records Pill */}
          <button
            type="button"
            onClick={() => navigate('/data')}
            className="apple-liquid-nav hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full border border-slate-200/80 bg-white/70 backdrop-blur-2xl text-xs font-normal text-slate-700 hover:border-purple-500/50 hover:text-purple-400 transition-all cursor-pointer shadow-xs active:scale-95"
            title="View Raw Database Records"
          >
            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>Database</span>
          </button>
        </div>

        {/* 2. CENTER: Segmented Admin Console Capsule (Users / Hosts / Subscriptions / UPI) */}
        <div className="fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-[calc(100vw-96px)] sm:max-w-none flex justify-center select-none">
          <LayoutGroup id="admin-segmented-nav-capsule">
            <nav className="apple-liquid-nav relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/80 bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              {/* Users Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setSearchQuery('');
                }}
                className={`relative z-10 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-normal transition-colors duration-150 ${
                  activeTab === 'users'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activeTab === 'users' && (
                  <motion.div
                    layoutId="admin-nav-pill-indicator"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)](0,0,0,0.4)] border border-slate-200/80 -z-10 pointer-events-none"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}
                <svg className={`relative z-10 w-3.5 h-3.5 transition-colors ${activeTab === 'users' ? 'text-purple-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="relative z-10 tracking-tight font-normal">Users</span>
                <span
                  className={`relative z-10 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-normal leading-none transition-colors ${
                    activeTab === 'users'
                      ? 'bg-purple-500/15 text-purple-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {users.length}
                </span>
              </button>

              {/* Hosts Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('hosts');
                  setSearchQuery('');
                }}
                className={`relative z-10 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-normal transition-colors duration-150 ${
                  activeTab === 'hosts'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activeTab === 'hosts' && (
                  <motion.div
                    layoutId="admin-nav-pill-indicator"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)](0,0,0,0.4)] border border-slate-200/80 -z-10 pointer-events-none"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}
                <svg className={`relative z-10 w-3.5 h-3.5 transition-colors ${activeTab === 'hosts' ? 'text-purple-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="relative z-10 tracking-tight font-normal">Hosts</span>
                <span
                  className={`relative z-10 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-normal leading-none transition-colors ${
                    activeTab === 'hosts'
                      ? 'bg-purple-500/15 text-purple-700'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {hosts.length}
                </span>
              </button>

              {/* Subscriptions Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('subscriptions');
                  setSearchQuery('');
                }}
                className={`relative z-10 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-normal transition-colors duration-150 ${
                  activeTab === 'subscriptions'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activeTab === 'subscriptions' && (
                  <motion.div
                    layoutId="admin-nav-pill-indicator"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)](0,0,0,0.4)] border border-slate-200/80 -z-10 pointer-events-none"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}
                <svg className={`relative z-10 w-3.5 h-3.5 transition-colors ${activeTab === 'subscriptions' ? 'text-purple-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="relative z-10 tracking-tight font-normal">Subscriptions</span>
                {subscriptionCounts.pending > 0 ? (
                  <span className="relative z-10 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-normal leading-none bg-amber-500 text-slate-950 animate-pulse">
                    {subscriptionCounts.pending}
                  </span>
                ) : (
                  <span
                    className={`relative z-10 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-normal leading-none transition-colors ${
                      activeTab === 'subscriptions'
                        ? 'bg-purple-500/15 text-purple-700'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {subscriptions.length}
                  </span>
                )}
              </button>

              {/* UPI Settings Tab (With layoutId spring pill) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upi');
                  setSearchQuery('');
                }}
                className={`relative z-10 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-normal transition-colors duration-150 ${
                  activeTab === 'upi'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {activeTab === 'upi' && (
                  <motion.div
                    layoutId="admin-nav-pill-indicator"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)](0,0,0,0.4)] border border-slate-200/80 -z-10 pointer-events-none"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}
                <svg className={`relative z-10 w-3.5 h-3.5 transition-colors ${activeTab === 'upi' ? 'text-purple-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span className="relative z-10 tracking-tight font-normal">UPI Settings</span>
              </button>
            </nav>
          </LayoutGroup>
        </div>

        {/* 3. RIGHT: Actions & Profile Cluster */}
        <div className="fixed top-3.5 right-3 sm:top-5 sm:right-6 z-50 flex items-center gap-1.5 sm:gap-2.5">
          {/* Explore Stays Switcher Button */}
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="apple-liquid-nav hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 border border-purple-500/30 text-xs font-normal transition-all shadow-xs cursor-pointer select-none active:scale-95"
            title="Return to User Explore Stays"
          >
            <span>🧭</span>
            <span>Explore Stays</span>
          </button>

          
          {/* Admin Avatar & Lock Button */}
          <button
            type="button"
            onClick={() => {
              adminAPI.setAdminKey(null);
              setIsAdminAuthorized(false);
              toast.info('Admin console locked');
            }}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 text-white font-normal text-xs sm:text-sm shadow-xs border border-purple-400/30 flex items-center justify-center cursor-pointer active:scale-95 transition-all select-none group"
            title="Lock Administrator Console (Click to lock)"
            aria-label="Lock Admin Console"
          >
            <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-400 text-slate-950 font-normal flex items-center justify-center text-[7px] border-2 border-white shadow-xs">
              🔒
            </span>
          </button>
        </div>
      </header>

      {/* BEGIN: MainContent */}
      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 flex flex-col gap-5">
        {/* 1. UPI Tab Panel */}
        <div className={activeTab === 'upi' ? 'block w-full' : 'hidden'}>
          <PlatformPaymentSettingsPage />
        </div>

        {/* 2. Users Tab Panel */}
        <div className={activeTab === 'users' ? 'block space-y-5 w-full' : 'hidden'}>
          {/* BEGIN: FilterAndSearchToolbar */}
            <section className="bg-white/80 rounded-3xl border border-slate-200/80 backdrop-blur-2xl shadow-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4" data-purpose="toolbar">
              <div className="flex items-center flex-wrap gap-2">
                {/* Online Users Button */}
                <button
                  type="button"
                  onClick={() => {
                    setUserSubTab('online');
                    setSearchQuery('');
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-normal transition-all shadow-xs active:scale-95 cursor-pointer ${
                    userSubTab === 'online'
                      ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
                      : 'text-slate-600 bg-white/60 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-400/50 animate-pulse" />
                  <span>Online Users</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-normal border ${
                    userSubTab === 'online'
                      ? 'bg-white text-emerald-800 border-emerald-500/30'
                      : 'bg-slate-100 text-slate-700 border-transparent'
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
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-normal transition-all shadow-xs active:scale-95 cursor-pointer ${
                    userSubTab === 'offline'
                      ? 'bg-amber-500/15 text-amber-700 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20'
                      : 'text-slate-600 bg-white/60 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-400/50" />
                  <span>Offline Users</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-normal border ${
                    userSubTab === 'offline'
                      ? 'bg-white text-amber-800 border-amber-500/30'
                      : 'bg-slate-100 text-slate-700 border-transparent'
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
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-normal transition-all shadow-xs active:scale-95 cursor-pointer ${
                    userSubTab === 'all'
                      ? 'bg-purple-500/15 text-purple-700 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20'
                      : 'text-slate-600 bg-white/60 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>All Accounts</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10.5px] font-normal">
                    {users.length}
                  </span>
                </button>
              </div>

              {/* Search, Filter & Export */}
              <div className="flex items-center gap-2.5 flex-1 max-w-lg lg:justify-end">
                <div className="relative w-full max-w-md group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                    className="w-full pl-9 pr-7 py-2 text-xs font-normal bg-slate-50/80 border border-slate-200/90 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-slate-900 rounded-xl focus:outline-none transition-all placeholder:text-slate-400 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterMenu((prev) => !prev)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50/80 border border-slate-200/90 shadow-xs hover:border-purple-500/40 transition-all shrink-0 cursor-pointer active:scale-95"
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
                        className="absolute right-0 mt-2 w-48 bg-white/95 rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 text-xs backdrop-blur-2xl"
                      >
                        <div className="px-3.5 py-1 font-normal text-slate-400 text-xs">Sort by</div>
                        <button
                          type="button"
                          onClick={() => { setSortBy('newest'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between cursor-pointer ${
                            sortBy === 'newest' ? 'font-normal text-purple-600' : 'text-slate-700'
                          }`}
                        >
                          <span>Newest First</span>
                          {sortBy === 'newest' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('oldest'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between cursor-pointer ${
                            sortBy === 'oldest' ? 'font-normal text-purple-600' : 'text-slate-700'
                          }`}
                        >
                          <span>Oldest First</span>
                          {sortBy === 'oldest' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('name_asc'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between cursor-pointer ${
                            sortBy === 'name_asc' ? 'font-normal text-purple-600' : 'text-slate-700'
                          }`}
                        >
                          <span>Name (A - Z)</span>
                          {sortBy === 'name_asc' && <span>✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSortBy('name_desc'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between cursor-pointer ${
                            sortBy === 'name_desc' ? 'font-normal text-purple-600' : 'text-slate-700'
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
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-normal text-slate-700 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/90 shadow-xs hover:border-purple-500/40 transition-all shrink-0 active:scale-95 cursor-pointer"
                  title="Export as CSV"
                >
                  <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
        </div>

        {/* 3. Hosts Tab Panel */}
        {/* 3. Hosts Tab Panel */}
        <div className={activeTab === 'hosts' ? 'block space-y-4 w-full' : 'hidden'}>
            {/* Toolbar for Hosts */}
            <section className="bg-white/80 rounded-3xl border border-slate-200/80 backdrop-blur-2xl shadow-xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600 font-normal">
                  Showing <span className="text-slate-900 font-medium">{filteredHosts.length}</span> of <span className="text-slate-900 font-medium">{hosts.length}</span> property hosts
                </div>

                {selectedHostIds.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-700 border border-purple-500/30 animate-pulse">
                    <span>{selectedHostIds.length} selected</span>
                  </span>
                )}
              </div>

              {/* Center Filter Segment: All / Approved / Pending */}
              <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-inner self-center">
                <button
                  type="button"
                  onClick={() => setHostStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All</span>
                  <span className={`px-1.5 py-0.2 text-[10.5px] rounded-md font-mono ${
                    hostStatusFilter === 'all'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {hosts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-emerald-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Approved</span>
                  <span className={`px-1.5 py-0.2 text-[10.5px] rounded-md font-mono ${
                    hostStatusFilter === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-700 font-bold'
                      : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {approvedHostsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'pending'
                      ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-amber-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.2 text-[10.5px] rounded-md font-mono ${
                    hostStatusFilter === 'pending'
                      ? 'bg-amber-500/20 text-amber-700 font-bold'
                      : 'bg-slate-200/60 text-slate-500'
                  }`}>
                    {pendingHostsCount}
                  </span>
                </button>
              </div>

              {/* Right: Multi-select Action (when selected) + Search + Export */}
              <div className="flex items-center gap-2.5 flex-wrap justify-end">
                {selectedHostIds.length > 0 && (
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    <button
                      type="button"
                      onClick={handleBulkApproveHosts}
                      disabled={isBulkApproving}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title={`Approve all ${selectedHostIds.length} selected hosts`}
                    >
                      {isBulkApproving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Approve all ({selectedHostIds.length})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearHostSelection}
                      className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Clear selection"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="relative w-full sm:w-64 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search host, property, status..."
                    className="w-full pl-9 pr-7 py-2 text-xs font-normal bg-slate-50/80 border border-slate-200/90 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-slate-900 rounded-xl focus:outline-none transition-all placeholder:text-slate-400 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCSV(filteredHosts, 'roomscout-hosts.csv')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-normal text-slate-700 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/90 shadow-xs hover:border-purple-500/40 transition-all shrink-0 active:scale-95 cursor-pointer"
                  title="Export Hosts as CSV"
                >
                  <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Export</span>
                </button>
              </div>
            </section>

            <div className="bg-white/80 rounded-3xl border border-slate-200/80 backdrop-blur-2xl shadow-xl overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/20 to-transparent pointer-events-none" />
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
                selectedHostIds={selectedHostIds}
                onToggleSelectHost={handleToggleSelectHost}
                onSelectAllHosts={handleSelectAllHosts}
                onClearSelection={handleClearHostSelection}
                onBulkApprove={handleBulkApproveHosts}
                isBulkApproving={isBulkApproving}
              />
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
              {selectedHostIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-2xl flex items-center gap-4"
                >
                  <span className="text-xs font-medium">
                    <span className="font-bold text-purple-400">{selectedHostIds.length}</span> host{selectedHostIds.length === 1 ? '' : 's'} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkApproveHosts}
                    disabled={isBulkApproving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isBulkApproving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Approve all ({selectedHostIds.length})</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHostSelection}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Deselect
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        {/* 4. Subscriptions Tab Panel */}
        <div className={activeTab === 'subscriptions' ? 'block w-full' : 'hidden'}>
          <AdminSubscriptionsView
            requests={subscriptions}
            counts={subscriptionCounts}
            loading={loadingSubscriptions}
            onRefresh={() => fetchSubscriptions(true)}
            onVerify={handleVerifySubscription}
            onReject={handleRejectSubscription}
            onDelete={handleDeleteSubscription}
            onDeleteAll={handleDeleteAllSubscriptions}
            onBulkVerify={handleBulkVerifySubscriptions}
            onBulkReject={handleBulkRejectSubscriptions}
            onManualActivate={handleManualActivateHostSubscription}
            hosts={hosts}
            formatDateTime={formatDateTime}
          />
        </div>
      </main>
      {/* END: MainContent */}
    </div>
  );
}

export default AdminPage;