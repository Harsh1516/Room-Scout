import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Payment } from '../models/Payment.js';
import { actorId, assertSelfHostOrAdmin, idsMatch, isAdminUser } from '../middleware/authMiddleware.js';
import { sendWhatsAppNotification } from '../services/whatsappService.js';

const BOOKING_STATUS_ENUM = [
  'PENDING',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
];

const NON_BLOCKING_STATUSES = ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'COMPLETED', 'EXPIRED'];

function normalizeBookingStatus(raw) {
  const value = String(raw || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (value.includes('PENDING') || value.includes('APPROVAL')) return 'PENDING';
  if (BOOKING_STATUS_ENUM.includes(value)) return value;
  return 'PENDING';
}

function resolveAadhar(payload = {}) {
  return String(
    payload.aadharNumber || payload.guestAadhar || payload.aadharId || payload.aadhar || ''
  ).replace(/\D/g, '');
}

async function findRoomOverlap({ stayId, roomNumber, checkIn, checkOut, excludeId }) {
  await autoExpireBookings({ stayId });
  const query = {
    stayId,
    roomNumber: String(roomNumber).trim(),
    status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    query._id = { $ne: excludeId };
  }
  return Booking.findOne(query).select('_id bookingReferenceId checkIn checkOut fullName status').lean();
}

/**
 * Checks whether a booking request has reached or passed its check-in date/time or payment deadline.
 */
export function isBookingRequestExpired(booking, now = new Date()) {
  if (!booking) return false;
  const status = String(booking.status || '').toUpperCase().trim();

  // Active confirmed or completed bookings are not pending requests
  if (['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED'].includes(status)) {
    return false;
  }
  if (status === 'EXPIRED') {
    return true;
  }

  const isPending =
    status === 'PENDING' ||
    status === 'DRAFT' ||
    status === 'PENDING HOST APPROVAL' ||
    status.includes('PENDING') ||
    status.includes('APPROVAL');
  const isAwaitingPayment = status === 'AWAITING_PAYMENT' || status === 'PAYMENT_PENDING';

  if (!isPending && !isAwaitingPayment) {
    return false;
  }

  // 0. If payment reference has been submitted and is awaiting host verification, do not expire
  if (booking.upiPayment?.verificationStatus === 'PENDING_VERIFICATION') {
    return false;
  }

  // 1. Payment window elapsed for awaiting payment
  if (isAwaitingPayment && booking.paymentDeadline) {
    const deadline = new Date(booking.paymentDeadline);
    if (!isNaN(deadline.getTime()) && deadline <= now) {
      return true;
    }
  }

  // 2. Full stay checkout timestamp has elapsed without host approval
  if (booking.checkOut) {
    const checkOutDate = new Date(booking.checkOut);
    if (!isNaN(checkOutDate.getTime()) && checkOutDate <= now) {
      return true;
    }
  }

  // 3. String dates check (e.g. bookedDates: ['2026-10-22'])
  // Request expires ONLY when the entire check-in date has completely passed (strictly past today)
  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDay = String(now.getDate()).padStart(2, '0');
  const todayLocalStr = `${nowYear}-${nowMonth}-${nowDay}`;
  const todayUTCStr = now.toISOString().slice(0, 10);

  if (Array.isArray(booking.bookedDates) && booking.bookedDates.length > 0) {
    const sortedDates = [...booking.bookedDates].filter(Boolean).sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate && lastDate.length === 10) {
      if (todayLocalStr > lastDate && todayUTCStr > lastDate) {
        return true;
      }
    }
  }

  if (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) {
    const sortedMonths = [...booking.bookedMonths].filter(Boolean).sort();
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    if (lastMonth && lastMonth.length === 7) {
      const currentMonthLocal = `${nowYear}-${nowMonth}`;
      const currentMonthUTC = todayUTCStr.slice(0, 7);
      if (currentMonthLocal > lastMonth && currentMonthUTC > lastMonth) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Automatically transitions stale booking requests into EXPIRED status without deleting them.
 * Preserves all records in the database for auditing and history.
 */
export async function autoExpireBookings(filter = {}) {
  try {
    const now = new Date();
    const pendingStatuses = [
      'PENDING',
      'DRAFT',
      'PENDING HOST APPROVAL',
      'Pending Host Approval',
      'Pending Approval',
      'AWAITING_PAYMENT',
      'PAYMENT_PENDING',
    ];

    const candidates = await Booking.find({
      ...filter,
      status: { $in: pendingStatuses },
    })
      .select('_id status checkIn checkOut bookedDates bookedMonths paymentDeadline phone fullName stayTitle roomNumber bookingReferenceId totalAmount')
      .lean();

    const expiredCandidates = [];
    for (const b of candidates) {
      if (isBookingRequestExpired(b, now)) {
        expiredCandidates.push(b);
      }
    }

    if (expiredCandidates.length > 0) {
      const expiredIds = expiredCandidates.map((b) => b._id);
      await Booking.updateMany(
        { _id: { $in: expiredIds } },
        {
          $set: {
            status: 'EXPIRED',
            paymentStatus: 'FAILED',
          },
        }
      );

      // Dispatch automated WhatsApp alerts for expired bookings
      for (const expiredBooking of expiredCandidates) {
        sendWhatsAppNotification(expiredBooking, 'BOOKING_EXPIRED').catch((err) => {
          console.warn('[WhatsApp Notice] Expiry alert notice:', err.message);
        });
      }
    }
  } catch (err) {
    console.error('Error auto-expiring bookings:', err);
  }
}

// Backward-compatible alias
const autoExpireAwaitingBookings = autoExpireBookings;

function ownershipForbidden(res) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: you do not own this booking or property.',
  });
}

/**
 * Universal Timing & Schedule Engine
 *
 * Strict Timing Rules:
 * - Per-Night (/night):
 *     Check-In:  Booked start day at 12:00 PM UTC (noon)
 *     Check-Out: Day after the last night at 11:59 AM UTC
 * - Per-Month (/month):
 *     Check-In:  1st of starting month at 12:00 AM UTC (midnight)
 *     Check-Out: Final day of ending month at 11:59 PM UTC
 */
