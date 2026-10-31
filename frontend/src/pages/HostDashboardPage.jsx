import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, staysAPI, bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import HostRoomCategories from '../components/host/HostRoomCategories';
import HostDashboardNavbar from '../components/host/HostDashboardNavbar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { getUpcoming30Days, isSameRoom, isRoomMatchingCategory } from '../utils/dateUtils';
import { PropertyTelemetryModal } from '../components/host/property/PropertyTelemetryModal';

// Dynamic On-Demand Sub-Modules for Host Dashboard
const HostWeeklySlotSchedule = lazy(() => import('../components/host/HostWeeklySlotSchedule'));
const HostUsersVisitedSection = lazy(() =>
  import('../components/host/HostUsersVisitedSection').then((m) => ({ default: m.HostUsersVisitedSection }))
);
const PaidUsersList = lazy(() =>
  import('../components/host/paid/PaidUsersList').then((m) => ({ default: m.PaidUsersList }))
);
import { isPaidGuest, isOnlineGuest } from '../utils/guestFilters';
const PropertyDetailsSection = lazy(() =>
  import('../components/host/PropertyDetailsSection').then((m) => ({ default: m.PropertyDetailsSection }))
);
const PropertyArchitecturalBackground = lazy(() =>
  import('../components/common/PropertyArchitecturalBackground').then((m) => ({ default: m.PropertyArchitecturalBackground }))
);
const HostPaymentSettingsSection = lazy(() =>
  import('../components/host/HostPaymentSettingsSection').then((m) => ({ default: m.HostPaymentSettingsSection }))
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

export function HostDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserSession } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'property');
  const TAB_ORDER = useMemo(() => ({ property: 0, room: 1, users: 2, paid: 3, payment: 4 }), []);
  const prevTabRef = useRef(activeTab);
  const [tabDirection, setTabDirection] = useState(1);

  useEffect(() => {
    const prevIdx = TAB_ORDER[prevTabRef.current] ?? 0;
    const nextIdx = TAB_ORDER[activeTab] ?? 0;
    if (nextIdx !== prevIdx) {
      setTabDirection(nextIdx > prevIdx ? 1 : -1);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, TAB_ORDER]);

  const pageConsoleVariants = useMemo(
    () => ({
      enter: (dir) => ({
        x: dir > 0 ? 40 : -40,
        opacity: 0,
        scale: 0.995,
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.28,
          ease: [0.16, 1, 0.3, 1],
        },
      },
      exit: (dir) => ({
        x: dir > 0 ? -40 : 40,
        opacity: 0,
        scale: 0.995,
        transition: {
          duration: 0.18,
          ease: [0.16, 1, 0.3, 1],
        },
      }),
    }),
    []
  );

  const handleTabSwitch = useCallback((nextTab) => {
    setActiveTab(nextTab);
  }, []);

  const [hostProperty, setHostProperty] = useState(() => location.state?.updatedHost || DEFAULT_HOST_PROPERTY);
  const [guests, setGuests] = useState([]);
  const [visitedSubTab, setVisitedSubTab] = useState('requests');
  const [showPropertyTelemetry, setShowPropertyTelemetry] = useState(false);
  const [propertySubTabIndex, setPropertySubTabIndex] = useState(0);

  const propertyOccupancyRate = useMemo(() => {
    let totalBeds = 0;
    if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
      totalBeds = hostProperty.rooms.reduce((acc, r) => acc + (Number(r.capacity) || 2), 0);
    } else if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) {
      totalBeds = hostProperty.roomRates.reduce((acc, r) => acc + (Number(r.capacity) || 2) * (Number(r.roomCount) || 2), 0);
    }
    if (totalBeds <= 0) return '0.0';
    let active = 0;
    if (Array.isArray(guests) && guests.length > 0) {
      const activeList = guests.filter((g) => g.status !== 'cancelled' && g.status !== 'checked_out');
      active = Math.min(totalBeds, activeList.length);
    }
    return ((active / totalBeds) * 100).toFixed(1);
  }, [hostProperty, guests]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = {};
    for (let i = 0; i < 20; i++) initial[i] = true;
    return initial;
  });
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
    const targetId = card?._id || rNum || cardId;
    selectedRoomCardIdRef.current = targetId;
    setSelectedRoomCardId(targetId);
  }, []);

  const [activeRightPanelTab, setActiveRightPanelTab] = useState('guest');
  const [requestedUserBooking, setRequestedUserBooking] = useState(null);
  const [selectedBookedGuest, setSelectedBookedGuest] = useState(null);
  const [hasVisitedMounted, setHasVisitedMounted] = useState(() => activeTab === 'users');
  const [hasPaidMounted, setHasPaidMounted] = useState(() => activeTab === 'paid');

  if (activeTab === 'users' && !hasVisitedMounted) {
    setHasVisitedMounted(true);
  }
  if (activeTab === 'paid' && !hasPaidMounted) {
    setHasPaidMounted(true);
  }

  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const prevStatusRef = useRef(null);
  const hasInitialFetchedRef = useRef(false);

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
      handleTabSwitch('property');
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [activeTab, handleTabSwitch, navigate]);

  const handleSelectUserRequest = useCallback((request) => {
    if (!request) return;

    // Check if this booking is an actual unapproved online request awaiting approval
    const rawSt = String(request.status || '').toUpperCase();
    const isDone =
      rawSt === 'CONFIRMED' ||
      rawSt === 'CHECKED_IN' ||
      rawSt === 'CHECKED_OUT' ||
      rawSt === 'REJECTED' ||
      rawSt === 'CANCELLED';
    const isPending =
      (rawSt.includes('PENDING') || rawSt === 'DRAFT' || String(request.status || '').toLowerCase().includes('pending')) &&
      !isDone;
    const isOnline =
      request.bookingSource === 'ONLINE' ||
      request.bookingSource === 'ONLINE_USER' ||
      request.isOnline === true;

    if (isPending && isOnline) {
      // Unapproved online booking request: open for approval
      setRequestedUserBooking(request);
      setSelectedBookedGuest(null);
      setActiveRightPanelTab('guest');
    } else {
      // Confirmed booking, offline guest, or check-in/out: show the booked slot in occupants tab
      setRequestedUserBooking(null);
      setSelectedBookedGuest(request);
      setActiveRightPanelTab('occupants');
    }

    const rawReqRoomNum = String(request.roomNumber || '').replace(/[^0-9]/g, '');
    const foundRoom = (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).find(
      (r) =>
        (rawReqRoomNum && String(r.roomNumber || '').replace(/[^0-9]/g, '') === rawReqRoomNum) ||
        (String(r.roomNumber || '').trim().toLowerCase() === String(request.roomNumber || '').trim().toLowerCase()) ||
        (request.roomId && r._id === request.roomId) ||
        (request.roomCardId && r._id === request.roomCardId)
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
      const rId = foundRoom._id || foundRoom.roomNumber;
      const rNum = foundRoom.roomNumber ? String(foundRoom.roomNumber).trim() : null;
      selectedRoomCardIdRef.current = rId;
      selectedRoomNumberRef.current = rNum;
      setSelectedRoomCardId(rId);
      if (rNum) setSelectedRoomNumber(rNum);
    }

    setActiveTab('room');
  }, [hostProperty]);

  const activeCategory = hostProperty?.roomRates?.[selectedCategoryIndex] || hostProperty?.roomRates?.[0] || null;

  const activeCategoryRooms = useMemo(() => {
    if (!activeCategory) return [];
    const rateId = activeCategory._id;
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
        
        _id: r._id || `room_${r.roomNumber || idx + 1}`,
      }));
  }, [hostProperty, activeCategory, selectedCategoryIndex]);

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => {
      const isCurrentlyOpen = prev[index] === false;
      const next = {};
      (hostProperty?.roomRates || []).forEach((_, i) => {
        next[i] = isCurrentlyOpen ? true : i !== index;
      });
      return next;
    });
  };

  const broadcastStayUpdate = useCallback((stayId) => {
    try {
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { stayId, sender: 'HostDashboard' } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'ROOMS_UPDATED', stayId, sender: 'HostDashboard' });
        bc.close();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateRoomRateDebounceRef = useRef(null);
  const updateRoomNumberDebounceRef = useRef(null);
  const updateRoomCapacityDebounceRef = useRef(null);
  const latestHostPropertyRef = useRef(hostProperty);
  const hasUnsavedChangesRef = useRef(false);
  const [savedRoomNumbers, setSavedRoomNumbers] = useState(() => new Set());
  const savedRoomNumbersRef = useRef(new Set());
  useEffect(() => {
    latestHostPropertyRef.current = hostProperty;
  }, [hostProperty]);

  const handleAddNewRoomTypeRow = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentRates = Array.isArray(hostProperty?.roomRates) ? [...hostProperty.roomRates] : [];

    const newRate = {
      _id: newId,
      type: '',
      price: '',
      rateUnit: '/night',
    };
    const updatedRates = [...currentRates, newRate];
    const newIdx = updatedRates.length - 1;
    const updatedHost = {
      ...(hostProperty || {}),
      roomRates: updatedRates,
    };
    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    setSelectedCategoryIndex(newIdx);
    setCollapsedCategories(() => {
      const next = {};
      updatedRates.forEach((_, i) => { next[i] = i !== newIdx; });
      return next;
    });

    // Category newly added in local state - host can fill details and click "Update"
  };

  const handleUpdateRoomRate = (index, field, value) => {
    let nextUpdatedHost = null;
    setHostProperty((prev) => {
      if (!prev) return prev;
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const targetRate = currentRates[index];
      const targetRateId = targetRate._id || `rate_${index}`;

      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...targetRate, _id: targetRateId, ...field };
      } else {
        currentRates[index] = { ...targetRate, _id: targetRateId, [field]: value };
      }

      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);
      const newCapacity = typeof field === 'object' ? field.capacity : (field === 'capacity' ? value : undefined);

      const updatedRate = currentRates[index];
      let updatedRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];

      updatedRooms = updatedRooms.map((r) => {
        const isMatch = isRoomMatchingCategory(r, targetRate, index, currentRates);

        if (!isMatch) return r;

        const updated = {
          ...r,
          rateId: updatedRate._id || targetRateId,
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
      hasUnsavedChangesRef.current = true;
      latestHostPropertyRef.current = nextUpdatedHost;
      return nextUpdatedHost;
    });
  };

  const handleSaveCategory = async (catIndex) => {
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
    const catName = targetHost.roomRates?.[catIndex]?.type || 'Room Category';

    try {
      const saved = await handleAutoSyncProperty(targetHost);
      broadcastStayUpdate(targetHost._id);
      hasUnsavedChangesRef.current = false;
      if (saved && Array.isArray(saved.rooms)) {
        const updatedNumbers = new Set(
          saved.rooms.map((r) => String(r.roomNumber || '').trim()).filter(Boolean)
        );
        setSavedRoomNumbers(updatedNumbers);
        savedRoomNumbersRef.current = updatedNumbers;
      }
      toast.success(`Category "${catName}" & rooms saved to database!`);
      return saved;
    } catch (err) {
      console.warn('Category update save error:', err);
      throw err;
    }
  };

  const handleRemoveRoomRate = async (index) => {
    if (!hostProperty) return;
    const currentRates = Array.isArray(hostProperty.roomRates) ? [...hostProperty.roomRates] : [];
    const removed = currentRates[index];
    if (!removed) return;
    currentRates.splice(index, 1);

    const removedType = (removed.type || '').trim().toLowerCase();

    // 1. Identify all room cards strictly belonging to this deleted category
    const roomsToRemove = (Array.isArray(hostProperty.rooms) ? hostProperty.rooms : []).filter((r) =>
      isRoomMatchingCategory(r, removed, index, hostProperty.roomRates)
    );
    const removedRoomNumbers = roomsToRemove.map((r) => r.roomNumber).filter(Boolean);
    const removedRawNumbers = new Set(
      removedRoomNumbers.map((num) => String(num).replace(/[^0-9]/g, ''))
    );

    // 2. Filter out these room cards from the property and re-index higher categories
    const updatedRooms = currentRates.length === 0
      ? []
      : (Array.isArray(hostProperty.rooms) ? hostProperty.rooms : [])
          .filter((r) => !roomsToRemove.includes(r))
          .map((r) => {
            if (typeof r.categoryIndex === 'number' && r.categoryIndex > index) {
              return { ...r, categoryIndex: r.categoryIndex - 1 };
            }
            return r;
          });

    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const isApprovedHost = hostProperty.status === 'Approved' || hostProperty.isApproved;
    const nextStatus = isApprovedHost
      ? 'Approved'
      : (updatedRooms.length === 0 || currentRates.length === 0)
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
    };

    // 3. Immediately update local property state (0ms UI reactivity)
    hasUnsavedChangesRef.current = true;
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
        stayId: hostProperty.stayId || hostProperty._id,
        roomNumbers: removedRoomNumbers,
        categoryType: removed.type,
      });
    } catch (err) {
      console.warn('Cascade category bookings error:', err);
    }

    // 7. Persist updated host property to database and broadcast update
    try {
      await handleAutoSyncProperty(updatedHost);
      broadcastStayUpdate(updatedHost._id);
    } catch (err) {
      console.warn('Delete room rate error:', err);
    }
  };

  const selectedRoomCard = useMemo(() => {
    if (!activeCategoryRooms.length) return null;

    // 1. Prioritize persistent roomNumber matching
    if (selectedRoomNumber) {
      const foundByNum = activeCategoryRooms.find(
        (r) => String(r.roomNumber || '').trim() === String(selectedRoomNumber).trim()
      );
      if (foundByNum) return foundByNum;
    }

    // 2. Prioritize card id / isSameRoom matching
    if (selectedRoomCardId) {
      const found = activeCategoryRooms.find((r) => isSameRoom(r, selectedRoomCardId));
      if (found) return found;
    }

    // 3. Default to first room
    return activeCategoryRooms[0];
  }, [activeCategoryRooms, selectedRoomCardId, selectedRoomNumber]);

  const isCurrentRoomSaved = useMemo(() => {
    if (!selectedRoomCard) return true;
    const rNum = String(selectedRoomCard.roomNumber || '').trim();
    if (!rNum) return false;
    if (savedRoomNumbers && savedRoomNumbers.size > 0) {
      return savedRoomNumbers.has(rNum);
    }
    const rId = selectedRoomCard._id;
    if (rId && typeof rId === 'string' && rId.length === 24 && !rId.startsWith('room_')) {
      return true;
    }
    return false;
  }, [selectedRoomCard, savedRoomNumbers]);

  useEffect(() => {
    if (!activeCategoryRooms.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const matchedId = matched._id || matched.roomNumber;
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
        const matchedId = matched._id || matched.roomNumber;
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
        const rId = roomAtIndex._id || roomAtIndex.roomNumber;
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
    const fId = firstRoom?._id || null;
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
      hostProperty.roomRates.map((r) => r._id).filter(Boolean)
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
  }, [hostProperty]);

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
    const effectiveRateUnit = (cat.rateUnit && String(cat.rateUnit).trim()) || '/night';

    const cleanCatType = cat.type.trim();
    const baseHost = latestHostPropertyRef.current || hostProperty;
    const currentRooms = Array.isArray(baseHost?.rooms) ? [...baseHost.rooms] : [];

    const allExistingNumbers = new Set(
      currentRooms
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
    const rateUnit = effectiveRateUnit;

    const currentRates = Array.isArray(baseHost?.roomRates) ? [...baseHost.roomRates] : [];
    const targetIdx = currentRates.findIndex((r) => (r._id && r._id === cat._id) || (cat.type && r.type === cat.type));
    const resolvedCatIndex = targetIdx !== -1 ? targetIdx : selectedCategoryIndex;
    if (resolvedCatIndex !== -1 && currentRates[resolvedCatIndex] && !currentRates[resolvedCatIndex].rateUnit) {
      currentRates[resolvedCatIndex] = { ...currentRates[resolvedCatIndex], rateUnit: effectiveRateUnit };
    }
    const rateId = cat._id || `rate_${resolvedCatIndex}`;

    const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCard = {
      _id: newRoomId,
      id: newRoomId,
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

    const updatedRooms = [...currentRooms, newCard];
    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const isAlreadyApproved = baseHost?.status === 'Approved';
    const nextStatus = isAlreadyApproved ? 'Approved' : 'Pending Approval';

    const updatedHost = {
      ...(baseHost || {}),
      rooms: updatedRooms,
      totalRooms: totalCount,
      availableRooms: availCount,
      availableRoomsCount: availCount,
      status: nextStatus,
    };

    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);
    setSelectedRoomCardId(newCard._id);
    setSelectedRoomNumber(newCard.roomNumber);
    selectedRoomNumberRef.current = newCard.roomNumber;
    selectedRoomCardIdRef.current = newCard._id;
    toast.info(`Room ${nextNum} added to preview. Click "Update" on the category tab to save changes.`);
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
    const pinnedId = card?._id || roomId;
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
        (card && isSameRoom(r, card._id || card.roomNumber))
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
    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = nextUpdatedHost;
    setHostProperty(nextUpdatedHost);
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
    const pinnedId = card?._id || roomId || trimmedNewNum;
    selectedRoomCardIdRef.current = pinnedId;
    setSelectedRoomCardId(pinnedId);

    const baseHost = latestHostPropertyRef.current || hostProperty;
    if (!baseHost) return;

    const currentRooms = Array.isArray(baseHost.rooms) ? [...baseHost.rooms] : [];
    const updatedRooms = currentRooms.map((r) => {
      const isMatch = Boolean(
        (card && r._id === card._id) ||
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
    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = nextUpdatedHost;
    setHostProperty(nextUpdatedHost);
  };

  const handleRemoveRoomCard = async (roomId, roomObj) => {
    const baseHost = latestHostPropertyRef.current || hostProperty;
    if (!baseHost) return;
    const currentRooms = Array.isArray(baseHost.rooms) ? [...baseHost.rooms] : [];
    
    const isTargetRoom = (r) => {
      if (!r) return false;
      if (isSameRoom(r, roomId)) return true;
      if (roomObj && isSameRoom(r, roomObj._id || roomObj.roomNumber)) return true;
      return false;
    };

    const targetRoom = currentRooms.find(isTargetRoom);
    const updatedRooms = currentRooms.filter((r) => !isTargetRoom(r));
    const totalCount = updatedRooms.length;
    const availCount = updatedRooms.filter((r) => r.status === 'Available').length;
    const isApprovedHost = baseHost.status === 'Approved' || Boolean(baseHost.isApproved);
    const nextStatus = isApprovedHost ? 'Approved' : (updatedRooms.length === 0 ? 'Pending Approval' : (baseHost.status || 'Pending Approval'));

    const updatedHost = {
      ...baseHost,
      rooms: updatedRooms,
      totalRooms: totalCount,
      availableRooms: availCount,
      availableRoomsCount: availCount,
      status: nextStatus,
    };

    // 1. Immediately update local state optimistically so room card disappears instantly
    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);

    // 2. Cascade delete orphaned bookings from database if this was an existing saved room
    if (targetRoom?.roomNumber && (Boolean(targetRoom._id))) {
      const rawNum = String(targetRoom.roomNumber).replace(/[^0-9]/g, '');
      try {
        await bookingsAPI.cascadeDeleteRoomBookings({
          hostEmail: baseHost.email,
          stayId: baseHost.stayId || baseHost._id,
          roomId: targetRoom?._id,
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
      const nextId = nextCard?._id || nextCard?.roomNumber || null;
      const nextNum = nextCard?.roomNumber ? String(nextCard.roomNumber).trim() : null;
      selectedRoomCardIdRef.current = nextId;
      selectedRoomNumberRef.current = nextNum;
      setSelectedRoomCardId(nextId);
      setSelectedRoomNumber(nextNum);
      selectedRoomIndexRef.current = 0;
    }

    toast.info('Room removed from preview. Click "Update" on the category tab to apply changes.');
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
        propertyName: (updatedHost.propertyName || updatedHost.title || hostProperty?.propertyName || hostProperty?.title || '').trim(),
        title: (updatedHost.propertyName || updatedHost.title || hostProperty?.propertyName || hostProperty?.title || '').trim(),
        propertyType: updatedHost.propertyType || updatedHost.type || hostProperty?.propertyType || hostProperty?.type || '',
        type: updatedHost.propertyType || updatedHost.type || hostProperty?.propertyType || hostProperty?.type || '',
        genderType: updatedHost.genderType || hostProperty?.genderType || '',
        description: (updatedHost.description !== undefined ? updatedHost.description : (hostProperty?.description || '')).trim(),
        address: (updatedHost.address !== undefined ? updatedHost.address : (hostProperty?.address || hostProperty?.location || '')).trim(),
        location: (updatedHost.location !== undefined ? updatedHost.location : (hostProperty?.location || hostProperty?.address || '')).trim(),
        roadArea: (updatedHost.roadArea !== undefined ? updatedHost.roadArea : (hostProperty?.roadArea || '')).trim(),
        city: (updatedHost.city !== undefined ? updatedHost.city : (hostProperty?.city || '')).trim(),
        state: (updatedHost.state !== undefined ? updatedHost.state : (hostProperty?.state || '')).trim(),
        pincode: (updatedHost.pincode !== undefined ? updatedHost.pincode : (hostProperty?.pincode || '')).trim(),
        latitude: updatedHost.latitude !== undefined && updatedHost.latitude !== null && updatedHost.latitude !== '' ? Number(updatedHost.latitude) : (hostProperty?.latitude ? Number(hostProperty.latitude) : null),
        longitude: updatedHost.longitude !== undefined && updatedHost.longitude !== null && updatedHost.longitude !== '' ? Number(updatedHost.longitude) : (hostProperty?.longitude ? Number(hostProperty.longitude) : null),
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
        status: (hostProperty?.status === 'Approved' || hostProperty?.isApproved || updatedHost?.status === 'Approved') ? 'Approved' : (hostProperty?.status || 'Pending Approval'),
        isApproved: Boolean(hostProperty?.status === 'Approved' || hostProperty?.isApproved || updatedHost?.status === 'Approved'),
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

        if (Array.isArray(merged.rooms)) {
          const updatedNumbers = new Set(
            merged.rooms.map((r) => String(r.roomNumber || '').trim()).filter(Boolean)
          );
          setSavedRoomNumbers(updatedNumbers);
          savedRoomNumbersRef.current = updatedNumbers;
        }

        try {
          window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
          window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
          localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('stayhub_live_channel');
            bc.postMessage({ type: 'HOST_UPDATED', hostId: merged._id, sender: 'HostDashboard' });
            bc.close();
          }
        } catch {
          /* ignore */
        }

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
  }, [user, hostProperty]);

  const handleDismissOrRejectBooking = useCallback(async (bookingOrRequest) => {
    if (!bookingOrRequest) {
      setRequestedUserBooking(null);
      setSelectedBookedGuest(null);
      return;
    }

    const b = bookingOrRequest;
    const targetBookingId = (b._id && /^[0-9a-fA-F]{24}$/.test(b._id))
      ? b._id
      : (b.bookingId || b.bookingReferenceId || b._id);

    const refId = b.bookingReferenceId || b.bookingId;
    const bId = b._id;
    const phone = b.phone || b.userPhone || b.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = b.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    // 1. Immediately wipe from all local state across the dashboard (0ms)
    setRequestedUserBooking(null);
    setSelectedBookedGuest(null);
    setGuests((prev) =>
      prev.filter((g) => {
        const gId = g._id || g.bookingId || g.bookingReferenceId;
        if (targetBookingId && gId && (gId === targetBookingId || String(gId) === String(targetBookingId))) return false;
        if (refId && (g.bookingReferenceId === refId || g.bookingId === refId)) return false;
        if (bId && g._id === bId) return false;
        const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
        const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
        return true;
      })
    );

    // 2. Perform database rejection & cascade slot release
    try {
      if (targetBookingId && !String(targetBookingId).startsWith('res_')) {
        await bookingsAPI.updateBookingStatus(targetBookingId, { status: 'REJECTED' }).catch(() => {});
        await bookingsAPI.deleteBooking(targetBookingId).catch(() => {});
      }

      await bookingsAPI
        .removeOccupantBooking({
          hostEmail: hostProperty?.email || hostProperty?.hostEmail,
          roomNumber: roomNum,
          occupantId: targetBookingId,
          bookingId: targetBookingId,
          bookingReferenceId: refId,
          slotBookingId: b.slotBookingId || refId,
          phone: cleanPhone || phone,
          name: b.userName || b.fullName || b.name || b.guestName,
          stayId: hostProperty?._id,
          hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
        })
        .catch(() => {});

      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);

      window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { sender: 'HostDashboard' } }));
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'HOST_UPDATED', hostId: propId, sender: 'HostDashboard' });
        bc.close();
      }

      showToast('Booking request dismissed and removed from all views.', 'info');
      refreshGuests();
    } catch (err) {
      console.warn('handleDismissOrRejectBooking error:', err);
      refreshGuests();
    }
  }, [hostProperty, broadcastStayUpdate, refreshGuests, showToast]);

  const fetchHostData = useCallback(async () => {
    if (
      hasUnsavedChangesRef.current ||
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
        const propId = foundHost._id || foundHost.email || 'default';
        const notifiedKey = `roomscout_approved_notified_${propId}`;
        const legacyNotifiedKey = `stayhub_approved_notified_${propId}`;
        const isApproved = foundHost.status === 'Approved';
        const alreadyNotified =
          typeof window !== 'undefined' &&
          (localStorage.getItem(notifiedKey) === 'true' || localStorage.getItem(legacyNotifiedKey) === 'true');

        // Only fire if there is a LIVE transition from a non-approved status to 'Approved'
        // during an active session (never on initial page mount or routine tab switching)
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
          // If property reverts to pending or unapproved, clear the flag so future approval can notify once
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

        setHostProperty(() => {
          if (hasUnsavedChangesRef.current && latestHostPropertyRef.current) {
            const merged = {
              ...latestHostPropertyRef.current,
              status: isApproved ? 'Approved' : (latestHostPropertyRef.current.status || 'Pending Approval'),
              isApproved: isApproved || Boolean(latestHostPropertyRef.current.isApproved),
            };
            latestHostPropertyRef.current = merged;
            return merged;
          }

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
            rateUnit: rr.rateUnit || '/night',
            _id: rr._id || `rate_${idx}`,
          }));

          const finalRooms = rawRooms.map((rm, idx) => {
            const rId = rm._id || `room_${rm.roomNumber || idx + 1}`;
            let rRateId = rm.rateId;
            let rCatIndex = rm.categoryIndex;
            let rType = rm.type;

            // Self-heal / associate legacy room with its category if missing or if rateId does not match current rate IDs
            const hasValidRateId = normalizedRates.some((rate) => String(rate._id) === String(rRateId));
            if (!rRateId || !hasValidRateId) {
              // 1. Match by type name
              let matchedIdx = normalizedRates.findIndex(
                (rate) => rate.type && rm.type && rate.type.trim().toLowerCase() === rm.type.trim().toLowerCase()
              );
              // 2. Fallback: match by categoryIndex
              if (matchedIdx === -1 && typeof rm.categoryIndex === 'number' && normalizedRates[rm.categoryIndex]) {
                matchedIdx = rm.categoryIndex;
              }
              // 3. Fallback: match by price
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
          latestHostPropertyRef.current = res;
          return res;
        });
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, updateUserSession, hostProperty]);

  useEffect(() => {
    if (location.state?.tab) {
      const isApprovedHost = hostProperty?.status === 'Approved' || hostProperty?.isApproved === true || location.state?.updatedHost?.status === 'Approved';
      if (isApprovedHost || location.state.tab === 'property') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(location.state.tab);
      } else {
        setActiveTab('property');
      }
    }
    if (location.state?.updatedHost) {
      setHostProperty(location.state.updatedHost);
      setLoading(false);
    }
    fetchHostData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, user?.email, user?._id]);

  // Tab Guard: If property is awaiting initial admin approval, lock navigation strictly to 'property' tab
  useEffect(() => {
    if (!loading && hostProperty) {
      const isApprovedHost = hostProperty?.status === 'Approved' || hostProperty?.isApproved === true;
      if (!isApprovedHost && activeTab !== 'property') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab('property');
      }
    }
  }, [hostProperty, activeTab, loading]);

  useEffect(() => {
    if (activeTab === 'users') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshGuests();
    }
  }, [activeTab, refreshGuests]);

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

    const handleFocus = () => {
      fetchHostData();
    };
    window.addEventListener('focus', handleFocus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHostData();
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

    // Auto-poll host data every 3.5s so guest requests, UTR submissions, and payments appear live without page refresh!
    const pollTimer = setInterval(() => {
      fetchHostData();
    }, 3500);

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
  }, [hostProperty?.status, hostProperty?.isApproved, fetchHostData]);

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
        let [, y, m, dy] = match;
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
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'CHECKED_OUT' ||
        st === 'EXPIRED'
      ) {
        return false;
      }

      // Online guests must have verified payment before counting as check-in
      if (isOnlineGuest(g) && !isPaidGuest(g)) {
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


  // Active Confirmed Paid Guests (Only verified by host with confirmed payment)
  const activePaidUsers = useMemo(() => {
    const activeRooms = new Set(
      Array.isArray(hostProperty?.rooms)
        ? hostProperty.rooms.map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
        : []
    );

    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRooms.size > 0 && (!gRoom || !activeRooms.has(gRoom))) return false;
      return isPaidGuest(g);
    });
  }, [guests, hostProperty]);

  const activePaidCount = activePaidUsers.length;

  // Calculate counts for User Visited console (Requests, Check-ins, Check-outs)
  const activeRoomNumbersSet = useMemo(() => {
    if (!Array.isArray(hostProperty?.rooms)) return new Set();
    return new Set(
      hostProperty.rooms
        .map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, ''))
        .filter(Boolean)
    );
  }, [hostProperty]);

  const pendingRequestsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED' || st === 'CONFIRMED' || st === 'CHECKED_IN') return false;
      return (
        st === 'PENDING HOST APPROVAL' ||
        st === 'PENDING' ||
        st === 'DRAFT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'AWAITING_PAYMENT' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        g.upiPayment?.verificationStatus === 'PENDING_VERIFICATION'
      );
    }).length;
  }, [guests, activeRoomNumbersSet]);

  const checkInsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'CHECKED_OUT' ||
        st === 'COMPLETED' ||
        st === 'EXPIRED'
      ) return false;

      // Online guests must be verified paid
      if (isOnlineGuest(g) && !isPaidGuest(g)) return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      return Boolean(g.checkIn || g.checkInISO || g.date || g.bookingId || g._id);
    }).length;
  }, [guests, activeRoomNumbersSet]);

  const checkOutsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'EXPIRED' ||
        st === 'CHECKED_OUT' ||
        st === 'COMPLETED'
      ) return false;

      // Only currently in-house (checked-in) guests can be checked out
      if (st !== 'CHECKED_IN') return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      return Boolean(g.checkOut || g.checkOutISO);
    }).length;
  }, [guests, activeRoomNumbersSet]);

  const isApproved = hostProperty?.status === 'Approved' || hostProperty?.isApproved === true;
  const isPending = !isApproved;

  return (
    <div
      className={`min-h-screen flex flex-col host-page-scope font-body-md antialiased text-slate-800 dark:text-on-surface bg-[#F8FAFC] dark:bg-[#070D18] selection:bg-custom-btn-primary selection:text-white relative transition-colors duration-300 ${
        activeTab === 'users' || activeTab === 'room' ? 'lg:h-screen lg:max-h-screen lg:overflow-hidden' : ''
      }`}
    >
      {/* ── Precision Architectural Dot Grid Background ── */}
      <Suspense fallback={null}>
        <PropertyArchitecturalBackground />
      </Suspense>

      {/* NAVBAR */}
      <HostDashboardNavbar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        isApproved={isApproved}
        onBack={handleBack}
        propertyType={hostProperty?.propertyType || hostProperty?.category || 'PG'}
        onEditDetails={() =>
          navigate('/host/upload', {
            state: {
              hostProperty: latestHostPropertyRef.current || hostProperty,
              fromDashboard: true,
            },
          })
        }
        onAddRoomType={handleAddNewRoomTypeRow}
        categoryCount={Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates.length : 0}
        roomCount={configuredCategoryRooms.length}
        todayCheckInsCount={todayCheckInsCount}
        activePaidCount={activePaidCount}
        activeRightPanelTab={activeRightPanelTab}
        setActiveRightPanelTab={setActiveRightPanelTab}
        visitedSubTab={visitedSubTab}
        onVisitedSubTabChange={setVisitedSubTab}
        pendingRequestsCount={pendingRequestsCount}
        checkInsCount={checkInsCount}
        checkOutsCount={checkOutsCount}
        onOpenPropertyTelemetry={() => setShowPropertyTelemetry(true)}
        propertyOccupancyRate={propertyOccupancyRate}
      />

      {/* MAIN CONTENT */}
      <main
        className={`w-full flex-1 relative bg-transparent text-slate-800 dark:text-on-surface font-body-md antialiased flex flex-col selection:bg-[#5E6BFF] selection:text-white ${
          activeTab === 'users' || activeTab === 'room' || activeTab === 'property'
            ? 'lg:h-[calc(100vh-4.75rem)] lg:overflow-hidden lg:min-h-0'
            : 'min-h-[calc(100vh-4rem)] overflow-x-hidden'
        }`}
      >
        <div className="w-full flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
            {/* Property Details Tab */}
            {activeTab === 'property' && (
              <motion.div
                key="console-tab-property"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 h-full min-h-0 flex flex-col px-3 sm:px-6 pt-2 sm:pt-2.5 pb-24 sm:pb-28 lg:pb-2.5 max-w-[1600px] mx-auto overflow-hidden relative"
              >
                <ErrorBoundary>
                  <Suspense fallback={<DashboardSkeletonLoader />}>
                    <PropertyDetailsSection
                      hostProperty={hostProperty || DEFAULT_HOST_PROPERTY}
                      isPending={isPending}
                      onEditDetails={() =>
                        navigate('/host/upload', {
                          state: {
                            hostProperty: latestHostPropertyRef.current || hostProperty,
                            fromDashboard: true,
                          },
                        })
                      }
                      onSaveProperty={handleAutoSyncProperty}
                      guests={guests}
                      onSwitchTab={handleTabSwitch}
                      activeSubTabIndex={propertySubTabIndex}
                      onSubTabChange={setPropertySubTabIndex}
                    />
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}

            {/* Room Schedule & Bookings Tab */}
            {activeTab === 'room' && (
              <motion.div
                key="console-tab-room"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 flex flex-col min-h-0"
              >
                <div className="flex flex-col w-full flex-1 h-full min-h-0 relative overflow-hidden">
                  <div className="relative w-full max-w-[1720px] mx-auto px-4 sm:px-6 pt-1 sm:pt-2 pb-28 sm:pb-32 lg:pb-3 flex flex-col gap-3 z-10 flex-1 min-h-0">
                    {/* Top Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAddNewRoomTypeRow}
                          className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/80 dark:border-purple-400/50 text-xs font-bold transition-all shadow-sm shadow-purple-600/20 cursor-pointer active:scale-95 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px] text-white group-hover:rotate-90 transition-transform">add</span>
                          <span>Add Room Type</span>
                        </button>
                      </div>
                      {/* Shifted Occupants / Add Guest console switch completely to this position */}
                      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100/90 dark:bg-surface-container-high border border-slate-200/80 dark:border-outline-variant/30 shadow-inner relative self-start sm:self-auto shrink-0 max-w-full overflow-x-auto no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setActiveRightPanelTab('occupants')}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer z-10 ${
                            activeRightPanelTab !== 'guest'
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-on-surface'
                          }`}
                          title="View active room occupants"
                        >
                          {activeRightPanelTab !== 'guest' && (
                            <motion.div
                              layoutId="occupantSwitchIndicator"
                              className="absolute inset-0 rounded-full bg-white dark:bg-surface-container-highest shadow-xs border border-slate-200/70 dark:border-transparent -z-10 pointer-events-none"
                              transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
                            />
                          )}
                          <span className="material-symbols-outlined text-[15px]">group</span>
                          <span>Occupants</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveRightPanelTab('guest')}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer z-10 ${
                            activeRightPanelTab === 'guest'
                              ? 'text-[#071320] font-black'
                              : 'text-slate-600 dark:text-slate-300 hover:text-[#00c984]'
                          }`}
                          title="Add new guest"
                        >
                          {activeRightPanelTab === 'guest' && (
                            <motion.div
                              layoutId="occupantSwitchIndicator"
                              className="absolute inset-0 rounded-full bg-[#00e599] shadow-xs shadow-[#00e599]/25 -z-10 pointer-events-none"
                              transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
                            />
                          )}
                          <span className="material-symbols-outlined text-[15px]">person_add</span>
                          <span>+ Add Guest</span>
                        </button>
                      </div>
                    </div>

                    {/* 3-Column Operational Dashboard Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start xl:items-center flex-1 min-h-0 my-auto">
                      {/* COLUMN 1: Room Category Configuration Card */}
                      <div className="xl:col-span-4 flex flex-col justify-center items-center my-auto min-h-0 w-full transition-all duration-300">
                        <ErrorBoundary>
                          <HostRoomCategories
                            roomRates={hostProperty?.roomRates || []}
                            rooms={
                              (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).map((rm, idx) => ({
                                ...rm,
                                _id: rm._id || `room_${rm.roomNumber || idx + 1}`,
                              }))
                            }
                            guests={guests}
                            todayISO={upcomingWeek[0]?.fullISO}
                            selectedCategoryIndex={selectedCategoryIndex}
                            onSelectCategoryIndex={setSelectedCategoryIndex}
                            onAddCategory={handleAddNewRoomTypeRow}
                            onRemoveCategory={handleRemoveRoomRate}
                            onUpdateCategory={handleUpdateRoomRate}
                            onSaveCategory={handleSaveCategory}
                            collapsedCategories={collapsedCategories}
                            onToggleCollapseCategory={toggleCollapseCategory}
                            selectedRoomCardId={selectedRoomCard?._id || selectedRoomCardId}
                            selectedRoomNumber={selectedRoomCard?.roomNumber || selectedRoomNumber}
                            onSelectRoomCardId={handleSelectRoomCard}
                            onAddRoomCard={handleAddRoomCard}
                            onRemoveRoomCard={handleRemoveRoomCard}
                            onUpdateRoomNumber={handleUpdateRoomNumber}
                            onUpdateRoomCapacity={handleUpdateRoomCapacity}
                          />
                        </ErrorBoundary>
                      </div>

                      {/* COLUMN 2+3 (xl:col-span-8): Calendar & Occupants via HostWeeklySlotSchedule */}
                      <div className="xl:col-span-8 flex flex-col min-h-0">
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
                                isRoomSavedToDb={isCurrentRoomSaved}
                                onRefreshBookings={refreshGuests}
                                onAutoSyncProperty={handleAutoSyncProperty}
                                showToast={showToast}
                                activeRightPanelTab={activeRightPanelTab}
                                setActiveRightPanelTab={setActiveRightPanelTab}
                                requestedUserBooking={requestedUserBooking}
                                onClearRequestedBooking={handleDismissOrRejectBooking}
                                selectedBookedGuest={selectedBookedGuest}
                                onClearBookedGuest={() => setSelectedBookedGuest(null)}
                                onGoBackToVisited={() => {
                                  setVisitedSubTab('requests');
                                  setActiveTab('users');
                                }}
                              />
                            </Suspense>
                          ) : (
                            <div className="hidden xl:flex flex-col items-center justify-center min-h-[320px] rounded-3xl border border-dashed border-slate-300 dark:border-outline-variant/60 bg-white/70 dark:bg-surface-container-low/60 backdrop-blur-sm text-center p-8 space-y-3 shadow-xs">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-container-high border border-slate-200 dark:border-outline-variant/40 flex items-center justify-center mx-auto text-slate-400 dark:text-primary">
                                <span className="material-symbols-outlined text-[24px]">meeting_room</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-on-surface">Select a room to view its schedule</p>
                                <p className="text-xs text-slate-500 dark:text-on-surface-variant max-w-sm mx-auto">Pick any room card from the left panel to open the booking calendar and occupants roster.</p>
                              </div>
                            </div>
                          )}
                        </ErrorBoundary>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Users Visited Tab */}
            {activeTab === 'users' && (
              <motion.div
                key="console-tab-users"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 min-h-0 flex flex-col px-3 sm:px-6 pt-1.5 pb-28 sm:pb-32 lg:pt-2 lg:pb-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden"
              >
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
                    subTab={visitedSubTab}
                    setSubTab={setVisitedSubTab}
                  />
                </Suspense>
              </motion.div>
            )}

            {/* Dedicated Paid Users Tab */}
            {activeTab === 'paid' && (
              <motion.div
                key="console-tab-paid"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 flex flex-col px-3 sm:px-6 pt-3 sm:pt-4 pb-28 sm:pb-32 lg:pb-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden"
              >
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <PaidUsersList
                    guests={activePaidUsers}
                    allGuests={guests}
                    setGuests={setGuests}
                    hostProperty={hostProperty}
                    showToast={showToast}
                    refreshGuests={refreshGuests}
                    broadcastStayUpdate={broadcastStayUpdate}
                    onBack={() => {
                      setVisitedSubTab('requests');
                      setActiveTab('users');
                    }}
                    onSelectUserRequest={handleSelectUserRequest}
                  />
                </Suspense>
              </motion.div>
            )}

            {/* UPI & Payment Settings Tab */}
            {activeTab === 'payment' && (
              <motion.div
                key="console-tab-payment"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 flex flex-col px-3 sm:px-6 pt-3 sm:pt-4 pb-28 sm:pb-32 lg:pb-8 max-w-[1200px] mx-auto overflow-y-auto"
              >
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <HostPaymentSettingsSection hostProperty={hostProperty} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Property Telemetry & Quick Actions Modal */}
      <PropertyTelemetryModal
        isOpen={showPropertyTelemetry}
        onClose={() => setShowPropertyTelemetry(false)}
        hostProperty={hostProperty || DEFAULT_HOST_PROPERTY}
        guests={guests}
        onSwitchTab={handleTabSwitch}
        onSelectSubTab={(subIdx) => {
          setPropertySubTabIndex(subIdx);
          handleTabSwitch('property');
        }}
      />
    </div>
  );
}

export default HostDashboardPage;