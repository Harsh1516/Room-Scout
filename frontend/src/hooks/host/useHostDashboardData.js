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

// Module-level in-memory cache for ultra-fast, zero-flicker mounts & back-navigation
export const cachedHostPropertyMap = new Map();
export const cachedGuestsMap = new Map();
export const lastHostFetchTimeMap = new Map();

export function getInitialHostProperty(userEmail, stateUpdatedHost) {
  if (stateUpdatedHost && (stateUpdatedHost._id || stateUpdatedHost.propertyName)) {
    return stateUpdatedHost;
  }
  const emailKey = userEmail ? userEmail.trim().toLowerCase() : '';
  if (emailKey && cachedHostPropertyMap.has(emailKey)) {
    return cachedHostPropertyMap.get(emailKey);
  }
  if (cachedHostPropertyMap.has('me')) {
    return cachedHostPropertyMap.get('me');
  }
  for (const prop of cachedHostPropertyMap.values()) {
    if (prop && (prop._id || prop.propertyName)) return prop;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (emailKey) {
        const raw = window.sessionStorage.getItem(`roomscout_cached_host_${emailKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed._id || parsed.propertyName)) {
            cachedHostPropertyMap.set(emailKey, parsed);
            return parsed;
          }
        }
      }
      const rawFallback = window.sessionStorage.getItem('roomscout_cached_host_latest');
      if (rawFallback) {
        const parsed = JSON.parse(rawFallback);
        if (parsed && (parsed._id || parsed.propertyName)) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_HOST_PROPERTY;
}

export function getInitialGuests(userEmail) {
  const emailKey = userEmail ? userEmail.trim().toLowerCase() : '';
  if (emailKey && cachedGuestsMap.has(emailKey)) {
    return cachedGuestsMap.get(emailKey);
  }
  if (cachedGuestsMap.has('me')) {
    return cachedGuestsMap.get('me');
  }
  for (const gList of cachedGuestsMap.values()) {
    if (Array.isArray(gList) && gList.length > 0) return gList;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (emailKey) {
        const raw = window.sessionStorage.getItem(`roomscout_cached_guests_${emailKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      const rawLatest = window.sessionStorage.getItem('roomscout_cached_guests_latest');
      if (rawLatest) {
        const parsed = JSON.parse(rawLatest);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function saveHostPropertyToCache(email, data) {
  if (!data || (!data._id && !data.propertyName)) return;
  const emailKey = email ? email.trim().toLowerCase() : '';
  if (emailKey) cachedHostPropertyMap.set(emailKey, data);
  cachedHostPropertyMap.set('me', data);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (emailKey) {
        window.sessionStorage.setItem(`roomscout_cached_host_${emailKey}`, JSON.stringify(data));
      }
      window.sessionStorage.setItem('roomscout_cached_host_latest', JSON.stringify(data));
    } catch {
      /* ignore storage quota */
    }
  }
}

export function saveGuestsToCache(email, data) {
  if (!Array.isArray(data)) return;
  const emailKey = email ? email.trim().toLowerCase() : '';
  if (emailKey) cachedGuestsMap.set(emailKey, data);
  cachedGuestsMap.set('me', data);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (emailKey) {
        window.sessionStorage.setItem(`roomscout_cached_guests_${emailKey}`, JSON.stringify(data));
      }
      window.sessionStorage.setItem('roomscout_cached_guests_latest', JSON.stringify(data));
    } catch {
      /* ignore storage quota */
    }
  }
}

export function isHostPropertyEqual(prev, next) {
  if (!prev || !next) return false;
  if (prev === next) return true;
  if (prev._id !== next._id) return false;
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
      const targetEmail = latestHostPropertyRef.current?.email || hostProperty?.email || (user?.email ? user.email.trim().toLowerCase() : '');
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
    try {
      if (!latestHostPropertyRef.current || !latestHostPropertyRef.current._id) {
        setLoading(true);
      }
      const targetEmail = user?.email ? user.email.trim().toLowerCase() : '';
      if (targetEmail) {
        lastHostFetchTimeMap.set(targetEmail, Date.now());
      }
      lastHostFetchTimeMap.set('me', Date.now());

      const [staysData, hostByEmailRes, guestsRes] = await Promise.all([
        staysAPI.getHostProperties().catch((e) => {
          console.warn('staysAPI.getHostProperties error:', e);
          return [];
        }),
        targetEmail ? adminAPI.getHostByEmail(targetEmail).catch(() => null) : null,
        targetEmail ? adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] })) : { guests: [] },
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

      let foundHost = Array.isArray(staysData) && staysData.length > 0 ? staysData[0] : null;
      if (!foundHost && hostByEmailRes?.hasProperty && hostByEmailRes?.host) {
        foundHost = hostByEmailRes.host;
      }

      if (foundHost) {
        const propId = foundHost._id || foundHost.email || 'default';
        const notifiedKey = `roomscout_approved_notified_${propId}`;
        const legacyNotifiedKey = `stayhub_approved_notified_${propId}`;
        const isApproved = foundHost.status === 'Approved';
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
          if (hasUnsavedChangesRef.current && latestHostPropertyRef.current) {
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

          const res = {
            ...foundHost,
            _id: foundHost._id,
            stayId: foundHost.stayId || foundHost._id,
            hostId: foundHost.hostId?._id || foundHost.hostId || foundHost.host?._id || hostByEmailRes?.host?._id || null,
            name: foundHost.name || foundHost.hostName || user?.name || '',
            email: foundHost.email || foundHost.hostEmail || user?.email || '',
            phone: foundHost.phone || user?.phone || '',
            propertyName: foundHost.propertyName || foundHost.title || '',
            title: foundHost.title || foundHost.propertyName || '',
            propertyType: foundHost.propertyType || foundHost.type || '',
            genderType: foundHost.genderType || '',
            description: foundHost.description || '',
            address: foundHost.address || foundHost.location || '',
            location: foundHost.location || foundHost.address || '',
            roadArea: foundHost.roadArea || '',
            city: foundHost.city || '',
            state: foundHost.state || '',
            pincode: foundHost.pincode || '',
            latitude: foundHost.latitude !== undefined && foundHost.latitude !== null && foundHost.latitude !== '' ? Number(foundHost.latitude) : null,
            longitude: foundHost.longitude !== undefined && foundHost.longitude !== null && foundHost.longitude !== '' ? Number(foundHost.longitude) : null,
            image: foundHost.image || (Array.isArray(foundHost.images) && foundHost.images[0]) || foundHost.property?.image || '',
            images: Array.isArray(foundHost.images) && foundHost.images.length > 0
              ? foundHost.images
              : (Array.isArray(foundHost.property?.images) && foundHost.property.images.length > 0
                ? foundHost.property.images
                : (foundHost.image ? [foundHost.image] : [])),
            instagramVideoUrl: foundHost.instagramVideoUrl || foundHost.property?.instagramVideoUrl || '',
            facilities: Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : []),
            amenities: Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : []),
            rules: Array.isArray(foundHost.rules) ? foundHost.rules : [],
            status: foundHost.status || 'Pending Approval',
            rating: foundHost.rating ? Number(foundHost.rating) : null,
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
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, updateUserSession]);

  // Handle locationState updates and initial fetch
  useEffect(() => {
    if (locationState?.updatedHost) {
      setHostProperty(locationState.updatedHost);
      saveHostPropertyToCache(user?.email, locationState.updatedHost);
      setLoading(false);
    }

    const emailKey = user?.email ? user.email.trim().toLowerCase() : '';
    const lastFetch = (emailKey ? lastHostFetchTimeMap.get(emailKey) : 0) || lastHostFetchTimeMap.get('me') || 0;
    const cached = emailKey ? cachedHostPropertyMap.get(emailKey) : cachedHostPropertyMap.get('me');
    const isFresh = Boolean(cached?._id) && (Date.now() - lastFetch < 20000);

    if (!isFresh) {
      fetchHostData();
    }
  }, [user?.email, user?._id, fetchHostData, locationState?.updatedHost]);

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

  // Sync event listeners: storage, custom events, focus, visibility, BroadcastChannel, 10s poll
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === 'stayhub_admin_sync_ts' ||
        e.key === 'stayhub_host_approved_ts' ||
        (e.key && e.key.startsWith('stayhub_')) ||
        (e.key && e.key.startsWith('roomscout_'))
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
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);
    window.addEventListener('stayhub_host_approved', handleCustomSync);

    const FOCUS_THROTTLE_MS = 25000;
    const targetEmail = user?.email ? user.email.trim().toLowerCase() : 'me';

    const handleFocus = () => {
      if (!document.hidden) {
        const now = Date.now();
        const lastFetch = (targetEmail !== 'me' ? lastHostFetchTimeMap.get(targetEmail) : 0) || lastHostFetchTimeMap.get('me') || 0;
        if (now - lastFetch >= FOCUS_THROTTLE_MS) {
          fetchHostData();
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const lastFetch = (targetEmail !== 'me' ? lastHostFetchTimeMap.get(targetEmail) : 0) || lastHostFetchTimeMap.get('me') || 0;
        if (now - lastFetch >= FOCUS_THROTTLE_MS) {
          fetchHostData();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (event.data?.sender === 'HostDashboard') return;
          if (['HOST_APPROVED', 'HOST_UPDATED', 'HOST_DELETED', 'ADMIN_SYNC'].includes(event.data?.type)) {
            fetchHostData();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    const pollTimer = setInterval(() => {
      if (document.hidden) return;
      if (latestHostPropertyRef.current?.isApproved || latestHostPropertyRef.current?.status === 'Approved') {
        refreshGuests();
      } else {
        fetchHostData();
      }
    }, 10000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
      window.removeEventListener('stayhub_host_approved', handleCustomSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bc) bc.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [fetchHostData, refreshGuests, user?.email]);

  return {
    hostProperty,
    setHostProperty,
    guests,
    setGuests,
    loading,
    setLoading,
    latestHostPropertyRef,
    hasUnsavedChangesRef,
    savedRoomNumbers,
    setSavedRoomNumbers,
    savedRoomNumbersRef,
    fetchHostData,
    refreshGuests,
  };
}