export const computeBookingTimings = ({
  rateUnit = '/night',
  bookedDates = [],
  bookedMonths = [],
  checkIn,
  checkOut,
}) => {
  const cleanDates = Array.isArray(bookedDates) ? [...bookedDates].filter(Boolean).sort() : [];
  const cleanMonths = Array.isArray(bookedMonths) ? [...bookedMonths].filter(Boolean).sort() : [];
  const firstDateVal = cleanDates[0] || '';
  const isExplicitMonthly = cleanMonths.length > 0 || firstDateVal.length === 7;
  const isRateMonthly = String(rateUnit || '').toLowerCase().includes('month');
  const isMonthly = isRateMonthly || isExplicitMonthly;

  let startDate;
  let endDate;

  if (isMonthly) {
    let startY, startM, endY, endM;

    if (cleanMonths.length > 0) {
      const firstVal = cleanMonths[0];
      const lastVal = cleanMonths[cleanMonths.length - 1];
      [startY, startM] = firstVal.split('-').map(Number);
      [endY, endM] = lastVal.split('-').map(Number);
    } else if (cleanDates.length > 0) {
      const firstVal = cleanDates[0];
      const lastVal = cleanDates[cleanDates.length - 1];
      [startY, startM] = firstVal.split('-').map(Number);
      [endY, endM] = lastVal.split('-').map(Number);
    } else {
      const inD = new Date(checkIn || Date.now());
      const outD = new Date(checkOut || checkIn || Date.now());

      startY = inD.getUTCFullYear();
      startM = inD.getUTCMonth() + 1;
      endY = outD.getUTCFullYear();
      endM = outD.getUTCMonth() + 1;
    }

    // 1st of starting month at 12:00:00 AM UTC
    startDate = new Date(Date.UTC(startY, startM - 1, 1, 0, 0, 0));
    // Last day of ending month at 11:59:59 PM UTC (Day 0 of month endM gives the last day of month endM - 1)
    endDate = new Date(Date.UTC(endY, endM, 0, 23, 59, 59));

    // Dynamic Duration Calculation from Canonical Timestamps
    const durationMonths = Math.max(
      1,
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1
    );
    const durationDays = 0;
    const durationDisplay = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;

    const resolvedMonths = [];
    let curM = new Date(Date.UTC(startY, startM - 1, 1));
    const finalM = new Date(Date.UTC(endY, endM - 1, 1));
    while (curM <= finalM) {
      const y = curM.getUTCFullYear();
      const m = String(curM.getUTCMonth() + 1).padStart(2, '0');
      resolvedMonths.push(`${y}-${m}`);
      curM.setUTCMonth(curM.getUTCMonth() + 1);
    }

    return {
      startDate,
      endDate,
      durationMonths,
      durationDays,
      durationDisplay,
      cleanDates,
      cleanMonths: cleanMonths.length > 0 ? cleanMonths : resolvedMonths,
    };
  } else {
    if (cleanDates.length > 0) {
      const firstVal = cleanDates[0];
      const lastVal = cleanDates[cleanDates.length - 1];

      const [startY, startM, startD] = firstVal.split('-').map(Number);
      const [endY, endM, endD] = lastVal.split('-').map(Number);

      // Booked day at 12:00:00 PM UTC
      startDate = new Date(Date.UTC(startY, startM - 1, startD, 12, 0, 0));
      // Next day after last booked night at 11:59:00 AM UTC
      endDate = new Date(Date.UTC(endY, endM - 1, endD + 1, 11, 59, 0));
    } else {
      const inD = new Date(checkIn || Date.now());
      const outD = new Date(checkOut || Date.now() + 86400000);

      startDate = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate(), 12, 0, 0));
      endDate = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate(), 11, 59, 0));
    }

    // Dynamic Duration Calculation from Canonical Timestamps
    const durationMonths = 0;
    const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const durationDisplay = `${durationDays} Night${durationDays > 1 ? 's' : ''}`;

    return { startDate, endDate, durationMonths, durationDays, durationDisplay, cleanDates };
  }
};

