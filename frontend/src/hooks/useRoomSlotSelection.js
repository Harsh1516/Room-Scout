import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from '../context/ToastContext';

function getRoomKey(r) {
  if (!r) return null;
  return r._id || r.id || (r.roomNumber ? String(r.roomNumber).trim() : null);
}

export function useRoomSlotSelection(
  selectedRoom,
  upcomingWeek,
  upcomingMonths,
  bookedSlotsForRoom,
  userRequestedSlotsForRoom,
  bookedMonthsForRoom,
  userRequestedMonthsForRoom,
  isMonthly = false
) {
  const [roomSelectedSlotsMap, setRoomSelectedSlotsMap] = useState({});
  const [roomSelectedMonthsMap, setRoomSelectedMonthsMap] = useState({});

  const selectedSlotIndices = useMemo(() => {
    if (!selectedRoom) return [];
    const rKey = getRoomKey(selectedRoom);
    return (rKey ? roomSelectedSlotsMap[rKey] : []) || [];
  }, [selectedRoom, roomSelectedSlotsMap]);

  const setSelectedSlotIndices = (newIndices) => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    setRoomSelectedSlotsMap((prev) => ({
      ...prev,
      [rKey]: typeof newIndices === 'function' ? newIndices(prev[rKey] || []) : newIndices,
    }));
  };

  const selectedMonthIndices = useMemo(() => {
    if (!selectedRoom) return [];
    const rKey = getRoomKey(selectedRoom);
    return (rKey ? roomSelectedMonthsMap[rKey] : []) || [];
  }, [selectedRoom, roomSelectedMonthsMap]);

  const setSelectedMonthIndices = (newIndices) => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    setRoomSelectedMonthsMap((prev) => ({
      ...prev,
      [rKey]: typeof newIndices === 'function' ? newIndices(prev[rKey] || []) : newIndices,
    }));
  };

  // Auto clean up slot selection when bookedSlotsForRoom or userRequestedSlotsForRoom changes
  useEffect(() => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    const currentSelected = roomSelectedSlotsMap[rKey];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedSlotsForRoom?.has?.(upcomingWeek[idx]?.fullISO) || userRequestedSlotsForRoom?.has?.(upcomingWeek[idx]?.fullISO)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedSlotsForRoom?.has?.(upcomingWeek[idx]?.fullISO) && !userRequestedSlotsForRoom?.has?.(upcomingWeek[idx]?.fullISO)
        );
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [rKey]: nonConflicting,
        }));
      }
    }
  }, [bookedSlotsForRoom, userRequestedSlotsForRoom, selectedRoom, upcomingWeek, roomSelectedSlotsMap]);

  // Auto clean up month selection when bookedMonthsForRoom or userRequestedMonthsForRoom changes
  useEffect(() => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    const currentSelected = roomSelectedMonthsMap[rKey];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedMonthsForRoom?.has?.(upcomingMonths[idx]?.monthKey) || userRequestedMonthsForRoom?.has?.(upcomingMonths[idx]?.monthKey)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedMonthsForRoom?.has?.(upcomingMonths[idx]?.monthKey) && !userRequestedMonthsForRoom?.has?.(upcomingMonths[idx]?.monthKey)
        );
        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [rKey]: nonConflicting,
        }));
      }
    }
  }, [bookedMonthsForRoom, userRequestedMonthsForRoom, selectedRoom, upcomingMonths, roomSelectedMonthsMap]);

  // Auto select first available nightly slot
  const initializedRoomSlotsRef = useRef(new Set());
  useEffect(() => {
    if (isMonthly || !selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey || initializedRoomSlotsRef.current.has(rKey)) return;
    const currentSlots = roomSelectedSlotsMap[rKey];
    if (!Array.isArray(currentSlots) || currentSlots.length === 0) {
      const firstAvailableSlot = upcomingWeek.find((s) => !bookedSlotsForRoom?.has(s.fullISO));
      if (firstAvailableSlot) {
        initializedRoomSlotsRef.current.add(rKey);
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [rKey]: [firstAvailableSlot.index],
        }));
      }
    }
  }, [isMonthly, selectedRoom, upcomingWeek, bookedSlotsForRoom, roomSelectedSlotsMap]);

  const handleToggleSlotDay = (slotIndex) => {
    const slotObj = upcomingWeek[slotIndex];
    if (bookedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.warn(
        `${selectedRoom?.roomNumber || 'Room'} is already booked for ${slotObj?.dayName} ${slotObj?.monthDay}.`
      );
      return;
    }
    if (userRequestedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.info(
        `You have already requested this slot for ${slotObj?.dayName} ${slotObj?.monthDay} (Pending Host Approval).`
      );
      return;
    }

    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [slotIndex];
      if (prev.length === 1 && prev[0] === slotIndex) return [];
      const start = Math.min(prev[0], slotIndex);
      const end = Math.max(prev[0], slotIndex);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (bookedSlotsForRoom.has(upcomingWeek[i]?.fullISO)) {
          toast.warn('Cannot select a date range containing already booked slots.');
          return prev;
        }
        if (userRequestedSlotsForRoom.has(upcomingWeek[i]?.fullISO)) {
          toast.info('Cannot select a date range containing slots you already requested.');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  const handleToggleSlotMonth = (monthIndex) => {
    const monthObj = upcomingMonths[monthIndex];
    if (bookedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.warn(
        `${selectedRoom?.roomNumber || 'Room'} is already booked for ${
          monthObj?.monthName || monthObj?.monthShort
        } ${monthObj?.year}.`
      );
      return;
    }
    if (userRequestedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.info(
        `You have already requested ${monthObj?.monthName || monthObj?.monthShort} ${
          monthObj?.year
        } (Pending Host Approval).`
      );
      return;
    }

    setSelectedMonthIndices((prev) => {
      if (prev.length === 0) return [monthIndex];
      if (prev.length === 1 && prev[0] === monthIndex) return [];
      const start = Math.min(prev[0], monthIndex);
      const end = Math.max(prev[0], monthIndex);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (bookedMonthsForRoom.has(upcomingMonths[i]?.monthKey)) {
          toast.warn('Cannot select a month range containing already booked months.');
          return prev;
        }
        if (userRequestedMonthsForRoom.has(upcomingMonths[i]?.monthKey)) {
          toast.info('Cannot select a month range containing months you already requested.');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  const clearSelection = () => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    setRoomSelectedSlotsMap((prev) => ({ ...prev, [rKey]: [] }));
    setRoomSelectedMonthsMap((prev) => ({ ...prev, [rKey]: [] }));
  };

  return {
    selectedSlotIndices,
    setSelectedSlotIndices,
    selectedMonthIndices,
    setSelectedMonthIndices,
    handleToggleSlotDay,
    handleToggleSlotMonth,
    clearSelection,
  };
}
