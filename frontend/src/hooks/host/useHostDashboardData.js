import { useState, useEffect, useRef, useCallback } from 'react';
import { adminAPI, staysAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

export const DEFAULT_HOST_PROPERTY = {
  propertyName: '',
  title: '',
  propertyType: '',
  category: '',
  genderType: '',
  rating: null,
  status: 'Pending Approval',
  isApproved: false,
  reraNumber: '',
  description: '',
  image: '',
  images: [],
  facilities: [],
  rules: [],
  roomRates: [],
  rooms: [],
  latitude: null,
  longitude: null,
  address: '',
  location: '',
  roadArea: '',
  city: '',
  state: '',
  pincode: '',
};

// Strict Host-Scoped In-Memory Cache (Keyed STRICTLY by normalized host email)
export const cachedHostPropertyMap = new Map();
export const cachedGuestsMap = new Map();
export const lastHostFetchTimeMap = new Map();

/**
 * Clear all host caches from memory and sessionStorage across tenant switch/logout.
 */
export function clearAllHostCaches() {
  cachedHostPropertyMap.clear();
  cachedGuestsMap.clear();
  lastHostFetchTimeMap.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && (key.startsWith('roomscout_cached_host_') || key.startsWith('roomscout_cached_guests_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      window.sessionStorage.removeItem('roomscout_cached_host_latest');
      window.sessionStorage.removeItem('roomscout_cached_guests_latest');
    } catch {
      /* ignore */
    }
  }
}

export function getInitialHostProperty(userEmail, stateUpdatedHost) {
  const emailKey = userEmail ? userEmail.trim().toLowerCase() : '';

  // 1. If explicit state was passed and strictly matches this host's email
  if (
    stateUpdatedHost &&
    (!stateUpdatedHost.email || !emailKey || stateUpdatedHost.email.trim().toLowerCase() === emailKey) &&
    (stateUpdatedHost._id || stateUpdatedHost.propertyName || stateUpdatedHost.name)
  ) {
    return stateUpdatedHost;
  }

  // 2. Look in strict in-memory map for THIS email only
  if (emailKey && cachedHostPropertyMap.has(emailKey)) {
    const cached = cachedHostPropertyMap.get(emailKey);
    if (cached && (!cached.email || cached.email.trim().toLowerCase() === emailKey)) {
      return cached;
    }
  }

  // 3. Look in sessionStorage strictly for THIS email key
  if (emailKey && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(`roomscout_cached_host_${emailKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (!parsed.email || parsed.email.trim().toLowerCase() === emailKey)) {
          cachedHostPropertyMap.set(emailKey, parsed);
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // STRICT ISOLATION: Never fall back to another host's cached data!
  return {
    ...DEFAULT_HOST_PROPERTY,
    email: emailKey,
  };
}

export function getInitialGuests(userEmail) {
  const emailKey = userEmail ? userEmail.trim().toLowerCase() : '';
  if (!emailKey) return [];

  if (cachedGuestsMap.has(emailKey)) {
    const cached = cachedGuestsMap.get(emailKey);
    if (Array.isArray(cached)) return cached;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(`roomscout_cached_guests_${emailKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedGuestsMap.set(emailKey, parsed);
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // STRICT ISOLATION: Never fall back to another host's guest records
  return [];
}

export function saveHostPropertyToCache(email, data) {
  const emailKey = email ? email.trim().toLowerCase() : '';
  if (!emailKey || !data) return;

  // Strict check: Data must match this email
  const dataEmail = (data.email || data.hostEmail || '').trim().toLowerCase();
  if (dataEmail && dataEmail !== emailKey) return;

  cachedHostPropertyMap.set(emailKey, data);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(`roomscout_cached_host_${emailKey}`, JSON.stringify(data));
    } catch {
      /* ignore storage quota */
    }
  }
}

export function saveGuestsToCache(email, data) {
  const emailKey = email ? email.trim().toLowerCase() : '';
  if (!emailKey || !Array.isArray(data)) return;

  cachedGuestsMap.set(emailKey, data);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(`roomscout_cached_guests_${emailKey}`, JSON.stringify(data));
    } catch {
      /* ignore storage quota */
    }
  }
}