// @desc    Create a new online booking
// @route   POST /api/bookings
// @access  Private / User
export const createBooking = async (req, res, next) => {
  try {
    const body = req.body || {};

    if (!body.stayId) {
      return res.status(400).json({ success: false, message: 'stayId is required.' });
    }

    const stay = await Stay.findById(body.stayId).lean();
    if (!stay) {
      return res.status(404).json({ success: false, message: 'Stay property not found.' });
    }

    const roomNumber = String(body.roomNumber || stay.rooms?.[0]?.roomNumber || '').trim();
    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'roomNumber is required.' });
    }

    const rateUnit = String(body.rateUnit || stay.rateUnit || '/month');
    const timings = computeBookingTimings({
      rateUnit,
      bookedDates: body.bookedDates,
      bookedMonths: body.bookedMonths,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });

    const checkIn = timings.startDate;
    const checkOut = timings.endDate;
    if (!checkIn || !checkOut || Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid check-in and check-out dates are required.' });
    }

    const overlap = await findRoomOverlap({ stayId: stay._id, roomNumber, checkIn, checkOut });
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: `Room ${roomNumber} is already booked for those dates.`,
        conflictingBookingId: overlap.bookingReferenceId,
      });
    }

    // Guard against duplicate pending requests by the SAME guest/user for the same room & overlapping dates
    const currentUserId = actorId(req);
    const cleanPhone = String(body.phone || body.guestPhone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = (body.email || body.guestEmail || req.user?.email || '').toLowerCase().trim();

    const userDuplicateQuery = {
      stayId: stay._id,
      roomNumber: String(roomNumber).trim(),
      status: { $in: ['PENDING', 'DRAFT', 'PENDING HOST APPROVAL'] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
      $or: [
        ...(currentUserId && mongoose.Types.ObjectId.isValid(currentUserId) ? [{ userId: currentUserId }] : []),
        ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ],
    };

    if (userDuplicateQuery.$or.length > 0) {
      const existingUserPending = await Booking.findOne(userDuplicateQuery).select('_id bookingReferenceId').lean();
      if (existingUserPending) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending booking request for this room on these dates. Please wait for host approval.',
          existingBookingId: existingUserPending.bookingReferenceId,
        });
      }
    }

    const paymentMethodRaw = String(body.paymentMethod || 'UPI').toUpperCase();
    const isPayOnArrival = paymentMethodRaw === 'PAY_ON_ARRIVAL' || paymentMethodRaw === 'OFFLINE' || paymentMethodRaw === 'CASH';

    // Exact Server-side Price Calculation from Trusted Database Stay Records
    const isMonthly = rateUnit.includes('month');
    const unitCount = isMonthly ? (timings.durationMonths || 1) : (timings.durationDays || 1);
    const targetRoom = (stay.rooms || []).find((r) => String(r.roomNumber).trim() === roomNumber);
    const rawPrice = targetRoom?.price || stay.price || 0;
    const roomBaseRate = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

    const baseAmount = roomBaseRate * unitCount;
    const serverTotal = (typeof body.totalAmount === 'number' && body.totalAmount >= 0)
      ? body.totalAmount
      : baseAmount;

    const deposit = 0;
    const maintenance = 0;
    const taxes = 0;

    // Lookup Host UPI settings for immutable booking pricing snapshot
    const hostDoc = await Host.findById(stay.hostId).select('name upiSettings').lean();
    const recipientUpi = stay.upiSettings?.upiId || hostDoc?.upiSettings?.upiId || '';
    const recipientPayee = stay.upiSettings?.payeeName || hostDoc?.upiSettings?.payeeName || hostDoc?.name || stay.title;

    let finalRefId = body.bookingReferenceId;
    if (finalRefId) {
      const exists = await Booking.exists({ bookingReferenceId: finalRefId });
      if (exists) {
        finalRefId = `${finalRefId}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      finalRefId = `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    let finalSlotId = body.slotBookingId || '';
    if (finalSlotId) {
      const exists = await Booking.exists({ slotBookingId: finalSlotId });
      if (exists) {
        finalSlotId = `${finalSlotId}_${Date.now().toString().slice(-4)}`;
      }
    }

    const newBooking = await Booking.create({
      stayId: stay._id,
      hostId: stay.hostId,
      userId: actorId(req) || null,
      stayTitle: body.stayTitle || stay.title || 'Room Reservation',
      location: body.location || stay.location || '',
      fullName: (body.fullName || body.guestName || req.user?.name || '').trim(),
      email: (body.email || body.guestEmail || req.user?.email || '').toLowerCase().trim(),
      phone: String(body.phone || body.guestPhone || '').replace(/\D/g, '').slice(-10),
      gender: body.gender || body.guestGender || 'Other',
      aadharNumber: resolveAadhar(body),
      roomNumber,
      roomType: body.roomType || targetRoom?.type || 'Standard',
      rateUnit: isMonthly ? '/month' : '/night',
      checkIn,
      checkOut,
      durationDisplay: timings.durationDisplay || body.durationDisplay || '',
      bookedDates: Array.isArray(body.bookedDates) && body.bookedDates.length > 0 ? body.bookedDates : (timings.cleanDates || []),
      bookedMonths: Array.isArray(body.bookedMonths) && body.bookedMonths.length > 0 ? body.bookedMonths : (timings.cleanMonths || []),
      personCount: Number(body.personCount) || 1,
      totalAmount: serverTotal,
      taxBreakdown: {
        baseAmount,
        cleaningFee: maintenance,
        cgst: Math.round(taxes / 2),
        sgst: Math.round(taxes / 2),
        totalAmount: serverTotal,
      },
      pricingSnapshot: {
        basePrice: roomBaseRate,
        rateUnit: isMonthly ? '/month' : '/night',
        unitCount,
        taxes,
        maintenance,
        deposit,
        totalAmount: serverTotal,
        currency: 'INR',
        recipientUpiId: recipientUpi,
        recipientPayeeName: recipientPayee,
        snapshotAt: new Date(),
      },
      upiPayment: {
        upiId: recipientUpi,
        payeeName: recipientPayee,
        transactionRef: '',
        receiptUrl: '',
        verificationStatus: 'UNSUBMITTED',
        submittedAt: null,
        verifiedAt: null,
      },
      auditLog: [
        {
          action: 'BOOKING_CREATED',
          performedBy: req.user?._id || null,
          performerRole: 'guest',
          timestamp: new Date(),
          details: { serverTotal, recipientUpi },
          note: 'Booking requested by guest with server-calculated price',
        },
      ],
      bookingReferenceId: finalRefId,
      slotBookingId: finalSlotId,
      bookingSource: 'ONLINE',
      status: 'PENDING',
      paymentStatus: isPayOnArrival ? 'PENDING' : 'UNPAID',
      paymentMethod: isPayOnArrival ? 'PAY_ON_ARRIVAL' : 'UPI',
    });

    await Payment.create({
      bookingId: newBooking._id,
      bookingReferenceId: newBooking.bookingReferenceId,
      stayId: newBooking.stayId,
      hostId: newBooking.hostId,
      userId: newBooking.userId || null,
      amount: newBooking.totalAmount,
      recipientUpiId: recipientUpi,
      paymentMethod: isPayOnArrival ? 'OFFLINE' : 'UPI',
      paymentStatus: 'PENDING',
      verificationStatus: 'UNSUBMITTED',
      transactionId: `TXN-PEND-${newBooking._id.toString().slice(-8)}`,
    });

    // Send automated WhatsApp confirmation to guest for received booking request
    sendWhatsAppNotification(newBooking, 'BOOKING_PENDING', {
      stayTitle: stay.title,
      location: stay.location,
      durationDisplay: newBooking.durationDisplay || timings.durationDisplay,
    }).catch((err) => {
      console.warn('[WhatsApp Warning] Could not send booking pending alert:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return next(error);
  }
};

// @desc    Create an offline walk-in booking by host (Range-Based Model)
// @route   POST /api/bookings/offline
// @access  Private / Host
export const createOfflineBooking = async (req, res, next) => {
  try {
    const {
      hostId,
      hostEmail,
      stayId,
      roomNumber,
      roomType,
      rateUnit: passedRateUnit,
      guestName,
      fullName,
      phone,
      guestPhone,
      email,
      guestEmail,
      aadhar,
      guestAadhar,
      personCount,
      gender,
      bookedDates,
      totalAmount,
    } = req.body;

    const cleanGuestName = (guestName || fullName || '').trim();
    const cleanDates = Array.isArray(bookedDates) ? [...bookedDates].sort() : [];
    const cleanPhone = (phone || guestPhone || '').replace(/\D/g, '').slice(-10);

    if (!roomNumber || !cleanGuestName || cleanDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'roomNumber, guestName, and date selection are required.',
      });
    }

    // Resolve Host
    let host = null;
    if (hostId && mongoose.Types.ObjectId.isValid(hostId)) {
      host = await Host.findById(hostId).lean();
      if (!host) {
        const stayDoc = await Stay.findById(hostId).lean();
        if (stayDoc?.hostId) {
          host = await Host.findById(stayDoc.hostId).lean();
        }
      }
    }
    if (!host && stayId && mongoose.Types.ObjectId.isValid(stayId)) {
      const stayDoc = await Stay.findById(stayId).lean();
      if (stayDoc?.hostId) {
        host = await Host.findById(stayDoc.hostId).lean();
      }
    }
    if (!host && hostEmail) {
      host = await Host.findOne({ email: hostEmail.toLowerCase().trim() }).lean();
    }
    if (!host && actorId(req) && mongoose.Types.ObjectId.isValid(actorId(req))) {
      host = await Host.findById(actorId(req)).lean();
    }
    if (!host && req.user?.email) {
      host = await Host.findOne({ email: req.user.email.toLowerCase().trim() }).lean();
    }

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host record not found.' });
    }

    if (!assertSelfHostOrAdmin(req, { hostId: host._id, hostEmail: host.email })) {
      return ownershipForbidden(res);
    }

    // Resolve Stay
    let stay = null;
    if (stayId && mongoose.Types.ObjectId.isValid(stayId)) {
      stay = await Stay.findById(stayId).lean();
    }
    if (!stay && hostId && mongoose.Types.ObjectId.isValid(hostId)) {
      stay = await Stay.findById(hostId).lean();
    }
    if (!stay && host) {
      stay = await Stay.findOne({ hostId: host._id }).lean();
    }

    if (!stay) {
      return res.status(404).json({ success: false, message: 'Stay property not found for this host.' });
    }

    if (!idsMatch(stay.hostId, host._id) && !isAdminUser(req)) {
      return ownershipForbidden(res);
    }

    const targetRoom = (stay.rooms || []).find(
      (r) => String(r.roomNumber).trim() === String(roomNumber).trim()
    );
    const matchingRate = (stay.roomRates || []).find(
      (rr) => (targetRoom?.rateId && String(rr._id) === String(targetRoom.rateId)) ||
              (roomType && rr.type && rr.type.trim().toLowerCase() === String(roomType).trim().toLowerCase())
    );

    const firstVal = cleanDates[0] || '';
    const isExplicitMonthly = firstVal.length === 7;
    const isExplicitDaily = firstVal.length === 10;

    const resolvedRateUnit = String(
      passedRateUnit ||
      targetRoom?.rateUnit ||
      matchingRate?.rateUnit ||
      (isExplicitDaily ? '/night' : stay.rateUnit || '/month')
    ).toLowerCase();

    const isMonthlyRoom = isExplicitMonthly || resolvedRateUnit.includes('month');

    const timings = computeBookingTimings({
      rateUnit: isMonthlyRoom ? '/month' : '/night',
      bookedDates: cleanDates,
      bookedMonths: req.body.bookedMonths || [],
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
    });

    const startDate = timings.startDate;
    const endDate = timings.endDate;
    const durationDisplay = timings.durationDisplay;

    const refId = `OFF-${roomNumber}-${Date.now().toString().slice(-5)}`;

    // 1. Create Master Reservation in Booking Collection
    const newBooking = await Booking.create({
      stayId: stay._id,
      hostId: host._id,
      userId: null,
      stayTitle: stay.title || 'Property Reservation',
      location: stay.location || '',
      bookingSource: 'OFFLINE_HOST',
      roomNumber: String(roomNumber).trim(),
      roomType: roomType || targetRoom?.type || 'Standard',
      rateUnit: isMonthlyRoom ? '/month' : '/night',
      fullName: cleanGuestName,
      phone: cleanPhone,
      email: (email || guestEmail || '').trim().toLowerCase(),
      aadharNumber: (aadhar || guestAadhar || '').trim(),
      personCount: Number(req.body?.personCount || personCount) || 1,
      gender: gender || 'Other',
      checkIn: startDate,
      checkOut: endDate,
      durationDisplay,
      bookedDates: cleanDates.length > 0 ? cleanDates : (timings.cleanDates || []),
      bookedMonths: Array.isArray(req.body.bookedMonths) && req.body.bookedMonths.length > 0 ? req.body.bookedMonths : (timings.cleanMonths || []),
      totalAmount: Number(totalAmount) || 0,
      bookingReferenceId: refId,
      slotBookingId: refId,
      status: 'CHECKED_IN',
      isOccupied: true,
      paymentStatus: 'PAID',
      paymentMethod: 'OFFLINE',
    });

    // 2. Record Transaction in Payment Collection
    await Payment.create({
      bookingId: newBooking._id,
      bookingReferenceId: refId,
      stayId: stay._id,
      hostId: host._id,
      userId: null,
      amount: Number(totalAmount) || 0,
      paymentMethod: 'OFFLINE',
      paymentStatus: 'COMPLETED',
      transactionId: `OFF-TXN-${Date.now().toString().slice(-6)}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Offline booking registered successfully.',
      booking: newBooking,
    });
  } catch (error) {
    console.error('Create offline booking error:', error);
    return next(error);
  }
};

// @desc    Check available rooms across requested date ranges
// @route   GET /api/bookings/check-availability
// @access  Public
export const checkStayAvailability = async (req, res, next) => {
  try {
    const { stayId, checkIn, checkOut } = req.query;

    if (!stayId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'stayId, checkIn, and checkOut are required parameters.',
      });
    }

    const requestedCheckIn = new Date(checkIn);
    const requestedCheckOut = new Date(checkOut);

    if (isNaN(requestedCheckIn.getTime()) || isNaN(requestedCheckOut.getTime()) || requestedCheckIn >= requestedCheckOut) {
      return res.status(400).json({ success: false, message: 'Invalid date range provided.' });
    }

    const targetStay = await Stay.findById(stayId).lean();
    if (!targetStay) {
      return res.status(404).json({ success: false, message: 'Stay not found.' });
    }

    const overlappingBookings = await Booking.find({
      stayId: targetStay._id,
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] },
      checkIn: { $lt: requestedCheckOut },
      checkOut: { $gt: requestedCheckIn },
    })
      .select('roomNumber')
      .lean();

    const occupiedRoomNumbers = new Set(
      overlappingBookings.map((b) => String(b.roomNumber).trim())
    );

    const roomsStatus = (targetStay.rooms || []).map((room) => {
      const isOccupied = occupiedRoomNumbers.has(String(room.roomNumber).trim());
      return {
        ...room,
        isAvailable: !isOccupied,
        status: isOccupied ? 'Occupied' : 'Available',
      };
    });

    return res.json({
      success: true,
      stayId: targetStay._id,
      checkIn: requestedCheckIn.toISOString(),
      checkOut: requestedCheckOut.toISOString(),
      totalRooms: roomsStatus.length,
      availableRoomsCount: roomsStatus.filter((r) => r.isAvailable).length,
      rooms: roomsStatus,
    });
  } catch (error) {
    console.error('Check availability error:', error);
    return next(error);
  }
};

// @desc    Get all bookings for a host
// @route   GET /api/bookings/host-bookings
// @access  Private / Host
export const getHostBookings = async (req, res, next) => {
  try {
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    let hostId = null;

    if (isCallerAdmin) {
      const hostIdentifier = req.query.hostId || req.user?._id;
      const hostEmail = (req.query.email || req.params.email || req.user?.email || '').toLowerCase().trim();
      if (hostIdentifier && mongoose.Types.ObjectId.isValid(hostIdentifier)) {
        hostId = hostIdentifier;
      } else if (hostEmail) {
        const host = await Host.findOne({ email: hostEmail }).select('_id').lean();
        if (host) hostId = host._id;
      }
    } else {
      // IDOR Guard: Caller can ONLY access their own host bookings
      const callerEmail = (req.user?.email || '').toLowerCase().trim();
      const callerId = req.user?._id;

      // If client sent an explicit email/hostId param, verify it matches caller
      if (req.params.email || req.query.email) {
        const targetEmail = (req.params.email || req.query.email).toLowerCase().trim();
        if (targetEmail !== callerEmail) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to view bookings of another host.',
          });
        }
      }

      const host = await Host.findOne({
        $or: [
          ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
          ...(callerEmail ? [{ email: callerEmail }] : []),
        ],
      }).select('_id').lean();

      if (req.query.hostId && host && !idsMatch(req.query.hostId, host._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view bookings of another host.',
        });
      }

      if (host) hostId = host._id;
    }

    if (!hostId) {
      return res.json({ success: true, count: 0, bookings: [], guests: [] });
    }

    await autoExpireAwaitingBookings({ hostId });

    // Automatically ensure all active offline walk-in bookings registered by host have status 'CHECKED_IN'
    await Booking.updateMany(
      {
        hostId,
        $or: [
          { bookingSource: { $in: ['OFFLINE_HOST', 'offline'] } },
          { paymentMethod: { $in: ['OFFLINE', 'CASH'] } },
        ],
        status: 'CONFIRMED',
      },
      {
        $set: { status: 'CHECKED_IN', isOccupied: true },
      }
    ).catch(() => {});

    const bookings = await Booking.find({
      hostId,
      status: { $nin: ['CANCELLED', 'REJECTED'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = bookings.map((b) => ({
      ...b,
      bookingId: b._id.toString(),
      userName: b.fullName,
      guestAadhar: b.aadharNumber,
    }));

    return res.json({
      success: true,
      count: formatted.length,
      bookings: formatted,
      guests: formatted,
    });
  } catch (error) {
    console.error('Get host bookings error:', error);
    return next(error);
  }
};

// @desc    Get user's personal bookings
// @route   GET /api/bookings/my-bookings
// @access  Private / User
export const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    const userPhone = req.user?.phone ? String(req.user.phone).replace(/\D/g, '').slice(-10) : '';

    const query = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.push({ userId });
    if (userEmail) query.push({ email: userEmail });
    if (userPhone) query.push({ phone: { $regex: userPhone + '$' } });

    if (query.length === 0) {
      return res.json({ success: true, count: 0, bookings: [] });
    }

    await autoExpireAwaitingBookings();

    const bookings = await Booking.find({ $or: query })
      .populate('stayId', 'title location images address')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return next(error);
  }
};

// @desc    Update booking details or status
// @route   PATCH /api/bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const userId = req.user?._id?.toString();
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const isAdmin = isAdminUser(req) || req.isAdminKey;
    const isOwner =
      Boolean(userId && booking.userId && idsMatch(booking.userId, userId)) ||
      Boolean(userEmail && booking.email && booking.email.toLowerCase().trim() === userEmail);

    let isPropertyHost = false;
    if (req.user?.role === 'host' || Boolean(req.user?.isHost) || req.hostAccount) {
      const callerHost = await Host.findOne({
        $or: [
          ...(userId && mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      }).select('_id email').lean();
      const callerHostId = callerHost?._id?.toString() || userId;
      const callerHostEmail = (callerHost?.email || userEmail || '').toLowerCase().trim();

      if (callerHostId && booking.hostId && (idsMatch(booking.hostId, callerHostId) || idsMatch(booking.hostId, userId))) {
        isPropertyHost = true;
      } else if (booking.stayId) {
        const stay = await Stay.findById(booking.stayId).select('hostId email hostEmail').lean();
        if (stay) {
          const stayHostId = stay.hostId?.toString();
          const stayEmail = (stay.email || stay.hostEmail || '').toLowerCase().trim();
          if (
            (callerHostId && idsMatch(stayHostId, callerHostId)) ||
            (userId && idsMatch(stayHostId, userId)) ||
            (callerHostEmail && stayEmail && stayEmail === callerHostEmail)
          ) {
            isPropertyHost = true;
          }
        }
      }
    }

    if (!isAdmin && !isPropertyHost && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not have permission to modify this reservation.',
      });
    }

    // Role-based privilege separation:
    // If the caller is only a guest owner (not host or admin), they may cancel or mark expired if countdown ended
    if (isOwner && !isPropertyHost && !isAdmin) {
      const requestedStatus = (req.body.status || '').toUpperCase();
      const validGuestStatuses = ['CANCELLED', 'EXPIRED'];
      if (requestedStatus && !validGuestStatuses.includes(requestedStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Guests are only permitted to cancel reservations or release expired slots. Status changes to active/paid/confirmed must be done by the host or admin.',
        });
      }

      // Cancellation State Lock: Guests can only cancel if current booking status is PENDING, AWAITING_PAYMENT, or CONFIRMED
      const nonCancellableStatuses = ['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
      if (requestedStatus === 'CANCELLED' && nonCancellableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `This booking cannot be cancelled because its current status is '${booking.status}'. Guests may only cancel pending or confirmed reservations.`,
        });
      }
    }

    const targetStatus = (req.body.status || '').toUpperCase();
    const isApprovalAction = targetStatus === 'AWAITING_PAYMENT' || targetStatus === 'CONFIRMED' || targetStatus === 'CHECKED_IN';

    // Guard: Prevent host or admin from approving/confirming an already-expired booking request
    if (isApprovalAction) {
      if (booking.status === 'EXPIRED' || isBookingRequestExpired(booking)) {
        if (booking.status !== 'EXPIRED') {
          booking.status = 'EXPIRED';
          booking.paymentStatus = 'FAILED';
          await booking.save();
        }
        return res.status(400).json({
          success: false,
          message: 'This booking request has expired because the requested check-in date has already arrived or passed. A host must approve requests before the check-in date is reached.',
          status: 'EXPIRED',
        });
      }

      // Guard: Ensure room is not already booked by another confirmed reservation
      const confirmedOverlap = await findRoomOverlap({
        stayId: booking.stayId,
        roomNumber: booking.roomNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeId: booking._id,
      });
      if (confirmedOverlap) {
        return res.status(409).json({
          success: false,
          message: `Cannot approve: Room ${booking.roomNumber} is already booked for these dates (Booking: ${confirmedOverlap.bookingReferenceId}).`,
        });
      }
    }

    const updateFields = {};
    const allowedFields = isOwner && !isPropertyHost && !isAdmin
      ? ['status']
      : [
          'status',
          'totalAmount',
          'fullName',
          'phone',
          'email',
          'aadharNumber',
          'personCount',
          'gender',
          'paymentDeadline',
          'approvedAt',
          'paymentStatus',
        ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    const isOnlineBooking = booking.bookingSource === 'ONLINE' || booking.isOnline === true;
    const isUnpaid = booking.paymentStatus !== 'PAID' && req.body.paymentStatus !== 'PAID';

    // Check-in Authorization Guard: Require valid confirmed booking and verified payment
    if (req.body.status === 'CHECKED_IN') {
      const isConfirmed = booking.status === 'CONFIRMED';
      const isPaid = booking.paymentStatus === 'PAID' || booking.paymentMethod === 'PAY_ON_ARRIVAL' || booking.paymentMethod === 'OFFLINE' || booking.paymentMethod === 'CASH';
      const isUpiVerified = booking.paymentMethod !== 'UPI' || booking.upiPayment?.verificationStatus === 'VERIFIED';

      if (!isConfirmed || !isPaid || !isUpiVerified) {
        return res.status(400).json({
          success: false,
          message: 'Check-in cannot be authorized: booking must be confirmed and payment verified by the host prior to room allocation.',
        });
      }
    }

    // If an online booking is approved by the host, it transitions to AWAITING_PAYMENT with payment instructions
    // It transitions to CONFIRMED once host verifies the direct guest UPI payment.
    if (isOnlineBooking && isUnpaid && (req.body.status === 'CONFIRMED' || req.body.status === 'AWAITING_PAYMENT')) {
      req.body.status = 'AWAITING_PAYMENT';
      updateFields.status = 'AWAITING_PAYMENT';
      updateFields.paymentStatus = 'UNPAID';
      updateFields.approvedAt = req.body.approvedAt ? new Date(req.body.approvedAt) : new Date();
      updateFields.paymentDeadline = req.body.paymentDeadline
        ? new Date(req.body.paymentDeadline)
        : new Date(Date.now() + 15 * 60 * 1000);
    } else if (req.body.status === 'AWAITING_PAYMENT') {
      updateFields.status = 'AWAITING_PAYMENT';
      updateFields.approvedAt = req.body.approvedAt ? new Date(req.body.approvedAt) : new Date();
      updateFields.paymentDeadline = req.body.paymentDeadline
        ? new Date(req.body.paymentDeadline)
        : new Date(Date.now() + 15 * 60 * 1000);
    }

    if (req.body.status === 'REJECTED' || req.body.status === 'CANCELLED') {
      const hasPaid = booking.paymentStatus === 'PAID';
      updateFields.paymentStatus = hasPaid ? 'REFUND_PENDING' : 'FAILED';
      if (!hasPaid) {
        await Payment.updateMany(
          { $or: [{ bookingId: booking._id }, { bookingReferenceId: booking.bookingReferenceId }] },
          { $set: { paymentStatus: 'FAILED' } }
        ).catch(() => {});
      } else {
        await Payment.updateMany(
          { $or: [{ bookingId: booking._id }, { bookingReferenceId: booking.bookingReferenceId }] },
          { $set: { paymentStatus: 'REFUND_PENDING' } }
        ).catch(() => {});
      }
    }

    if (req.body.status === 'CHECKED_OUT') {
      if (booking.stayId && booking.roomNumber) {
        const remainingActive = await Booking.countDocuments({
          stayId: booking.stayId,
          roomNumber: String(booking.roomNumber).trim(),
          _id: { $ne: booking._id },
          status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
        });
        if (remainingActive === 0) {
          await Stay.updateOne(
            { _id: booking.stayId, 'rooms.roomNumber': String(booking.roomNumber).trim() },
            { $set: { 'rooms.$.status': 'Available' } }
          ).catch(() => {});
        }
      }
      await Booking.findByIdAndDelete(booking._id);
      await Payment.deleteMany({
        $or: [{ bookingId: booking._id }, { bookingReferenceId: booking.bookingReferenceId }],
      }).catch(() => {});
      return res.json({
        success: true,
        message: 'Booking checked out and removed from database successfully.',
        booking: null,
      });
    }

    if (req.body.personCount !== undefined) {
      updateFields.personCount = Number(req.body.personCount) || 1;
    }

    if (isPropertyHost || isAdmin) {
      if (req.body.guestName) updateFields.fullName = req.body.guestName;
      if (req.body.guestPhone) updateFields.phone = req.body.guestPhone;
      if (req.body.guestEmail) updateFields.email = req.body.guestEmail;
      if (req.body.guestAadhar || req.body.aadhar) {
        updateFields.aadharNumber = req.body.guestAadhar || req.body.aadhar;
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(booking._id, { $set: updateFields }, { new: true });

    // Send automated WhatsApp alerts based on host status action
    if (updatedBooking) {
      if (req.body.status === 'AWAITING_PAYMENT') {
        sendWhatsAppNotification(updatedBooking, 'PAYMENT_PENDING').catch((err) => {
          console.warn('[WhatsApp Warning] Could not send payment pending alert:', err.message);
        });
      } else if (req.body.status === 'CONFIRMED') {
        sendWhatsAppNotification(updatedBooking, 'BOOKING_CONFIRMED').catch((err) => {
          console.warn('[WhatsApp Warning] Could not send booking confirmed alert:', err.message);
        });
      } else if (req.body.status === 'REJECTED') {
        sendWhatsAppNotification(updatedBooking, 'BOOKING_REJECTED').catch((err) => {
          console.warn('[WhatsApp Warning] Could not send booking rejected alert:', err.message);
        });
      }
    }

    return res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return next(error);
  }
};

// @desc    Permanently delete a booking / occupant
// @route   POST /api/bookings/occupant/remove
// @access  Private / Host
export const removeOccupantBooking = async (req, res, next) => {
  try {
    const {
      occupantId,
      slotBookingId,
      bookingReferenceId,
      bookingId,
      id,
      _id,
      phone,
      guestPhone,
      userPhone,
      roomNumber,
      stayId,
      hostId,
    } = req.body;

    const queryOr = [];

    // Check all possible ID values
    const candidateIds = [occupantId, slotBookingId, bookingReferenceId, bookingId, id, _id].filter(Boolean);
    candidateIds.forEach((cId) => {
      if (mongoose.Types.ObjectId.isValid(cId)) {
        queryOr.push({ _id: cId });
      }
      queryOr.push({ bookingReferenceId: cId });
      queryOr.push({ slotBookingId: cId });
    });

    // Fallback: match by roomNumber and phone if provided
    const cleanPhone = String(phone || guestPhone || userPhone || '').replace(/\D/g, '').slice(-10);
    const rawRoom = String(roomNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone && rawRoom) {
      const phoneFilter = {
        roomNumber: { $regex: `${rawRoom}$`, $options: 'i' },
        phone: { $regex: `${cleanPhone}$` },
      };
      if (stayId && mongoose.Types.ObjectId.isValid(stayId)) {
        phoneFilter.stayId = stayId;
      }
      queryOr.push(phoneFilter);
    }

    if (queryOr.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid booking identifier provided.' });
    }

    const matchingBookings = await Booking.find({ $or: queryOr });
    if (!matchingBookings || matchingBookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // IDOR Guard: Verify host owns the property of the target bookings
    if (!isAdminUser(req) && !req.isAdminKey) {
      const callerId = req.user?._id?.toString();
      const callerEmail = (req.user?.email || '').toLowerCase().trim();
      const callerHost = await Host.findOne({
        $or: [
          ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
          ...(callerEmail ? [{ email: callerEmail }] : []),
        ],
      }).select('_id').lean();

      const callerHostId = callerHost?._id?.toString() || callerId;
      const unauthorized = matchingBookings.some((b) => {
        return !idsMatch(b.hostId, callerHostId);
      });

      if (unauthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to remove occupants from listings you do not own.',
        });
      }
    }

    const bookingIds = matchingBookings.map((b) => b._id);
    await Booking.deleteMany({ _id: { $in: bookingIds } });
    await Payment.deleteMany({ bookingId: { $in: bookingIds } });

    return res.json({
      success: true,
      message: 'Occupant booking and related payments deleted successfully.',
      deletedCount: bookingIds.length,
    });
  } catch (error) {
    console.error('Remove occupant error:', error);
    return next(error);
  }
};

// @desc    Mark occupant as checked out & delete booking with all details from database
// @route   POST /api/bookings/occupant/checkout
// @access  Private / Host
export const checkoutOccupant = async (req, res, next) => {
  try {
    const {
      occupantId,
      slotBookingId,
      bookingReferenceId,
      bookingId,
      id,
      _id,
      phone,
      guestPhone,
      userPhone,
      roomNumber,
      stayId,
      hostId,
    } = req.body;

    const queryOr = [];

    // Check all possible ID values
    const candidateIds = [occupantId, slotBookingId, bookingReferenceId, bookingId, id, _id].filter(Boolean);
    candidateIds.forEach((cId) => {
      if (mongoose.Types.ObjectId.isValid(cId)) {
        queryOr.push({ _id: cId });
      }
      queryOr.push({ bookingReferenceId: cId });
      queryOr.push({ slotBookingId: cId });
    });

    // Fallback: match by roomNumber and phone if provided
    const cleanPhone = String(phone || guestPhone || userPhone || '').replace(/\D/g, '').slice(-10);
    const rawRoom = String(roomNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone && rawRoom) {
      const phoneFilter = {
        roomNumber: { $regex: `${rawRoom}$`, $options: 'i' },
        phone: { $regex: `${cleanPhone}$` },
      };
      if (stayId && mongoose.Types.ObjectId.isValid(stayId)) {
        phoneFilter.stayId = stayId;
      }
      queryOr.push(phoneFilter);
    }

    if (queryOr.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid booking identifier provided for checkout.' });
    }

    const matchingBookings = await Booking.find({ $or: queryOr });
    if (!matchingBookings || matchingBookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // IDOR Guard: Verify host owns the property of the target bookings
    if (!isAdminUser(req) && !req.isAdminKey) {
      const callerId = req.user?._id?.toString();
      const callerEmail = (req.user?.email || '').toLowerCase().trim();
      const callerHost = await Host.findOne({
        $or: [
          ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
          ...(callerEmail ? [{ email: callerEmail }] : []),
        ],
      }).select('_id').lean();

      const callerHostId = callerHost?._id?.toString() || callerId;
      const unauthorized = matchingBookings.some((b) => {
        return !idsMatch(b.hostId, callerHostId);
      });

      if (unauthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to check out occupants from listings you do not own.',
        });
      }
    }

    const bookingIds = matchingBookings.map((b) => b._id);

    // Check-out occupant: remove booking completely from database and free room slots
    await Booking.deleteMany({ _id: { $in: bookingIds } });
    await Payment.deleteMany({ bookingId: { $in: bookingIds } }).catch(() => {});

    // If stayId and roomNumber are provided, check if room has any remaining active occupants
    if (stayId && roomNumber) {
      const remainingActive = await Booking.countDocuments({
        stayId,
        roomNumber: String(roomNumber).trim(),
        status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
      });
      if (remainingActive === 0) {
        await Stay.updateOne(
          { _id: stayId, 'rooms.roomNumber': String(roomNumber).trim() },
          { $set: { 'rooms.$.status': 'Available' } }
        ).catch(() => {});
      }
    }

    return res.json({
      success: true,
      message: 'Occupant successfully checked out. Room slots freed and payment records preserved.',
      checkedOutCount: bookingIds.length,
    });
  } catch (error) {
    console.error('Checkout occupant error:', error);
    return next(error);
  }
};

// @desc    Complete check-out for a single booking (frees room slots while preserving financial records)
// @route   POST /api/bookings/:id/checkout or PATCH /api/bookings/:id/checkout
// @access  Private / Host / Admin
export const checkoutBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    // IDOR verification
    const userId = req.user?._id?.toString();
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const isAdmin = isAdminUser(req) || req.isAdminKey;

    let isPropertyHost = false;
    if (req.user?.role === 'host' || Boolean(req.user?.isHost) || req.hostAccount) {
      const callerHost = await Host.findOne({
        $or: [
          ...(userId && mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      }).select('_id email').lean();
      const callerHostId = callerHost?._id?.toString() || userId;
      const callerHostEmail = (callerHost?.email || userEmail || '').toLowerCase().trim();

      if (callerHostId && booking.hostId && (idsMatch(booking.hostId, callerHostId) || idsMatch(booking.hostId, userId))) {
        isPropertyHost = true;
      } else if (booking.stayId) {
        const stay = await Stay.findById(booking.stayId).select('hostId email hostEmail').lean();
        if (stay) {
          const stayHostId = stay.hostId?.toString();
          const stayEmail = (stay.email || stay.hostEmail || '').toLowerCase().trim();
          if (
            (callerHostId && idsMatch(stayHostId, callerHostId)) ||
            (userId && idsMatch(stayHostId, userId)) ||
            (callerHostEmail && stayEmail && stayEmail === callerHostEmail)
          ) {
            isPropertyHost = true;
          }
        }
      }
    }

    if (!isAdmin && !isPropertyHost) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to check out this booking.' });
    }

    // Free room status in Stay if no other active guests in room
    if (booking.stayId && booking.roomNumber) {
      const remainingActive = await Booking.countDocuments({
        stayId: booking.stayId,
        roomNumber: String(booking.roomNumber).trim(),
        _id: { $ne: booking._id },
        status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
      });
      if (remainingActive === 0) {
        await Stay.updateOne(
          { _id: booking.stayId, 'rooms.roomNumber': String(booking.roomNumber).trim() },
          { $set: { 'rooms.$.status': 'Available' } }
        ).catch(() => {});
      }
    }

    await Booking.findByIdAndDelete(booking._id);
    await Payment.deleteMany({
      $or: [{ bookingId: booking._id }, { bookingReferenceId: booking.bookingReferenceId }],
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Guest successfully checked out and removed from database.',
      booking: null,
    });
  } catch (error) {
    console.error('Error during checkout booking:', error);
    return next(error);
  }
};

// @desc    Cascade delete all bookings for a deleted room
// @route   POST /api/bookings/room/cascade-delete
// @access  Private / Host
export const cascadeDeleteRoomBookings = async (req, res, next) => {
  try {
    const { stayId, roomNumber, roomNumbers, categoryType, hostEmail, roomId } = req.body;

    const targetRoomNumbers = Array.isArray(roomNumbers) && roomNumbers.length > 0
      ? roomNumbers
      : (roomNumber ? [roomNumber] : []);

    if (targetRoomNumbers.length === 0 && !roomId && !categoryType) {
      return res.status(400).json({ success: false, message: 'roomNumber, roomNumbers, roomId, or categoryType is required.' });
    }

    // Resolve stayId if missing
    let targetStayId = stayId;
    if (!targetStayId || !mongoose.Types.ObjectId.isValid(targetStayId)) {
      const email = hostEmail || req.user?.email;
      if (email) {
        const HostModel = mongoose.model('Host');
        const host = await HostModel.findOne({ email }).lean();
        if (host?._id) {
          const StayModel = mongoose.model('Stay');
          const stay = await StayModel.findOne({ hostId: host._id }).lean();
          if (stay?._id) targetStayId = stay._id;
        }
      }
    }

    const queryOr = [];

    // Match individual or batch room numbers
    for (const num of targetRoomNumbers) {
      const rawNum = String(num || '').replace(/[^0-9]/g, '');
      if (rawNum) {
        queryOr.push({ roomNumber: { $regex: `${rawNum}$`, $options: 'i' } });
      }
      if (num) {
        queryOr.push({ roomNumber: String(num).trim() });
      }
    }

    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      queryOr.push({ roomId });
    }

    if (categoryType && typeof categoryType === 'string' && categoryType.trim()) {
      const cleanCat = categoryType.trim();
      queryOr.push({ roomType: { $regex: `^${cleanCat}$`, $options: 'i' } });
      queryOr.push({ category: { $regex: `^${cleanCat}$`, $options: 'i' } });
    }

    if (queryOr.length === 0) {
      return res.json({ success: true, message: 'No target rooms specified for cascade deletion.', deletedCount: 0 });
    }

    const matchQuery = { $or: queryOr };
    if (targetStayId && mongoose.Types.ObjectId.isValid(targetStayId)) {
      matchQuery.stayId = targetStayId;
    }

    // Find matching bookings to clean up both bookings and payments
    const matchingBookings = await Booking.find(matchQuery).select('_id');
    const bookingIds = matchingBookings.map((b) => b._id);

    let deletedCount = 0;
    if (bookingIds.length > 0) {
      const result = await Booking.deleteMany({ _id: { $in: bookingIds } });
      deletedCount = result.deletedCount;
      await Payment.deleteMany({ bookingId: { $in: bookingIds } });
    }

    return res.json({
      success: true,
      message: `Cascade deleted ${deletedCount} booking(s) across deleted room(s)/category.`,
      deletedCount,
    });
  } catch (error) {
    console.error('Cascade delete error:', error);
    return next(error);
  }
};

// @desc    Delete a booking (by owning user, property host, or admin)
// @route   DELETE /api/bookings/:id
// @access  Private
export const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const isHost = req.user?.role === 'host' || Boolean(req.user?.isHost) || Boolean(req.hostAccount);
    const isAdmin = req.user?.role === 'admin' || Boolean(req.user?.isAdmin) || Boolean(req.isAdminKey);

    const queryOr = [];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }
    queryOr.push({ bookingReferenceId: id }, { slotBookingId: id });

    // Phone fallback only if id is strictly formatted as a phone number
    const cleanDigits = String(id).replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10 && /^\+?[0-9\s-]{10,15}$/.test(String(id).trim())) {
      queryOr.push({ phone: { $regex: cleanDigits + '$' } });
    }

    const booking = await Booking.findOne({ $or: queryOr });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const bookingUserEmail = (booking.email || '').toLowerCase().trim();
    const isOwner =
      Boolean(userId && booking.userId && idsMatch(booking.userId, userId)) ||
      Boolean(userEmail && bookingUserEmail && bookingUserEmail === userEmail);

    let isPropertyHost = false;
    if (isHost && (userId || userEmail)) {
      const callerHost = await Host.findOne({
        $or: [
          ...(userId && mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      }).select('_id email').lean();

      const callerHostId = callerHost?._id?.toString() || userId;
      const callerHostEmail = (callerHost?.email || userEmail || '').toLowerCase().trim();

      if (callerHostId && booking.hostId && (idsMatch(booking.hostId, callerHostId) || idsMatch(booking.hostId, userId))) {
        isPropertyHost = true;
      } else if (booking.stayId) {
        const stay = await Stay.findById(booking.stayId).select('hostId email hostEmail').lean();
        if (stay) {
          const stayHostId = stay.hostId?.toString();
          const stayEmail = (stay.email || stay.hostEmail || '').toLowerCase().trim();
          if (
            (callerHostId && idsMatch(stayHostId, callerHostId)) ||
            (userId && idsMatch(stayHostId, userId)) ||
            (callerHostEmail && stayEmail && stayEmail === callerHostEmail)
          ) {
            isPropertyHost = true;
          }
        }
      }
    }

    if (!isAdmin && !isOwner && !isPropertyHost) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this booking.' });
    }

    // Role-based deletion guard: Guests cannot delete active in-progress stays (CHECKED_IN)
    if (isOwner && !isPropertyHost && !isAdmin) {
      const nonDeletableStatuses = ['CHECKED_IN'];
      if (nonDeletableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `This booking cannot be deleted because its current status is '${booking.status}'. Active in-progress stays cannot be removed until checked out.`,
        });
      }
    }

    await Booking.findByIdAndDelete(booking._id);
    await Payment.deleteMany({ bookingId: booking._id });

    return res.json({
      success: true,
      message: 'Booking record removed successfully.',
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    return next(error);
  }
};

// @desc    Get all active bookings for a stay to populate room slot schedules
// @route   GET /api/bookings/stay/:stayId
// @access  Public
export const getBookingsByStayId = async (req, res, next) => {
  try {
    const { stayId } = req.params;
    if (!stayId || !mongoose.Types.ObjectId.isValid(stayId)) {
      return res.status(400).json({ success: false, message: 'Valid stayId is required.' });
    }

    await autoExpireAwaitingBookings({ stayId });

    const bookings = await Booking.find({
      stayId,
      status: { $nin: ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'EXPIRED'] },
    })
      .select(
        'roomNumber roomType checkIn checkOut status fullName durationDisplay rateUnit userId phone email bookedDates bookedMonths paymentDeadline approvedAt paymentStatus paymentMethod totalAmount bookingReferenceId slotBookingId guestType'
      )
      .lean();

    const enrichedBookings = bookings.map((b) => {
      let bDates = Array.isArray(b.bookedDates) ? [...b.bookedDates] : [];
      let bMonths = Array.isArray(b.bookedMonths) ? [...b.bookedMonths] : [];

      if (bDates.length === 0 && b.checkIn && b.checkOut) {
        const inD = new Date(b.checkIn);
        const outD = new Date(b.checkOut);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          let curr = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate()));
          const end = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate()));
          if (curr.getTime() === end.getTime()) {
            const y = curr.getUTCFullYear();
            const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
            const d = String(curr.getUTCDate()).padStart(2, '0');
            bDates.push(`${y}-${m}-${d}`);
          } else {
            while (curr < end) {
              const y = curr.getUTCFullYear();
              const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
              const d = String(curr.getUTCDate()).padStart(2, '0');
              bDates.push(`${y}-${m}-${d}`);
              curr.setUTCDate(curr.getUTCDate() + 1);
            }
          }
        }
      }

      if (bMonths.length === 0 && b.checkIn && b.checkOut) {
        const inD = new Date(b.checkIn);
        const outD = new Date(b.checkOut);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          let currM = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
          const endYear = outD.getUTCFullYear();
          const endMonth = outD.getUTCDate() === 1 ? outD.getUTCMonth() - 1 : outD.getUTCMonth();
          const endM = new Date(Date.UTC(endYear, endMonth, 1));
          while (currM <= endM) {
            const y = currM.getUTCFullYear();
            const m = String(currM.getUTCMonth() + 1).padStart(2, '0');
            bMonths.push(`${y}-${m}`);
            currM.setUTCMonth(currM.getUTCMonth() + 1);
          }
        }
      }

      const durMatch = String(b.durationDisplay || b.duration || '').match(/(\d+)\s*month/i);
      const expectedMonths = Number(b.durationMonths) || (durMatch ? parseInt(durMatch[1], 10) : 0);
      if (expectedMonths > bMonths.length && b.checkIn) {
        const inD = new Date(b.checkIn);
        if (!isNaN(inD.getTime())) {
          bMonths = [];
          let currM = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
          for (let i = 0; i < expectedMonths; i++) {
            const y = currM.getUTCFullYear();
            const m = String(currM.getUTCMonth() + 1).padStart(2, '0');
            bMonths.push(`${y}-${m}`);
            currM.setUTCMonth(currM.getUTCMonth() + 1);
          }
        }
      }

      return {
        ...b,
        bookedDates: bDates,
        bookedMonths: bMonths,
      };
    });

    return res.json({
      success: true,
      count: enrichedBookings.length,
      bookings: enrichedBookings,
    });
  } catch (error) {
    console.error('Error fetching bookings by stay:', error);
    return next(error);
  }
};