import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { actorId, assertSelfHostOrAdmin, idsMatch, isAdminUser } from '../middleware/authMiddleware.js';
import {
  sendBookingRequestToHostEmail,
  sendBookingApprovedToGuestEmail,
  sendBookingRejectedToGuestEmail,
  sendBookingConfirmedEmail,
  sendPaymentSubmittedToHostEmail,
  getPublicClientBaseUrl,
} from '../services/emailService.js';
import { emitToHost, emitToUser, emitToGlobal } from '../services/socketService.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';
import { generateUniqueBookingPassKey } from '../utils/passKeyGenerator.js';
import {
  buildExtensionUpiUri,
  computeExtensionRoomAmount,
  computeNextExtensionPeriod,
  getExtendValidityState,
  getRoomOccupancyForTargetMonth,
  isPerPersonRoomPricing,
  isValidUpiVpa,
  resolveRoomMonthlyPrice,
} from '../utils/bookingExtensionHelpers.js';

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

// In-memory concurrency mutex to serialize simultaneous booking attempts on the exact same room
const activeRoomLocks = new Map();

/**
 * Acquires a temporary lock on a specific room to eliminate Time-of-Check to Time-of-Use (TOCTOU) race conditions.
 */
export async function acquireRoomLock(stayId, roomNumber, maxWaitMs = 5000) {
  const lockKey = `${String(stayId).trim()}_${String(roomNumber).trim()}`;
  const startTime = Date.now();

  while (activeRoomLocks.has(lockKey)) {
    if (Date.now() - startTime > maxWaitMs) {
      const err = new Error(`Room ${roomNumber} is currently processing another reservation. Please retry in a few seconds.`);
      err.statusCode = 409;
      throw err;
    }
    await new Promise((res) => setTimeout(res, 50));
  }

  activeRoomLocks.set(lockKey, Date.now());

  return () => {
    activeRoomLocks.delete(lockKey);
  };
}

/**
 * Executes an operation inside a MongoDB transaction when supported (MongoDB Atlas replica set),
 * with graceful fallback for standalone development environments.
 */
export async function executeWithTransaction(actionFn) {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    // Standalone mongod instances without replica sets
    session = null;
  }

  if (!session) {
    return await actionFn(null);
  }

  try {
    const result = await actionFn(session);
    await session.commitTransaction();
    return result;
  } catch (txErr) {
    await session.abortTransaction();
    throw txErr;
  } finally {
    session.endSession();
  }
}

