import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, bookingsAPI } from '../services/api';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import HostRoomCategories from '../components/host/HostRoomCategories';
import HostRoomCards from '../components/host/HostRoomCards';
import HostWeeklySlotSchedule from '../components/host/HostWeeklySlotSchedule';
import { HostUsersVisitedSection } from '../components/host/HostUsersVisitedSection';
import { getUpcoming30Days } from '../utils/dateUtils';

export function HostDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Center Navbar Tabs: 'property' | 'room' | 'users'
  const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'property');

  const [hostProperty, setHostProperty] = useState(() => location.state?.updatedHost || null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(() => !location.state?.updatedHost);
  const [isUpdatingRooms, setIsUpdatingRooms] = useState(false);
  const [updatingGuestId, setUpdatingGuestId] = useState(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [activeScrollDotIndex, setActiveScrollDotIndex] = useState(0);
  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const roomCardsScrollRef = useRef(null);
  const roomCardRefs = useRef({});

  // Active Category & Rooms
  const activeCategory = hostProperty?.roomRates?.[selectedCategoryIndex] || hostProperty?.roomRates?.[0] || null;

  const activeCategoryRooms = useMemo(() => {
    if (!activeCategory?.type) return [];
    return Array.isArray(hostProperty?.rooms)
      ? hostProperty.rooms.filter(
          (r) => r.type && activeCategory.type && r.type.toLowerCase() === activeCategory.type.toLowerCase()
        )
      : [];
  }, [hostProperty?.rooms, activeCategory?.type]);

  // Convert vertical wheel scrolling inside the room cards row to horizontal sliding
  const handleRoomCardsWheel = useCallback((e) => {
    const el = roomCardsScrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  // Callback ref to attach non-passive wheel listener the exact instant the element mounts
  const setRoomCardsScrollRef = useCallback((node) => {
    if (roomCardsScrollRef.current) {
      roomCardsScrollRef.current.removeEventListener('wheel', handleRoomCardsWheel);
    }
    roomCardsScrollRef.current = node;
    if (node) {
      node.addEventListener('wheel', handleRoomCardsWheel, { passive: false });
    }
  }, [handleRoomCardsWheel]);

  // Secondary backup effect whenever activeTab or category changes
  useEffect(() => {
    const el = roomCardsScrollRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleRoomCardsWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleRoomCardsWheel);
    };
  }, [activeTab, selectedCategoryIndex, activeCategoryRooms.length, handleRoomCardsWheel]);

  // Update active dot based on scroll position
  const handleRoomCardsScroll = () => {
    const el = roomCardsScrollRef.current;
    if (!el || !activeCategoryRooms.length) return;
    const cardStep = 130 + 12; // 130px card width + 12px gap
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / cardStep);
    const clamped = Math.max(0, Math.min(index, activeCategoryRooms.length - 1));
    setActiveScrollDotIndex(clamped);
  };

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => ({
      ...prev,
      [index]: !prev[index], // default is false (expanded / not collapsed)
    }));
  };

  const broadcastStayUpdate = (stayId) => {
    try {
      localStorage.setItem('stayhub_rooms_updated', Date.now().toString());
      if (stayId) localStorage.setItem('stayhub_last_stay_id', String(stayId));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { stayId } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'ROOMS_UPDATED', stayId });
        bc.close();
      }
    } catch {}
  };

  // Add a new room type row directly to persistent roomRates
  const handleAddNewRoomTypeRow = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRate = {
      id: newId,
      type: '',
      price: '',
      rateUnit: '',
      rateUnitLocked: false,
    };
    const currentRates = Array.isArray(hostProperty?.roomRates) ? [...hostProperty.roomRates] : [];
    const updatedRates = [...currentRates, newRate];
    const updatedHost = {
      ...(hostProperty || {}),
      roomRates: updatedRates,
    };
    setHostProperty(updatedHost);
    setSelectedCategoryIndex(updatedRates.length - 1);
    setCollapsedCategories((prev) => ({
      ...prev,
      [updatedRates.length - 1]: false,
    }));
    adminAPI.createHost(updatedHost).then(() => {
      broadcastStayUpdate(updatedHost.id || updatedHost._id);
    }).catch(() => {});
  };

  // Inline update of room rate fields
  const handleUpdateRoomRate = (index, field, value) => {
    setHostProperty((prev) => {
      if (!prev) return prev;
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const oldType = currentRates[index].type;
      currentRates[index] = {
        ...currentRates[index],
        [field]: value,
      };

      // If category type name changed, also sync all associated rooms to this new name
      let updatedRooms = prev.rooms;
      if (field === 'type' && oldType && Array.isArray(prev.rooms)) {
        updatedRooms = prev.rooms.map((r) =>
          r.type?.toLowerCase() === oldType.toLowerCase() ? { ...r, type: value } : r
        );
      }
      if (field === 'rateUnit' && currentRates[index].type && Array.isArray(prev.rooms)) {
        updatedRooms = prev.rooms.map((r) =>
          r.type?.toLowerCase() === currentRates[index].type.toLowerCase() ? { ...r, rateUnit: value } : r
        );
      }

      return {
        ...prev,
        roomRates: currentRates,
        rooms: updatedRooms,
      };
    });
  };

  // Save room rates to backend on blur
  const handleSaveRoomRateOnBlur = async () => {
    if (!hostProperty) return;
    try {
      await adminAPI.createHost(hostProperty);
      broadcastStayUpdate(hostProperty.id || hostProperty._id);
    } catch (err) {
      console.warn('Auto save blur error:', err);
    }
  };

  // Remove a room rate
  const handleRemoveRoomRate = async (index) => {
    if (!hostProperty) return;
    const currentRates = Array.isArray(hostProperty.roomRates) ? [...hostProperty.roomRates] : [];
    const removed = currentRates[index];
    currentRates.splice(index, 1);

    const updatedRooms = Array.isArray(hostProperty.rooms)
      ? hostProperty.rooms.filter((r) => r.type && removed?.type && r.type.toLowerCase() !== removed.type.toLowerCase())
      : [];

    const updatedHost = {
      ...hostProperty,
      roomRates: currentRates,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    };

    setHostProperty(updatedHost);
    setSelectedCategoryIndex((prev) => Math.max(0, Math.min(prev, currentRates.length - 1)));
    showToast('Room category removed.');

    try {
      await adminAPI.createHost(updatedHost);
      broadcastStayUpdate(updatedHost.id || updatedHost._id);
    } catch (err) {
      console.warn('Delete room rate error:', err);
    }
  };

  // Active selected room card (defaults to first room of category or user-clicked card)
  const selectedRoomCard = useMemo(() => {
    if (!activeCategoryRooms.length) return null;
    return activeCategoryRooms.find((r) => r.id === selectedRoomCardId) || activeCategoryRooms[0];
  }, [activeCategoryRooms, selectedRoomCardId]);

  // Selected slot dates for the active room
  const [selectedSlotIndices, setSelectedSlotIndices] = useState([]);
  const [hostUserPhone, setHostUserPhone] = useState('');
  const [hostUserName, setHostUserName] = useState('');
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);

  // State for editing occupant details
  const [editingOccupantId, setEditingOccupantId] = useState(null);
  const [editOccupantName, setEditOccupantName] = useState('');
  const [editOccupantPhone, setEditOccupantPhone] = useState('');
  const [isSavingOccupant, setIsSavingOccupant] = useState(false);

  // Get guest or booking associated with the selected room card, including per-date occupant mapping
  const roomBookingInfo = useMemo(() => {
    if (!selectedRoomCard) return { guest: null, bookedDates: new Set(), dateToGuestMap: {} };
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    const bookedDates = new Set();
    const dateToGuestMap = {};

    // 1. Inspect direct slotBookings or bookedDates stored directly on the room object
    if (Array.isArray(selectedRoomCard.slotBookings)) {
      selectedRoomCard.slotBookings.forEach((sb) => {
        if (Array.isArray(sb.bookedDates)) {
          sb.bookedDates.forEach((d) => {
            bookedDates.add(d);
            dateToGuestMap[d] = {
              userName: sb.guestName || sb.userName || 'Offline Guest',
              userPhone: sb.guestPhone || sb.userPhone || sb.phone || '',
              status: 'CONFIRMED',
            };
          });
        }
      });
    }

    if (Array.isArray(selectedRoomCard.bookedDates)) {
      selectedRoomCard.bookedDates.forEach((d) => {
        bookedDates.add(d);
        if (!dateToGuestMap[d]) {
          dateToGuestMap[d] = {
            userName: selectedRoomCard.guestName || 'Offline Guest',
            userPhone: selectedRoomCard.guestPhone || selectedRoomCard.userPhone || '',
            status: 'CONFIRMED',
          };
        }
      });
    }

    // 2. Dates from matching guest bookings
    let matchedGuest = null;
    guests.forEach((g) => {
      if (g.status === 'REJECTED' || g.status === 'CANCELLED' || g.status === 'CHECKED_OUT') return;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (gNum && rawCardNum && gNum === rawCardNum) {
        if (!matchedGuest) matchedGuest = g;
        const gDates = [];
        if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
          gDates.push(...g.bookedDates);
        } else if (g.checkInISO && g.checkOutISO) {
          let curr = new Date(g.checkInISO);
          const end = new Date(g.checkOutISO);
          while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            gDates.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
          }
        } else {
          upcomingWeek.forEach((slot) => gDates.push(slot.fullISO));
        }

        gDates.forEach((d) => {
          bookedDates.add(d);
          dateToGuestMap[d] = {
            userName: g.userName || g.fullName || g.guestName || 'Offline Guest',
            userPhone: g.userPhone || g.phone || g.guestPhone || '',
            status: g.status || 'CONFIRMED',
            checkIn: g.checkIn || '',
            checkOut: g.checkOut || '',
          };
        });
      }
    });

    return { guest: matchedGuest, bookedDates, dateToGuestMap };
  }, [selectedRoomCard, guests, upcomingWeek]);

  // List of all occupants for the selected room
  const roomOccupantsList = useMemo(() => {
    if (!selectedRoomCard) return [];
    const list = [];
    const seenBookingIds = new Set();
    const seenKeys = new Set();
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    // 1. Direct slot bookings from room card
    if (Array.isArray(selectedRoomCard.slotBookings)) {
      selectedRoomCard.slotBookings.forEach((sb) => {
        const dates = Array.isArray(sb.bookedDates) ? sb.bookedDates : [];
        const key = `${sb.guestPhone || sb.userPhone || ''}_${dates.join(',')}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          if (sb.id) seenBookingIds.add(sb.id);
          list.push({
            id: sb.id || `slot_${Date.now()}_${Math.random()}`,
            name: sb.guestName || sb.userName || 'Offline Guest',
            phone: sb.guestPhone || sb.userPhone || '',
            bookedDates: dates,
            status: 'CONFIRMED',
            totalAmount: sb.totalAmount || 0,
            createdAt: sb.createdAt,
            source: 'slotBooking',
          });
        }
      });
    }

    // 2. Matching bookings from guests
    guests.forEach((g) => {
      if (g.status === 'REJECTED' || g.status === 'CANCELLED' || g.status === 'CHECKED_OUT') return;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (gNum && rawCardNum && gNum === rawCardNum) {
        const dates = Array.isArray(g.bookedDates) && g.bookedDates.length > 0
          ? g.bookedDates
          : (g.checkInISO && g.checkOutISO ? [g.checkInISO] : []);
        const key = `${g.phone || g.userPhone || ''}_${dates.join(',')}`;
        const bId = g._id || g.id || g.bookingReferenceId;
        if (!seenKeys.has(key) && !seenBookingIds.has(bId) && !seenBookingIds.has(g.bookingReferenceId)) {
          seenKeys.add(key);
          if (bId) seenBookingIds.add(bId);
          list.push({
            id: bId,
            bookingReferenceId: g.bookingReferenceId,
            name: g.userName || g.fullName || g.guestName || 'Guest User',
            phone: g.userPhone || g.phone || g.guestPhone || '',
            bookedDates: dates,
            checkIn: g.checkIn,
            checkOut: g.checkOut,
            status: g.status || 'CONFIRMED',
            totalAmount: g.totalAmount || 0,
            createdAt: g.createdAt || g.bookingDate,
            source: 'booking',
          });
        }
      }
    });

    return list;
  }, [selectedRoomCard, guests]);

  // Toggle or range-select slots for the active room (blocks booked slots from being selected)
  const handleToggleSlotDay = (index) => {
    const slotISO = upcomingWeek[index]?.fullISO;
    if (roomBookingInfo.bookedDates.has(slotISO)) {
      showToast('This date slot is already booked for an occupant.', 'info');
      return;
    }
    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [index];
      if (prev.length === 1 && prev[0] === index) return [];
      const start = Math.min(prev[0], index);
      const end = Math.max(prev[0], index);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (roomBookingInfo.bookedDates.has(upcomingWeek[i]?.fullISO)) {
          showToast('Cannot select a date range containing already booked slots.', 'error');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  // Start editing occupant
  const handleStartEditOccupant = (occupant) => {
    setEditingOccupantId(occupant.id);
    setEditOccupantName(occupant.name);
    setEditOccupantPhone(occupant.phone);
  };

  // Cancel editing occupant
  const handleCancelEditOccupant = () => {
    setEditingOccupantId(null);
    setEditOccupantName('');
    setEditOccupantPhone('');
  };

  // Save occupant details
  const handleSaveOccupantEdit = async (occupant) => {
    if (!editOccupantName.trim()) {
      showToast('Occupant name cannot be empty.', 'error');
      return;
    }
    if (!editOccupantPhone.trim()) {
      showToast('Occupant mobile number cannot be empty.', 'error');
      return;
    }

    setIsSavingOccupant(true);
    try {
      const cleanName = editOccupantName.trim();
      const cleanPhone = editOccupantPhone.trim();

      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const updatedSlotBookings = prevSlotBookings.map((sb) => {
            const isMatch = sb.id === occupant.id ||
              (Array.isArray(sb.bookedDates) && Array.isArray(occupant.bookedDates) &&
               sb.bookedDates.some((d) => occupant.bookedDates.includes(d)));
            if (isMatch) {
              return {
                ...sb,
                guestName: cleanName,
                userName: cleanName,
                guestPhone: cleanPhone,
                userPhone: cleanPhone,
              };
            }
            return sb;
          });
          return {
            ...rm,
            slotBookings: updatedSlotBookings,
          };
        }
        return rm;
      });

      const updatedHost = {
        ...hostProperty,
        rooms: updatedRooms,
      };

      setHostProperty(updatedHost);
      await adminAPI.createHost(updatedHost).catch((err) => console.warn('Save host room edit error:', err));

      const matchingGuest = guests.find((g) =>
        g._id === occupant.id || g.id === occupant.id || g.bookingReferenceId === occupant.bookingReferenceId ||
        (Array.isArray(g.bookedDates) && Array.isArray(occupant.bookedDates) &&
         g.bookedDates.some((d) => occupant.bookedDates.includes(d)))
      );

      if (matchingGuest) {
        const bookingId = matchingGuest._id || matchingGuest.id || matchingGuest.bookingReferenceId;
        await bookingsAPI.updateBookingStatus(bookingId, {
          userName: cleanName,
          fullName: cleanName,
          guestName: cleanName,
          userPhone: cleanPhone,
          phone: cleanPhone,
          guestPhone: cleanPhone,
          status: matchingGuest.status || 'CONFIRMED',
          hostEmail: hostProperty?.email,
        }).catch((err) => console.warn('Save booking status error:', err));

        refreshGuests();
      }

      showToast('Occupant details updated successfully.', 'success');
      setEditingOccupantId(null);
    } catch (err) {
      console.error('Error saving occupant edit:', err);
      showToast('Failed to update occupant details.', 'error');
    } finally {
      setIsSavingOccupant(false);
    }
  };

  // Remove occupant and release booked slot dates
  const handleRemoveOccupant = async (occupant) => {
    if (!window.confirm(`Are you sure you want to remove occupant "${occupant.name}" and release their booked slots?`)) {
      return;
    }

    setIsUpdatingSlot(true);
    try {
      const datesToRemove = new Set(occupant.bookedDates || []);
      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const todayISO = upcomingWeek[0]?.fullISO;

      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const updatedSlotBookings = prevSlotBookings.filter((sb) => {
            if (sb.id && sb.id === occupant.id) return false;
            if (Array.isArray(sb.bookedDates) && sb.bookedDates.some((d) => datesToRemove.has(d))) return false;
            return true;
          });

          const prevBookedDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
          const remainingBookedDates = prevBookedDates.filter((d) => !datesToRemove.has(d));
          const isOccupiedToday = remainingBookedDates.includes(todayISO);

          return {
            ...rm,
            bookedDates: remainingBookedDates,
            slotBookings: updatedSlotBookings,
            status: isOccupiedToday ? 'Occupied' : 'Available',
          };
        }
        return rm;
      });

      const freeRoomsCount = updatedRooms.filter((rm) => {
        const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
        const isBookedToday = Array.isArray(rm.bookedDates) && rm.bookedDates.includes(todayISO);
        return !isOcc && !isBookedToday;
      }).length;

      const updatedHost = {
        ...hostProperty,
        rooms: updatedRooms,
        availableRooms: freeRoomsCount,
        availableRoomsCount: freeRoomsCount,
      };

      setHostProperty(updatedHost);
      await adminAPI.createHost(updatedHost).catch((err) => console.warn('Save host removal error:', err));

      const matchingGuest = guests.find((g) =>
        g._id === occupant.id || g.id === occupant.id || g.bookingReferenceId === occupant.bookingReferenceId ||
        (Array.isArray(g.bookedDates) && Array.isArray(occupant.bookedDates) &&
         g.bookedDates.some((d) => datesToRemove.has(d)))
      );

      if (matchingGuest) {
        const bookingId = matchingGuest._id || matchingGuest.id || matchingGuest.bookingReferenceId;
        await bookingsAPI.updateBookingStatus(bookingId, {
          status: 'CANCELLED',
          hostEmail: hostProperty?.email,
        }).catch((err) => console.warn('Cancel booking error:', err));

        refreshGuests();
      }

      showToast(`Occupant "${occupant.name}" removed and slots released successfully.`, 'success');
      setSelectedSlotIndices([]);
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  // Host marks selected weekly slots as Booked for this room (requires guest/user phone number)
  const handleHostMarkSlotBooked = async () => {
    if (!selectedRoomCard || selectedSlotIndices.length === 0) {
      showToast('Please select at least one date slot.', 'error');
      return;
    }

    if (!hostUserPhone.trim()) {
      showToast('Please enter the User / Guest mobile number to book the slot.', 'error');
      return;
    }

    setIsUpdatingSlot(true);
    try {
      const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
      const chosenDates = sortedIndices.map((idx) => upcomingWeek[idx]?.fullISO).filter(Boolean);
      const firstSlot = upcomingWeek[sortedIndices[0]];
      const lastSlot = upcomingWeek[sortedIndices[sortedIndices.length - 1]];

      const nextD = new Date(lastSlot.dateObj);
      nextD.setDate(nextD.getDate() + 1);
      const nextDayISO = nextD.toISOString().split('T')[0];

      const cleanPhone = hostUserPhone.trim();
      const cleanName = hostUserName.trim() || `Offline Guest (${cleanPhone})`;

      const bookingPayload = {
        id: `host_res_${Date.now()}`,
        bookingId: `RES-${Date.now().toString().slice(-6)}`,
        bookingReferenceId: `RES-${Date.now().toString().slice(-6)}`,
        stayId: hostProperty?._id || hostProperty?.id || 'host_prop',
        stayTitle: hostProperty?.propertyName || 'Host Property',
        hostEmail: hostProperty?.email || '',
        roomNumber: selectedRoomCard.roomNumber,
        roomType: selectedRoomCard.type,
        price: selectedRoomCard.price || '₹4,500',
        rateUnit: selectedRoomCard.rateUnit || '/month',
        checkIn: `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''} (12:00 PM)`,
        checkOut: `${lastSlot.dayName}, ${lastSlot.monthDay ? lastSlot.monthDay.replace('Sep', 'Sept') : ''} (11:59 AM)`,
        checkInISO: firstSlot.fullISO,
        checkOutISO: nextDayISO,
        bookedDates: chosenDates,
        guestName: cleanName,
        userName: cleanName,
        fullName: cleanName,
        guestPhone: cleanPhone,
        userPhone: cleanPhone,
        phone: cleanPhone,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      };

      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
          const combinedDates = Array.from(new Set([...prevDates, ...chosenDates]));
          const includesToday = chosenDates.includes(upcomingWeek[0]?.fullISO);
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const newSlotBooking = {
            id: bookingPayload.id,
            guestName: cleanName,
            userName: cleanName,
            guestPhone: cleanPhone,
            userPhone: cleanPhone,
            bookedDates: chosenDates,
            createdAt: new Date().toISOString(),
          };

          return {
            ...rm,
            bookedDates: combinedDates,
            slotBookings: [...prevSlotBookings, newSlotBooking],
            status: includesToday ? 'Occupied' : (rm.status || 'Available'),
          };
        }
        return rm;
      });

      const todayISO = upcomingWeek[0]?.fullISO;
      const freeRoomsCount = updatedRooms.filter((rm) => {
        const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
        const isBookedToday = Array.isArray(rm.bookedDates) && rm.bookedDates.includes(todayISO);
        return !isOcc && !isBookedToday;
      }).length;

      const updatedHost = {
        ...(hostProperty || {}),
        rooms: updatedRooms,
        availableRooms: freeRoomsCount,
      };

      setHostProperty(updatedHost);
      setGuests((prev) => [bookingPayload, ...prev]);

      await adminAPI.createHost(updatedHost).catch(() => {});
      try {
        await bookingsAPI.createBooking(bookingPayload);
      } catch (err) {
        console.warn('Booking API save warning:', err);
      }

      showToast(`Room ${selectedRoomCard.roomNumber} booked for ${cleanName} (${cleanPhone})!`, 'success');
      setSelectedSlotIndices([]);
      setHostUserPhone('');
      setHostUserName('');
    } catch (err) {
      console.error('Error marking room as booked:', err);
      showToast('Could not update slot. Please try again.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  // Host releases selected weekly slots back to Available (Only host can unbook)
  const handleHostReleaseSlot = async () => {
    if (!selectedRoomCard || selectedSlotIndices.length === 0) {
      showToast('Please select at least one date slot to release.', 'error');
      return;
    }

    setIsUpdatingSlot(true);
    try {
      const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
      const chosenDates = new Set(sortedIndices.map((idx) => upcomingWeek[idx]?.fullISO).filter(Boolean));

      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
          const remainingDates = prevDates.filter((d) => !chosenDates.has(d));
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const remainingSlotBookings = prevSlotBookings.filter(
            (sb) => !Array.isArray(sb.bookedDates) || !sb.bookedDates.some((d) => chosenDates.has(d))
          );
          const todayISO = upcomingWeek[0]?.fullISO;
          const isTodayBooked = remainingDates.includes(todayISO);
          return {
            ...rm,
            bookedDates: remainingDates,
            slotBookings: remainingSlotBookings,
            status: isTodayBooked ? 'Occupied' : 'Available',
          };
        }
        return rm;
      });

      const todayISO = upcomingWeek[0]?.fullISO;
      const freeRoomsCount = updatedRooms.filter((rm) => {
        const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
        const isBookedToday = Array.isArray(rm.bookedDates) && rm.bookedDates.includes(todayISO);
        return !isOcc && !isBookedToday;
      }).length;

      const updatedHost = {
        ...(hostProperty || {}),
        rooms: updatedRooms,
        availableRooms: freeRoomsCount,
      };

      setHostProperty(updatedHost);

      // Cancel matching bookings in DB
      const matchingBookings = guests.filter((g) => {
        const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        const cNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');
        return gNum && cNum && gNum === cNum && Array.isArray(g.bookedDates) && g.bookedDates.some((d) => chosenDates.has(d));
      });

      for (const b of matchingBookings) {
        const bId = b.id || b._id || b.bookingReferenceId;
        if (bId) {
          try {
            await bookingsAPI.updateBookingStatus(bId, { status: 'CANCELLED' });
          } catch {}
        }
      }

      setGuests((prev) =>
        prev.filter((g) => {
          const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
          const cNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');
          if (gNum && cNum && gNum === cNum) {
            if (Array.isArray(g.bookedDates) && g.bookedDates.some((d) => chosenDates.has(d))) {
              return false;
            }
          }
          return true;
        })
      );

      await adminAPI.createHost(updatedHost).catch(() => {});
      showToast(`Selected dates for Room ${selectedRoomCard.roomNumber} unbooked and marked Available!`, 'success');
      setSelectedSlotIndices([]);
      setHostUserPhone('');
      setHostUserName('');
    } catch (err) {
      console.error('Error releasing slot:', err);
      showToast('Could not release slot. Please try again.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  // Calculate total rooms strictly belonging to currently active room categories
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

  // Add a room card to a category
  const handleAddRoomCard = (targetCategory) => {
    const cat = targetCategory || activeCategory;
    if (!cat || !cat.type) {
      showToast('Please enter a category name first.', 'error');
      return;
    }

    const catRooms = Array.isArray(hostProperty?.rooms)
      ? hostProperty.rooms.filter(
          (r) => r.type && cat.type && r.type.toLowerCase() === cat.type.toLowerCase()
        )
      : [];

    const countForType = catRooms.length;
    let nextNum = '101';
    if (countForType > 0) {
      const lastNum = parseInt(String(catRooms[countForType - 1]?.roomNumber || '').replace(/[^0-9]/g, ''), 10);
      nextNum = !isNaN(lastNum) ? String(lastNum + 1) : `${101 + countForType}`;
    }

    const newCard = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roomNumber: nextNum,
      roomNumInt: parseInt(nextNum, 10) || 101,
      type: cat.type,
      price: cat.price || '₹4,500',
      rateUnit: cat.rateUnit || '/month',
      status: 'Available',
    };

    const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
    const updatedRooms = [...currentRooms, newCard];
    const updatedHost = {
      ...hostProperty,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    };

    handleAutoSyncProperty(updatedHost);
    setSelectedRoomCardId(newCard.id);
    if (targetCategory && Array.isArray(hostProperty?.roomRates)) {
      const catIdx = hostProperty.roomRates.findIndex(
        (r) => r.type && r.type.toLowerCase() === targetCategory.type.toLowerCase()
      );
      if (catIdx !== -1) {
        setSelectedCategoryIndex(catIdx);
      }
    }
    toast.success(`Added Room ${nextNum} to ${cat.type}`);
  };

  // Inline edit room number with debounced auto-sync
  const handleUpdateRoomNumber = (roomId, newNumber) => {
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
      const updated = {
        ...prev,
        rooms: updatedRooms,
      };
      adminAPI.createHost(updated).catch(() => {});
      return updated;
    });
  };

  // Remove a room card with immediate auto-sync
  const handleRemoveRoomCard = (roomId) => {
    if (!hostProperty) return;
    const currentRooms = Array.isArray(hostProperty.rooms) ? [...hostProperty.rooms] : [];
    const updatedRooms = currentRooms.filter((r) => r.id !== roomId);
    const updatedHost = {
      ...hostProperty,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    };
    handleAutoSyncProperty(updatedHost);
    toast.info('Room card removed');
  };

  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Live auto-sync handler: saves property and room details directly to database without needing manual button click
  const handleAutoSyncProperty = async (updatedHost) => {
    if (!updatedHost) return;
    setHostProperty(updatedHost);
    setIsSavingProperty(true);
    try {
      await adminAPI.createHost(updatedHost);
      try {
        localStorage.setItem('stayhub_slots_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      } catch (e) {}
    } catch (err) {
      console.warn('Auto-sync property error:', err);
    } finally {
      setIsSavingProperty(false);
    }
  };

  // Explicit Update button handler to save property and room details to database
  const handleUpdatePropertyToDatabase = async () => {
    if (!hostProperty) return;

    try {
      setIsSavingProperty(true);

      const formattedRates = Array.isArray(hostProperty.roomRates)
        ? hostProperty.roomRates
            .filter((r) => r && (r.type || r.price))
            .map((r) => {
              const cleanType = (r.type || '').trim();
              const numPrice = parseInt(String(r.price || '').replace(/[^0-9]/g, ''), 10);
              const formattedPrice = !isNaN(numPrice) ? `₹${numPrice.toLocaleString('en-IN')}` : (r.price || '');
              return {
                id: r.id || `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                type: cleanType,
                price: formattedPrice,
                rateUnit: r.rateUnit || '/month',
              };
            })
            .filter((r) => r.type !== '')
        : [];

      // Only keep rooms that belong to active valid room categories
      const validCategoryTypes = formattedRates.map((r) => r.type.toLowerCase()).filter(Boolean);
      const cleanedRooms = Array.isArray(hostProperty.rooms)
        ? hostProperty.rooms
            .filter((rm) => rm && rm.type && validCategoryTypes.includes(rm.type.toLowerCase()))
            .map((rm) => ({
              ...rm,
              roomNumber: (rm.roomNumber || '').trim(),
              status: rm.status || 'Available',
            }))
        : [];

      const totalCount = cleanedRooms.length;
      const availCount = cleanedRooms.filter((rm) => rm.status === 'Available').length;

      const updatedPayload = {
        ...hostProperty,
        roomRates: formattedRates,
        rooms: cleanedRooms,
        totalRooms: totalCount,
        availableRooms: availCount,
      };

      const res = await adminAPI.createHost(updatedPayload);
      broadcastStayUpdate(updatedPayload.id || updatedPayload._id);
      if (res?.host) {
        setHostProperty((prev) => ({
          ...prev,
          ...res.host,
          roomRates: formattedRates,
          rooms: cleanedRooms,
          totalRooms: totalCount,
          availableRooms: availCount,
        }));
      } else {
        setHostProperty(updatedPayload);
      }

      showToast(`Saved ${formattedRates.length} room types and ${totalCount} rooms with their room numbers to database!`, 'success');
    } catch (err) {
      console.error('Failed to update property details to database:', err);
      showToast('Failed to update property details to database', 'error');
    } finally {
      setIsSavingProperty(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
      toast.error(msg);
    } else if (
      type === 'success' ||
      msg.toLowerCase().includes('updated') ||
      msg.toLowerCase().includes('success') ||
      msg.toLowerCase().includes('saved') ||
      msg.toLowerCase().includes('checked')
    ) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

  // Helper to format date & time strictly as "25 Aug 2026, 04:00 PM"
  const formatDateTime = (dateVal) => {
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
  };

  // Live polling helper to reload guests and room slot bookings from backend
  const refreshGuests = useCallback(async () => {
    try {
      const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('mal_practice_user') : null;
      let savedUser = null;
      try {
        savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      } catch {
        savedUser = null;
      }
      const effectiveUser = user || savedUser;
      const targetEmail = effectiveUser?.email ? effectiveUser.email.trim().toLowerCase() : 'harshchhikara1516@gmail.com';

      const [guestsRes, propRes] = await Promise.all([
        adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] })),
        adminAPI.getHostByEmail(targetEmail).catch(() => ({ host: null })),
      ]);

      if (Array.isArray(guestsRes?.guests)) {
        setGuests(guestsRes.guests);
      }

      if (propRes?.hasProperty && propRes?.host?.rooms) {
        setHostProperty((prev) => {
          if (!prev) return propRes.host;
          return {
            ...prev,
            rooms: propRes.host.rooms,
          };
        });
      }
    } catch (err) {
      console.warn('refreshGuests error:', err);
    }
  }, [user]);

  const fetchHostData = async () => {
    try {
      if (!hostProperty) {
        setLoading(true);
      }
      const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('mal_practice_user') : null;
      let savedUser = null;
      try {
        savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      } catch {
        savedUser = null;
      }
      const effectiveUser = user || savedUser;
      const targetEmail = effectiveUser?.email ? effectiveUser.email.trim().toLowerCase() : 'harshchhikara1516@gmail.com';

      const [propRes, guestsRes] = await Promise.all([
        adminAPI.getHostByEmail(targetEmail).catch(() => ({ host: null })),
        adminAPI.getHostGuests(targetEmail).catch(() => ({ guests: [] })),
      ]);

      if (Array.isArray(guestsRes?.guests)) {
        setGuests(guestsRes.guests);
      }

      let foundHost = null;
      if (propRes?.hasProperty && propRes?.host) {
        foundHost = propRes.host;
      }

      if (!foundHost) {
        const hostsList = await adminAPI.getHosts().catch(() => []);
        if (Array.isArray(hostsList) && hostsList.length > 0) {
          foundHost = hostsList.find((h) => h.email?.toLowerCase() === targetEmail) || hostsList[0];
          if (foundHost) {
            const fallbackGuests = await adminAPI.getHostGuests(foundHost.email).catch(() => ({ guests: [] }));
            if (Array.isArray(fallbackGuests?.guests) && fallbackGuests.guests.length > 0) {
              setGuests(fallbackGuests.guests);
            }
          }
        }
      }

      if (foundHost) {
        // Ensure rooms loaded into state strictly match valid room categories
        const rates = Array.isArray(foundHost.roomRates) ? foundHost.roomRates : [];
        const validTypes = rates.map((r) => (r.type || '').trim().toLowerCase()).filter(Boolean);
        const validRooms = Array.isArray(foundHost.rooms)
          ? foundHost.rooms.filter((rm) => rm.type && validTypes.includes(rm.type.trim().toLowerCase()))
          : [];

        const sanitizedHost = {
          ...foundHost,
          rooms: validRooms,
          totalRooms: validRooms.length,
          availableRooms: validRooms.filter((rm) => rm.status === 'Available').length,
        };

        setHostProperty((prev) => {
          if (location.state?.updatedHost) {
            const locRates = Array.isArray(location.state.updatedHost.roomRates)
              ? location.state.updatedHost.roomRates
              : sanitizedHost.roomRates;
            const locValidTypes = locRates.map((r) => (r.type || '').trim().toLowerCase()).filter(Boolean);
            const locRooms = Array.isArray(location.state.updatedHost.rooms)
              ? location.state.updatedHost.rooms.filter((rm) => rm.type && locValidTypes.includes(rm.type.trim().toLowerCase()))
              : sanitizedHost.rooms;

            return {
              ...sanitizedHost,
              ...location.state.updatedHost,
              roomRates: locRates,
              rooms: locRooms,
              totalRooms: locRooms.length,
              availableRooms: locRooms.filter((rm) => rm.status === 'Available').length,
            };
          }
          return sanitizedHost;
        });
      }

      if (Array.isArray(guestsRes?.guests) && guestsRes.guests.length > 0) {
        setGuests(guestsRes.guests);
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    if (location.state?.updatedHost) {
      setHostProperty(location.state.updatedHost);
      setLoading(false);
    }
    fetchHostData();
  }, [location.key, user?.email, user?.id]);

  // Derived 2D Rooms array
  const currentRooms = useMemo(() => {
    if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
      return hostProperty.rooms;
    }
    const total = Number(hostProperty?.totalRooms || hostProperty?.availableRooms || 4);
    const availableCount = Number(hostProperty?.availableRooms !== undefined ? hostProperty.availableRooms : total);
    const rates = Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0
      ? hostProperty.roomRates
      : [{ type: 'Standard Room', price: '₹4,000', rateUnit: '/month' }];

    const generated = [];
    for (let i = 1; i <= total; i++) {
      const floorNum = Math.ceil(i / 4);
      const roomNum = 100 * floorNum + ((i - 1) % 4 + 1);
      const rate = rates[(i - 1) % rates.length];
      generated.push({
        id: `room_${roomNum}`,
        roomNumber: `Room ${roomNum}`,
        floor: `Floor ${floorNum}`,
        type: rate.type || 'Standard Room',
        price: rate.price || '₹4,000',
        rateUnit: rate.rateUnit || '/month',
        status: i <= availableCount ? 'Available' : 'Booked',
      });
    }
    return generated;
  }, [hostProperty]);

  // Toggle single room card status
  const handleToggleRoomStatus = async (roomId) => {
    const list = Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0
      ? hostProperty.rooms
      : currentRooms;

    const updatedRooms = list.map((rm) => {
      if (rm.id === roomId) {
        const nextStatus = rm.status === 'Available' ? 'Booked' : 'Available';
        return { ...rm, status: nextStatus };
      }
      return rm;
    });

    const newAvailable = updatedRooms.filter((r) => r.status === 'Available').length;
    const total = updatedRooms.length;

    const updatedHost = {
      ...hostProperty,
      rooms: updatedRooms,
      availableRooms: newAvailable,
      totalRooms: total,
    };

    setHostProperty(updatedHost);

    try {
      await adminAPI.createHost(updatedHost);
      showToast(`Room updated. Available: ${newAvailable} of ${total}`);
    } catch (err) {
      showToast('Failed to save room status to server', 'error');
    }
  };

  // Quick manual update for available rooms
  const handleUpdateRooms = async (newCount) => {
    const maxLimit = hostProperty?.totalRooms || hostProperty?.availableRooms || 1;
    if (newCount < 0) return;
    if (newCount > maxLimit) {
      showToast(`Cannot exceed total room limit of ${maxLimit}`);
      return;
    }
    try {
      setIsUpdatingRooms(true);
      const list = Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0
        ? [...hostProperty.rooms]
        : [...currentRooms];

      const updatedRooms = list.map((rm, idx) => ({
        ...rm,
        status: idx < newCount ? 'Available' : 'Booked',
      }));

      const updatedData = {
        ...hostProperty,
        availableRooms: newCount,
        totalRooms: maxLimit,
        rooms: updatedRooms,
      };
      await adminAPI.createHost(updatedData);
      setHostProperty(updatedData);
      showToast(`Available rooms updated to ${newCount} of ${maxLimit}`);
    } catch (err) {
      showToast(`Update error: ${err.message}`);
    } finally {
      setIsUpdatingRooms(false);
    }
  };

  // Automatic Room Count Adjustment on Guest Status Change (Check-in / Check-out)
  const handleGuestStatusChange = async (guest, newStatus) => {
    const bookingId = guest.bookingId || guest._id || guest.id || guest.bookingReferenceId;
    if (!bookingId) return;

    try {
      setUpdatingGuestId(bookingId);
      const hostEmail = hostProperty?.email || user?.email || '';

      await bookingsAPI.updateBookingStatus(bookingId, {
        status: newStatus,
        hostEmail,
      });

      setGuests((prev) =>
        prev.map((g) => {
          const gId = g.bookingId || g._id || g.id || g.bookingReferenceId;
          if (gId === bookingId) {
            return { ...g, status: newStatus };
          }
          return g;
        })
      );

      const total = hostProperty?.totalRooms || hostProperty?.availableRooms || 1;
      let currentAvailable = hostProperty?.availableRooms !== undefined ? hostProperty.availableRooms : total;

      if (newStatus === 'CHECKED_IN' || newStatus === 'CONFIRMED') {
        const updatedAvail = Math.max(0, currentAvailable - 1);
        setHostProperty((prev) => ({ ...prev, availableRooms: updatedAvail }));
        showToast(`Guest checked in! 1 room allocated. Available: ${updatedAvail} / ${total}`);
      } else if (newStatus === 'CHECKED_OUT' || newStatus === 'CANCELLED') {
        const updatedAvail = Math.min(total, currentAvailable + 1);
        setHostProperty((prev) => ({ ...prev, availableRooms: updatedAvail }));
        showToast(`Guest checked out! 1 room freed. Available: ${updatedAvail} / ${total}`);
      }
    } catch (err) {
      showToast(`Status update failed: ${err.message}`, 'error');
    } finally {
      setUpdatingGuestId(null);
    }
  };

  const isPending = hostProperty?.status === 'Pending Approval' || hostProperty?.isApproved === false;
  const totalRoomsCount = hostProperty?.totalRooms || hostProperty?.availableRooms || currentRooms.length || 1;
  const availableRoomsCount =
    hostProperty?.availableRooms !== undefined
      ? hostProperty.availableRooms
      : currentRooms.filter((r) => r.status === 'Available').length;
  const occupiedRoomsCount = Math.max(0, totalRoomsCount - availableRoomsCount);
  const occupancyPercent = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* 🧭 PREMIUM NAVBAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-10 h-16 flex items-center justify-between gap-3">
          {/* Left: Simple Back Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Back to Home"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Exact Tab Buttons: Property, Room, Users Visited */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('property')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'property'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Property
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('room')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'room'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Room
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Users Visited</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                {guests.length}
              </span>
            </button>
          </div>

          {/* Right: Profile Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Login />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 📋 MAIN CONTENT */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full overflow-y-auto">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-10 py-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-sm">
              Loading host dashboard...
            </div>
          ) : !hostProperty ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                No Property Registered Yet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Please complete your property registration form with location details, facilities, and room rates.
              </p>
              <button
                type="button"
                onClick={() => navigate('/host/upload')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Go to Property Form
              </button>
            </div>
          ) : (
            <>
              {/* ================================================================= */}
              {/* 🏠 TAB 1: PROPERTY (ALL PROPERTY DETAILS, NO ROOM ITEMS) */}
              {/* ================================================================= */}
              {activeTab === 'property' && (
                <div className="space-y-5">
                  {/* Property Header Banner */}
                  <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                            {hostProperty.propertyType || 'PG'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                            For: {hostProperty.genderType || 'Both'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                            Rating: ★ {hostProperty.rating || 4.8}
                          </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                          {hostProperty.propertyName}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {hostProperty.address || hostProperty.location || 'Location not specified'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-semibold">
                            Pending Admin Approval
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
                            Approved & Live
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate('/host/upload')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>

                    {isPending && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
                        <span>
                          Property upload request is pending admin review. Once approved, it will be visible in search results.
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate('/admin')}
                          className="font-bold underline shrink-0 cursor-pointer"
                        >
                          Review in Admin
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description & Address Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Description */}
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Property Description
                      </h2>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {hostProperty.description || hostProperty.bio || 'No description provided.'}
                      </p>
                    </div>

                    {/* Address & Coordinates */}
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Address & Location
                      </h2>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <p><span className="text-slate-400">Full Address:</span> {hostProperty.address || '—'}</p>
                        <p><span className="text-slate-400">Area / Road:</span> {hostProperty.roadArea || '—'}</p>
                        <p><span className="text-slate-400">City / State:</span> {hostProperty.city || '—'}, {hostProperty.state || '—'} {hostProperty.pincode ? `(${hostProperty.pincode})` : ''}</p>
                        <p><span className="text-slate-400">Coordinates:</span> {Number(hostProperty.latitude || 29.3919).toFixed(5)}, {Number(hostProperty.longitude || 79.4542).toFixed(5)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Facilities & Rules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Facilities */}
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Facilities ({hostProperty.amenities?.length || 0})
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(hostProperty.amenities) && hostProperty.amenities.length > 0 ? (
                          hostProperty.amenities.map((facility, fIdx) => (
                            <span
                              key={fIdx}
                              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                            >
                              {facility}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No facilities listed</span>
                        )}
                      </div>
                    </div>

                    {/* Rules */}
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Rules & Policies ({hostProperty.rules?.length || hostProperty.houseRules?.length || 0})
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(hostProperty.rules) && hostProperty.rules.length > 0) ||
                        (Array.isArray(hostProperty.houseRules) && hostProperty.houseRules.length > 0) ? (
                          (hostProperty.rules || hostProperty.houseRules).map((rule, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
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

                  {/* Photos */}
                  {Array.isArray(hostProperty.images) && hostProperty.images.length > 0 && (
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Property Photos ({hostProperty.images.length})
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {hostProperty.images.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
              )}

              {/* ================================================================= */}
              {/* 🛏️ TAB 2: ROOM (SPLIT VIEW: LEFT PANEL = TYPES, CENTER = ROOMS) */}
              {/* ================================================================= */}
              {activeTab === 'room' && (
                <div className="space-y-5">
                  {/* Top Action & Metrics Bar */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewRoomTypeRow}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-fit shadow-2xs"
                      >
                        <span className="text-sm font-bold leading-none">+</span>
                        <span>Add Room Type</span>
                      </button>
                    </div>

                    {/* Metrics Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 shadow-2xs">
                          <span className="text-slate-400">Categories</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates.length : 0}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 shadow-2xs">
                          <span className="text-slate-400">Rooms</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {configuredCategoryRooms.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🏢 3-TAB BALANCED DASHBOARD (EXACT SAME WIDTH FOR LEFT, MID & RIGHT TABS):
                      - TAB 1 (LEFT, 1/3 WIDTH): ROOM CATEGORIES & RESPECTIVE ROOMS PANEL AT BOTTOM
                      - TAB 2 (MID, 1/3 WIDTH): MONTH CARD SCHEDULE
                      - TAB 3 (RIGHT, 1/3 WIDTH): GUEST DETAILS & CONFIRMATION & OCCUPANTS
                  */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {/* ⬅️ TAB 1 (LEFT): ROOM CATEGORIES WITH ATTACHED ROOM CARDS AT BOTTOM */}
                    <div className="space-y-4">
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
                        selectedRoomCardId={selectedRoomCard?.id}
                        onSelectRoomCardId={setSelectedRoomCardId}
                        onAddRoomCard={handleAddRoomCard}
                        onRemoveRoomCard={handleRemoveRoomCard}
                        onUpdateRoomNumber={handleUpdateRoomNumber}
                      />
                    </div>

                    {/* 📅 TAB 2 (MID) & 👥 TAB 3 (RIGHT): HOST WEEKLY SLOT SCHEDULE (EACH EXACT 1fr EQUAL WIDTH) */}
                    <div className="lg:col-span-2">
                      {selectedRoomCard ? (
                        <HostWeeklySlotSchedule
                          selectedRoomCard={selectedRoomCard}
                          activeCategory={activeCategory}
                          upcomingWeek={upcomingWeek}
                          guests={guests}
                          hostProperty={hostProperty}
                          onRefreshBookings={refreshGuests}
                          onAutoSyncProperty={handleAutoSyncProperty}
                          showToast={showToast}
                        />
                      ) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                          Select a room card on the left to view schedule and occupants.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 👥 TAB 3: USERS VISITED (SUB-NAVBARS: REQUESTS, CHECK-IN, CHECK-OUT) */}
              {/* ================================================================= */}
              {activeTab === 'users' && (
                <HostUsersVisitedSection
                  guests={guests}
                  setGuests={setGuests}
                  hostProperty={hostProperty}
                  setHostProperty={setHostProperty}
                  showToast={showToast}
                  refreshGuests={refreshGuests}
                  broadcastStayUpdate={broadcastStayUpdate}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default HostDashboardPage;
