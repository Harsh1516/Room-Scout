import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, staysAPI, bookingsAPI } from '../services/api';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import HostRoomCategories from '../components/host/HostRoomCategories';
import HostWeeklySlotSchedule from '../components/host/HostWeeklySlotSchedule';
import { HostUsersVisitedSection } from '../components/host/HostUsersVisitedSection';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { getUpcoming30Days } from '../utils/dateUtils';

export function HostDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'property');
  const [hostProperty, setHostProperty] = useState(() => location.state?.updatedHost || null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(() => !location.state?.updatedHost);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [activeRightPanelTab, setActiveRightPanelTab] = useState('guest');
  const [requestedUserBooking, setRequestedUserBooking] = useState(null);
  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const roomCardsScrollRef = useRef(null);
  const prevStatusRef = useRef(hostProperty?.status);

  const showToast = useCallback((msg, type = 'info') => {
    if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
      toast.error(msg);
    } else if (type === 'success' || msg.toLowerCase().includes('updated') || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('saved')) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (activeTab !== 'property') {
      setActiveTab('property');
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [activeTab, navigate]);

  const handleSelectUserRequest = useCallback((request) => {
    if (!request) return;
    setRequestedUserBooking(request);

    const rawReqRoomNum = String(request.roomNumber || '').replace(/[^0-9]/g, '');
    const foundRoom = (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).find(
      (r) =>
        (rawReqRoomNum && String(r.roomNumber || '').replace(/[^0-9]/g, '') === rawReqRoomNum) ||
        (String(r.roomNumber || '').trim().toLowerCase() === String(request.roomNumber || '').trim().toLowerCase()) ||
        (request.roomId && (r.id === request.roomId || r._id === request.roomId)) ||
        (request.roomCardId && (r.id === request.roomCardId || r._id === request.roomCardId))
    );

    let catIndex = 0;
    if (foundRoom?.type && Array.isArray(hostProperty?.roomRates)) {
      const idx = hostProperty.roomRates.findIndex(
        (rate) => rate.type?.trim().toLowerCase() === foundRoom.type.trim().toLowerCase()
      );
      if (idx !== -1) catIndex = idx;
    } else if (request.roomType && Array.isArray(hostProperty?.roomRates)) {
      const idx = hostProperty.roomRates.findIndex(
        (rate) => rate.type?.trim().toLowerCase() === request.roomType.trim().toLowerCase()
      );
      if (idx !== -1) catIndex = idx;
    }

    setSelectedCategoryIndex(catIndex);
    if (foundRoom) {
      setSelectedRoomCardId(foundRoom.id || foundRoom._id || foundRoom.roomNumber);
    }

    setActiveTab('room');
    setActiveRightPanelTab('guest');
  }, [hostProperty]);

  const activeCategory = hostProperty?.roomRates?.[selectedCategoryIndex] || hostProperty?.roomRates?.[0] || null;

  const activeCategoryRooms = useMemo(() => {
    if (!activeCategory?.type) return [];
    const catType = String(activeCategory.type).toLowerCase().trim();
    return (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [])
      .filter((r) => r.type && String(r.type).toLowerCase().trim() === catType)
      .map((r, idx) => ({
        ...r,
        id: r.id || r._id || `room_${r.roomNumber || idx + 1}`,
        _id: r._id || r.id || `room_${r.roomNumber || idx + 1}`,
      }));
  }, [hostProperty?.rooms, activeCategory?.type]);

  const handleRoomCardsWheel = useCallback((e) => {
    const el = roomCardsScrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  const setRoomCardsScrollRef = useCallback((node) => {
    if (roomCardsScrollRef.current) {
      roomCardsScrollRef.current.removeEventListener('wheel', handleRoomCardsWheel);
    }
    roomCardsScrollRef.current = node;
    if (node) {
      node.addEventListener('wheel', handleRoomCardsWheel, { passive: false });
    }
  }, [handleRoomCardsWheel]);

  useEffect(() => {
    const el = roomCardsScrollRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleRoomCardsWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleRoomCardsWheel);
    };
  }, [activeTab, selectedCategoryIndex, activeCategoryRooms.length, handleRoomCardsWheel]);

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const broadcastStayUpdate = (stayId) => {
    try {
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { stayId, sender: 'HostDashboard' } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'ROOMS_UPDATED', stayId, sender: 'HostDashboard' });
        bc.close();
      }
    } catch {}
  };

  const updateRoomRateDebounceRef = useRef(null);
  const updateRoomNumberDebounceRef = useRef(null);
  const latestHostPropertyRef = useRef(hostProperty);
  useEffect(() => {
    latestHostPropertyRef.current = hostProperty;
  }, [hostProperty]);

  const handleAddNewRoomTypeRow = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentRates = Array.isArray(hostProperty?.roomRates) ? [...hostProperty.roomRates] : [];

    const newRate = {
      id: newId,
      type: '',
      price: '',
      rateUnit: '',
    };
    const updatedRates = [...currentRates, newRate];
    const newIdx = updatedRates.length - 1;
    const updatedHost = {
      ...(hostProperty || {}),
      roomRates: updatedRates,
    };
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    setSelectedCategoryIndex(newIdx);
    setCollapsedCategories((prev) => ({
      ...prev,
      [newIdx]: false,
    }));

    adminAPI.createHost(updatedHost)
      .then(() => broadcastStayUpdate(updatedHost.id || updatedHost._id))
      .catch((err) => console.warn('Add room rate immediate save error:', err));
  };

  const handleUpdateRoomRate = (index, field, value) => {
    let nextUpdatedHost = null;
    setHostProperty((prev) => {
      if (!prev) return prev;
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const oldType = currentRates[index].type;
      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...currentRates[index], ...field };
      } else {
        currentRates[index] = { ...currentRates[index], [field]: value };
      }

      let updatedRooms = prev.rooms;
      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);

      if (newType !== undefined && oldType && Array.isArray(prev.rooms)) {
        updatedRooms = prev.rooms.map((r) =>
          r.type?.trim().toLowerCase() === oldType.trim().toLowerCase() ? { ...r, type: newType } : r
        );
      }
      if (newPrice !== undefined && currentRates[index].type && Array.isArray(prev.rooms)) {
        updatedRooms = prev.rooms.map((r) =>
          r.type?.trim().toLowerCase() === currentRates[index].type.trim().toLowerCase() ? { ...r, price: newPrice } : r
        );
      }
      if (newRateUnit !== undefined && currentRates[index].type && Array.isArray(prev.rooms)) {
        updatedRooms = prev.rooms.map((r) =>
          r.type?.trim().toLowerCase() === currentRates[index].type.trim().toLowerCase() ? { ...r, rateUnit: newRateUnit } : r
        );
      }

      nextUpdatedHost = { ...prev, roomRates: currentRates, rooms: updatedRooms };
      latestHostPropertyRef.current = nextUpdatedHost;
      return nextUpdatedHost;
    });

    if (updateRoomRateDebounceRef.current) {
      clearTimeout(updateRoomRateDebounceRef.current);
    }
    updateRoomRateDebounceRef.current = setTimeout(() => {
      updateRoomRateDebounceRef.current = null;
      const hostToSave = latestHostPropertyRef.current || nextUpdatedHost;
      if (hostToSave) {
        adminAPI.createHost(hostToSave)
          .then(() => broadcastStayUpdate(hostToSave.id || hostToSave._id))
          .catch((err) => console.warn('Debounced category rate save error:', err));
      }
    }, 600);
  };

  const handleSaveRoomRateOnBlur = async () => {
    if (updateRoomRateDebounceRef.current) {
      clearTimeout(updateRoomRateDebounceRef.current);
      updateRoomRateDebounceRef.current = null;
    }
    const targetHost = latestHostPropertyRef.current || hostProperty;
    if (!targetHost) return;
    try {
      await adminAPI.createHost(targetHost);
      broadcastStayUpdate(targetHost.id || targetHost._id);
    } catch (err) {
      console.warn('Auto save blur error:', err);
    }
  };

  const handleRemoveRoomRate = async (index) => {
    if (!hostProperty) return;
    const currentRates = Array.isArray(hostProperty.roomRates) ? [...hostProperty.roomRates] : [];
    const removed = currentRates[index];
    if (!removed) return;
    currentRates.splice(index, 1);

    const removedType = (removed.type || '').trim().toLowerCase();
    const updatedRooms = Array.isArray(hostProperty.rooms)
      ? (removedType
          ? hostProperty.rooms.filter((r) => (r.type || '').trim().toLowerCase() !== removedType)
          : hostProperty.rooms)
      : [];

    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const nextStatus = (updatedRooms.length === 0 || currentRates.length === 0)
      ? 'Pending Approval'
      : (hostProperty.status || 'Pending Approval');

    const updatedHost = {
      ...hostProperty,
      roomRates: currentRates,
      rooms: updatedRooms,
      totalRooms: totalCount,
      availableRooms: availCount,
      availableRoomsCount: availCount,
      status: nextStatus,
      hostDetails: { ...(hostProperty.hostDetails || {}), status: nextStatus },
    };

    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    setSelectedCategoryIndex((prev) => Math.max(0, Math.min(prev, currentRates.length - 1)));
    toast.info(`Category "${removed.type || 'Unnamed'}" removed.`);

    try {
      await adminAPI.createHost(updatedHost);
      broadcastStayUpdate(updatedHost.id || updatedHost._id);
    } catch (err) {
      console.warn('Delete room rate error:', err);
    }
  };

  const selectedRoomCard = useMemo(() => {
    if (!activeCategoryRooms.length) return null;
    const found = activeCategoryRooms.find(
      (r) =>
        (r.id && r.id === selectedRoomCardId) ||
        (r._id && r._id === selectedRoomCardId) ||
        String(r.roomNumber) === String(selectedRoomCardId)
    );
    return found || activeCategoryRooms[0];
  }, [activeCategoryRooms, selectedRoomCardId]);

  useEffect(() => {
    if (!activeCategoryRooms.length) {
      if (selectedRoomCardId !== null) setSelectedRoomCardId(null);
      return;
    }
    const exists = activeCategoryRooms.some(
      (r) =>
        (r.id && r.id === selectedRoomCardId) ||
        (r._id && r._id === selectedRoomCardId) ||
        String(r.roomNumber) === String(selectedRoomCardId)
    );
    if (!exists) {
      setSelectedRoomCardId(activeCategoryRooms[0]?.id || activeCategoryRooms[0]?._id || null);
    }
  }, [activeCategoryRooms, selectedRoomCardId]);

  const configuredCategoryRooms = useMemo(() => {
    if (!Array.isArray(hostProperty?.roomRates) || !Array.isArray(hostProperty?.rooms)) {
      return [];
    }
    const currentTypes = hostProperty.roomRates
      .map((rate) => (rate.type || '').trim().toLowerCase())
      .filter(Boolean);

    return hostProperty.rooms.filter(
      (room) => room.type && currentTypes.includes(room.type.trim().toLowerCase())
    );
  }, [hostProperty?.roomRates, hostProperty?.rooms]);

  const handleAddRoomCard = (targetCategory) => {
    const cat = targetCategory || activeCategory;
    if (!cat || !cat.type || !cat.type.trim()) {
      showToast('Please enter a room category name first.', 'error');
      return;
    }
    const rawPrice = String(cat.price || '').replace(/[^0-9]/g, '');
    if (!rawPrice || parseInt(rawPrice, 10) <= 0) {
      showToast('Please enter a valid room price first.', 'error');
      return;
    }
    if (!cat.rateUnit || !String(cat.rateUnit).trim()) {
      showToast('Please select a room billing cycle/unit first.', 'error');
      return;
    }

    const cleanCatType = cat.type.trim();
    const allExistingNumbers = new Set(
      (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [])
        .map((r) => parseInt(String(r.roomNumber || '').replace(/[^0-9]/g, ''), 10))
        .filter((n) => !isNaN(n))
    );

    let nextNumInt = 101;
    if (allExistingNumbers.size > 0) {
      const maxNum = Math.max(...Array.from(allExistingNumbers));
      nextNumInt = maxNum + 1;
    }
    while (allExistingNumbers.has(nextNumInt)) {
      nextNumInt++;
    }
    const nextNum = String(nextNumInt);
    const formattedPrice = `₹${parseInt(rawPrice, 10).toLocaleString('en-IN')}`;
    const rateUnit = cat.rateUnit || '/month';

    const newCard = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roomNumber: nextNum,
      roomNumInt: nextNumInt,
      type: cleanCatType,
      price: formattedPrice,
      rateUnit: rateUnit,
      status: 'Available',
      floor: nextNumInt < 100 ? 'Floor 1' : `Floor ${Math.floor(nextNumInt / 100)}`,
    };

    const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
    const updatedRooms = [...currentRooms, newCard];
    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const isAlreadyApproved = hostProperty?.status === 'Approved';
    const nextStatus = isAlreadyApproved ? 'Approved' : 'Pending Approval';
    const isFirstRoom = currentRooms.length === 0;

    const updatedHost = {
      ...(hostProperty || {}),
      rooms: updatedRooms,
      totalRooms: totalCount,
      availableRooms: availCount,
      availableRoomsCount: availCount,
      status: nextStatus,
    };

    handleAutoSyncProperty(updatedHost);
    setSelectedRoomCardId(newCard.id);
    toast.success(`Added Room ${nextNum} to ${cleanCatType}`);
    if (isFirstRoom && !isAlreadyApproved) {
      toast.info('🚀 Property sent to Admin for approval.');
    }
  };

  const handleUpdateRoomNumber = (roomId, newNumber) => {
    let nextUpdatedHost = null;
    setHostProperty((prev) => {
      if (!prev) return prev;
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        if (r.id === roomId) {
          const parsed = parseInt(newNumber.replace(/[^0-9]/g, ''), 10);
          return {
            ...r,
            roomNumber: newNumber,
            roomNumInt: !isNaN(parsed) ? parsed : r.roomNumInt,
          };
        }
        return r;
      });
      nextUpdatedHost = { ...prev, rooms: updatedRooms };
      latestHostPropertyRef.current = nextUpdatedHost;
      return nextUpdatedHost;
    });

    if (updateRoomNumberDebounceRef.current) {
      clearTimeout(updateRoomNumberDebounceRef.current);
    }
    updateRoomNumberDebounceRef.current = setTimeout(() => {
      updateRoomNumberDebounceRef.current = null;
      if (nextUpdatedHost) {
        adminAPI.createHost(nextUpdatedHost).catch((err) => console.warn('Debounced room save error:', err));
      }
    }, 600);
  };

  const handleRemoveRoomCard = async (roomId) => {
    if (!hostProperty) return;
    const currentRooms = Array.isArray(hostProperty.rooms) ? [...hostProperty.rooms] : [];
    const targetRoom = currentRooms.find((r) => r.id === roomId);
    const updatedRooms = currentRooms.filter((r) => r.id !== roomId);
    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const nextStatus = updatedRooms.length === 0 ? 'Pending Approval' : (hostProperty.status || 'Pending Approval');

    const updatedHost = {
      ...hostProperty,
      rooms: updatedRooms,
      totalRooms: totalCount,
      availableRooms: availCount,
      availableRoomsCount: availCount,
      status: nextStatus,
      hostDetails: { ...(hostProperty.hostDetails || {}), status: nextStatus },
    };

    // 1. Save updated host property
    handleAutoSyncProperty(updatedHost);

    // 2. Cascade delete orphaned bookings from database
    if (targetRoom?.roomNumber) {
      const rawNum = String(targetRoom.roomNumber).replace(/[^0-9]/g, '');
      try {
        await bookingsAPI.cascadeDeleteRoomBookings({
          hostEmail: hostProperty.email,
          roomNumber: targetRoom.roomNumber,
        });

        // 3. Immediately clean local guests state
        setGuests((prev) =>
          prev.filter((g) => {
            const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
            return gNum !== rawNum;
          })
        );
      } catch (err) {
        console.warn('Cascade room bookings error:', err);
      }
    }

    if (selectedRoomCardId === roomId) {
      const remainingForActiveCat = updatedRooms.filter(
        (r) => r.type && activeCategory?.type && r.type.trim().toLowerCase() === activeCategory.type.trim().toLowerCase()
      );
      setSelectedRoomCardId(remainingForActiveCat[0]?.id || updatedRooms[0]?.id || null);
    }
    toast.info('Room and associated bookings removed');
  };

  const handleAutoSyncProperty = async (updatedHost) => {
    if (!updatedHost) return;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    try {
      await adminAPI.createHost(updatedHost);
      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
        window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
        localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('stayhub_live_channel');
          bc.postMessage({ type: 'HOST_UPDATED', hostId: updatedHost.id || updatedHost._id });
          bc.close();
        }
      } catch (e) {}
    } catch (err) {
      console.warn('Auto-sync property error:', err);
    }
  };


  const refreshGuests = useCallback(async () => {
    try {
      const targetEmail = hostProperty?.email || (user?.email ? user.email.trim().toLowerCase() : '');
      if (!targetEmail) return;

      const guestsRes = await adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] }));
      if (Array.isArray(guestsRes?.guests)) {
        setGuests(guestsRes.guests);
      }
    } catch (err) {
      console.warn('refreshGuests error:', err);
    }
  }, [user?.email, hostProperty?.email]);

  const fetchHostData = async () => {
    if (updateRoomRateDebounceRef.current || updateRoomNumberDebounceRef.current) return;
    try {
      if (!hostProperty) setLoading(true);
      const targetEmail = user?.email ? user.email.trim().toLowerCase() : '';

      const [staysData, hostByEmailRes, guestsRes] = await Promise.all([
        staysAPI.getHostProperties().catch((e) => {
          console.warn('staysAPI.getHostProperties error:', e);
          return [];
        }),
        targetEmail ? adminAPI.getHostByEmail(targetEmail).catch(() => null) : null,
        targetEmail ? adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] })) : { guests: [] },
      ]);

      if (Array.isArray(guestsRes?.guests)) {
        setGuests(guestsRes.guests);
      }

      let foundHost = Array.isArray(staysData) && staysData.length > 0 ? staysData[0] : null;
      if (!foundHost && hostByEmailRes?.hasProperty && hostByEmailRes?.host) {
        foundHost = hostByEmailRes.host;
      }

      if (foundHost) {
        if (prevStatusRef.current && prevStatusRef.current !== 'Approved' && foundHost.status === 'Approved') {
          toast.success('🎉 Property approved by Admin! Room scheduling is now unlocked.');
        }
        prevStatusRef.current = foundHost.status;

        const serverRates = Array.isArray(foundHost.roomRates) ? foundHost.roomRates : [];
        const serverRooms = Array.isArray(foundHost.rooms) ? foundHost.rooms : [];

        setHostProperty((prev) => {
          const localRates = latestHostPropertyRef.current?.roomRates || prev?.roomRates;
          const localRooms = latestHostPropertyRef.current?.rooms || prev?.rooms;
          const finalRates = Array.isArray(localRates) && localRates.length > 0 ? localRates : serverRates;
          const rawRooms = Array.isArray(localRooms) && localRooms.length > 0 ? localRooms : serverRooms;
          const finalRooms = rawRooms.map((rm, idx) => ({
            ...rm,
            id: rm.id || rm._id || `room_${rm.roomNumber || idx + 1}`,
            _id: rm._id || rm.id || `room_${rm.roomNumber || idx + 1}`,
          }));

          const res = {
            ...foundHost,
            id: foundHost.id || foundHost._id,
            _id: foundHost._id || foundHost.id,
            stayId: foundHost.id || foundHost._id,
            hostId: foundHost.hostId?._id || foundHost.hostId || foundHost.host?._id || hostByEmailRes?.host?._id || null,
            name: foundHost.name || foundHost.hostName || user?.name || '',
            email: foundHost.email || foundHost.hostEmail || user?.email || '',
            phone: foundHost.phone || user?.phone || '',
            propertyName: foundHost.propertyName || foundHost.title || '',
            title: foundHost.title || foundHost.propertyName || '',
            propertyType: foundHost.propertyType || foundHost.type || 'PG',
            genderType: foundHost.genderType || 'Both',
            description: foundHost.description || '',
            address: foundHost.address || foundHost.location || '',
            location: foundHost.location || foundHost.address || '',
            roadArea: foundHost.roadArea || '',
            city: foundHost.city || '',
            state: foundHost.state || '',
            pincode: foundHost.pincode || '',
            latitude: Number(foundHost.latitude) || 29.3919,
            longitude: Number(foundHost.longitude) || 79.4542,
            facilities: Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : []),
            amenities: Array.isArray(foundHost.facilities) ? foundHost.facilities : (Array.isArray(foundHost.amenities) ? foundHost.amenities : []),
            rules: Array.isArray(foundHost.rules) ? foundHost.rules : [],
            status: foundHost.status || 'Pending Approval',
            rating: Number(foundHost.rating) || 4.8,
            roomRates: finalRates,
            rooms: finalRooms,
            totalRooms: finalRooms.length,
            availableRooms: finalRooms.filter((rm) => rm.status === 'Available').length,
          };
          latestHostPropertyRef.current = res;
          return res;
        });
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
    if (location.state?.updatedHost) {
      setHostProperty(location.state.updatedHost);
      setLoading(false);
    }
    fetchHostData();
  }, [location.key, user?.email, user?.id]);

  useEffect(() => {
    if (activeTab === 'users') {
      refreshGuests();
    }
  }, [activeTab, refreshGuests]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'stayhub_admin_sync_ts' || (e.key && e.key.startsWith('stayhub_'))) fetchHostData();
    };
    window.addEventListener('storage', handleStorage);
    const handleCustomSync = (e) => {
      if (e?.detail?.sender === 'HostDashboard') return;
      fetchHostData();
    };
    window.addEventListener('stayhub_admin_sync', handleCustomSync);
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);
    window.addEventListener('focus', fetchHostData);

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

    let pollTimer = null;
    if (hostProperty && hostProperty.status !== 'Approved') {
      pollTimer = setInterval(fetchHostData, 10000);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
      window.removeEventListener('focus', fetchHostData);
      if (bc) bc.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [hostProperty?.status]);

  // Active check-in count for the current day
  const todayCheckInsCount = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayISO = `${year}-${month}-${day}`;

    const activeRooms = new Set(
      Array.isArray(hostProperty?.rooms)
        ? hostProperty.rooms.map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
        : []
    );

    const extractKey = (dateVal) => {
      if (!dateVal) return '';
      if (Array.isArray(dateVal)) return dateVal.length > 0 ? extractKey(dateVal[0]) : '';
      const str = String(dateVal).trim();
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear() < 2025 ? 2026 : dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const dy = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
      }
      const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        let [_, y, m, dy] = match;
        if (parseInt(y, 10) < 2025) y = '2026';
        return `${y}-${m}-${dy}`;
      }
      return str;
    };

    // Deduplicate guests (database guests + embedded slot bookings)
    const existingGuestKeys = new Set();
    const uniqueGuests = [];

    const rawList = Array.isArray(guests) ? [...guests] : [];
    rawList.forEach((g) => {
      const phone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
      const room = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      const compositeKey = `${room}_${phone}`;
      if (!existingGuestKeys.has(compositeKey)) {
        if (phone && room) existingGuestKeys.add(compositeKey);
        uniqueGuests.push(g);
      }
    });

    // Filter to active rooms and check-in date matching today
    const checkInsToday = uniqueGuests.filter((g) => {
      const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRooms.size > 0 && (!gRoom || !activeRooms.has(gRoom))) return false;

      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st.includes('PENDING') || st === 'CHECKED_OUT') {
        return false;
      }

      const dateSources = [g.checkInISO, g.checkIn].filter(Boolean);
      const isToday = dateSources.some((src) => extractKey(src) === todayISO);
      if (isToday) return true;

      if (g.checkIn) {
        const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = d.getDate();
        if (g.checkIn.includes(shortMonth) && g.checkIn.includes(String(dayNum))) return true;
      }

      return false;
    });

    return checkInsToday.length;
  }, [guests, hostProperty?.rooms]);

  const isPending = hostProperty?.status === 'Pending Approval' || hostProperty?.isApproved === false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5bb2f8] via-[#c6e6fc] via-35% to-[#f4f9fd] text-slate-900 flex flex-col font-sans overflow-x-clip relative">
      {/* Soft Ambient Light Diffusers for Ethereal Sky Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[350px] bg-sky-300/30 rounded-full blur-[140px]" />
        <div className="absolute -top-24 right-1/4 w-[600px] h-[350px] bg-blue-400/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/40 rounded-full blur-[160px]" />
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/45 border-b border-white/60 shadow-[0_4px_24px_rgba(31,38,135,0.04)]">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2.5 z-10">
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/80 bg-white/75 hover:bg-white/95 backdrop-blur-xl text-slate-700 hover:text-slate-900 text-xs font-semibold tracking-tight transition-all cursor-pointer shadow-xs active:scale-[0.98] shrink-0"
              title="Back"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>

            {activeTab === 'room' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddNewRoomTypeRow}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-tight flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer shrink-0 active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold leading-none">+</span>
                  <span>Add Room Type</span>
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  <div className="px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 flex items-center gap-1.5 text-xs shadow-xs">
                    <span className="text-slate-600 font-medium text-[11.5px]">Categories</span>
                    <span className="font-semibold text-emerald-700">
                      {Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates.length : 0}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-xl border border-white/80 flex items-center gap-1.5 text-xs shadow-xs">
                    <span className="text-slate-600 font-medium text-[11.5px]">Rooms</span>
                    <span className="font-semibold text-emerald-700">
                      {configuredCategoryRooms.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Tabs with Smooth Sliding Pill */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/50 backdrop-blur-2xl p-1 rounded-2xl border border-white/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_4px_16px_rgba(31,38,135,0.05)] z-10">
            {[
              { id: 'property', label: 'Property' },
              { id: 'room', label: 'Room' },
              { id: 'users', label: 'Users Visited', badge: todayCheckInsCount },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="hostDashboardActivePill"
                      className="absolute inset-0 rounded-xl bg-emerald-600 shadow-xs"
                      transition={{
                        type: 'spring',
                        stiffness: 550,
                        damping: 38,
                        mass: 0.5,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors duration-200 border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/20'
                          : 'bg-white/80 text-emerald-700 border-white/80'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto z-10">
            {activeTab === 'room' && (
              <button
                type="button"
                onClick={() => setActiveRightPanelTab((prev) => (prev === 'guest' ? 'occupants' : 'guest'))}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none active:scale-95 ${
                  activeRightPanelTab === 'guest'
                    ? 'border border-white/80 bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
                title={activeRightPanelTab === 'guest' ? 'View Room Occupants' : 'Add / Book New Guest'}
              >
                {activeRightPanelTab === 'guest' ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Occupants</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold leading-none">+</span>
                    <span>Add Guest</span>
                  </>
                )}
              </button>
            )}
            <Login />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full overflow-x-clip">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 text-sm">
              Loading host dashboard...
            </div>
          ) : !hostProperty ? (
            <div className="p-10 text-center bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                No Property Registered Yet
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                Please complete your property registration form with location details, facilities, and room rates.
              </p>
              <button
                type="button"
                onClick={() => navigate('/host/upload')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Go to Property Form
              </button>
            </div>
          ) : (
            <div>
              {/* Property Details Tab */}
              <div className={activeTab === 'property' ? 'space-y-5 block' : 'hidden'}>
                  <div className="p-6 sm:p-7 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-white/80 text-emerald-700 text-[11px] font-bold shadow-xs">
                            {hostProperty.propertyType || 'PG'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-white/80 text-slate-700 text-[11px] font-semibold shadow-xs">
                            For: {hostProperty.genderType || 'Both'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[11px] font-semibold shadow-xs">
                            ★ {hostProperty.rating || 4.8}
                          </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                          {hostProperty.propertyName}
                        </h1>
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          {hostProperty.address || hostProperty.location || 'Location not specified'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                            Pending Admin Approval
                          </span>
                        ) : (
                          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs">
                            Approved & Live
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate('/host/upload')}
                          className="px-3.5 py-1.5 rounded-xl border border-white/80 bg-white/80 hover:bg-white text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>

                    {isPending && (
                      <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <span className="font-bold shrink-0">⏳ Status:</span>
                        <span>
                          Property upload request is pending admin review. Once approved by the administrator, your room scheduling slots will unlock and your listing will be visible to guests.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-2">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Property Description
                      </h2>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {hostProperty.description || hostProperty.bio || 'No description provided.'}
                      </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-2">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Address & Location
                      </h2>
                      <div className="text-xs text-slate-700 space-y-1.5">
                        <p><span className="text-slate-400 font-medium">Full Address:</span> {hostProperty.address || '—'}</p>
                        <p><span className="text-slate-400 font-medium">Area / Road:</span> {hostProperty.roadArea || '—'}</p>
                        <p><span className="text-slate-400 font-medium">City / State:</span> {hostProperty.city || '—'}, {hostProperty.state || '—'} {hostProperty.pincode ? `(${hostProperty.pincode})` : ''}</p>
                        <p><span className="text-slate-400 font-medium">Coordinates:</span> {Number(hostProperty.latitude || 29.3919).toFixed(5)}, {Number(hostProperty.longitude || 79.4542).toFixed(5)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-3">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Facilities ({hostProperty.facilities?.length || hostProperty.amenities?.length || 0})
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {((Array.isArray(hostProperty.facilities) && hostProperty.facilities.length > 0) ||
                         (Array.isArray(hostProperty.amenities) && hostProperty.amenities.length > 0)) ? (
                          (hostProperty.facilities || hostProperty.amenities).map((facility, fIdx) => (
                            <span
                              key={fIdx}
                              className="px-3 py-1.5 rounded-lg bg-white/80 border border-white/80 text-slate-700 text-xs font-medium shadow-xs"
                            >
                              {facility}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No facilities listed</span>
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-3">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Rules & Policies ({hostProperty.rules?.length || hostProperty.houseRules?.length || 0})
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(hostProperty.rules) && hostProperty.rules.length > 0) ||
                        (Array.isArray(hostProperty.houseRules) && hostProperty.houseRules.length > 0) ? (
                          (hostProperty.rules || hostProperty.houseRules).map((rule, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-3 py-1.5 rounded-lg bg-white/80 border border-white/80 text-slate-700 text-xs font-medium shadow-xs"
                            >
                              {rule}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No rules specified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {Array.isArray(hostProperty.images) && hostProperty.images.length > 0 && (
                    <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-3">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Property Photos ({hostProperty.images.length})
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {hostProperty.images.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="h-28 rounded-2xl overflow-hidden bg-white/50 border border-white/80 shadow-xs">
                            <img
                              src={imgUrl}
                              alt={`Property ${iIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              {/* Room Schedule & Bookings Tab */}
              <div className={activeTab === 'room' ? 'space-y-4 block' : 'hidden'}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 xl:gap-5 items-start">
                  <div className="space-y-4">
                    <ErrorBoundary>
                      <HostRoomCategories
                        roomRates={hostProperty?.roomRates || []}
                        rooms={hostProperty?.rooms || []}
                        guests={guests}
                        todayISO={upcomingWeek[0]?.fullISO}
                        selectedCategoryIndex={selectedCategoryIndex}
                        onSelectCategoryIndex={setSelectedCategoryIndex}
                        onAddCategory={handleAddNewRoomTypeRow}
                        onRemoveCategory={handleRemoveRoomRate}
                        onUpdateCategory={handleUpdateRoomRate}
                        onSaveCategory={handleSaveRoomRateOnBlur}
                        collapsedCategories={collapsedCategories}
                        onToggleCollapseCategory={toggleCollapseCategory}
                        selectedRoomCardId={selectedRoomCard?.id || selectedRoomCard?._id || selectedRoomCardId}
                        onSelectRoomCardId={setSelectedRoomCardId}
                        onAddRoomCard={handleAddRoomCard}
                        onRemoveRoomCard={handleRemoveRoomCard}
                        onUpdateRoomNumber={handleUpdateRoomNumber}
                      />
                    </ErrorBoundary>
                  </div>

                  <div className="lg:col-span-2">
                    <ErrorBoundary>
                      {selectedRoomCard ? (
                        <HostWeeklySlotSchedule
                          selectedRoomCard={selectedRoomCard}
                          activeCategory={activeCategory}
                          upcomingWeek={upcomingWeek}
                          guests={guests}
                          setGuests={setGuests}
                          hostProperty={hostProperty}
                          onRefreshBookings={refreshGuests}
                          onAutoSyncProperty={handleAutoSyncProperty}
                          showToast={showToast}
                          activeRightPanelTab={activeRightPanelTab}
                          setActiveRightPanelTab={setActiveRightPanelTab}
                          requestedUserBooking={requestedUserBooking}
                          onClearRequestedBooking={() => setRequestedUserBooking(null)}
                        />
                      ) : (
                        <div className="p-12 text-center border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl text-xs text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-950">
                          Select a room card on the left to view schedule and occupants.
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              </div>

              {/* Users Visited Tab */}
              <div className={activeTab === 'users' ? 'block' : 'hidden'}>
                <HostUsersVisitedSection
                  guests={guests}
                  setGuests={setGuests}
                  hostProperty={hostProperty}
                  setHostProperty={setHostProperty}
                  showToast={showToast}
                  refreshGuests={refreshGuests}
                  broadcastStayUpdate={broadcastStayUpdate}
                  roomRates={hostProperty?.roomRates || []}
                  rooms={hostProperty?.rooms || []}
                  onSelectUserRequest={handleSelectUserRequest}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HostDashboardPage;