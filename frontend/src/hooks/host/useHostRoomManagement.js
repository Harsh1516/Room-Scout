import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { adminAPI, bookingsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { isSameRoom, isRoomMatchingCategory } from '../../utils/dateUtils';
import { saveHostPropertyToCache } from './useHostDashboardData';

export function useHostRoomManagement({
  hostProperty,
  setHostProperty,
  latestHostPropertyRef,
  hasUnsavedChangesRef,
  savedRoomNumbers,
  setSavedRoomNumbers,
  savedRoomNumbersRef,
  setGuests,
  broadcastStayUpdate,
  showToast,
  user,
}) {
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

  const selectedRoomCard = useMemo(() => {
    if (!activeCategoryRooms.length) return null;

    if (selectedRoomNumber) {
      const foundByNum = activeCategoryRooms.find(
        (r) => String(r.roomNumber || '').trim() === String(selectedRoomNumber).trim()
      );
      if (foundByNum) return foundByNum;
    }

    if (selectedRoomCardId) {
      const found = activeCategoryRooms.find((r) => isSameRoom(r, selectedRoomCardId));
      if (found) return found;
    }

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
      if (selectedRoomCardId !== null) setSelectedRoomCardId(null);
      if (selectedRoomNumber !== null) setSelectedRoomNumber(null);
      selectedRoomIndexRef.current = null;
      selectedRoomNumberRef.current = null;
      selectedRoomCardIdRef.current = null;
      return;
    }

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

        if (newType !== undefined) updated.type = newType;
        if (newPrice !== undefined) updated.price = newPrice;
        if (newRateUnit !== undefined) updated.rateUnit = newRateUnit;
        if (newCapacity !== undefined) updated.capacity = Number(newCapacity) || 1;

        return updated;
      });

      nextUpdatedHost = { ...prev, roomRates: currentRates, rooms: updatedRooms };
      hasUnsavedChangesRef.current = true;
      latestHostPropertyRef.current = nextUpdatedHost;
      return nextUpdatedHost;
    });
  };

  const handleAutoSyncProperty = async (updatedHost) => {
    if (!updatedHost) return;
    try {
      const targetEmail = (
        user?.email ||
        updatedHost.email ||
        updatedHost.hostEmail ||
        hostProperty?.email ||
        hostProperty?.hostEmail ||
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

      latestHostPropertyRef.current = payload;
      setHostProperty(payload);
      saveHostPropertyToCache(targetEmail, payload);

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
        saveHostPropertyToCache(targetEmail, merged);

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

  const handleSaveCategory = async (catIndex) => {
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

    const roomsToRemove = (Array.isArray(hostProperty.rooms) ? hostProperty.rooms : []).filter((r) =>
      isRoomMatchingCategory(r, removed, index, hostProperty.roomRates)
    );
    const removedRoomNumbers = roomsToRemove.map((r) => r.roomNumber).filter(Boolean);
    const removedRawNumbers = new Set(
      removedRoomNumbers.map((num) => String(num).replace(/[^0-9]/g, ''))
    );

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

    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);

    setGuests((prev) =>
      (Array.isArray(prev) ? prev : []).filter((g) => {
        const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        const gType = (g.roomType || g.type || '').trim().toLowerCase();
        if (gType && gType === removedType) return false;
        if (gNum && removedRawNumbers.has(gNum)) return false;
        return true;
      })
    );

    setSelectedCategoryIndex((prev) => Math.max(0, Math.min(prev, currentRates.length - 1)));
    if (roomsToRemove.some((r) => isSameRoom(r, selectedRoomCardId) || (selectedRoomNumber && String(r.roomNumber).trim() === String(selectedRoomNumber).trim()))) {
      setSelectedRoomCardId(null);
      setSelectedRoomNumber(null);
      selectedRoomCardIdRef.current = null;
      selectedRoomNumberRef.current = null;
      selectedRoomIndexRef.current = null;
    }

    toast.info(`Category "${removed.type || 'Unnamed'}" and ${roomsToRemove.length} room card(s) removed.`);

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

    try {
      await handleAutoSyncProperty(updatedHost);
      broadcastStayUpdate(updatedHost._id);
    } catch (err) {
      console.warn('Delete room rate error:', err);
    }
  };

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

    hasUnsavedChangesRef.current = true;
    latestHostPropertyRef.current = updatedHost;
    setHostProperty(updatedHost);

    if (targetRoom?.roomNumber && (Boolean(targetRoom._id))) {
      const rawNum = String(targetRoom.roomNumber).replace(/[^0-9]/g, '');
      try {
        await bookingsAPI.cascadeDeleteRoomBookings({
          hostEmail: baseHost.email,
          stayId: baseHost.stayId || baseHost._id,
          roomId: targetRoom?._id,
          roomNumber: targetRoom.roomNumber,
        });

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

  return {
    selectedCategoryIndex,
    setSelectedCategoryIndex,
    collapsedCategories,
    setCollapsedCategories,
    toggleCollapseCategory,
    selectedRoomCardId,
    setSelectedRoomCardId,
    selectedRoomNumber,
    setSelectedRoomNumber,
    selectedRoomIndexRef,
    selectedRoomNumberRef,
    selectedRoomCardIdRef,
    handleSelectRoomCard,
    activeCategory,
    activeCategoryRooms,
    selectedRoomCard,
    isCurrentRoomSaved,
    configuredCategoryRooms,
    handleAddNewRoomTypeRow,
    handleUpdateRoomRate,
    handleSaveCategory,
    handleRemoveRoomRate,
    handleAddRoomCard,
    handleUpdateRoomCapacity,
    handleUpdateRoomNumber,
    handleRemoveRoomCard,
    handleAutoSyncProperty,
  };
}