export function isHostPropertyEqual(prev, next) {
  if (!prev || !next) return false;
  if (prev === next) return true;
  if (prev._id !== next._id) return false;
  if (prev.email !== next.email) return false;
  if (prev.status !== next.status || Boolean(prev.isApproved) !== Boolean(next.isApproved)) return false;
  if (prev.propertyName !== next.propertyName || prev.title !== next.title) return false;
  if (prev.propertyType !== next.propertyType || prev.genderType !== next.genderType) return false;
  if (prev.description !== next.description) return false;
  if (prev.address !== next.address || prev.city !== next.city || prev.state !== next.state || prev.pincode !== next.pincode) return false;
  if (prev.latitude !== next.latitude || prev.longitude !== next.longitude) return false;
  if (prev.image !== next.image) return false;
  if (prev.rating !== next.rating) return false;

  const prevImages = prev.images || [];
  const nextImages = next.images || [];
  if (prevImages.length !== nextImages.length) return false;
  for (let i = 0; i < nextImages.length; i++) {
    if (prevImages[i] !== nextImages[i]) return false;
  }

  const prevFac = prev.facilities || [];
  const nextFac = next.facilities || [];
  if (prevFac.length !== nextFac.length) return false;

  const prevRates = prev.roomRates || [];
  const nextRates = next.roomRates || [];
  if (prevRates.length !== nextRates.length) return false;
  for (let i = 0; i < nextRates.length; i++) {
    const pr = prevRates[i];
    const nr = nextRates[i];
    if (!pr || !nr) return false;
    if (
      pr._id !== nr._id ||
      pr.type !== nr.type ||
      pr.price !== nr.price ||
      pr.rateUnit !== nr.rateUnit ||
      pr.capacity !== nr.capacity
    ) {
      return false;
    }
  }

  const prevRooms = prev.rooms || [];
  const nextRooms = next.rooms || [];
  if (prevRooms.length !== nextRooms.length) return false;
  for (let i = 0; i < nextRooms.length; i++) {
    const pr = prevRooms[i];
    const nr = nextRooms[i];
    if (!pr || !nr) return false;
    if (
      pr._id !== nr._id ||
      pr.roomNumber !== nr.roomNumber ||
      pr.type !== nr.type ||
      pr.status !== nr.status ||
      pr.price !== nr.price ||
      pr.rateId !== nr.rateId ||
      pr.capacity !== nr.capacity
    ) {
      return false;
    }
  }

  return true;
}

