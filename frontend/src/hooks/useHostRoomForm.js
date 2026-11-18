import { useState } from 'react';
import { isRoomMatchingCategory } from '../utils/dateUtils';

export function useHostRoomForm({ formData, setFormData, showToast = () => {} }) {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Room Categories & Inventory Handlers (Parity with HostRoomsPage / HostDashboard)
  const handleAddNewCategory = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let newIdx = 0;
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      const newRate = {
        _id: newId,
        type: '',
        price: '',
        rateUnit: '/month',
        capacity: 1,
        features: [],
        photos: [],
        images: [],
      };
      const updatedRates = [...currentRates, newRate];
      newIdx = updatedRates.length - 1;
      return { ...prev, roomRates: updatedRates };
    });

    const nextCollapsed = {};
    for (let i = 0; i <= newIdx; i++) {
      nextCollapsed[i] = i !== newIdx;
    }
    setSelectedCategoryIndex(newIdx);
    setCollapsedCategories(nextCollapsed);
    showToast('New room type created! Fill in the category name and price.', 'success');
  };

  const handleRemoveCategory = (index) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      const removed = currentRates[index];
      if (!removed) return prev;
      currentRates.splice(index, 1);

      // Filter out only rooms strictly belonging to this category and re-index higher categories
      const updatedRooms = (Array.isArray(prev.rooms) ? prev.rooms : [])
        .filter((r) => !isRoomMatchingCategory(r, removed, index, prev.roomRates))
        .map((r) => {
          if (typeof r.categoryIndex === 'number' && r.categoryIndex > index) {
            return { ...r, categoryIndex: r.categoryIndex - 1 };
          }
          return r;
        });

      return {
        ...prev,
        roomRates: currentRates,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });

    const nextCollapsed = {};
    const totalRemaining = Math.max(0, (formData.roomRates?.length || 1) - 1);
    for (let i = 0; i < totalRemaining; i++) {
      nextCollapsed[i] = true;
    }
    setCollapsedCategories(nextCollapsed);
    setSelectedCategoryIndex((cur) => Math.max(0, Math.min(cur, totalRemaining - 1)));
    showToast('Category removed.');
  };

  const handleUpdateCategory = (index, field, value) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const targetRate = currentRates[index];
      const targetRateId = targetRate._id || `rate_${index}`;

      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...targetRate, _id: targetRateId, ...field };
      } else {
        currentRates[index] = { ...targetRate, _id: targetRateId, [field]: value };
      }

      const updatedRate = currentRates[index];
      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);
      const newCapacity = typeof field === 'object' ? field.capacity : (field === 'capacity' ? value : undefined);

      let updatedRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      updatedRooms = updatedRooms.map((r) => {
        // Strict category match prevents claiming rooms from other categories
        const isMatch = isRoomMatchingCategory(r, targetRate, index, currentRates);

        if (!isMatch) return r;

        const updated = {
          ...r,
          rateId: updatedRate._id || targetRateId,
          categoryIndex: index,
        };
        if (newType !== undefined) updated.type = newType;
        if (newPrice !== undefined) updated.price = newPrice;
        if (newRateUnit !== undefined) updated.rateUnit = newRateUnit;
        if (newCapacity !== undefined) updated.capacity = Number(newCapacity) || 1;
        return updated;
      });

      const primaryRate = currentRates[0];
      const primaryPrice = primaryRate?.price ? String(primaryRate.price).replace(/[^0-9]/g, '') : prev.price;
      const primaryUnit = primaryRate?.rateUnit || prev.rateUnit;

      return {
        ...prev,
        roomRates: currentRates,
        rooms: updatedRooms,
        price: primaryPrice || prev.price,
        rateUnit: primaryUnit || prev.rateUnit,
      };
    });
  };

  const handleAddRoomCard = (targetCategory) => {
    let createdRoomUid = null;
    let createdRoomNumber = null;

    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? prev.roomRates : [];
      const cat = targetCategory || currentRates[selectedCategoryIndex];
      if (!cat || !cat.type || !cat.type.trim()) {
        showToast('Please enter a room category name first.', 'error');
        return prev;
      }
      const rawPrice = String(cat.price || '').replace(/[^0-9]/g, '');
      if (!rawPrice || parseInt(rawPrice, 10) <= 0) {
        showToast('Please enter a valid room price first.', 'error');
        return prev;
      }
      if (!cat.rateUnit || !String(cat.rateUnit).trim()) {
        showToast('Please select a room billing cycle/unit first.', 'error');
        return prev;
      }

      const cleanCatType = cat.type.trim();
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
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
      const rateUnit = cat.rateUnit || '/month';

      const targetIdx = currentRates.findIndex(
        (r) => (r._id && cat._id && String(r._id) === String(cat._id)) || (r.type && cat.type && r.type === cat.type)
      );
      const resolvedCatIndex =
        targetIdx !== -1 ? targetIdx : typeof selectedCategoryIndex === 'number' ? selectedCategoryIndex : 0;
      const rateId = cat._id || `rate_${Date.now()}_${resolvedCatIndex}`;

      const roomUid = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      createdRoomUid = roomUid;
      createdRoomNumber = nextNum;

      const newCard = {
        _id: roomUid,
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

      return {
        ...prev,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });

    if (createdRoomUid) {
      setSelectedRoomCardId(createdRoomUid);
      setSelectedRoomNumber(createdRoomNumber);
    }
  };

  const handleRemoveRoomCard = (roomId, roomData) => {
    const card = roomData && typeof roomData === 'object' ? roomData : null;
    const targetRoomNumber = card?.roomNumber || (typeof roomId === 'string' && !roomId.startsWith('room_') ? roomId : null);
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const removeIndex = currentRooms.findIndex((r) => {
        if (targetId && r._id === targetId) return true;
        if (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}` || roomId === `room_${r._id}`)) return true;

        if (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim()) {
          if (card.type && r.type && String(r.type).trim().toLowerCase() !== String(card.type).trim().toLowerCase()) {
            return false;
          }
          return true;
        }
        if (targetRoomNumber && String(r.roomNumber).trim() === String(targetRoomNumber).trim()) return true;

        return false;
      });

      if (removeIndex === -1) {
        console.warn('Could not find room to remove:', { roomId, roomData, currentRooms });
        return prev;
      }

      currentRooms.splice(removeIndex, 1);

      return {
        ...prev,
        rooms: currentRooms,
        totalRooms: currentRooms.length,
        availableRooms: currentRooms.filter((r) => r.status === 'Available').length,
      };
    });

    if (selectedRoomCardId === targetId || (card?.roomNumber && selectedRoomNumber === card.roomNumber)) {
      setSelectedRoomCardId(null);
      setSelectedRoomNumber(null);
    }
  };

  const handleUpdateRoomNumber = (roomId, newNumber, idx, roomData) => {
    const card = roomData && typeof roomData === 'object' ? roomData : null;
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        const isMatch =
          (targetId && r._id === targetId) ||
          (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}`)) ||
          (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim() && (card.type ? r.type === card.type : true));

        if (isMatch) {
          const numInt = parseInt(String(newNumber).replace(/[^0-9]/g, ''), 10);
          return {
            ...r,
            roomNumber: String(newNumber),
            roomNumInt: isNaN(numInt) ? r.roomNumInt : numInt,
            floor: !isNaN(numInt) ? (numInt < 100 ? 'Floor 1' : `Floor ${Math.floor(numInt / 100)}`) : r.floor,
          };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleUpdateRoomCapacity = (roomId, newCapacity, cIdx, roomData) => {
    const cap = Math.max(1, Math.min(10, Number(newCapacity) || 1));
    const card = roomData && typeof roomData === 'object' ? roomData : null;
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        const isMatch =
          (targetId && r._id === targetId) ||
          (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}`)) ||
          (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim() && (card.type ? r.type === card.type : true));

        if (isMatch) {
          return { ...r, capacity: cap };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => {
      const isCurrentlyOpen = prev[index] === false;
      const next = {};
      (formData?.roomRates || []).forEach((_, i) => {
        next[i] = isCurrentlyOpen ? true : i !== index;
      });
      return next;
    });
  };

  return {
    selectedCategoryIndex,
    setSelectedCategoryIndex,
    selectedRoomCardId,
    setSelectedRoomCardId,
    selectedRoomNumber,
    setSelectedRoomNumber,
    collapsedCategories,
    setCollapsedCategories,
    handleAddNewCategory,
    handleRemoveCategory,
    handleUpdateCategory,
    handleAddRoomCard,
    handleRemoveRoomCard,
    handleUpdateRoomNumber,
    handleUpdateRoomCapacity,
    toggleCollapseCategory,
  };
}