async function findRoomOverlap({ stayId, roomNumber, checkIn, checkOut, excludeId, session = null }) {
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
  let q = Booking.findOne(query).select('_id bookingReferenceId checkIn checkOut fullName status');
  if (session) q = q.session(session);
  return q.lean();
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

  if (booking.isTimedOut) {
    return true;
  }

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
      .select('_id status checkIn checkOut bookedDates bookedMonths paymentDeadline phone fullName stayTitle roomNumber bookingReferenceId totalAmount paymentReRequested isTimedOut upiPayment')
      .lean();

    const expiredCandidates = [];
    for (const b of candidates) {
      if (isBookingRequestExpired(b, now)) {
        expiredCandidates.push(b);
      }
    }

    if (expiredCandidates.length > 0) {
      const expiredTimedOutIds = [];
      const standardExpiredIds = [];

      for (const b of expiredCandidates) {
        if (b.paymentReRequested) {
          expiredTimedOutIds.push(b._id);
        } else {
          standardExpiredIds.push(b._id);
        }
      }

      if (standardExpiredIds.length > 0) {
        await Booking.updateMany(
          { _id: { $in: standardExpiredIds } },
          {
            $set: {
              status: 'EXPIRED',
              paymentStatus: 'FAILED',
            },
          }
        );
      }

      if (expiredTimedOutIds.length > 0) {
        await Booking.updateMany(
          { _id: { $in: expiredTimedOutIds } },
          {
            $set: {
              status: 'EXPIRED',
              paymentStatus: 'FAILED',
              isTimedOut: true,
            },
          }
        );
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

// Helper to determine if pricing should be per person (shared utility in bookingExtensionHelpers)
function isPerPersonPricing(stayOrProperty, categoryOrRoom) {
  return isPerPersonRoomPricing(stayOrProperty, categoryOrRoom);
}

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

    // Public booking safeguard: Property must be actively live with verified subscription
    const isLive = Boolean(
      stay.isPublished &&
      stay.subscription?.status === 'ACTIVE' &&
      stay.subscription?.expiresAt &&
      new Date(stay.subscription.expiresAt) > new Date()
    );

    if (!isLive) {
      return res.status(403).json({
        success: false,
        message: 'This property listing is not currently live for online bookings. An active subscription plan is required.',
      });
    }

    const roomNumber = String(body.roomNumber || stay.rooms?.[0]?.roomNumber || '').trim();
    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'roomNumber is required.' });
    }

    const targetRoom = (stay.rooms || []).find((r) => String(r.roomNumber).trim() === roomNumber);
    if (Array.isArray(stay.rooms) && stay.rooms.length > 0 && !targetRoom) {
      return res.status(400).json({
        success: false,
        message: `Room '${roomNumber}' does not exist in this property.`,
      });
    }

    const rateMatch = (stay.roomRates || []).find(
      (r) => String(r?.type || '').trim().toLowerCase() === String(targetRoom?.type || '').trim().toLowerCase()
    );
    const rateUnit = String(targetRoom?.rateUnit || rateMatch?.rateUnit || stay.rateUnit || '/month');

    const safePersons = Math.max(1, Number(body.personCount) || 1);
    const configuredCapacity = Number(targetRoom?.capacity || rateMatch?.capacity || 0);
    if (configuredCapacity > 0 && safePersons > configuredCapacity) {
      return res.status(400).json({
        success: false,
        message: `Guest count (${safePersons}) exceeds Room ${roomNumber} maximum capacity (${configuredCapacity}).`,
      });
    }

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

    const paymentMethodRaw = String(body.paymentMethod || 'UPI').toUpperCase();
    const isPayOnArrival = paymentMethodRaw === 'PAY_ON_ARRIVAL' || paymentMethodRaw === 'OFFLINE' || paymentMethodRaw === 'CASH';

    // Exact Server-side Price Calculation from Trusted Database Stay Records
    const isMonthly = rateUnit.includes('month');
    const unitCount = isMonthly ? (timings.durationMonths || 1) : (timings.durationDays || 1);
    const rawPrice = targetRoom?.price || rateMatch?.price || stay.price || 0;
    const roomBaseRate = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

    const isPerPerson = isPerPersonPricing(stay, targetRoom || rateMatch);
    const effectiveMultiplier = isPerPerson ? safePersons : 1;
    const baseAmount = roomBaseRate * unitCount * effectiveMultiplier;
    // Security: Always enforce server-computed room total instead of trusting client-supplied totalAmount
    const serverTotal = baseAmount;

    const deposit = 0;
    const maintenance = 0;
    const taxes = 0;

    // Lookup Host UPI settings for immutable booking pricing snapshot
    const hostDoc = await Host.findById(stay.hostId).select('name email upiSettings').lean();
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

    let uploadedAadharPhoto = '';
    const rawAadharPhoto = String(body.aadharPhoto || body.guestAadharPhoto || '').trim();
    if (!rawAadharPhoto) {
      return res.status(400).json({
        success: false,
        message: 'Aadhar card photo is required.',
      });
    }
    try {
      uploadedAadharPhoto = await uploadSecureImage(rawAadharPhoto, 'stayin/aadhar');
    } catch (imgErr) {
      return res.status(400).json({
        success: false,
        message: imgErr.message || 'Invalid Aadhar card photo format.',
      });
    }

    const bookingPayload = {
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
      aadharPhoto: uploadedAadharPhoto,
      roomNumber,
      roomType: body.roomType || targetRoom?.type || 'Standard',
      rateUnit: isMonthly ? '/month' : '/night',
      checkIn,
      checkOut,
      durationDisplay: timings.durationDisplay || body.durationDisplay || '',
      bookedDates: isMonthly ? [] : (Array.isArray(body.bookedDates) && body.bookedDates.length > 0 ? body.bookedDates : (timings.cleanDates || [])),
      bookedMonths: isMonthly ? (Array.isArray(body.bookedMonths) && body.bookedMonths.length > 0 ? body.bookedMonths : (timings.cleanMonths || [])) : [],
      personCount: Number(body.personCount) || 1,
      totalAmount: serverTotal,
      pricingSnapshot: {
        basePrice: roomBaseRate,
        baseAmount,
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
      bookingSource: 'ONLINE',
      status: 'PENDING',
      paymentStatus: isPayOnArrival ? 'PENDING' : 'UNPAID',
      paymentMethod: isPayOnArrival ? 'PAY_ON_ARRIVAL' : 'UPI',
    };

    // Concurrency Protection: Serialize simultaneous booking requests targeting the same room
    let releaseLock;
    try {
      releaseLock = await acquireRoomLock(stay._id, roomNumber);
    } catch (lErr) {
      return res.status(409).json({
        success: false,
        message: lErr.message || `Room ${roomNumber} is currently processing another reservation. Please retry.`,
      });
    }

    try {
      const newBooking = await executeWithTransaction(async (session) => {
        // Atomic overlap check inside transaction & room lock
        const overlap = await findRoomOverlap({ stayId: stay._id, roomNumber, checkIn, checkOut, session });
        if (overlap) {
          const err = new Error(`Room ${roomNumber} is already booked for those dates.`);
          err.statusCode = 409;
          err.conflictingBookingId = overlap.bookingReferenceId;
          throw err;
        }

        // Duplicate pending request check by same guest inside transaction & room lock
        if (userDuplicateQuery.$or.length > 0) {
          let uQ = Booking.findOne(userDuplicateQuery).select('_id bookingReferenceId');
          if (session) uQ = uQ.session(session);
          const existingUserPending = await uQ.lean();
          if (existingUserPending) {
            const err = new Error('You already have a pending booking request for this room on these dates. Please wait for host approval.');
            err.statusCode = 400;
            err.existingBookingId = existingUserPending.bookingReferenceId;
            throw err;
          }
        }

        const [createdBooking] = await Booking.create([bookingPayload], { session });

        await Payment.create(
          [
            {
              bookingId: createdBooking._id,
              bookingReferenceId: createdBooking.bookingReferenceId,
              stayId: createdBooking.stayId,
              hostId: createdBooking.hostId,
              userId: createdBooking.userId || null,
              amount: createdBooking.totalAmount,
              recipientUpiId: recipientUpi,
              paymentMethod: isPayOnArrival ? 'OFFLINE' : 'UPI',
              paymentStatus: 'PENDING',
              verificationStatus: 'UNSUBMITTED',
              transactionId: `TXN-PEND-${createdBooking._id.toString().slice(-8)}`,
            },
          ],
          { session }
        );

        return createdBooking;
      });
      // Send automated branded email alert to host (new booking request)
      if (hostDoc?.email) {
        sendBookingRequestToHostEmail({
          hostEmail: hostDoc.email,
          hostName: hostDoc.name || 'Host Partner',
          guestName: newBooking.fullName,
          guestPhone: newBooking.phone,
          guestEmail: newBooking.email,
          stayTitle: stay.title,
          roomNumber: newBooking.roomNumber,
          roomType: newBooking.roomType,
          totalAmount: newBooking.totalAmount,
          durationDisplay: newBooking.durationDisplay || timings.durationDisplay,
          checkIn: newBooking.checkIn,
          checkOut: newBooking.checkOut,
          bookingId: newBooking._id,
          bookingReferenceId: newBooking.bookingReferenceId,
        }).catch((err) => {
          console.warn('[Email Warning] Could not send host booking request alert:', err.message);
        });
      }

      // Real-time WebSockets dispatch to Host & Global availability
      emitToHost([newBooking.hostId], 'booking:new', {
        booking: newBooking,
        message: `New booking request for Room ${newBooking.roomNumber} from ${newBooking.fullName}`,
      });
      emitToHost([newBooking.hostId], 'booking:created', {
        booking: newBooking,
      });
      emitToGlobal('stay:availability_changed', {
        stayId: newBooking.stayId,
        roomNumber: newBooking.roomNumber,
      });

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking: newBooking,
      });
    } catch (atomicErr) {
      if (atomicErr.statusCode) {
        return res.status(atomicErr.statusCode).json({
          success: false,
          message: atomicErr.message,
          ...(atomicErr.conflictingBookingId ? { conflictingBookingId: atomicErr.conflictingBookingId } : {}),
          ...(atomicErr.existingBookingId ? { existingBookingId: atomicErr.existingBookingId } : {}),
        });
      }
      throw atomicErr;
    } finally {
      if (releaseLock) releaseLock();
    }
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

    const rawPrice = targetRoom?.price || matchingRate?.price || stay.price || 0;
    const roomBaseRate = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const unitCount = isMonthlyRoom ? (timings.durationMonths || (req.body.bookedMonths?.length) || 1) : (timings.durationDays || (cleanDates?.length) || 1);
    const safePersons = Math.max(1, Number(req.body?.personCount || personCount) || 1);
    const isPerPerson = isPerPersonPricing(stay, targetRoom || matchingRate);
    const effectiveMultiplier = isPerPerson ? safePersons : 1;
    const computedBaseAmount = roomBaseRate * unitCount * effectiveMultiplier;
    const finalTotalAmount = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) > 0)
      ? Number(totalAmount)
      : computedBaseAmount;

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
      personCount: safePersons,
      gender: gender || 'Other',
      checkIn: startDate,
      checkOut: endDate,
      durationDisplay,
      bookedDates: isMonthlyRoom ? [] : (cleanDates.length > 0 ? cleanDates : (timings.cleanDates || [])),
      bookedMonths: isMonthlyRoom ? (Array.isArray(req.body.bookedMonths) && req.body.bookedMonths.length > 0 ? req.body.bookedMonths : (timings.cleanMonths || [])) : [],
      totalAmount: finalTotalAmount,
      bookingReferenceId: refId,
      status: 'CHECKED_IN',
      isOccupied: true,
      paymentStatus: 'PAID',
      paymentMethod: 'OFFLINE',
      checkInCode: null,
    });

    // 2. Record Transaction in Payment Collection
    await Payment.create({
      bookingId: newBooking._id,
      bookingReferenceId: refId,
      stayId: stay._id,
      hostId: host._id,
      userId: null,
      amount: finalTotalAmount,
      paymentMethod: 'OFFLINE',
      paymentStatus: 'COMPLETED',
      transactionId: `OFF-TXN-${Date.now().toString().slice(-6)}`,
    });

    // Real-time WebSockets dispatch to Host & Global availability
    emitToHost([host._id], 'booking:updated', {
      booking: newBooking,
      action: 'OFFLINE_BOOKING_CREATED',
    });
    emitToGlobal('stay:availability_changed', {
      stayId: stay._id,
      roomNumber: newBooking.roomNumber,
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
      guestAadharPhoto: b.aadharPhoto || '',
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
    const rawPhoneDigits = req.user?.phone ? String(req.user.phone).replace(/\D/g, '') : '';
    const userPhone = rawPhoneDigits.length >= 10 ? rawPhoneDigits.slice(-10) : '';

    const query = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.push({ userId });
    if (userEmail) query.push({ email: userEmail });
    if (userPhone) query.push({ userId: null, phone: { $regex: userPhone + '$' } });

    if (query.length === 0) {
      return res.json({ success: true, count: 0, bookings: [] });
    }

    await autoExpireAwaitingBookings();

    const bookings = await Booking.find({ $or: query })
      .populate('stayId', 'title location images address rooms roomRates hostId hostName')
      .populate('hostId', 'name phone email')
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

// @desc    Get single booking details by ID or reference ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    await autoExpireAwaitingBookings();

    const booking = await Booking.findOne(query)
      .populate('stayId', 'title propertyName location images address rooms roomRates upiSettings hostId description amenities policies')
      .populate('hostId', 'name phone email upiSettings')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    // Check if re-requested payment window has expired and user has not submitted for verification
    if (
      booking.paymentReRequested &&
      !booking.isTimedOut &&
      booking.upiPayment?.verificationStatus !== 'PENDING_VERIFICATION' &&
      booking.upiPayment?.verificationStatus !== 'VERIFIED'
    ) {
      if (
        booking.status === 'EXPIRED' ||
        (booking.paymentDeadline && new Date(booking.paymentDeadline).getTime() <= Date.now())
      ) {
        booking.isTimedOut = true;
        booking.status = 'EXPIRED';
        booking.paymentStatus = 'FAILED';
        await Booking.updateOne(
          { _id: booking._id },
          { $set: { isTimedOut: true, status: 'EXPIRED', paymentStatus: 'FAILED' } }
        );
      }
    }

    // Ensure confirmed/checked-in ONLINE bookings have an 8-digit check-in pass code
    const isOfflineBooking = Boolean(
      booking.bookingSource === 'OFFLINE_HOST' ||
      booking.source === 'offline' ||
      booking.paymentMethod === 'OFFLINE'
    );
    if (
      !isOfflineBooking &&
      (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN' || booking.upiPayment?.verificationStatus === 'VERIFIED') &&
      !booking.checkInCode
    ) {
      const generatedCode = await generateUniqueBookingPassKey();
      await Booking.updateOne({ _id: booking._id }, { $set: { checkInCode: generatedCode } });
      booking.checkInCode = generatedCode;
    }
    if (isOfflineBooking && booking.checkInCode) {
      booking.checkInCode = '';
      await Booking.updateOne({ _id: booking._id }, { $unset: { checkInCode: 1 } });
    }

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    const rawCallerDigits = req.user?.phone ? String(req.user.phone).replace(/\D/g, '') : '';
    const callerPhone = rawCallerDigits.length >= 10 ? rawCallerDigits.slice(-10) : '';
    const bookingPhoneDigits = booking.phone ? String(booking.phone).replace(/\D/g, '') : '';
    const bookingPhone10 = bookingPhoneDigits.length >= 10 ? bookingPhoneDigits.slice(-10) : '';

    const isOwner =
      Boolean(callerId && booking.userId && idsMatch(booking.userId, callerId)) ||
      Boolean(callerEmail && booking.email && booking.email.toLowerCase().trim() === callerEmail) ||
      Boolean(!booking.userId && callerPhone && bookingPhone10 && bookingPhone10 === callerPhone);

    const isPropertyHost =
      Boolean(callerId && booking.hostId && (idsMatch(booking.hostId, callerId) || idsMatch(booking.hostId?._id, callerId))) ||
      Boolean(req.hostAccount && idsMatch(booking.hostId, req.hostAccount._id));

    const isAdmin = isAdminUser(req) || req.isAdminKey;

    if (!isOwner && !isPropertyHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this reservation.',
      });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Get booking by id error:', error);
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

      // Cancellation & Expiry State Locks:
      const nonCancellableStatuses = ['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
      if (requestedStatus === 'CANCELLED' && nonCancellableStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `This booking cannot be cancelled because its current status is '${booking.status}'. Guests may only cancel pending or confirmed reservations.`,
        });
      }

      if (requestedStatus === 'EXPIRED') {
        const expirableStatuses = ['PENDING', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'EXPIRED'];
        const currentUp = String(booking.status || '').toUpperCase().trim();
        const isVerificationInProgress = ['PENDING_VERIFICATION', 'VERIFIED'].includes(
          String(booking.upiPayment?.verificationStatus || '').toUpperCase()
        );
        if (!expirableStatuses.includes(currentUp) || booking.paymentStatus === 'PAID' || isVerificationInProgress) {
          return res.status(400).json({
            success: false,
            message: `This booking cannot be marked expired because its current status is '${booking.status}'.`,
          });
        }
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
    }

    // Hold room concurrency lock across BOTH overlap verification AND MongoDB persistence to prevent TOCTOU double-bookings
    let releaseApprovalLock = null;
    let updatedBooking = null;
    try {
      if (isApprovalAction) {
        try {
          releaseApprovalLock = await acquireRoomLock(booking.stayId, booking.roomNumber);
        } catch (lockErr) {
          if (lockErr.statusCode) {
            return res.status(lockErr.statusCode).json({ success: false, message: lockErr.message });
          }
          throw lockErr;
        }
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
          'paymentReRequested',
          'isTimedOut',
        ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    const isOnlineBooking = booking.bookingSource === 'ONLINE' || booking.isOnline === true;
    const isPayOnArrival = ['PAY_ON_ARRIVAL', 'OFFLINE', 'CASH'].includes(String(booking.paymentMethod || '').toUpperCase());
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

    // Pay on Arrival bookings confirm directly without getting trapped by an online UPI payment timer;
    // Online UPI bookings transition to AWAITING_PAYMENT until host verifies direct UPI receipt.
    if (isOnlineBooking && isPayOnArrival && (req.body.status === 'CONFIRMED' || req.body.status === 'AWAITING_PAYMENT')) {
      req.body.status = 'CONFIRMED';
      updateFields.status = 'CONFIRMED';
      updateFields.approvedAt = req.body.approvedAt ? new Date(req.body.approvedAt) : (booking.approvedAt || new Date());
      updateFields.paymentDeadline = null;
    } else if (isOnlineBooking && isUnpaid && (req.body.status === 'CONFIRMED' || req.body.status === 'AWAITING_PAYMENT')) {
      req.body.status = 'AWAITING_PAYMENT';
      updateFields.status = 'AWAITING_PAYMENT';
      updateFields.paymentStatus = 'UNPAID';
      updateFields.approvedAt = req.body.approvedAt ? new Date(req.body.approvedAt) : new Date();
      updateFields.paymentDeadline = req.body.paymentDeadline
        ? new Date(req.body.paymentDeadline)
        : new Date(Date.now() + 10 * 60 * 1000);
    } else if (req.body.status === 'AWAITING_PAYMENT') {
      updateFields.status = 'AWAITING_PAYMENT';
      updateFields.approvedAt = req.body.approvedAt ? new Date(req.body.approvedAt) : new Date();
      updateFields.paymentDeadline = req.body.paymentDeadline
        ? new Date(req.body.paymentDeadline)
        : new Date(Date.now() + 10 * 60 * 1000);
    }

    if (req.body.status === 'EXPIRED') {
      updateFields.status = 'EXPIRED';
      updateFields.paymentStatus = 'FAILED';
      if (booking.paymentReRequested || req.body.isTimedOut) {
        updateFields.isTimedOut = true;
      }
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
      const checkedOutAt = new Date();
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

      // Preserve booking & payment ledger permanently so Paid Users revenue & post-checkout Extend Validity stay intact
      const updatedCheckedOut = await Booking.findByIdAndUpdate(
        booking._id,
        {
          $set: {
            status: 'CHECKED_OUT',
            checkedOutAt,
            isOccupied: false,
          },
          $push: {
            auditLog: {
              action: 'GUEST_CHECKED_OUT',
              performedBy: actorId(req) || null,
              performerRole: 'host',
              timestamp: checkedOutAt,
              note: 'Guest checked out; record retained in Paid Users history',
            },
          },
        },
        { new: true }
      );

      if (booking.hostId) {
        emitToHost([booking.hostId], 'booking:updated', {
          bookingId: booking._id,
          action: 'CHECKED_OUT',
          status: 'CHECKED_OUT',
          booking: updatedCheckedOut,
        });
      }
      if (booking.userId || booking.email) {
        emitToUser([booking.userId, booking.email], 'booking:checked_out', {
          bookingId: booking._id,
          bookingReferenceId: booking.bookingReferenceId,
          status: 'CHECKED_OUT',
          booking: updatedCheckedOut,
        });
      }
      emitToGlobal('stay:availability_changed', { stayId: booking.stayId, roomNumber: booking.roomNumber });

      return res.json({
        success: true,
        message: 'Guest successfully checked out.',
        booking: updatedCheckedOut,
      });
    }

    if (req.body.personCount !== undefined) {
      updateFields.personCount = Number(req.body.personCount) || 1;
    }

    const isOfflineTarget = Boolean(
      booking.bookingSource === 'OFFLINE_HOST' ||
      booking.source === 'offline' ||
      booking.paymentMethod === 'OFFLINE' ||
      req.body.bookingSource === 'OFFLINE_HOST'
    );
    if (!isOfflineTarget && (req.body.status === 'CONFIRMED' || req.body.status === 'CHECKED_IN') && !booking.checkInCode) {
      updateFields.checkInCode = await generateUniqueBookingPassKey();
    }

    if (isPropertyHost || isAdmin) {
      if (req.body.guestName) updateFields.fullName = req.body.guestName;
      if (req.body.guestPhone) updateFields.phone = req.body.guestPhone;
      if (req.body.guestEmail) updateFields.email = req.body.guestEmail;
      if (req.body.guestAadhar || req.body.aadhar) {
        updateFields.aadharNumber = req.body.guestAadhar || req.body.aadhar;
      }
    }

    updatedBooking = await Booking.findByIdAndUpdate(booking._id, { $set: updateFields }, { new: true });
    } finally {
      if (releaseApprovalLock) releaseApprovalLock();
    }

    // Send automated Email alerts based on host status action
    if (updatedBooking) {
      if (req.body.status === 'AWAITING_PAYMENT' || updateFields.status === 'AWAITING_PAYMENT') {
        const dispatchApprovedEmail = async () => {
          let recipientEmail = (updatedBooking.email || booking.email || '').trim();
          let recipientName = (updatedBooking.fullName || booking.fullName || '').trim();

          if (!recipientEmail && (updatedBooking.userId || booking.userId)) {
            try {
              const userDoc = await User.findById(updatedBooking.userId || booking.userId).select('name email').lean();
              if (userDoc?.email) {
                recipientEmail = userDoc.email.trim();
                if (!recipientName) recipientName = userDoc.name || 'Guest';
              }
            } catch (err) {
              console.warn('[Email Warning] Could not resolve guest user from userId:', err.message);
            }
          }

          if (recipientEmail) {
            const originUrl = req.get('origin') || process.env.CLIENT_URL || 'http://localhost:5173';
            const directBookingUrl = `${originUrl}/booking/${updatedBooking._id}`;
            await sendBookingApprovedToGuestEmail({
              guestEmail: recipientEmail,
              guestName: recipientName || 'Guest',
              stayTitle: updatedBooking.stayTitle || booking.stayTitle,
              roomNumber: updatedBooking.roomNumber || booking.roomNumber,
              totalAmount: updatedBooking.totalAmount || booking.totalAmount,
              paymentDeadline: updatedBooking.paymentDeadline,
              bookingId: updatedBooking._id,
              bookingReferenceId: updatedBooking.bookingReferenceId,
              bookingUrl: directBookingUrl,
            });
          }
        };

        dispatchApprovedEmail().catch((err) => {
          console.warn('[Email Warning] Could not send guest booking approved alert:', err.message);
        });
      } else if (req.body.status === 'CONFIRMED') {
        if (updatedBooking.email) {
          sendBookingConfirmedEmail({
            guestEmail: updatedBooking.email,
            guestName: updatedBooking.fullName,
            stayTitle: updatedBooking.stayTitle,
            roomNumber: updatedBooking.roomNumber,
            totalAmount: updatedBooking.totalAmount,
            checkInCode: updatedBooking.checkInCode || updatedBooking.bookingReferenceId,
            bookingId: updatedBooking._id,
            bookingReferenceId: updatedBooking.bookingReferenceId,
          }).catch((err) => {
            console.warn('[Email Warning] Could not send guest booking confirmed alert:', err.message);
          });
        }
      } else if (req.body.status === 'REJECTED') {
        if (updatedBooking.email) {
          sendBookingRejectedToGuestEmail({
            guestEmail: updatedBooking.email,
            guestName: updatedBooking.fullName,
            stayTitle: updatedBooking.stayTitle,
            roomNumber: updatedBooking.roomNumber,
            bookingReferenceId: updatedBooking.bookingReferenceId,
          }).catch((err) => {
            console.warn('[Email Warning] Could not send guest booking rejected alert:', err.message);
          });
        }
      }

      // Real-time synchronization to guest and host via WebSockets
      if (updatedBooking.userId || updatedBooking.email) {
        emitToUser([updatedBooking.userId, updatedBooking.email], 'booking:status_changed', {
          booking: updatedBooking,
          bookingId: updatedBooking._id,
          bookingReferenceId: updatedBooking.bookingReferenceId,
          status: updatedBooking.status,
          paymentStatus: updatedBooking.paymentStatus,
          paymentDeadline: updatedBooking.paymentDeadline,
        });
        if (updatedBooking.status === 'CONFIRMED') {
          emitToUser([updatedBooking.userId, updatedBooking.email], 'booking:confirmed', {
            booking: updatedBooking,
            bookingId: updatedBooking._id,
            bookingReferenceId: updatedBooking.bookingReferenceId,
          });
        }
      }

      if (updatedBooking.hostId) {
        emitToHost([updatedBooking.hostId], 'booking:updated', {
          booking: updatedBooking,
          bookingId: updatedBooking._id,
          bookingReferenceId: updatedBooking.bookingReferenceId,
          status: updatedBooking.status,
        });
      }

      if (['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(updatedBooking.status)) {
        emitToGlobal('stay:availability_changed', {
          stayId: updatedBooking.stayId,
          roomNumber: updatedBooking.roomNumber,
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

    // Real-time WebSockets dispatch to Host & Global availability
    const hostTargets = [...new Set(matchingBookings.map((b) => b.hostId?.toString()).filter(Boolean))];
    if (hostTargets.length > 0) {
      emitToHost(hostTargets, 'booking:updated', { deletedCount: bookingIds.length });
    }
    const stayTargets = [...new Set(matchingBookings.map((b) => b.stayId?.toString()).filter(Boolean))];
    stayTargets.forEach((sId) => emitToGlobal('stay:availability_changed', { stayId: sId }));

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
    const checkedOutAt = new Date();

    // Check-out occupant: update status cleanly and free room slots while keeping Paid Users & payment records intact
    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      {
        $set: {
          status: 'CHECKED_OUT',
          checkedOutAt,
          isOccupied: false,
        },
      }
    );

    // Real-time WebSockets dispatch to Host & Global availability
    const hostTargets = [...new Set(matchingBookings.map((b) => b.hostId?.toString()).filter(Boolean))];
    if (hostTargets.length > 0) {
      emitToHost(hostTargets, 'booking:updated', { checkedOutCount: bookingIds.length });
    }
    if (stayId) {
      emitToGlobal('stay:availability_changed', { stayId, roomNumber });
    }

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

    // Preserve booking & payment history in DB for Paid Users revenue and post-checkout validity grace
    const checkedOutAt = new Date();
    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          status: 'CHECKED_OUT',
          checkedOutAt,
          isOccupied: false,
        },
      },
      { new: true }
    );

    // Real-time WebSockets dispatch
    if (booking.hostId) {
      emitToHost([booking.hostId], 'booking:updated', {
        bookingId: booking._id,
        action: 'CHECKED_OUT',
        status: 'CHECKED_OUT',
        booking: updatedBooking,
      });
    }
    if (booking.userId || booking.email) {
      emitToUser([booking.userId, booking.email], 'booking:checked_out', {
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        status: 'CHECKED_OUT',
        booking: updatedBooking,
      });
    }
    if (booking.stayId) {
      emitToGlobal('stay:availability_changed', { stayId: booking.stayId, roomNumber: booking.roomNumber });
    }

    return res.json({
      success: true,
      message: 'Guest successfully checked out. Record retained in payment history.',
      booking: updatedBooking,
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

    // Resolve and verify targetStayId belongs to caller (or admin)
    const isAdmin = isAdminUser(req) || Boolean(req.isAdminKey);
    let targetStayId = stayId;
    let targetStay = null;

    if (targetStayId && mongoose.Types.ObjectId.isValid(targetStayId)) {
      targetStay = await Stay.findById(targetStayId).select('hostId email hostEmail').lean();
    } else {
      const email = (isAdmin && hostEmail ? hostEmail : req.user?.email || '').toLowerCase().trim();
      if (email) {
        const host = await Host.findOne({ email }).select('_id').lean();
        if (host?._id) {
          targetStay = await Stay.findOne({ hostId: host._id }).select('_id hostId email hostEmail').lean();
          if (targetStay?._id) targetStayId = targetStay._id;
        }
      }
    }

    if (!targetStay || !targetStayId || !mongoose.Types.ObjectId.isValid(targetStayId)) {
      return res.status(404).json({ success: false, message: 'Target property not found for cascade deletion.' });
    }

    if (!isAdmin && !assertSelfHostOrAdmin(req, { hostId: targetStay.hostId, hostEmail: targetStay.email || targetStay.hostEmail })) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this property.' });
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
      const cleanCat = categoryType.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queryOr.push({ roomType: { $regex: `^${cleanCat}$`, $options: 'i' } });
      queryOr.push({ category: { $regex: `^${cleanCat}$`, $options: 'i' } });
    }

    if (queryOr.length === 0) {
      return res.json({ success: true, message: 'No target rooms specified for cascade deletion.', deletedCount: 0 });
    }

    const matchQuery = { stayId: targetStayId, $or: queryOr };

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

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    const isAdmin = isAdminUser(req) || Boolean(req.isAdminKey);

    let canViewFullPII = isAdmin;
    if (!canViewFullPII && req.user) {
      const stay = await Stay.findById(stayId).select('hostId email hostEmail').lean();
      if (stay && assertSelfHostOrAdmin(req, { hostId: stay.hostId, hostEmail: stay.email || stay.hostEmail })) {
        canViewFullPII = true;
      }
    }

    await autoExpireAwaitingBookings({ stayId });

    const selectFields = canViewFullPII
      ? 'stayId roomNumber roomType checkIn checkOut status fullName durationDisplay rateUnit userId phone email bookedDates bookedMonths personCount paymentDeadline approvedAt paymentStatus paymentMethod bookingSource source upiPayment.verificationStatus activeExtension totalAmount bookingReferenceId slotBookingId guestType'
      : 'stayId roomNumber roomType checkIn checkOut status durationDisplay rateUnit bookedDates bookedMonths personCount paymentMethod bookingSource source activeExtension.status activeExtension.targetMonths';

    const bookings = await Booking.find({
      stayId,
      $or: [
        { status: { $nin: ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'EXPIRED'] } },
        { 'activeExtension.status': 'PENDING_VERIFICATION' },
      ],
    })
      .select(selectFields)
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

      if (
        b.activeExtension?.status === 'PENDING_VERIFICATION' &&
        Array.isArray(b.activeExtension.targetMonths) &&
        b.activeExtension.targetMonths.length > 0 &&
        (!b.activeExtension.targetRoomNumber || b.activeExtension.targetRoomNumber === b.roomNumber)
      ) {
        bMonths = Array.from(new Set([...bMonths, ...b.activeExtension.targetMonths])).sort();
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

// @desc    Guest re-requests payment access for the last time (starts new 5-minute timer)
// @route   POST /api/bookings/:id/re-request-payment
// @access  Private
export const reRequestPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    const rawCallerDigits = req.user?.phone ? String(req.user.phone).replace(/\D/g, '') : '';
    const callerPhone = rawCallerDigits.length >= 10 ? rawCallerDigits.slice(-10) : '';
    const bookingPhoneDigits = booking.phone ? String(booking.phone).replace(/\D/g, '') : '';
    const bookingPhone10 = bookingPhoneDigits.length >= 10 ? bookingPhoneDigits.slice(-10) : '';

    const isOwner =
      Boolean(callerId && booking.userId && idsMatch(booking.userId, callerId)) ||
      Boolean(callerEmail && booking.email && booking.email.toLowerCase().trim() === callerEmail) ||
      Boolean(!booking.userId && callerPhone && bookingPhone10 && bookingPhone10 === callerPhone);

    const isAdmin = isAdminUser(req) || req.isAdminKey;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to modify this reservation.',
      });
    }

    // Must not have already re-requested (this is strictly the LAST chance)
    if (booking.isTimedOut || booking.paymentReRequested) {
      return res.status(400).json({
        success: false,
        message: 'Payment re-request has already been used for this booking. This reservation has permanently timed out.',
      });
    }

    if (
      booking.status === 'CONFIRMED' ||
      booking.status === 'CHECKED_IN' ||
      booking.upiPayment?.verificationStatus === 'VERIFIED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been verified and confirmed.',
      });
    }

    const curStatus = String(booking.status || '').toUpperCase().trim();
    const wasPreviouslyApproved = Boolean(
      booking.approvedAt ||
      booking.paymentDeadline ||
      curStatus === 'AWAITING_PAYMENT' ||
      curStatus === 'PAYMENT_PENDING' ||
      curStatus === 'APPROVED' ||
      curStatus === 'APPROVED - PAYMENT PENDING'
    );
    if (
      ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'COMPLETED'].includes(curStatus) ||
      !wasPreviouslyApproved
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payment re-request is only available after host approval.',
      });
    }

    // Check that reservation check-out date has not elapsed
    if (booking.checkOut && new Date(booking.checkOut) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot re-request payment: reservation stay period has already passed.',
      });
    }

    // Give new 5-minute timer (300 seconds)
    const fiveMinutesMs = 5 * 60 * 1000;
    const newDeadline = new Date(Date.now() + fiveMinutesMs);

    booking.status = 'AWAITING_PAYMENT';
    booking.paymentStatus = 'UNPAID';
    booking.paymentDeadline = newDeadline;
    booking.paymentReRequested = true;
    booking.paymentReRequestedAt = new Date();
    booking.isTimedOut = false;

    if (!booking.upiPayment) {
      booking.upiPayment = {};
    }
    if (booking.upiPayment.verificationStatus !== 'PENDING_VERIFICATION') {
      booking.upiPayment.verificationStatus = 'UNSUBMITTED';
    }

    booking.auditLog.push({
      action: 'PAYMENT_RE_REQUESTED',
      performedBy: req.user?._id || null,
      performerRole: 'guest',
      timestamp: new Date(),
      details: {
        newDeadline,
        durationMinutes: 5,
        isFinalAttempt: true,
      },
      note: 'Guest activated final 5-minute payment window to show QR and UPI details',
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('stayId', 'title propertyName location images address rooms roomRates upiSettings hostId description amenities policies')
      .populate('hostId', 'name phone email upiSettings')
      .lean();

    return res.json({
      success: true,
      booking: populated,
      message: 'Final 5-minute payment window activated. Please complete payment and send for verification before time runs out.',
    });
  } catch (error) {
    console.error('Error re-requesting payment:', error);
    return next(error);
  }
};

