export function buildBookingPayload({
  isMonthly,
  selectedRoom,
  stay,
  stayId,
  cleanName,
  cleanPhone,
  guestEmail,
  cleanAadhar,
  safePersons,
  user,
  selectedMonthIndices,
  upcomingMonths,
  displayCategoryUnit,
  selectedSlotIndices,
  upcomingWeek,
  allKnownBookings,
}) {
  const allExistingRefs = new Set(
    allKnownBookings.map((b) => String(b.bookingReferenceId || '')).filter(Boolean)
  );
  let refSuffix = '';
  if (allExistingRefs.has('BK-' + cleanPhone)) {
    const matchingCount = allKnownBookings.filter((b) =>
      String(b.bookingReferenceId || '').startsWith('BK-' + cleanPhone)
    ).length;
    refSuffix = `-${matchingCount + 1}`;
  }
  const uniqueBookingRefId = `BK-${cleanPhone}${refSuffix}`;
  const uniqueSlotBookingId = `res_${cleanPhone}${refSuffix}`;
  const uniqueBookingId = `bk_${cleanPhone}${refSuffix}`;

  const rawPrice = selectedRoom?.price || stay?.price || 0;
  const unitPrice =
    typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
  const resolvedType = String(stay?.propertyType || stay?.type || 'PG').trim().toLowerCase();
  const isPerPerson = resolvedType === 'pg' || resolvedType === 'hostel';
  const effectiveMultiplier = isPerPerson ? safePersons : 1;

  if (isMonthly) {
    const sortedMonthIndices = [...selectedMonthIndices].sort((a, b) => a - b);
    const firstMonth = upcomingMonths[sortedMonthIndices[0]];
    const lastMonth = upcomingMonths[sortedMonthIndices[sortedMonthIndices.length - 1]];

    const [sY, sM] = firstMonth.monthKey.split('-').map(Number);
    const exactMonthlyInUTC = new Date(Date.UTC(sY, sM - 1, 1, 0, 0, 0)).toISOString();
    const [eY, eM] = lastMonth.monthKey.split('-').map(Number);
    const exactMonthlyOutUTC = new Date(Date.UTC(eY, eM, 0, 23, 59, 59)).toISOString();

    const checkInLabel = `1st ${firstMonth.monthShort} ${firstMonth.year} (12:00 AM)`;
    const checkOutLabel = `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year} (11:59 PM)`;

    const chosenMonthKeys = sortedMonthIndices.map((idx) => upcomingMonths[idx]?.monthKey);
    const computedTotal = unitPrice * sortedMonthIndices.length * effectiveMultiplier;
    const durationDisplay = `${sortedMonthIndices.length} Month${sortedMonthIndices.length > 1 ? 's' : ''}`;

    return {
      id: uniqueBookingId,
      bookingReferenceId: uniqueBookingRefId,
      stayId: stayId,
      roomId: selectedRoom._id || selectedRoom.id,
      stayTitle: stay?.propertyName || stay?.title || 'RoomScout Stay',
      stayLocation: stay?.location || stay?.city || 'Uttarakhand',
      stayAddress: stay?.address || stay?.location || '',
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.type,
      price: selectedRoom.price,
      totalAmount: computedTotal,
      durationDisplay: durationDisplay,
      rateUnit: selectedRoom.rateUnit || displayCategoryUnit || '/month',
      checkIn: exactMonthlyInUTC,
      checkOut: exactMonthlyOutUTC,
      checkInDisplay: checkInLabel,
      checkOutDisplay: checkOutLabel,
      checkInISO: exactMonthlyInUTC,
      checkOutISO: exactMonthlyOutUTC,
      bookedMonths: chosenMonthKeys,
      bookedDates: [],
      selectedDaysCount: chosenMonthKeys.length,
      durationMonths: sortedMonthIndices.length,
      guestName: cleanName,
      fullName: cleanName,
      userName: cleanName,
      guestEmail:
        guestEmail.trim() ||
        user?.email ||
        `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
      email:
        guestEmail.trim() ||
        user?.email ||
        `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
      guestPhone: cleanPhone,
      phone: cleanPhone,
      userPhone: cleanPhone,
      gender: 'Other',
      guestGender: 'Other',
      userGender: 'Other',
      personCount: safePersons,
      guestAadhar: cleanAadhar,
      aadharId: cleanAadhar,
      userId: user?._id || 'guest_user',
      hostEmail: stay?.hostEmail || stay?.email || '',
      hostPhone: stay?.hostPhone || stay?.phone || '',
      hostName: stay?.hostName || stay?.name || 'Host Owner',
      status: 'Pending Host Approval',
      createdAt: new Date().toISOString(),
    };
  }

  // Nightly flow
  const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
  const firstSlot = upcomingWeek[sortedIndices[0]];
  const lastSlot = upcomingWeek[sortedIndices[sortedIndices.length - 1]];

  const [yIn, mIn, dIn] = firstSlot.fullISO.split('-').map(Number);
  const exactCheckInUTC = new Date(Date.UTC(yIn, mIn - 1, dIn, 12, 0, 0)).toISOString();

  const [yLast, mLast, dLast] = lastSlot.fullISO.split('-').map(Number);
  const checkoutDateUTC = new Date(Date.UTC(yLast, mLast - 1, dLast + 1, 11, 59, 0));
  const exactCheckOutUTC = checkoutDateUTC.toISOString();

  const nextDayName = checkoutDateUTC.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const nextMonthDay = checkoutDateUTC.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  const checkInLabel = `${firstSlot.dayName}, ${
    firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''
  } (12:00 PM)`;
  const checkOutLabel = `${nextDayName}, ${
    nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''
  } (11:59 AM)`;

  const computedTotal = unitPrice * selectedSlotIndices.length * effectiveMultiplier;
  const durationDisplay = `${selectedSlotIndices.length} Night${selectedSlotIndices.length > 1 ? 's' : ''}`;

  return {
    id: uniqueBookingId,
    bookingReferenceId: uniqueBookingRefId,
    stayId: stayId,
    roomId: selectedRoom._id || selectedRoom.id,
    stayTitle: stay?.propertyName || stay?.title || 'RoomScout Stay',
    stayLocation: stay?.location || stay?.city || 'Uttarakhand',
    stayAddress: stay?.address || stay?.location || '',
    roomNumber: selectedRoom.roomNumber,
    roomType: selectedRoom.type,
    price: selectedRoom.price,
    totalAmount: computedTotal,
    durationDisplay: durationDisplay,
    rateUnit: selectedRoom.rateUnit,
    checkIn: exactCheckInUTC,
    checkOut: exactCheckOutUTC,
    checkInDisplay: checkInLabel,
    checkOutDisplay: checkOutLabel,
    checkInISO: exactCheckInUTC,
    checkOutISO: exactCheckOutUTC,
    bookedDates: sortedIndices.map((idx) => upcomingWeek[idx]?.fullISO),
    bookedMonths: [],
    selectedDaysCount: selectedSlotIndices.length,
    guestName: cleanName,
    fullName: cleanName,
    userName: cleanName,
    guestEmail:
      guestEmail.trim() ||
      user?.email ||
      `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
    email:
      guestEmail.trim() ||
      user?.email ||
      `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
    guestPhone: cleanPhone,
    phone: cleanPhone,
    userPhone: cleanPhone,
    gender: 'Other',
    guestGender: 'Other',
    userGender: 'Other',
    personCount: safePersons,
    guestAadhar: cleanAadhar,
    aadharId: cleanAadhar,
    userId: user?._id || 'guest_user',
    hostEmail: stay?.hostEmail || stay?.email || '',
    hostPhone: stay?.hostPhone || stay?.phone || '',
    hostName: stay?.hostName || stay?.name || 'Host Owner',
    status: 'Pending Host Approval',
    createdAt: new Date().toISOString(),
  };
}