export function useHostDashboardData({ user, updateUserSession, locationState, activeTab, setActiveTab }) {
  const currentEmail = user?.email ? user.email.trim().toLowerCase() : '';
  const prevUserEmailRef = useRef(currentEmail);

  const [hostProperty, setHostProperty] = useState(() =>
    getInitialHostProperty(user?.email, locationState?.updatedHost)
  );
  const [guests, setGuests] = useState(() =>
    getInitialGuests(user?.email)
  );
  const [loading, setLoading] = useState(false);
  const latestHostPropertyRef = useRef(hostProperty);
  const hasUnsavedChangesRef = useRef(false);
  const [savedRoomNumbers, setSavedRoomNumbers] = useState(() => new Set());
  const savedRoomNumbersRef = useRef(new Set());
  const prevStatusRef = useRef(null);
  const hasInitialFetchedRef = useRef(false);

  useEffect(() => {
    latestHostPropertyRef.current = hostProperty;
  }, [hostProperty]);

  const refreshGuests = useCallback(async () => {
    try {
      const targetEmail = user?.email ? user.email.trim().toLowerCase() : (latestHostPropertyRef.current?.email || hostProperty?.email || '').trim().toLowerCase();
      if (!targetEmail) return;

      const guestsRes = await adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] }));
      if (Array.isArray(guestsRes?.guests)) {
        saveGuestsToCache(targetEmail, guestsRes.guests);
        setGuests((prev) => {
          if (Array.isArray(prev) && prev.length === guestsRes.guests.length) {
            const isSame = prev.every((g, i) => {
              const nextG = guestsRes.guests[i];
              return (
                g._id === nextG._id &&
                g.status === nextG.status &&
                g.paymentStatus === nextG.paymentStatus &&
                g.updatedAt === nextG.updatedAt
              );
            });
            if (isSame) return prev;
          }
          return guestsRes.guests;
        });
      }
    } catch (err) {
      console.warn('refreshGuests error:', err);
    }
  }, [user?.email, hostProperty?.email]);

  const fetchHostData = useCallback(async () => {
    if (hasUnsavedChangesRef.current) {
      return;
    }
    const targetEmail = user?.email ? user.email.trim().toLowerCase() : '';
    if (!targetEmail) return;

    try {
      if (!latestHostPropertyRef.current || !latestHostPropertyRef.current._id || latestHostPropertyRef.current.email !== targetEmail) {
        setLoading(true);
      }
      lastHostFetchTimeMap.set(targetEmail, Date.now());

      const [staysData, hostByEmailRes, guestsRes] = await Promise.all([
        staysAPI.getHostProperties().catch((e) => {
          console.warn('staysAPI.getHostProperties error:', e);
          return [];
        }),
        adminAPI.getHostByEmail(targetEmail).catch(() => null),
        adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] })),
      ]);

      if (Array.isArray(guestsRes?.guests)) {
        saveGuestsToCache(targetEmail, guestsRes.guests);
        setGuests((prev) => {
          if (Array.isArray(prev) && prev.length === guestsRes.guests.length) {
            const isSame = prev.every((g, i) => {
              const nextG = guestsRes.guests[i];
              return (
                g._id === nextG._id &&
                g.status === nextG.status &&
                g.paymentStatus === nextG.paymentStatus &&
                g.updatedAt === nextG.updatedAt
              );
            });
            if (isSame) return prev;
          }
          return guestsRes.guests;
        });
      }

      // STRICT MULTI-TENANT FILTER: Stays must match targetEmail or user._id
      const myStays = (Array.isArray(staysData) ? staysData : []).filter((s) => {
        const stayEmail = (s.email || s.hostEmail || '').trim().toLowerCase();
        const stayHostId = (s.hostId?._id || s.hostId || '').toString();
        const myId = (user?._id || '').toString();
        if (stayEmail && targetEmail && stayEmail === targetEmail) return true;
        if (stayHostId && myId && stayHostId === myId) return true;
        return false;
      });

      const hostMatchesTarget = hostByEmailRes?.host && (!hostByEmailRes.host.email || hostByEmailRes.host.email.trim().toLowerCase() === targetEmail);

      let foundHost = myStays.length > 0 ? myStays[0] : null;
      if (!foundHost && hostMatchesTarget) {
        foundHost = hostByEmailRes.host;
      }

      if (foundHost) {
        const propId = foundHost._id || foundHost.email || 'default';
        const notifiedKey = `roomscout_approved_notified_${propId}`;
        const legacyNotifiedKey = `stayhub_approved_notified_${propId}`;
        const isApproved = foundHost.status === 'Approved' || Boolean(foundHost.isApproved);
        const alreadyNotified =
          typeof window !== 'undefined' &&
          (localStorage.getItem(notifiedKey) === 'true' || localStorage.getItem(legacyNotifiedKey) === 'true');

        if (isApproved) {
          if (!alreadyNotified) {
            if (hasInitialFetchedRef.current && prevStatusRef.current && prevStatusRef.current !== 'Approved') {
              toast.success('🎉 Property approved by Admin! Room scheduling is now unlocked.');
            }
            try {
              localStorage.setItem(notifiedKey, 'true');
              localStorage.removeItem(legacyNotifiedKey);
            } catch {
              /* ignore */
            }
          }
          if (
            typeof updateUserSession === 'function' &&
            (!user?.isApproved || user?.status !== 'Approved')
          ) {
            updateUserSession((prev) => ({
              ...(prev || {}),
              status: 'Approved',
              isApproved: true,
            }));
          }
        } else {
          try {
            localStorage.removeItem(notifiedKey);
            localStorage.removeItem(legacyNotifiedKey);
          } catch {
            /* ignore */
          }
        }

        prevStatusRef.current = foundHost.status;
        hasInitialFetchedRef.current = true;

        const serverRates = Array.isArray(foundHost.roomRates) ? foundHost.roomRates : [];
        const serverRooms = Array.isArray(foundHost.rooms) ? foundHost.rooms : [];

        const initialSavedNumbers = new Set(
          serverRooms.map((r) => String(r.roomNumber || '').trim()).filter(Boolean)
        );
        setSavedRoomNumbers(initialSavedNumbers);
        savedRoomNumbersRef.current = initialSavedNumbers;

        setHostProperty((prev) => {
          if (hasUnsavedChangesRef.current && latestHostPropertyRef.current && latestHostPropertyRef.current.email === targetEmail) {
            const merged = {
              ...latestHostPropertyRef.current,
              status: isApproved ? 'Approved' : (latestHostPropertyRef.current.status || 'Pending Approval'),
              isApproved: isApproved || Boolean(latestHostPropertyRef.current.isApproved),
            };
            latestHostPropertyRef.current = merged;
            return merged;
          }

          const localRates = serverRates;
          const localRooms = serverRooms;
          const finalRates = Array.isArray(localRates) ? localRates : serverRates;
          const rawRooms = Array.isArray(localRooms) ? localRooms : serverRooms;

          const normalizedRates = finalRates.map((rr, idx) => ({
            ...rr,
            rateUnit: rr.rateUnit || '/night',
            _id: rr._id || `rate_${idx}`,
          }));

          const finalRooms = rawRooms.map((rm, idx) => {
            const rId = rm._id || `room_${rm.roomNumber || idx + 1}`;
            let rRateId = rm.rateId;
            let rCatIndex = rm.categoryIndex;
            let rType = rm.type;

            const hasValidRateId = normalizedRates.some((rate) => String(rate._id) === String(rRateId));
            if (!rRateId || !hasValidRateId) {
              let matchedIdx = normalizedRates.findIndex(
                (rate) => rate.type && rm.type && rate.type.trim().toLowerCase() === rm.type.trim().toLowerCase()
              );
              if (matchedIdx === -1 && typeof rm.categoryIndex === 'number' && normalizedRates[rm.categoryIndex]) {
                matchedIdx = rm.categoryIndex;
              }
              if (matchedIdx === -1) {
                const rmPriceNum = parseInt(String(rm.price || '').replace(/[^0-9]/g, ''), 10);
                if (rmPriceNum > 0) {
                  matchedIdx = normalizedRates.findIndex((rate) => {
                    const rPriceNum = parseInt(String(rate.price || '').replace(/[^0-9]/g, ''), 10);
                    return rPriceNum === rmPriceNum;
                  });
                }
              }

              if (matchedIdx !== -1) {
                const matchedRate = normalizedRates[matchedIdx];
                rRateId = matchedRate._id;
                rCatIndex = matchedIdx;
                if (matchedRate.type && (!rType || rType === 'Standard')) {
                  rType = matchedRate.type;
                }
              }
            }

            return {
              ...rm,
              _id: rm._id || rId,
              rateId: rRateId || '',
              categoryIndex: typeof rCatIndex === 'number' ? rCatIndex : undefined,
              type: rType || 'Standard',
            };
          });

          const hasActualProperty = Boolean(
            foundHost.propertyName ||
            foundHost.title ||
            foundHost.location ||
            foundHost.city ||
            (Array.isArray(foundHost.rooms) && foundHost.rooms.length > 0)
          );

          const res = {
            ...foundHost,
            _id: foundHost._id || user?._id || '',
            stayId: foundHost.stayId || (hasActualProperty ? foundHost._id : null),
            hostId: foundHost.hostId?._id || foundHost.hostId || foundHost.host?._id || hostByEmailRes?.host?._id || user?._id || null,
            name: foundHost.name || foundHost.hostName || user?.name || '',
            email: targetEmail,
            phone: foundHost.phone || user?.phone || '',
            propertyName: hasActualProperty ? (foundHost.propertyName || foundHost.title || '') : '',
            title: hasActualProperty ? (foundHost.title || foundHost.propertyName || '') : '',
            propertyType: hasActualProperty ? (foundHost.propertyType || foundHost.type || '') : '',
            genderType: hasActualProperty ? (foundHost.genderType || '') : '',
            description: hasActualProperty ? (foundHost.description || '') : '',
            address: hasActualProperty ? (foundHost.address || foundHost.location || '') : '',
            location: hasActualProperty ? (foundHost.location || foundHost.address || '') : '',
            roadArea: hasActualProperty ? (foundHost.roadArea || '') : '',
            city: hasActualProperty ? (foundHost.city || '') : '',
            state: hasActualProperty ? (foundHost.state || '') : '',
            pincode: hasActualProperty ? (foundHost.pincode || '') : '',
            latitude: hasActualProperty && foundHost.latitude !== undefined && foundHost.latitude !== null && foundHost.latitude !== '' ? Number(foundHost.latitude) : null,
            longitude: hasActualProperty && foundHost.longitude !== undefined && foundHost.longitude !== null && foundHost.longitude !== '' ? Number(foundHost.longitude) : null,
            image: hasActualProperty ? (foundHost.image || (Array.isArray(foundHost.images) && foundHost.images[0]) || '') : '',
            images: hasActualProperty
              ? (Array.isArray(foundHost.images) && foundHost.images.length > 0 ? foundHost.images : (foundHost.image ? [foundHost.image] : []))
              : [],
            instagramVideoUrl: hasActualProperty ? (foundHost.instagramVideoUrl || '') : '',
            facilities: hasActualProperty ? (Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : [])) : [],
            amenities: hasActualProperty ? (Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : [])) : [],
            rules: hasActualProperty ? (Array.isArray(foundHost.rules) ? foundHost.rules : []) : [],
            status: foundHost.status || user?.status || 'Pending Approval',
            isApproved: isApproved,
            rating: hasActualProperty && foundHost.rating ? Number(foundHost.rating) : null,
            roomRates: normalizedRates,
            rooms: finalRooms,
            totalRooms: finalRooms.length,
            availableRooms: finalRooms.filter((rm) => rm.status === 'Available').length,
          };

          if (isHostPropertyEqual(prev, res)) {
            latestHostPropertyRef.current = prev;
            return prev;
          }

          latestHostPropertyRef.current = res;
          saveHostPropertyToCache(targetEmail, res);
          return res;
        });
      } else {
        // STRICT CLEAN STATE: Host exists but has NO property uploaded yet
        const cleanEmptyHost = {
          ...DEFAULT_HOST_PROPERTY,
          _id: user?._id || hostByEmailRes?.host?._id || '',
          id: user?._id || hostByEmailRes?.host?._id || '',
          name: user?.name || hostByEmailRes?.host?.name || '',
          email: targetEmail,
          phone: user?.phone || hostByEmailRes?.host?.phone || '',
          status: user?.status || hostByEmailRes?.host?.status || 'Pending Approval',
          isApproved: user?.status === 'Approved' || hostByEmailRes?.host?.status === 'Approved' || Boolean(user?.isApproved),
          propertyName: '',
          title: '',
          propertyType: '',
          category: '',
          genderType: '',
          location: '',
          address: '',
          roadArea: '',
          city: '',
          state: '',
          pincode: '',
          latitude: null,
          longitude: null,
          rooms: [],
          roomRates: [],
          facilities: [],
          rules: [],
          images: [],
          image: '',
          description: '',
          rating: null,
          totalRooms: 0,
          availableRooms: 0,
        };

        latestHostPropertyRef.current = cleanEmptyHost;
        setHostProperty(cleanEmptyHost);
        saveHostPropertyToCache(targetEmail, cleanEmptyHost);
        setSavedRoomNumbers(new Set());
        savedRoomNumbersRef.current = new Set();
        setGuests([]);
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?._id, user?.name, user?.phone, user?.status, user?.isApproved, updateUserSession]);

  // Detect Host Identity / Session Change: Immediately wipe any old host's state!
  useEffect(() => {
    if (prevUserEmailRef.current !== currentEmail) {
      prevUserEmailRef.current = currentEmail;
      hasUnsavedChangesRef.current = false;
      prevStatusRef.current = null;
      hasInitialFetchedRef.current = false;

      const freshInitial = getInitialHostProperty(currentEmail, locationState?.updatedHost);
      setHostProperty(freshInitial);
      latestHostPropertyRef.current = freshInitial;

      const freshGuests = getInitialGuests(currentEmail);
      setGuests(freshGuests);
      setSavedRoomNumbers(new Set());
      savedRoomNumbersRef.current = new Set();

      if (currentEmail) {
        fetchHostData();
      }
    }
  }, [currentEmail, locationState?.updatedHost, fetchHostData]);

  // Handle locationState updates and initial fetch
  useEffect(() => {
    if (locationState?.updatedHost && (!locationState.updatedHost.email || locationState.updatedHost.email.trim().toLowerCase() === currentEmail)) {
      setHostProperty(locationState.updatedHost);
      saveHostPropertyToCache(currentEmail, locationState.updatedHost);
      setLoading(false);
    }

    if (currentEmail) {
      const lastFetch = lastHostFetchTimeMap.get(currentEmail) || 0;
      const cached = cachedHostPropertyMap.get(currentEmail);
      const isFresh = Boolean(cached?._id) && (Date.now() - lastFetch < 20000);

      if (!isFresh) {
        fetchHostData();
      }
    }
  }, [currentEmail, user?._id, fetchHostData, locationState?.updatedHost]);

  // Tab Guard: If property is awaiting initial admin approval, lock navigation strictly to 'property' tab
  useEffect(() => {
    if (!loading && hostProperty) {
      const isApprovedHost = hostProperty?.status === 'Approved' || hostProperty?.isApproved === true;
      if (!isApprovedHost && activeTab !== 'property') {
        setActiveTab('property');
      }
    }
  }, [hostProperty, activeTab, loading, setActiveTab]);

  // Auto-refresh guests when switching to 'users' tab
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab === 'users' && prevActiveTabRef.current !== 'users') {
      refreshGuests();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, refreshGuests]);

  // Sync event listeners: storage, custom events, focus, visibility, BroadcastChannel
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === 'stayhub_admin_sync_ts' ||
        e.key === 'stayhub_host_approved_ts' ||
        (e.key && (e.key.startsWith('stayhub_') || e.key.startsWith('roomscout_')))
      ) {
        fetchHostData();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleCustomSync = (e) => {
      if (e?.detail?.sender === 'HostDashboard') return;
      fetchHostData();
    };
    window.addEventListener('stayhub_admin_sync', handleCustomSync);
    window.addEventListener('stayhub_slots_updated', handleCustomSync);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (event.data?.sender === 'HostDashboard') return;
          fetchHostData();
        };
      }
    } catch {
      /* ignore */
    }

    const handleFocus = () => {
      if (currentEmail) {
        const last = lastHostFetchTimeMap.get(currentEmail) || 0;
        if (Date.now() - last > 5000) {
          fetchHostData();
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentEmail) {
        const last = lastHostFetchTimeMap.get(currentEmail) || 0;
        if (Date.now() - last > 5000) {
          fetchHostData();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bc) {
        try {
          bc.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [fetchHostData, currentEmail]);

  return {
    hostProperty,
    setHostProperty,
    guests,
    setGuests,
    loading,
    latestHostPropertyRef,
    hasUnsavedChangesRef,
    savedRoomNumbers,
    setSavedRoomNumbers,
    savedRoomNumbersRef,
    fetchHostData,
    refreshGuests,
  };
}