// @desc    Mark booking as timed out when final 5-minute payment window expires
// @route   POST /api/bookings/:id/timeout
// @access  Private
export const markBookingTimedOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';
    const isAdmin = isAdminUser(req) || Boolean(req.isAdminKey);
    const isOwner =
      Boolean(callerId && booking.userId && idsMatch(booking.userId, callerId)) ||
      Boolean(callerEmail && booking.email && booking.email.toLowerCase().trim() === callerEmail);
    const isPropertyHost = assertSelfHostOrAdmin(req, { hostId: booking.hostId });

    if (!isAdmin && !isOwner && !isPropertyHost) {
      return res.status(403).json({ success: false, message: 'Unauthorized to timeout this booking.' });
    }

    // Only AWAITING_PAYMENT online bookings whose deadline has elapsed may be timed out
    if (booking.status !== 'AWAITING_PAYMENT' || booking.bookingSource === 'OFFLINE_HOST' || booking.paymentMethod === 'PAY_ON_ARRIVAL') {
      return res.json({ success: true, booking, isTimedOut: false });
    }

    if (!isAdmin && booking.paymentDeadline && Date.now() + 5000 < new Date(booking.paymentDeadline).getTime()) {
      return res.status(400).json({ success: false, message: 'Payment deadline has not expired yet.' });
    }

    // If payment reference is already submitted for verification, do not timeout!
    if (
      booking.upiPayment?.verificationStatus === 'PENDING_VERIFICATION' ||
      booking.upiPayment?.verificationStatus === 'VERIFIED'
    ) {
      return res.json({ success: true, booking, isTimedOut: false });
    }

    booking.status = 'EXPIRED';
    booking.paymentStatus = 'FAILED';
    booking.isTimedOut = true;

    booking.auditLog.push({
      action: 'PAYMENT_TIMED_OUT',
      performedBy: req.user?._id || null,
      performerRole: 'system',
      timestamp: new Date(),
      note: 'Payment window timed out permanently',
    });

    await booking.save();

    return res.json({
      success: true,
      isTimedOut: true,
      message: 'Booking has timed out.',
    });
  } catch (error) {
    console.error('Error marking booking timed out:', error);
    return next(error);
  }
};

