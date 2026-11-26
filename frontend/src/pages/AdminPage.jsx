import { getSocket } from '../services/socket';
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

  useEffect(() => {
    if (!showFilterMenu) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowFilterMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilterMenu]);

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

    // ── Real-Time WebSockets Listener (Instant 0ms surgical sync for Admin Panel) ──
    const socket = getSocket();

    // Authenticate socket and explicitly join admin room for 0ms push updates
    socket.emit('authenticate', {
      isAdmin: true,
      role: 'admin',
      adminKey: adminAPI.getAdminKey(),
    });
    socket.emit('join_admin_room');

    const handleHostApproved = (payload) => {
      const hId = payload?.hostId;
      if (!hId) return;
      setHosts((prev) =>
        prev.map((h) =>
          String(h._id) === String(hId)
            ? { ...h, status: 'Approved', isApproved: true }
            : h
        )
      );
    };

    const handleHostUpdated = (payload) => {
      const hId = payload?.hostId;
      if (!hId) {
        fetchData(true);
        return;
      }
      setHosts((prev) =>
        prev.map((h) =>
          String(h._id) === String(hId)
            ? {
                ...h,
                status: payload.status || h.status,
                propertyName: payload.propertyName || h.propertyName,
                location: payload.location || h.location,
                hasProperty: true,
              }
            : h
        )
      );
    };

    const handleSubscriptionCreated = (payload) => {
      const newPayment = payload?.payment;
      if (newPayment) {
        setSubscriptions((prev) => {
          const exists = prev.some((s) => String(s._id) === String(newPayment._id));
          const updated = exists
            ? prev.map((s) => (String(s._id) === String(newPayment._id) ? { ...s, ...newPayment } : s))
            : [newPayment, ...prev];
          saveStoredAdminSubscriptions(updated);
          return updated;
        });

        if (payload?.counts) {
          setSubscriptionCounts(payload.counts);
          saveStoredAdminSubscriptions(undefined, payload.counts);
        } else {
          setSubscriptionCounts((prev) => ({
            ...prev,
            pending: (prev.pending || 0) + (newPayment.status === 'PENDING' ? 1 : 0),
            total: (prev.total || 0) + 1,
          }));
        }
      }
      fetchSubscriptions(true);
    };

    const handleSubscriptionSync = () => {
      fetchSubscriptions(true);
    };

    const handleAdminSync = () => fetchData(true);

    socket.on('admin:host_updated', handleHostUpdated);
    socket.on('admin:host_approved', handleHostApproved);
    socket.on('admin:hosts_bulk_approved', handleAdminSync);
    socket.on('admin:host_rejected', handleAdminSync);
    socket.on('stay:updated', handleAdminSync);

    // Subscription real-time socket events
    socket.on('admin:subscription_created', handleSubscriptionCreated);
    socket.on('subscription:new', handleSubscriptionCreated);
    socket.on('admin:subscription_verified', handleSubscriptionSync);
    socket.on('admin:subscription_rejected', handleSubscriptionSync);
    socket.on('admin:subscription_updated', handleSubscriptionSync);
    socket.on('admin:subscription_deleted', handleSubscriptionSync);
    socket.on('subscription:updated', handleSubscriptionSync);
    socket.on('subscription:verified', handleSubscriptionSync);

    // Cross-tab BroadcastChannel listener for 0ms instant local sync across tabs
    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'SUBSCRIPTION_CREATED' ||
            event.data?.type === 'SUBSCRIPTION_VERIFIED' ||
            event.data?.type === 'SUBSCRIPTION_UPDATED' ||
            event.data?.type === 'SUBSCRIPTION_DELETED'
          ) {
            if (event.data?.payment) {
              handleSubscriptionCreated({ payment: event.data.payment });
            } else {
              fetchSubscriptions(true);
            }
          }
        };
      }
    } catch (bcErr) {
      console.warn('Admin BroadcastChannel error:', bcErr);
    }

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
      socket.off('admin:host_updated', handleHostUpdated);
      socket.off('admin:host_approved', handleHostApproved);
      socket.off('admin:hosts_bulk_approved', handleAdminSync);
      socket.off('admin:host_rejected', handleAdminSync);
      socket.off('stay:updated', handleAdminSync);
      socket.off('admin:subscription_created', handleSubscriptionCreated);
      socket.off('subscription:new', handleSubscriptionCreated);
      socket.off('admin:subscription_verified', handleSubscriptionSync);
      socket.off('admin:subscription_rejected', handleSubscriptionSync);
      socket.off('admin:subscription_updated', handleSubscriptionSync);
      socket.off('admin:subscription_deleted', handleSubscriptionSync);
      socket.off('subscription:updated', handleSubscriptionSync);
      socket.off('subscription:verified', handleSubscriptionSync);
      if (bc) bc.close();
 window.removeEventListener('focus', handleFocus);
 document.removeEventListener('visibilitychange', handleVisibility);
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
 toast.error('Offline user has no login');
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
 toast.success(`Accessed portal: ${res.user.name}`);
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
 window.sessionStorage.removeItem('stayin_host_active_tab');
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
 window.sessionStorage.removeItem('stayin_host_active_tab');
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
 const targetHost = hosts.find((h) => String(h._id) === String(hostId));
  const hasProp = Boolean(targetHost && (targetHost.hasProperty || targetHost.location) && targetHost.propertyName && targetHost.propertyName !== 'Host Property' && !targetHost.propertyName.endsWith("'s Stay") && targetHost.location);
  if (!hasProp) {
    showToast(`Cannot approve ${hostName || 'host'}: Property details have not been added yet.`);
    return;
  }
  // 1. Instant optimistic state update: approve immediately on UI
  setHosts((prev) =>
    prev.map((h) =>
      String(h._id) === String(hostId)
        ? { ...h, status: 'Approved', isApproved: true }
        : h
    )
  );
  showToast(`Property for ${hostName || 'Host'} approved & published live!`);

  try {
    setApprovingHostId(hostId);
    await adminAPI.approveHost(hostId);
  } catch (err) {
    console.error('Failed to approve host:', err);
    // Revert on error
    setHosts((prev) =>
      prev.map((h) =>
        String(h._id) === String(hostId)
          ? { ...h, status: targetHost.status }
          : h
      )
    );
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
  const hasProp = Boolean(host && (host.hasProperty || host.location) && host.propertyName && host.propertyName !== 'Host Property' && !host.propertyName.endsWith("'s Stay") && host.location);
  return host && host.status !== 'Approved' && hasProp;
  });

  if (pendingSelectedIds.length === 0) {
    toast.info('None of the selected hosts have property details added yet.');
    return;
  }

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
 toast.success(`Approved ${idsToApprove.length} host(s)`);
 } catch (err) {
 console.error('Failed to bulk approve hosts:', err);
 toast.error(`Error approving hosts: ${err.message || 'Something went wrong'}`);
 } finally {
 setIsBulkApproving(false);
 }
 };

 const notifySubscriptionSync = (data = {}) => {
    try {
      window.dispatchEvent(new CustomEvent('stayhub_subscription_updated', { detail: data }));
      localStorage.setItem('stayhub_subscription_updated_ts', String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'SUBSCRIPTION_VERIFIED', timestamp: Date.now(), ...data });
        bc.close();
      }
    } catch (e) {
      console.warn('Subscription sync broadcast error:', e);
    }
  };

  const handleVerifySubscription = async (id, payload) => {
    const res = await adminAPI.verifySubscriptionRequest(id, payload);
    toast.success('Plan verified & active');
    notifySubscriptionSync({ id, action: 'VERIFY' });
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleRejectSubscription = async (id, payload) => {
    const res = await adminAPI.verifySubscriptionRequest(id, payload);
    toast.success('Request rejected');
    notifySubscriptionSync({ id, action: 'REJECT' });
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleManualActivateHostSubscription = async (hostId, payload) => {
    const res = await adminAPI.manualActivateHostSubscription(hostId, payload);
    toast.success('Plan granted');
    notifySubscriptionSync({ hostId, action: 'MANUAL_ACTIVATE' });
    fetchSubscriptions(true);
    fetchData(true);
  };

  const handleDeleteSubscription = async (id) => {
    try {
      const res = await adminAPI.deleteSubscriptionRequest(id);
      toast.success('Payment entry deleted');
      setSubscriptions((prev) => prev.filter((s) => String(s._id) !== String(id)));
      notifySubscriptionSync({ id, action: 'DELETE' });
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
      toast.success('All records deleted');
      setSubscriptions([]);
      setSubscriptionCounts({ pending: 0, verified: 0, rejected: 0, total: 0 });
      notifySubscriptionSync({ action: 'DELETE_ALL' });
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
      toast.success('Underpaid requests rejected');
      notifySubscriptionSync({ action: 'BULK_REJECT' });
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
      toast.success('Bulk verification complete');
      notifySubscriptionSync({ action: 'BULK_VERIFY' });
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

 const handleExportCSV = (dataList, filename = 'stayin-users.csv') => {
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

  const adminTabs = [
    {
      id: 'users',
      label: 'Users',
      count: users.length,
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'hosts',
      label: 'Hosts',
      count: hosts.length,
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      count: subscriptionCounts.pending > 0 ? subscriptionCounts.pending : subscriptions.length,
      isAlert: subscriptionCounts.pending > 0,
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'upi',
      label: 'UPI Settings',
      count: null,
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
  ];

  const handleTabKeyDown = (e, idx) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIdx = e.key === 'ArrowRight'
      ? (idx + 1) % adminTabs.length
      : (idx - 1 + adminTabs.length) % adminTabs.length;
    const nextTab = adminTabs[nextIdx];
    setActiveTab(nextTab.id);
    setSearchQuery('');
    const nextEl = document.getElementById(`admin-tab-${nextTab.id}`);
    nextEl?.focus();
  };

  const sectionMeta = {
    users: {
      title: 'Users Directory',
      subtitle: `${onlineUsersList.length} registered accounts · ${offlineUsersList.length} offline guests`,
    },
    hosts: {
      title: 'Property Hosts',
      subtitle: `${approvedHostsCount} approved live · ${pendingHostsCount} awaiting review`,
    },
    subscriptions: {
      title: 'Host Subscriptions',
      subtitle: `${subscriptionCounts.pending || 0} pending UTR verification · ${subscriptionCounts.verified || 0} active`,
    },
    upi: {
      title: 'UPI & Plan Pricing',
      subtitle: 'Configure platform receiver VPA, per-room rates, and duration discounts',
    },
  }[activeTab] || { title: 'Admin Console', subtitle: '' };

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-[#1f1b16] flex flex-col items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md p-7 sm:p-9 rounded-2xl bg-white border border-stone-200/90 shadow-sm flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-[#f7f4ee] border border-stone-200 flex items-center justify-center text-[#1f1b16] mb-5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <span className="text-[11px] uppercase tracking-[0.12em] text-stone-500 font-medium mb-1.5">
            Stay In · Console
          </span>
          <h1 className="text-2xl font-medium tracking-tight text-[#1f1b16] mb-2">
            Administrator Access
          </h1>
          <p className="text-[13px] text-stone-500 mb-6 leading-relaxed">
            Enter your verified master security passkey to unlock platform controls.
          </p>

          <form onSubmit={handleVerifyPasskey} className="w-full flex flex-col gap-3">
            <label htmlFor="admin-passkey-input" className="sr-only">
              Master Admin Passkey
            </label>
            <input
              id="admin-passkey-input"
              type="password"
              value={passkeyInput}
              onChange={(e) => {
                setPasskeyInput(e.target.value);
                setPasskeyError('');
              }}
              placeholder="Enter master passkey..."
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#f7f4ee]/70 border border-stone-200 text-[#1f1b16] placeholder-stone-400 text-sm focus:outline-none focus:border-[#1f1b16] focus:bg-white transition-all"
              autoFocus
            />

            {passkeyError && (
              <p className="text-[12px] text-rose-600 text-left px-1 font-medium" role="alert">
                {passkeyError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingKey || !passkeyInput.trim()}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-[#1f1b16] hover:bg-[#0f766e] disabled:opacity-45 text-white text-sm font-medium transition-colors cursor-pointer active:scale-[0.99] mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]"
            >
              {isVerifyingKey ? 'Verifying credentials…' : 'Unlock Console'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="mt-5 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 text-[13px] font-medium text-stone-500 hover:text-[#1f1b16] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Return to Explore</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-white text-[#1f1b16] antialiased selection:bg-[#1f1b16] selection:text-white font-sans flex flex-col">
      {/* ===================================================================== */}
      {/* FULL-WIDTH STICKY ADMIN TOPBAR */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#faf8f4]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* LEFT: Brand & Database Shortcut */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-stone-200/90 hover:border-stone-300 transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]"
              title="Return to Explore Stays"
              aria-label="Stay In Brand Home"
            >
              <span className="w-6 h-6 rounded-full bg-[#1f1b16] text-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <polygon points="15.5 8.5 13.8 13.8 8.5 15.5 10.2 10.2 15.5 8.5" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="hidden sm:inline text-[13px] font-medium tracking-tight text-[#1f1b16]">
                Stay In
              </span>
              <span className="hidden md:inline-flex text-[10px] uppercase tracking-[0.08em] font-medium px-2 py-0.5 rounded-full bg-[#f7f4ee] text-stone-600 border border-stone-200/80">
                Admin
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/data')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white border border-stone-200/80 hover:border-stone-300 text-[12px] font-medium text-stone-600 hover:text-[#1f1b16] transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]"
              title="View Stays Database"
            >
              <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <span>Database</span>
            </button>
          </div>

          {/* CENTER: Segmented Tab Switcher (Desktop) */}
          <div className="hidden md:flex items-center justify-center min-w-0">
            <LayoutGroup id="admin-segmented-nav-capsule">
              <div
                role="tablist"
                aria-label="Admin sections"
                className="relative flex items-center p-1 rounded-full bg-stone-200/60 border border-stone-200/90"
              >
                {adminTabs.map((tab, idx) => {
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`admin-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onKeyDown={(e) => handleTabKeyDown(e, idx)}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery('');
                      }}
                      className={`relative z-10 px-3.5 py-1.5 rounded-full text-[13px] cursor-pointer flex items-center gap-1.5 select-none whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16] ${
                        isSelected
                          ? 'text-[#1f1b16] font-medium'
                          : 'text-stone-600 hover:text-[#1f1b16] font-normal'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="admin-nav-pill-indicator"
                          className="absolute inset-0 rounded-full bg-white shadow-xs border border-stone-200/90 z-0 pointer-events-none"
                          transition={{ type: 'spring', stiffness: 450, damping: 35, mass: 0.7 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors ${isSelected ? 'text-[#0f766e]' : 'text-stone-400'}`}>
                        {tab.icon}
                      </span>
                      <span className="relative z-10 tracking-tight">{tab.label}</span>
                      {tab.count !== null && (
                        <span
                          className={`relative z-10 text-[11px] px-1.5 py-0.5 rounded-full font-medium tabular-nums leading-none transition-colors ${
                            tab.isAlert
                              ? 'bg-amber-500 text-white'
                              : isSelected
                              ? 'bg-[#f7f4ee] text-[#1f1b16] border border-stone-200/80'
                              : 'bg-stone-200/70 text-stone-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>

          {/* RIGHT: Explore & Lock Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#1f1b16] text-[#1f1b16] hover:text-white border border-stone-200/90 hover:border-[#1f1b16] text-[12px] font-medium transition-colors cursor-pointer select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]"
              title="Return to User Explore Stays"
            >
              <span>Explore Stays</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                adminAPI.setAdminKey(null);
                setIsAdminAuthorized(false);
                toast.info('Admin console locked');
              }}
              className="relative w-9 h-9 rounded-full bg-[#1f1b16] hover:bg-[#0f766e] text-white font-medium text-[12px] flex items-center justify-center cursor-pointer active:scale-95 transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]"
              title="Lock Administrator Console"
              aria-label="Lock Admin Console"
            >
              <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}</span>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white text-[#1f1b16] border border-stone-300 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* MOBILE TAB BAR (Single scrollable row, zero wrapping or overlap) */}
        <div className="md:hidden border-t border-stone-200/70 bg-[#f7f4ee]/95 px-4 py-2 overflow-x-auto no-scrollbar">
          <div role="tablist" aria-label="Admin sections mobile" className="flex items-center gap-1.5 w-max">
            {adminTabs.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  className={`flex-none px-3 py-1.5 rounded-full text-[12px] flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1f1b16] text-white font-medium'
                      : 'bg-white text-stone-600 border border-stone-200/80 font-normal'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums leading-none ${
                        tab.isAlert
                          ? 'bg-amber-500 text-white'
                          : isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* BEGIN: MainContent */}
      <main className="relative z-10 w-full flex-1 flex flex-col">
        {/* Clean Full-Width Editorial Section Heading */}
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-end justify-between gap-2 bg-white">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-medium tracking-tight text-[#1f1b16] leading-tight">
              {sectionMeta.title}
            </h1>
            <p className="text-[13px] text-stone-500 mt-0.5">
              {sectionMeta.subtitle}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[12px] text-stone-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#faf8f4] border border-stone-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>Live sync</span>
            </span>
          </div>
        </div>

        {/* 1. UPI Tab Panel */}
        <div
          role="tabpanel"
          aria-labelledby="admin-tab-upi"
          hidden={activeTab !== 'upi'}
          className={activeTab === 'upi' ? 'block w-full' : 'hidden'}
        >
          <PlatformPaymentSettingsPage />
        </div>

        {/* 2. Users Tab Panel */}
        <div
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          hidden={activeTab !== 'users'}
          className={activeTab === 'users' ? 'block w-full' : 'hidden'}
        >
          {/* BEGIN: FilterAndSearchToolbar */}
          <section className="w-full bg-white border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3" data-purpose="toolbar">
            <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-xl bg-[#f7f4ee] border border-stone-200/70 w-fit">
              {/* Online Users Button */}
              <button
                type="button"
                aria-pressed={userSubTab === 'online'}
                onClick={() => {
                  setUserSubTab('online');
                  setSearchQuery('');
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer ${
                  userSubTab === 'online'
                    ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-[#1f1b16] font-normal border border-transparent'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Online Users</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums leading-none ${
                  userSubTab === 'online'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-stone-200/60 text-stone-600'
                }`}>
                  {onlineUsersList.length}
                </span>
              </button>

              {/* Offline Users Button */}
              <button
                type="button"
                aria-pressed={userSubTab === 'offline'}
                onClick={() => {
                  setUserSubTab('offline');
                  setSearchQuery('');
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer ${
                  userSubTab === 'offline'
                    ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-[#1f1b16] font-normal border border-transparent'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Offline Guests</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums leading-none ${
                  userSubTab === 'offline'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-stone-200/60 text-stone-600'
                }`}>
                  {offlineUsersList.length}
                </span>
              </button>

              {/* All Accounts Button */}
              <button
                type="button"
                aria-pressed={userSubTab === 'all'}
                onClick={() => {
                  setUserSubTab('all');
                  setSearchQuery('');
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer ${
                  userSubTab === 'all'
                    ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-[#1f1b16] font-normal border border-transparent'
                }`}
              >
                <span>All Accounts</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums leading-none ${
                  userSubTab === 'all'
                    ? 'bg-stone-100 text-[#1f1b16]'
                    : 'bg-stone-200/60 text-stone-600'
                }`}>
                  {users.length}
                </span>
              </button>
            </div>

            {/* Search, Filter & Export */}
            <div className="flex items-center gap-2 flex-1 max-w-lg lg:justify-end">
              <div className="relative w-full max-w-sm group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#1f1b16] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <label htmlFor="admin-users-search" className="sr-only">
                  Search users
                </label>
                <input
                  id="admin-users-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    userSubTab === 'online'
                      ? 'Search name, email, or phone…'
                      : userSubTab === 'offline'
                      ? 'Search guest, phone, or stay…'
                      : 'Search all accounts…'
                  }
                  className="w-full pl-8.5 pr-8 py-2 text-[13px] bg-[#f7f4ee]/65 border border-stone-200 focus:border-[#1f1b16] focus:bg-white text-[#1f1b16] rounded-xl focus:outline-none transition-colors placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-200/60 cursor-pointer transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu((prev) => !prev)}
                  aria-expanded={showFilterMenu}
                  aria-haspopup="menu"
                  aria-label="Sort users"
                  className={`p-2 rounded-xl border transition-colors shrink-0 cursor-pointer active:scale-95 ${
                    showFilterMenu
                      ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                      : 'text-stone-600 hover:text-[#1f1b16] bg-[#f7f4ee]/65 border-stone-200 hover:border-stone-300'
                  }`}
                  title="Sort options"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showFilterMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowFilterMenu(false)}
                        aria-hidden="true"
                      />
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200/90 py-1.5 z-50 text-[13px]"
                      >
                        <div className="px-3.5 py-1 text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                          Sort by
                        </div>
                        {[
                          { key: 'newest', label: 'Newest First' },
                          { key: 'oldest', label: 'Oldest First' },
                          { key: 'name_asc', label: 'Name (A – Z)' },
                          { key: 'name_desc', label: 'Name (Z – A)' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={sortBy === opt.key}
                            onClick={() => {
                              setSortBy(opt.key);
                              setShowFilterMenu(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-[#f7f4ee] flex items-center justify-between cursor-pointer transition-colors ${
                              sortBy === opt.key ? 'font-medium text-[#0f766e]' : 'text-stone-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.key && (
                              <svg className="w-3.5 h-3.5 text-[#0f766e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV(filteredUsers, 'stayin-users.csv')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium text-[#1f1b16] bg-[#f7f4ee]/65 hover:bg-stone-100 border border-stone-200 hover:border-stone-300 transition-colors shrink-0 active:scale-95 cursor-pointer"
                title="Export as CSV"
              >
                <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
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
        <div
          role="tabpanel"
          aria-labelledby="admin-tab-hosts"
          hidden={activeTab !== 'hosts'}
          className={activeTab === 'hosts' ? 'block w-full' : 'hidden'}
        >
          {/* Toolbar for Hosts */}
          <section className="w-full bg-white border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-3">
              {/* Filter Segment: All / Approved / Pending */}
              <div className="flex items-center p-1 rounded-xl bg-[#f7f4ee] border border-stone-200/70">
                <button
                  type="button"
                  aria-pressed={hostStatusFilter === 'all'}
                  onClick={() => setHostStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'all'
                      ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                      : 'text-stone-600 hover:text-[#1f1b16] border border-transparent'
                  }`}
                >
                  <span>All</span>
                  <span className="px-1.5 py-0.5 text-[11px] rounded-md bg-stone-200/60 text-stone-700 tabular-nums leading-none">
                    {hosts.length}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={hostStatusFilter === 'approved'}
                  onClick={() => setHostStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'approved'
                      ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                      : 'text-stone-600 hover:text-[#1f1b16] border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <span>Approved</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md tabular-nums leading-none ${
                    hostStatusFilter === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-stone-200/60 text-stone-600'
                  }`}>
                    {approvedHostsCount}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={hostStatusFilter === 'pending'}
                  onClick={() => setHostStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    hostStatusFilter === 'pending'
                      ? 'bg-white text-[#1f1b16] font-medium shadow-2xs border border-stone-200/80'
                      : 'text-stone-600 hover:text-[#1f1b16] border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span>Pending</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md tabular-nums leading-none ${
                    hostStatusFilter === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-stone-200/60 text-stone-600'
                  }`}>
                    {pendingHostsCount}
                  </span>
                </button>
              </div>

              <span className="text-[12px] text-stone-500">
                <span className="text-[#1f1b16] font-medium tabular-nums">{filteredHosts.length}</span> of{' '}
                <span className="text-[#1f1b16] font-medium tabular-nums">{hosts.length}</span> hosts
              </span>
            </div>

            {/* Right: Multi-select Action + Search + Export */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {selectedHostIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleBulkApproveHosts}
                    disabled={isBulkApproving}
                    className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title={`Approve all ${selectedHostIds.length} selected hosts`}
                  >
                    {isBulkApproving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Approving…</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Approve ({selectedHostIds.length})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearHostSelection}
                    className="px-2.5 py-2 text-[12px] text-stone-500 hover:text-[#1f1b16] transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="relative w-full sm:w-64 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#1f1b16] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <label htmlFor="admin-hosts-search" className="sr-only">
                  Search hosts
                </label>
                <input
                  id="admin-hosts-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search host, property, status…"
                  className="w-full pl-8.5 pr-8 py-2 text-[13px] bg-[#f7f4ee]/65 border border-stone-200 focus:border-[#1f1b16] focus:bg-white text-[#1f1b16] rounded-xl focus:outline-none transition-colors placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-200/60 cursor-pointer transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV(filteredHosts, 'stayin-hosts.csv')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium text-[#1f1b16] bg-[#f7f4ee]/65 hover:bg-stone-100 border border-stone-200 hover:border-stone-300 transition-colors shrink-0 active:scale-95 cursor-pointer"
                title="Export Hosts as CSV"
              >
                <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Export</span>
              </button>
            </div>
          </section>

          <div className="w-full bg-white">
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f1b16] text-white px-4 py-2.5 rounded-full shadow-lg border border-stone-700/80 flex items-center gap-3.5"
              >
                <span className="text-[12px] font-normal pl-1 tabular-nums">
                  <span className="font-semibold text-white">{selectedHostIds.length}</span> host{selectedHostIds.length === 1 ? '' : 's'} selected
                </span>
                <button
                  type="button"
                  onClick={handleBulkApproveHosts}
                  disabled={isBulkApproving}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-[#0f766e] hover:bg-emerald-600 text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isBulkApproving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Approving…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Approve all ({selectedHostIds.length})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClearHostSelection}
                  className="text-[12px] text-stone-400 hover:text-white pr-1 transition-colors cursor-pointer"
                >
                  Deselect
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Subscriptions Tab Panel */}
        <div
          role="tabpanel"
          aria-labelledby="admin-tab-subscriptions"
          hidden={activeTab !== 'subscriptions'}
          className={activeTab === 'subscriptions' ? 'block w-full' : 'hidden'}
        >
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
