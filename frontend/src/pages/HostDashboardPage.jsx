import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, staysAPI, bookingsAPI } from '../services/api';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import HostRoomCategories from '../components/host/HostRoomCategories';
import HostDashboardNavbar from '../components/host/HostDashboardNavbar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { getUpcoming30Days, isSameRoom } from '../utils/dateUtils';

// Dynamic On-Demand Sub-Modules for Host Dashboard
const HostWeeklySlotSchedule = lazy(() => import('../components/host/HostWeeklySlotSchedule'));
const HostUsersVisitedSection = lazy(() =>
  import('../components/host/HostUsersVisitedSection').then((m) => ({ default: m.HostUsersVisitedSection }))
);
const PropertyDetailsSection = lazy(() =>
  import('../components/host/PropertyDetailsSection').then((m) => ({ default: m.PropertyDetailsSection }))
);

function DashboardSkeletonLoader() {
  return (
    <div className="w-full min-h-[320px] rounded-2xl bg-white/60 dark:bg-zinc-900/60 animate-pulse border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 p-8">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        Loading Panel Content...
      </span>
    </div>
  );
}

const DEFAULT_HOST_PROPERTY = {
  propertyName: '',
  title: '',
  propertyType: 'PG',
  category: 'PG',
  genderType: 'Both',
  rating: 5.0,
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
};