// @desc    Get Extend Validity info (next month, slot availability, price, Host UPI QR — no forms/Aadhaar needed)
// @route   GET /api/bookings/:id/extend-info
// @access  Private
export const getBookingExtendInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email?.toLowerCase().trim();
    const isGuest =
      idsMatch(callerId, booking.userId) ||
      (callerEmail && booking.email && callerEmail === booking.email.toLowerCase().trim());
    const isPropertyHost =
      idsMatch(callerId, booking.hostId) ||
      idsMatch(req.hostAccount?._id, booking.hostId);
    if (!isGuest && !isPropertyHost && !isAdminUser(req)) {
      return ownershipForbidden(res);
    }

    const extensionState = getExtendValidityState(booking);
    const stay = await Stay.findById(booking.stayId)
      .select('title propertyName rooms roomRates price upiSettings hostId')
      .lean();
    if (!stay) {
      return res.status(404).json({ success: false, message: 'Property listing not found.' });
    }

    const period = computeNextExtensionPeriod(booking, 1);
    const stayBookings = await Booking.find({
      stayId: stay._id,
      $or: [
        { status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] } },
        { 'activeExtension.status': 'PENDING_VERIFICATION' },
      ],
    })
      .select('_id roomNumber status bookedMonths checkIn checkOut personCount activeExtension')
      .lean();

    const safePersons = Math.max(1, Number(booking.personCount) || 1);
    const preferredRoom = String(req.query?.roomNumber || booking.roomNumber || '').trim();
    const {
      unitPrice,
      roomType,
      roomFound,
      exactAmount,
    } = computeExtensionRoomAmount(stay, preferredRoom, safePersons, booking.totalAmount);

    if (req.query?.roomNumber && Array.isArray(stay.rooms) && stay.rooms.length > 0 && !roomFound) {
      return res.status(400).json({
        success: false,
        message: `Room '${preferredRoom}' does not exist in this property.`,
      });
    }

    const roomOccupancy = getRoomOccupancyForTargetMonth(
      stay,
      preferredRoom,
      period.targetMonthKey,
      stayBookings,
      booking._id
    );
    const isSameRoomAvailable = roomOccupancy.availableSeats >= safePersons;

    const availableAlternativeRooms = [];
    for (const rm of stay.rooms || []) {
      const rmNum = String(rm?.roomNumber || '').trim();
      if (!rmNum) continue;
      const occ = getRoomOccupancyForTargetMonth(stay, rmNum, period.targetMonthKey, stayBookings, booking._id);
      if (occ.availableSeats >= safePersons) {
        const rmPricing = computeExtensionRoomAmount(stay, rmNum, safePersons, booking.totalAmount);
        availableAlternativeRooms.push({
          roomNumber: rmNum,
          roomType: rmPricing.roomType,
          unitPrice: rmPricing.unitPrice,
          amount: rmPricing.exactAmount,
          availableSeats: occ.availableSeats,
        });
      }
    }

    const host = await Host.findById(booking.hostId).select('name upiSettings').lean();
    const hostUpi = stay?.upiSettings?.upiId || host?.upiSettings?.upiId || '';
    const payeeName = stay?.upiSettings?.payeeName || host?.upiSettings?.payeeName || host?.name || stay?.title || 'Stay In Host';

    let upiUri = '';
    let qrCodeDataUrl = '';
    const isConfigured = Boolean(hostUpi && isValidUpiVpa(hostUpi));

    if (isConfigured) {
      upiUri = buildExtensionUpiUri({
        upiId: hostUpi,
        payeeName,
        amount: exactAmount,
        note: `EXT-${booking.bookingReferenceId || booking._id}-${period.targetMonthKey}`,
      });
      try {
        qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 300,
          color: { dark: '#030712', light: '#ffffff' },
        });
      } catch (qrErr) {
        console.warn('Extend QR generation note:', qrErr.message);
      }
    }

    return res.json({
      success: true,
      extensionState,
      isConfigured,
      targetMonthKey: period.targetMonthKey,
      targetMonthLabel: period.targetMonthLabel,
      targetCheckIn: period.targetCheckIn,
      targetCheckOut: period.targetCheckOut,
      targetRoomNumber: preferredRoom,
      targetRoomType: booking.roomType || roomType,
      unitPrice,
      personCount: safePersons,
      totalAmount: exactAmount,
      isSameRoomAvailable,
      availableSeats: roomOccupancy.availableSeats,
      availableAlternativeRooms,
      recipientUpiId: hostUpi,
      recipientPayeeName: payeeName,
      upiUri,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Get Booking Extend Info Error:', error);
    return next(error);
  }
};

// @desc    Submit 12-digit UPI UTR for Extend Validity (NO screenshot, reuses stored guest/Aadhaar profile)
// @route   POST /api/bookings/:id/extend-submit
// @access  Private
export const submitBookingExtension = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionRef, targetRoomNumber: requestedRoomNumber } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email?.toLowerCase().trim();
    const isGuest =
      idsMatch(callerId, booking.userId) ||
      (callerEmail && booking.email && callerEmail === booking.email.toLowerCase().trim());
    if (!isGuest && !isAdminUser(req)) {
      return ownershipForbidden(res);
    }

    const extState = getExtendValidityState(booking);
    if (extState.isExtensionPending) {
      return res.status(409).json({
        success: false,
        message: 'Your renewal UTR is already submitted and waiting for host verification.',
      });
    }
    if (!extState.eligible) {
      return res.status(400).json({
        success: false,
        message: 'Extend validity window is not currently open for this booking.',
      });
    }

    const normalizedRef = String(transactionRef || '').replace(/\D/g, '').trim();
    if (!/^\d{12}$/.test(normalizedRef)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 12-digit numeric UPI UTR reference.',
      });
    }

    const stay = await Stay.findById(booking.stayId).lean();
    if (!stay) {
      return res.status(404).json({ success: false, message: 'Property listing not found.' });
    }

    const targetRoomNumber = String(requestedRoomNumber || booking.roomNumber || '').trim();
    const {
      roomType,
      roomFound,
      exactAmount,
    } = computeExtensionRoomAmount(stay, targetRoomNumber, booking.personCount, booking.totalAmount);

    if (Array.isArray(stay.rooms) && stay.rooms.length > 0 && !roomFound) {
      return res.status(400).json({
        success: false,
        message: `Room '${targetRoomNumber}' does not exist in this property.`,
      });
    }

    const period = computeNextExtensionPeriod(booking, 1);

    let releaseLock;
    try {
      releaseLock = await acquireRoomLock(stay._id, targetRoomNumber);
    } catch (lErr) {
      return res.status(409).json({
        success: false,
        message: lErr.message || `Room ${targetRoomNumber} is busy. Please retry.`,
      });
    }

    try {
      // Check room availability for the target month inside lock
      const stayBookings = await Booking.find({
        stayId: stay._id,
        $or: [
          { status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] } },
          { 'activeExtension.status': 'PENDING_VERIFICATION' },
        ],
      })
        .select('_id roomNumber status bookedMonths checkIn checkOut personCount activeExtension')
        .lean();

      const safePersons = Math.max(1, Number(booking.personCount) || 1);
      const occupancy = getRoomOccupancyForTargetMonth(
        stay,
        targetRoomNumber,
        period.targetMonthKey,
        stayBookings,
        booking._id
      );
      if (occupancy.availableSeats < safePersons) {
        return res.status(409).json({
          success: false,
          message: `Room ${targetRoomNumber} is already full for ${period.targetMonthLabel}. Please select another available room.`,
        });
      }

      // Enforce global UTR uniqueness across Payment ledger and Bookings (including paymentHistory & extensions)
      const [dupPayment, dupBooking] = await Promise.all([
        Payment.findOne({ transactionRef: normalizedRef }).select('_id').lean(),
        Booking.findOne({
          $or: [
            { 'upiPayment.transactionRef': normalizedRef, 'upiPayment.verificationStatus': { $in: ['PENDING_VERIFICATION', 'VERIFIED'] } },
            { 'paymentHistory.transactionRef': normalizedRef },
            { 'activeExtension.transactionRef': normalizedRef, 'activeExtension.status': 'PENDING_VERIFICATION' },
          ],
        })
          .select('_id')
          .lean(),
      ]);

      if (dupPayment || dupBooking) {
        return res.status(409).json({
          success: false,
          message: 'This 12-digit UTR has already been used for another payment. Please check your UPI transaction reference.',
        });
      }

      const now = new Date();
      const prevSubCount = Number(booking.activeExtension?.submissionCount || 0);

      booking.activeExtension = {
        status: 'PENDING_VERIFICATION',
        targetMonths: period.targetMonths,
        targetMonthLabel: period.targetMonthLabel,
        targetRoomNumber,
        targetRoomType: roomType || booking.roomType || 'Standard',
        targetCheckIn: period.targetCheckIn,
        targetCheckOut: period.targetCheckOut,
        amount: exactAmount,
        transactionRef: normalizedRef,
        rejectionReason: '',
        submittedAt: now,
        requestedAt: booking.activeExtension?.requestedAt || now,
        submissionCount: prevSubCount + 1,
      };

      booking.auditLog.push({
        action: 'EXTENSION_REFERENCE_SUBMITTED',
        performedBy: req.user?._id || null,
        performerRole: 'guest',
        timestamp: now,
        details: {
          transactionRef: normalizedRef,
          targetMonths: period.targetMonths,
          targetMonthLabel: period.targetMonthLabel,
          targetRoomNumber,
          amount: exactAmount,
        },
        note: `Guest submitted Extend Validity UTR (${normalizedRef}) for ${period.targetMonthLabel}`,
      });

      await booking.save();

      // Alert Host via Email & WebSockets
      try {
        const hostDoc = await Host.findById(booking.hostId).select('name email').lean();
        if (hostDoc?.email) {
          const clientBaseUrl = getPublicClientBaseUrl(req);
          sendPaymentSubmittedToHostEmail({
            hostEmail: hostDoc.email,
            hostName: hostDoc.name || 'Host Partner',
            guestName: booking.fullName,
            roomCategory: roomType || booking.roomType || 'Standard',
            roomType: roomType || booking.roomType || 'Standard',
            roomNumber: targetRoomNumber,
            durationDisplay: period.targetMonthLabel,
            rateUnit: '/month',
            bookedMonths: period.targetMonths,
            checkIn: period.targetCheckIn,
            checkOut: period.targetCheckOut,
            amount: exactAmount,
            transactionRef: normalizedRef,
            bookingId: booking._id,
            dashboardUrl: `${clientBaseUrl}/host-dashboard?tab=visited`,
            isExtension: true,
            targetMonthLabel: period.targetMonthLabel,
          }).catch((err) => console.warn('[Email Warning] Host extension alert:', err.message));
        }
      } catch (emailErr) {
        console.warn('[Email Warning] Host extension alert lookup:', emailErr.message);
      }

      emitToHost([booking.hostId], 'payment:submitted', {
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        transactionRef: normalizedRef,
        guestName: booking.fullName,
        amount: exactAmount,
        stayTitle: booking.stayTitle,
        roomNumber: targetRoomNumber,
        verificationStatus: 'PENDING_VERIFICATION',
        isExtension: true,
      });
      emitToHost([booking.hostId], 'booking:updated', {
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        isExtension: true,
        booking,
      });
      emitToUser([booking.userId, booking.email], 'payment:status_updated', {
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        verificationStatus: 'PENDING_VERIFICATION',
        transactionRef: normalizedRef,
        isExtension: true,
        booking,
      });
      emitToGlobal('stay:availability_changed', {
        stayId: booking.stayId,
        roomNumber: targetRoomNumber,
      });

      return res.json({
        success: true,
        message: `Renewal UTR submitted for ${period.targetMonthLabel}! The host will verify it shortly.`,
        booking,
        targetMonthLabel: period.targetMonthLabel,
        amount: exactAmount,
      });
    } finally {
      if (releaseLock) releaseLock();
    }
  } catch (error) {
    console.error('Submit Booking Extension Error:', error);
    return next(error);
  }
};