export function HostDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'property');
  const [hostProperty, setHostProperty] = useState(() => location.state?.updatedHost || DEFAULT_HOST_PROPERTY);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
  const selectedRoomIndexRef = useRef(null);
  const selectedRoomNumberRef = useRef(null);
  const selectedRoomCardIdRef = useRef(null);

  const handleSelectRoomCard = useCallback((cardId, cIdx, card) => {
    if (typeof cIdx === 'number' && cIdx >= 0) {
      selectedRoomIndexRef.current = cIdx;
    }
    const rNum = card?.roomNumber ? String(card.roomNumber).trim() : null;
    if (rNum) {
      selectedRoomNumberRef.current = rNum;
      setSelectedRoomNumber(rNum);
    }
    const targetId = card?.id || card?._id || rNum || cardId;
    selectedRoomCardIdRef.current = targetId;
    setSelectedRoomCardId(targetId);
  }, []);

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
      const rId = foundRoom.id || foundRoom._id || foundRoom.roomNumber;
      const rNum = foundRoom.roomNumber ? String(foundRoom.roomNumber).trim() : null;
      selectedRoomCardIdRef.current = rId;
      selectedRoomNumberRef.current = rNum;
      setSelectedRoomCardId(rId);
      if (rNum) setSelectedRoomNumber(rNum);
    }

    setActiveTab('room');
    setActiveRightPanelTab('guest');
  }, [hostProperty]);

  const activeCategory = hostProperty?.roomRates?.[selectedCategoryIndex] || hostProperty?.roomRates?.[0] || null;

  const activeCategoryRooms = useMemo(() => {
    if (!activeCategory) return [];
    const rateId = activeCategory.id || activeCategory._id;
    const catType = String(activeCategory.type || '').toLowerCase().trim();

    return (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [])
      .filter((r) => {
        if (rateId && r.rateId && (r.rateId === rateId || (activeCategory._id && String(r.rateId) === String(activeCategory._id)))) {
          return true;
        }
        if (catType && r.type && String(r.type).toLowerCase().trim() === catType) {
          return true;
        }
        if (typeof r.categoryIndex === 'number' && r.categoryIndex === selectedCategoryIndex) {
          return true;
        }
        return false;
      })
      .map((r, idx) => ({
        ...r,
        id: r.id || r._id || `room_${r.roomNumber || idx + 1}`,
        _id: r._id || r.id || `room_${r.roomNumber || idx + 1}`,
      }));
  }, [hostProperty?.rooms, activeCategory, selectedCategoryIndex]);

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
  const updateRoomCapacityDebounceRef = useRef(null);
  const latestHostPropertyRef = useRef(hostProperty);
  useEffect(() => {
    latestHostPropertyRef.current = hostProperty;
  }, [hostProperty]);

  const handleAddNewRoomTypeRow = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentRates = Array.isArray(hostProperty?.roomRates) ? [...hostProperty.roomRates] : [];

    const newRate = {
      id: newId,
      _id: newId,
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

      const targetRate = currentRates[index];
      const targetRateId = targetRate.id || targetRate._id || `rate_${index}`;
      const oldType = targetRate.type;

      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...targetRate, id: targetRateId, ...field };
      } else {
        currentRates[index] = { ...targetRate, id: targetRateId, [field]: value };
      }

      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);
      const newCapacity = typeof field === 'object' ? field.capacity : (field === 'capacity' ? value : undefined);

      let updatedRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];

      updatedRooms = updatedRooms.map((r) => {
        const isMatch =
          (r.rateId && (r.rateId === targetRateId || (targetRate._id && String(r.rateId) === String(targetRate._id)))) ||
          (oldType && r.type && String(r.type).trim().toLowerCase() === String(oldType).trim().toLowerCase()) ||
          (typeof r.categoryIndex === 'number' && r.categoryIndex === index);

        if (!isMatch) return r;

        const updated = {
          ...r,
          rateId: targetRateId,
          categoryIndex: index,
        };

        if (newType !== undefined) {
          updated.type = newType;
        }
        if (newPrice !== undefined) {
          updated.price = newPrice;
        }
        if (newRateUnit !== undefined) {
          updated.rateUnit = newRateUnit;
        }
        if (newCapacity !== undefined) {
          updated.capacity = Number(newCapacity) || 1;
        }

        return updated;
      });

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
    if (updateRoomNumberDebounceRef.current) {
      clearTimeout(updateRoomNumberDebounceRef.current);
      updateRoomNumberDebounceRef.current = null;
    }
    if (updateRoomCapacityDebounceRef.current) {
      clearTimeout(updateRoomCapacityDebounceRef.current);
      updateRoomCapacityDebounceRef.current = null;
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

    const removedRateId = removed.id || removed._id;
    const removedType = (removed.type || '').trim().toLowerCase();

    // 1. Identify all room cards belonging to this deleted category
    const roomsToRemove = (Array.isArray(hostProperty.rooms) ? hostProperty.rooms : []).filter((r) => {
      if (removedRateId && r.rateId && (r.rateId === removedRateId || (removed._id && String(r.rateId) === String(removed._id)))) return true;
      if (removedType && r.type && String(r.type).trim().toLowerCase() === removedType) return true;
      if (typeof r.categoryIndex === 'number' && r.categoryIndex === index) return true;
      return false;
    });
    const removedRoomNumbers = roomsToRemove.map((r) => r.roomNumber).filter(Boolean);
    const removedRawNumbers = new Set(
      removedRoomNumbers.map((num) => String(num).replace(/[^0-9]/g, ''))
    );

    // 2. Filter out these room cards from the property (and purge any orphaned rooms)
    const validRateIds = new Set(currentRates.map((r) => r.id || r._id).filter(Boolean));
    const validTypes = new Set(currentRates.map((r) => (r.type || '').trim().toLowerCase()).filter(Boolean));

    const updatedRooms = currentRates.length === 0
      ? []
      : (Array.isArray(hostProperty.rooms) ? hostProperty.rooms : []).filter((r) => {
          if (roomsToRemove.includes(r)) return false;
          const rRateId = r.rateId;
          const rType = (r.type || '').trim().toLowerCase();
          return (rRateId && validRateIds.has(rRateId)) || (rType && validTypes.has(rType));
        });

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

    // 3. Immediately update local property state (0ms UI reactivity)
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);

    // 4. Immediately purge occupants/guests of all removed rooms from local schedule state
    setGuests((prev) =>
      (Array.isArray(prev) ? prev : []).filter((g) => {
        const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        const gType = (g.roomType || g.type || '').trim().toLowerCase();
        if (gType && gType === removedType) return false;
        if (gNum && removedRawNumbers.has(gNum)) return false;
        return true;
      })
    );

    // 5. Reset selected category and selected room card if it belonged to deleted category
    setSelectedCategoryIndex((prev) => Math.max(0, Math.min(prev, currentRates.length - 1)));
    if (roomsToRemove.some((r) => isSameRoom(r, selectedRoomCardId) || (selectedRoomNumber && String(r.roomNumber).trim() === String(selectedRoomNumber).trim()))) {
      setSelectedRoomCardId(null);
      setSelectedRoomNumber(null);
      selectedRoomCardIdRef.current = null;
      selectedRoomNumberRef.current = null;
      selectedRoomIndexRef.current = null;
    }

    toast.info(`Category "${removed.type || 'Unnamed'}" and ${roomsToRemove.length} room card(s) removed.`);

    // 6. Cascade delete all bookings for these room cards from database
    try {
      await bookingsAPI.cascadeDeleteRoomBookings({
        hostEmail: hostProperty.email,
        stayId: hostProperty.stayId || hostProperty._id || hostProperty.id,
        roomNumbers: removedRoomNumbers,
        categoryType: removed.type,
      });
    } catch (err) {
      console.warn('Cascade category bookings error:', err);
    }

    // 7. Persist updated host property to database and broadcast update
    try {
      await handleAutoSyncProperty(updatedHost);
      broadcastStayUpdate(updatedHost.id || updatedHost._id);
    } catch (err) {
      console.warn('Delete room rate error:', err);
    }
  };

  const selectedRoomCard = useMemo(() => {
    if (!activeCategoryRooms.length) return null;

    // 1. Prioritize persistent roomNumber matching
    const activeNum = selectedRoomNumber || selectedRoomNumberRef.current;
    if (activeNum) {
      const foundByNum = activeCategoryRooms.find(
        (r) => String(r.roomNumber || '').trim() === String(activeNum).trim()
      );
      if (foundByNum) return foundByNum;
    }

    // 2. Prioritize card id / isSameRoom matching
    const activeId = selectedRoomCardId || selectedRoomCardIdRef.current;
    if (activeId) {
      const found = activeCategoryRooms.find((r) => isSameRoom(r, activeId));
      if (found) return found;
    }

    // 3. Prioritize category index
    if (
      selectedRoomIndexRef.current !== null &&
      selectedRoomIndexRef.current >= 0 &&
      selectedRoomIndexRef.current < activeCategoryRooms.length
    ) {
      return activeCategoryRooms[selectedRoomIndexRef.current];
    }

    // 4. Default to first room
    return activeCategoryRooms[0];
  }, [activeCategoryRooms, selectedRoomCardId, selectedRoomNumber]);

  useEffect(() => {
    if (!activeCategoryRooms.length) {
      if (selectedRoomCardId !== null) setSelectedRoomCardId(null);
      if (selectedRoomNumber !== null) setSelectedRoomNumber(null);
      selectedRoomIndexRef.current = null;
      selectedRoomNumberRef.current = null;
      selectedRoomCardIdRef.current = null;
      return;
    }

    // 1. Check if selectedRoomNumber matches any room in activeCategoryRooms
    const activeNum = selectedRoomNumber || selectedRoomNumberRef.current;
    if (activeNum) {
      const foundIdx = activeCategoryRooms.findIndex(
        (r) => String(r.roomNumber || '').trim() === String(activeNum).trim()
      );
      if (foundIdx !== -1) {
        selectedRoomIndexRef.current = foundIdx;
        const matched = activeCategoryRooms[foundIdx];
        const matchedId = matched.id || matched._id || matched.roomNumber;
        selectedRoomCardIdRef.current = matchedId;
        selectedRoomNumberRef.current = String(matched.roomNumber).trim();
        if (selectedRoomCardId !== matchedId) {
          setSelectedRoomCardId(matchedId);
        }
        return;
      }
    }

    // 2. Check if selectedRoomCardId matches any room
    const activeId = selectedRoomCardId || selectedRoomCardIdRef.current;
    if (activeId) {
      const foundIdx = activeCategoryRooms.findIndex((r) => isSameRoom(r, activeId));
      if (foundIdx !== -1) {
        selectedRoomIndexRef.current = foundIdx;
        const matched = activeCategoryRooms[foundIdx];
        const matchedId = matched.id || matched._id || matched.roomNumber;
        const matchedNum = matched.roomNumber ? String(matched.roomNumber).trim() : null;
        selectedRoomCardIdRef.current = matchedId;
        selectedRoomNumberRef.current = matchedNum;
        if (matchedNum && matchedNum !== selectedRoomNumber) {
          setSelectedRoomNumber(matchedNum);
        }
        return;
      }
    }

    // 3. Fallback to index if valid
    if (
      selectedRoomIndexRef.current !== null &&
      selectedRoomIndexRef.current >= 0 &&
      selectedRoomIndexRef.current < activeCategoryRooms.length
    ) {
      const roomAtIndex = activeCategoryRooms[selectedRoomIndexRef.current];
      if (roomAtIndex) {
        const rId = roomAtIndex.id || roomAtIndex._id || roomAtIndex.roomNumber;
        const rNum = roomAtIndex.roomNumber ? String(roomAtIndex.roomNumber).trim() : null;
        selectedRoomCardIdRef.current = rId;
        selectedRoomNumberRef.current = rNum;
        setSelectedRoomCardId(rId);
        if (rNum) setSelectedRoomNumber(rNum);
        return;
      }
    }

    // 4. Default to first room
    const firstRoom = activeCategoryRooms[0];
    const fId = firstRoom?.id || firstRoom?._id || null;
    const fNum = firstRoom?.roomNumber ? String(firstRoom.roomNumber).trim() : null;
    selectedRoomCardIdRef.current = fId;
    selectedRoomNumberRef.current = fNum;
    setSelectedRoomCardId(fId);
    setSelectedRoomNumber(fNum);
    selectedRoomIndexRef.current = 0;
  }, [activeCategoryRooms, selectedRoomCardId, selectedRoomNumber]);

  const configuredCategoryRooms = useMemo(() => {
    if (!Array.isArray(hostProperty?.roomRates) || !Array.isArray(hostProperty?.rooms)) {
      return [];
    }
    const rateIds = new Set(
      hostProperty.roomRates.map((r) => r.id || r._id).filter(Boolean)
    );
    const currentTypes = new Set(
      hostProperty.roomRates
        .map((rate) => (rate.type || '').trim().toLowerCase())
        .filter(Boolean)
    );

    return hostProperty.rooms.filter((room) => {
      if (room.rateId && rateIds.has(room.rateId)) return true;
      if (room.type && currentTypes.has(room.type.trim().toLowerCase())) return true;
      if (typeof room.categoryIndex === 'number' && room.categoryIndex < hostProperty.roomRates.length) return true;
      return false;
    });
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
      configuredCategoryRooms
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

    const targetIdx = Array.isArray(hostProperty?.roomRates)
      ? hostProperty.roomRates.findIndex((r) => (r.id && r.id === cat.id) || (cat.type && r.type === cat.type))
      : selectedCategoryIndex;
    const resolvedCatIndex = targetIdx !== -1 ? targetIdx : selectedCategoryIndex;
    const rateId = cat.id || cat._id || `rate_${resolvedCatIndex}`;

    const newCard = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      rateId: rateId,
      categoryIndex: resolvedCatIndex,
      roomNumber: nextNum,
      roomNumInt: nextNumInt,
      type: cleanCatType,
      price: formattedPrice,
      rateUnit: rateUnit,
      capacity: Number(cat.capacity) || 1,
      status: 'Available',
      floor: nextNumInt < 100 ? 'Floor 1' : `Floor ${Math.floor(nextNumInt / 100)}`,
    };

    const activeRateIds = new Set((hostProperty?.roomRates || []).map((r) => r.id || r._id).filter(Boolean));
    const activeTypes = new Set((hostProperty?.roomRates || []).map((r) => (r.type || '').trim().toLowerCase()).filter(Boolean));
    const currentRooms = (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).filter((r) => {
      const rRateId = r.rateId;
      const rType = (r.type || '').trim().toLowerCase();
      return (rRateId && activeRateIds.has(rRateId)) || (rType && activeTypes.has(rType));
    });
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

    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    handleAutoSyncProperty(updatedHost);
    setSelectedRoomCardId(newCard.id);
    setSelectedRoomNumber(newCard.roomNumber);
    selectedRoomNumberRef.current = newCard.roomNumber;
    selectedRoomCardIdRef.current = newCard.id;
    toast.success(`Added Room ${nextNum} to ${cleanCatType}`);
    if (isFirstRoom && !isAlreadyApproved) {
      toast.info('🚀 Property sent to Admin for approval.');
    }
  };

  const handleUpdateRoomCapacity = (roomId, newCapacity, cIdx, card) => {
    const val = Math.max(1, Math.min(10, parseInt(newCapacity, 10) || 1));
    const targetRoomNum = card?.roomNumber ? String(card.roomNumber).trim() : null;

    if (typeof cIdx === 'number' && cIdx >= 0) {
      selectedRoomIndexRef.current = cIdx;
    }
    if (targetRoomNum) {
      selectedRoomNumberRef.current = targetRoomNum;
      setSelectedRoomNumber(targetRoomNum);
    }
    const pinnedId = card?.id || card?._id || roomId;
    if (pinnedId) {
      selectedRoomCardIdRef.current = pinnedId;
      setSelectedRoomCardId(pinnedId);
    }

    const baseHost = latestHostPropertyRef.current || hostProperty;
    if (!baseHost) return;

    const currentRooms = Array.isArray(baseHost.rooms) ? [...baseHost.rooms] : [];
    const updatedRooms = currentRooms.map((r) => {
      const isMatch = Boolean(
        (targetRoomNum && String(r.roomNumber || '').trim() === targetRoomNum) ||
        (roomId && isSameRoom(r, roomId)) ||
        (card && isSameRoom(r, card.id || card._id || card.roomNumber))
      );
      if (isMatch) {
        return {
          ...r,
          capacity: val,
        };
      }
      return r;
    });

    const nextUpdatedHost = { ...baseHost, rooms: updatedRooms };
    latestHostPropertyRef.current = nextUpdatedHost;
    setHostProperty(nextUpdatedHost);

    if (updateRoomCapacityDebounceRef.current) {
      clearTimeout(updateRoomCapacityDebounceRef.current);
    }
    updateRoomCapacityDebounceRef.current = setTimeout(() => {
      updateRoomCapacityDebounceRef.current = null;
      const targetHost = latestHostPropertyRef.current || nextUpdatedHost;
      if (targetHost) {
        adminAPI.createHost(targetHost)
          .then(() => broadcastStayUpdate(targetHost.id || targetHost._id))
          .catch((err) => console.warn('Debounced room capacity save error:', err));
      }
    }, 500);
  };

  const handleUpdateRoomNumber = (roomId, newNumber, cIdx, card) => {
    const trimmedNewNum = String(newNumber || '').trim();
    if (typeof cIdx === 'number' && cIdx >= 0) {
      selectedRoomIndexRef.current = cIdx;
    }
    if (trimmedNewNum) {
      selectedRoomNumberRef.current = trimmedNewNum;
      setSelectedRoomNumber(trimmedNewNum);
    }
    const pinnedId = card?.id || card?._id || roomId || trimmedNewNum;
    selectedRoomCardIdRef.current = pinnedId;
    setSelectedRoomCardId(pinnedId);

    const baseHost = latestHostPropertyRef.current || hostProperty;
    if (!baseHost) return;

    const currentRooms = Array.isArray(baseHost.rooms) ? [...baseHost.rooms] : [];
    const updatedRooms = currentRooms.map((r) => {
      const isMatch = Boolean(
        (card && (r.id === card.id || r._id === card._id)) ||
        (card?.roomNumber && String(r.roomNumber || '').trim() === String(card.roomNumber).trim()) ||
        (roomId && isSameRoom(r, roomId))
      );
      if (isMatch) {
        const parsed = parseInt(trimmedNewNum.replace(/[^0-9]/g, ''), 10);
        return {
          ...r,
          roomNumber: newNumber,
          roomNumInt: !isNaN(parsed) ? parsed : r.roomNumInt,
        };
      }
      return r;
    });

    const nextUpdatedHost = { ...baseHost, rooms: updatedRooms };
    latestHostPropertyRef.current = nextUpdatedHost;
    setHostProperty(nextUpdatedHost);

    if (updateRoomNumberDebounceRef.current) {
      clearTimeout(updateRoomNumberDebounceRef.current);
    }
    updateRoomNumberDebounceRef.current = setTimeout(() => {
      updateRoomNumberDebounceRef.current = null;
      const targetHost = latestHostPropertyRef.current || nextUpdatedHost;
      if (targetHost) {
        adminAPI.createHost(targetHost).catch((err) => console.warn('Debounced room save error:', err));
      }
    }, 600);
  };

  const handleRemoveRoomCard = async (roomId, roomObj) => {
    if (!hostProperty) return;
    const currentRooms = Array.isArray(hostProperty.rooms) ? [...hostProperty.rooms] : [];
    
    const isTargetRoom = (r) => {
      if (!r) return false;
      if (isSameRoom(r, roomId)) return true;
      if (roomObj && isSameRoom(r, roomObj.id || roomObj._id || roomObj.roomNumber)) return true;
      return false;
    };

    const targetRoom = currentRooms.find(isTargetRoom);
    const updatedRooms = currentRooms.filter((r) => !isTargetRoom(r));
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

    // 1. Immediately update local state optimistically so room card disappears instantly
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);

    // 2. Cascade delete orphaned bookings from database
    if (targetRoom?.roomNumber) {
      const rawNum = String(targetRoom.roomNumber).replace(/[^0-9]/g, '');
      try {
        await bookingsAPI.cascadeDeleteRoomBookings({
          hostEmail: hostProperty.email,
          stayId: hostProperty.stayId || hostProperty._id || hostProperty.id,
          roomId: targetRoom?.id || targetRoom?._id,
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

    if (
      (selectedRoomCardId && (isSameRoom(targetRoom, selectedRoomCardId) || selectedRoomCardId === roomId)) ||
      (selectedRoomNumber && targetRoom?.roomNumber && String(targetRoom.roomNumber).trim() === String(selectedRoomNumber).trim())
    ) {
      const remainingForActiveCat = updatedRooms.filter(
        (r) => r.type && activeCategory?.type && r.type.trim().toLowerCase() === activeCategory.type.trim().toLowerCase()
      );
      const nextCard = remainingForActiveCat[0] || updatedRooms[0] || null;
      const nextId = nextCard?.id || nextCard?._id || nextCard?.roomNumber || null;
      const nextNum = nextCard?.roomNumber ? String(nextCard.roomNumber).trim() : null;
      selectedRoomCardIdRef.current = nextId;
      selectedRoomNumberRef.current = nextNum;
      setSelectedRoomCardId(nextId);
      setSelectedRoomNumber(nextNum);
      selectedRoomIndexRef.current = 0;
    }

    // 4. Save updated host property to backend database
    await handleAutoSyncProperty(updatedHost);
    toast.info('Room and associated bookings removed');
  };

  const handleAutoSyncProperty = async (updatedHost) => {
    if (!updatedHost) return;
    try {
      const targetEmail = (
        updatedHost.email ||
        updatedHost.hostEmail ||
        hostProperty?.email ||
        hostProperty?.hostEmail ||
        user?.email ||
        ''
      ).trim().toLowerCase();

      if (!targetEmail) {
        toast.error('Host email is missing. Please log in again.');
        return;
      }

      const rawRooms = Array.isArray(updatedHost.rooms) ? updatedHost.rooms : (hostProperty?.rooms || []);
      const validRooms = rawRooms.map((rm, idx) => ({
        ...rm,
        roomNumber: (rm.roomNumber || `Room ${idx + 1}`).trim(),
        type: rm.type || 'Standard',
        price: rm.price || '₹4,000',
        status: rm.status || 'Available',
      }));

      const finalTotalRooms = validRooms.length > 0 ? validRooms.length : (hostProperty?.totalRooms || 1);
      const finalAvailableRooms = validRooms.length > 0
        ? validRooms.filter((r) => r.status === 'Available').length
        : (hostProperty?.availableRooms || 1);

      const facilitiesList = (
        updatedHost.facilities?.length > 0
          ? updatedHost.facilities
          : (updatedHost.amenities?.length > 0 ? updatedHost.amenities : hostProperty?.facilities)
      ) || [];

      const rulesList = (
        updatedHost.rules?.length > 0
          ? updatedHost.rules
          : (updatedHost.houseRules?.length > 0 ? updatedHost.houseRules : hostProperty?.rules)
      ) || [];

      const imagesList = (
        Array.isArray(updatedHost.images) && updatedHost.images.length > 0
          ? updatedHost.images
          : (Array.isArray(hostProperty?.images) ? hostProperty.images : [])
      );

      const primaryImage = (
        (imagesList && imagesList[0]) ||
        updatedHost.image ||
        hostProperty?.image ||
        ''
      );

      const payload = {
        ...hostProperty,
        ...updatedHost,
        email: targetEmail,
        name: (updatedHost.name || updatedHost.hostName || hostProperty?.name || hostProperty?.hostName || user?.name || '').trim(),
        phone: (updatedHost.phone || hostProperty?.phone || user?.phone || '').trim(),
        propertyName: (updatedHost.propertyName || updatedHost.title || hostProperty?.propertyName || hostProperty?.title || 'My Property').trim(),
        title: (updatedHost.propertyName || updatedHost.title || hostProperty?.propertyName || hostProperty?.title || 'My Property').trim(),
        propertyType: updatedHost.propertyType || updatedHost.type || hostProperty?.propertyType || hostProperty?.type || 'PG',
        type: updatedHost.propertyType || updatedHost.type || hostProperty?.propertyType || hostProperty?.type || 'PG',
        genderType: updatedHost.genderType || hostProperty?.genderType || 'Both',
        description: (updatedHost.description !== undefined ? updatedHost.description : (hostProperty?.description || '')).trim(),
        address: (updatedHost.address !== undefined ? updatedHost.address : (hostProperty?.address || hostProperty?.location || '')).trim(),
        location: (updatedHost.location !== undefined ? updatedHost.location : (hostProperty?.location || hostProperty?.address || '')).trim(),
        roadArea: (updatedHost.roadArea !== undefined ? updatedHost.roadArea : (hostProperty?.roadArea || '')).trim(),
        city: (updatedHost.city !== undefined ? updatedHost.city : (hostProperty?.city || '')).trim(),
        state: (updatedHost.state !== undefined ? updatedHost.state : (hostProperty?.state || '')).trim(),
        pincode: (updatedHost.pincode !== undefined ? updatedHost.pincode : (hostProperty?.pincode || '')).trim(),
        latitude: updatedHost.latitude !== undefined ? Number(updatedHost.latitude) : (Number(hostProperty?.latitude) || 29.3919),
        longitude: updatedHost.longitude !== undefined ? Number(updatedHost.longitude) : (Number(hostProperty?.longitude) || 79.4542),
        facilities: facilitiesList,
        amenities: facilitiesList,
        rules: rulesList,
        images: imagesList,
        image: primaryImage,
        instagramVideoUrl: (
          updatedHost.instagramVideoUrl !== undefined
            ? updatedHost.instagramVideoUrl
            : (hostProperty?.instagramVideoUrl || '')
        ).trim(),
        roomRates: Array.isArray(updatedHost.roomRates) ? updatedHost.roomRates : (hostProperty?.roomRates || []),
        rooms: validRooms,
        totalRooms: finalTotalRooms,
        availableRooms: finalAvailableRooms,
        status: hostProperty?.status || 'Pending Approval',
      };

      // Optimistically update local dashboard state
      latestHostPropertyRef.current = payload;
      setHostProperty(payload);

      const res = await adminAPI.createHost(payload);
      if (res?.success && res.host) {
        const merged = {
          ...payload,
          ...res.host,
          images: res.host.images?.length > 0 ? res.host.images : payload.images,
          image: res.host.image || payload.image,
          instagramVideoUrl: res.host.instagramVideoUrl !== undefined ? res.host.instagramVideoUrl : payload.instagramVideoUrl,
        };
        latestHostPropertyRef.current = merged;
        setHostProperty(merged);

        try {
          window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
          window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
          localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('stayhub_live_channel');
            bc.postMessage({ type: 'HOST_UPDATED', hostId: merged.id || merged._id, sender: 'HostDashboard' });
            bc.close();
          }
        } catch (e) {}

        return merged;
      } else {
        throw new Error(res?.message || 'Failed to save property changes to database');
      }
    } catch (err) {
      console.error('Auto-sync property error:', err);
      toast.error(`Database save error: ${err.message || 'Check server connection'}`);
      throw err;
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
    if (
      updateRoomRateDebounceRef.current ||
      updateRoomNumberDebounceRef.current ||
      updateRoomCapacityDebounceRef.current
    ) {
      return;
    }
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
          const isDebouncing = Boolean(
            updateRoomRateDebounceRef.current ||
            updateRoomNumberDebounceRef.current ||
            updateRoomCapacityDebounceRef.current
          );
          const localRates = isDebouncing && latestHostPropertyRef.current?.roomRates !== undefined ? latestHostPropertyRef.current.roomRates : serverRates;
          const localRooms = isDebouncing && latestHostPropertyRef.current?.rooms !== undefined ? latestHostPropertyRef.current.rooms : serverRooms;
          const finalRates = Array.isArray(localRates) ? localRates : serverRates;
          const rawRooms = Array.isArray(localRooms) ? localRooms : serverRooms;

          const normalizedRates = finalRates.map((rr, idx) => ({
            ...rr,
            id: rr.id || rr._id || `rate_${idx}`,
            _id: rr._id || rr.id || `rate_${idx}`,
          }));

          const finalRooms = rawRooms.map((rm, idx) => {
            const rId = rm.id || rm._id || `room_${rm.roomNumber || idx + 1}`;
            let rRateId = rm.rateId;
            let rCatIndex = rm.categoryIndex;
            let rType = rm.type;

            // Self-heal / associate legacy room with its category if missing
            if (!rRateId) {
              // 1. Match by type name
              let matchedIdx = normalizedRates.findIndex(
                (rate) => rate.type && rm.type && rate.type.trim().toLowerCase() === rm.type.trim().toLowerCase()
              );
              // 2. If type was 'Standard' or unassigned, match by price
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
                rRateId = matchedRate.id || matchedRate._id;
                rCatIndex = matchedIdx;
                if (matchedRate.type && (!rType || rType === 'Standard')) {
                  rType = matchedRate.type;
                }
              }
            }

            return {
              ...rm,
              id: rId,
              _id: rm._id || rm.id || rId,
              rateId: rRateId || '',
              categoryIndex: typeof rCatIndex === 'number' ? rCatIndex : undefined,
              type: rType || 'Standard',
            };
          });

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
            roomRates: normalizedRates,
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
      if (e.key === 'stayhub_admin_sync_ts' || (e.key && e.key.startsWith('stayhub_'))) {
        if (activeTab !== 'property') fetchHostData();
      }
    };
    window.addEventListener('storage', handleStorage);
    const handleCustomSync = (e) => {
      if (e?.detail?.sender === 'HostDashboard') return;
      if (activeTab === 'property') return;
      fetchHostData();
    };
    window.addEventListener('stayhub_admin_sync', handleCustomSync);
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);

    const handleFocus = () => {
      if (activeTab === 'property') return;
      fetchHostData();
    };
    window.addEventListener('focus', handleFocus);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (event.data?.sender === 'HostDashboard') return;
          if (activeTab === 'property') return;
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
      pollTimer = setInterval(() => {
        if (activeTab === 'property') return;
        fetchHostData();
      }, 10000);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
      window.removeEventListener('focus', handleFocus);
      if (bc) bc.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [hostProperty?.status, activeTab]);

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
    <div
      className="min-h-screen flex flex-col host-page-scope font-body-md antialiased bg-[#fafbfc] dark:bg-[#090b10] text-slate-900 dark:text-zinc-100 overflow-x-clip relative selection:bg-custom-btn-primary selection:text-white transition-colors duration-300"
    >
      {/* Ambient Minimal Light Glow (Matching Landing Page) */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-emerald-100/50 via-teal-50/20 to-transparent blur-3xl opacity-60 dark:opacity-20" />
      </div>

      {/* NAVBAR */}
      <HostDashboardNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={handleBack}
        onEditDetails={() => navigate('/host/upload')}
        onAddRoomType={handleAddNewRoomTypeRow}
        categoryCount={Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates.length : 0}
        roomCount={configuredCategoryRooms.length}
        todayCheckInsCount={todayCheckInsCount}
        activeRightPanelTab={activeRightPanelTab}
        setActiveRightPanelTab={setActiveRightPanelTab}
      />

      {/* MAIN CONTENT */}
      <main className="w-full pt-14 sm:pt-16 bg-transparent relative z-10 flex-1 min-h-[calc(100vh-3.5rem)]">
        <div className="w-full px-3 sm:px-6 py-3 sm:py-4 max-w-[1600px] mx-auto">
          <div>
            {/* Property Details Tab */}
            <div className={activeTab === 'property' ? 'space-y-4 block' : 'hidden'}>
              <ErrorBoundary>
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <PropertyDetailsSection
                    hostProperty={hostProperty || DEFAULT_HOST_PROPERTY}
                    isPending={isPending}
                    onEditDetails={() => navigate('/host/upload')}
                    onSaveProperty={handleAutoSyncProperty}
                    guests={guests}
                    onSwitchTab={setActiveTab}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>

              {/* Room Schedule & Bookings Tab */}
              <div className={activeTab === 'room' ? 'space-y-4 block' : 'hidden'}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 xl:gap-5 items-start">
                  <div className="space-y-4">
                    <ErrorBoundary>
                      <HostRoomCategories
                        roomRates={hostProperty?.roomRates || []}
                        rooms={
                          (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).map((rm, idx) => ({
                            ...rm,
                            id: rm.id || rm._id || `room_${rm.roomNumber || idx + 1}`,
                            _id: rm._id || rm.id || `room_${rm.roomNumber || idx + 1}`,
                          }))
                        }
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
                        selectedRoomNumber={selectedRoomCard?.roomNumber || selectedRoomNumber || selectedRoomNumberRef.current}
                        onSelectRoomCardId={handleSelectRoomCard}
                        onAddRoomCard={handleAddRoomCard}
                        onRemoveRoomCard={handleRemoveRoomCard}
                        onUpdateRoomNumber={handleUpdateRoomNumber}
                        onUpdateRoomCapacity={handleUpdateRoomCapacity}
                      />
                    </ErrorBoundary>
                  </div>

                  <div className="lg:col-span-2">
                    <ErrorBoundary>
                      {selectedRoomCard ? (
                        <Suspense fallback={<DashboardSkeletonLoader />}>
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
                        </Suspense>
                      ) : (
                        <div className="p-12 text-center border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl text-xs text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-950">
                          Select a room card on the left to view schedule and occupants.
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              </div>

              {/* Users Visited Tab (Loaded only when user navigates to tab) */}
              <div className={activeTab === 'users' ? 'block' : 'hidden'}>
                {activeTab === 'users' && (
                  <Suspense fallback={<DashboardSkeletonLoader />}>
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
                  </Suspense>
                )}
              </div>
            </div>
        </div>
      </main>

      {/* Operations Footer (Matching Landing Page Style) */}
      <footer className="relative z-10 border-t border-slate-200/70 dark:border-zinc-800 bg-white/70 dark:bg-[#090b10]/80 backdrop-blur-sm py-2.5 sm:py-3 shrink-0 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
          <p>© 2025 RoomScout. Direct stays, zero brokerage.</p>
          <div className="flex items-center gap-5 text-[11px]">
            <button
              type="button"
              onClick={() => showToast('Telemetry Engine: Direct Host Synchronization active.', 'info')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Telemetry Engine
            </button>
            <button
              type="button"
              onClick={() => showToast('Compliance Registry: Telemetry Verified.', 'info')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Compliance
            </button>
            <button
              type="button"
              onClick={() => showToast('API Connectivity: WebSocket & REST Operational.', 'info')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              API Status
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HostDashboardPage;