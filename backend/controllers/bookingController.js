import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Payment } from '../models/Payment.js';
import { actorId, assertSelfHostOrAdmin, idsMatch, isAdminUser } from '../middleware/authMiddleware.js';

const BOOKING_STATUS_ENUM = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
];

const NON_BLOCKING_STATUSES = ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'EXPIRED'];

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
  const query = {
    stayId,
    roomNumber: String(roomNumber).trim(),
    status: { $nin: NON_BLOCKING_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    query._id = { $ne: excludeId };
  }
  return Booking.findOne(query).select('_id bookingReferenceId checkIn checkOut fullName').lean();
}

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
  checkIn,
  checkOut,
}) => {
  const isMonthly = String(rateUnit || '').toLowerCase().includes('month');
  const cleanDates = Array.isArray(bookedDates) ? [...bookedDates].filter(Boolean).sort() : [];

  let startDate;
  let endDate;

  if (isMonthly) {
    let startY, startM, endY, endM;

    if (cleanDates.length > 0) {
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

    // 1st of month at 12:00:00 AM UTC
    startDate = new Date(Date.UTC(startY, startM - 1, 1, 0, 0, 0));
    // Last day of month at 11:59:59 PM UTC (Day 0 of month endM gives the last day of month endM - 1)
    endDate = new Date(Date.UTC(endY, endM, 0, 23, 59, 59));

    // Dynamic Duration Calculation from Canonical Timestamps
    const durationMonths = Math.max(
      1,
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1
    );
    const durationDays = 0;
    const durationDisplay = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;

    return { startDate, endDate, durationMonths, durationDays, durationDisplay, cleanDates };
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
      bookedDates: body.bookedDates || body.bookedMonths,
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
        message: `Room ${roomNumber} is already reserved for those dates.`,
        conflictingBookingId: overlap.bookingReferenceId,
      });
    }

    const paymentMethodRaw = String(body.paymentMethod || 'ONLINE').toUpperCase();
    const isPayOnArrival = paymentMethodRaw === 'PAY_ON_ARRIVAL' || paymentMethodRaw === 'OFFLINE' || paymentMethodRaw === 'CASH';

    let finalAmount = Number(body.totalAmount) || 0;
    if (finalAmount <= 0) {
      const isMonthly = rateUnit.includes('month');
      const unitCount = isMonthly ? (timings.durationMonths || 1) : (timings.durationDays || 1);
      const targetRoom = (stay.rooms || []).find((r) => String(r.roomNumber).trim() === roomNumber);
      const rawPrice = targetRoom?.price || stay.price || 0;
      const numPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      finalAmount = numPrice * unitCount;
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
      gender: body.gender || body.guestGender || 'Male',
      aadharNumber: resolveAadhar(body),
      roomNumber,
      roomType: body.roomType || 'Standard',
      rateUnit: rateUnit.includes('month') ? '/month' : '/night',
      checkIn,
      checkOut,
      durationDisplay: timings.durationDisplay || body.durationDisplay || '',
      adults: Number(body.adults) || 1,
      children: Number(body.children) || 0,
      totalAmount: finalAmount,
      taxBreakdown: body.taxBreakdown || {},
      bookingReferenceId:
        body.bookingReferenceId || `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`,
      slotBookingId: body.slotBookingId || '',
      bookingSource: 'ONLINE',
      status: 'PENDING',
      paymentStatus: isPayOnArrival ? 'PENDING' : 'UNPAID',
      paymentMethod: isPayOnArrival ? 'PAY_ON_ARRIVAL' : paymentMethodRaw === 'RAZORPAY' ? 'RAZORPAY' : 'ONLINE',
    });

    await Payment.create({
      bookingId: newBooking._id,
      bookingReferenceId: newBooking.bookingReferenceId,
      stayId: newBooking.stayId,
      hostId: newBooking.hostId,
      userId: newBooking.userId || null,
      amount: newBooking.totalAmount,
      paymentMethod: newBooking.paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : isPayOnArrival ? 'OFFLINE' : 'ONLINE',
      paymentStatus: 'PENDING',
      transactionId: `TXN-PEND-${newBooking._id.toString().slice(-8)}`,
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
      guestName,
      fullName,
      phone,
      guestPhone,
      email,
      guestEmail,
      aadhar,
      guestAadhar,
      adults,
      children,
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
    const rateUnitStr = String(targetRoom?.rateUnit || stay.rateUnit || '/month').toLowerCase();
    const isMonthlyRoom = rateUnitStr.includes('month');

    // Strict UTC Boundary Calculations
    const firstVal = cleanDates[0];
    const lastVal = cleanDates[cleanDates.length - 1];

    let startDate;
    let endDate;
    let durationMonths = 0;
    let durationDays = 0;
    let durationDisplay = '';

    if (isMonthlyRoom || firstVal.length === 7) {
      const [startY, startM] = firstVal.split('-').map(Number);
      startDate = new Date(Date.UTC(startY, startM - 1, 1, 0, 0, 0));

      const [endY, endM] = lastVal.split('-').map(Number);
      endDate = new Date(Date.UTC(endY, endM, 0, 23, 59, 59));

      durationMonths = Math.max(
        1,
        (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
        (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1
      );
      durationDays = 0;
      durationDisplay = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;
    } else {
      const [startY, startM, startD] = firstVal.split('-').map(Number);
      startDate = new Date(Date.UTC(startY, startM - 1, startD, 12, 0, 0));

      const [endY, endM, endD] = lastVal.split('-').map(Number);
      endDate = new Date(Date.UTC(endY, endM - 1, endD + 1, 11, 59, 0));

      durationMonths = 0;
      durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      durationDisplay = `${durationDays} Night${durationDays > 1 ? 's' : ''}`;
    }

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
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      gender: gender || 'Male',
      checkIn: startDate,
      checkOut: endDate,
      durationDisplay,
      totalAmount: Number(totalAmount) || 0,
      bookingReferenceId: refId,
      slotBookingId: refId,
      status: 'CONFIRMED',
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
      status: { $nin: ['CANCELLED', 'REJECTED', 'CHECKED_OUT'] },
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
    const hostIdentifier = req.query.hostId || req.user?.id || req.user?._id;
    const hostEmail = (req.query.email || req.user?.email || '').toLowerCase().trim();

    let hostId = null;
    if (hostIdentifier && mongoose.Types.ObjectId.isValid(hostIdentifier)) {
      hostId = hostIdentifier;
    } else if (hostEmail) {
      const host = await Host.findOne({ email: hostEmail }).select('_id').lean();
      if (host) hostId = host._id;
    }

    if (!hostId) {
      return res.json({ success: true, count: 0, bookings: [], guests: [] });
    }

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
    const userId = req.user?.id || req.user?._id;
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : '';

    const query = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.push({ userId });
    if (userEmail) query.push({ email: userEmail });

    if (query.length === 0) {
      return res.json({ success: true, count: 0, bookings: [] });
    }

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
    const updateFields = {};

    const allowedFields = [
      'status',
      'totalAmount',
      'fullName',
      'phone',
      'email',
      'aadharNumber',
      'adults',
      'children',
      'gender',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    if (req.body.guestName) updateFields.fullName = req.body.guestName;
    if (req.body.guestPhone) updateFields.phone = req.body.guestPhone;
    if (req.body.guestEmail) updateFields.email = req.body.guestEmail;
    if (req.body.guestAadhar || req.body.aadhar) {
      updateFields.aadharNumber = req.body.guestAadhar || req.body.aadhar;
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { bookingReferenceId: id }, { slotBookingId: id }] }
      : { $or: [{ bookingReferenceId: id }, { slotBookingId: id }] };

    const updatedBooking = await Booking.findOneAndUpdate(query, { $set: updateFields }, { new: true });

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
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

// @desc    Mark occupant as checked out
// @route   POST /api/bookings/occupant/checkout
// @access  Private / Host
export const checkoutOccupant = async (req, res, next) => {
  try {
    const { occupantId, slotBookingId, bookingReferenceId } = req.body;

    const queryOr = [];
    if (occupantId && mongoose.Types.ObjectId.isValid(occupantId)) queryOr.push({ _id: occupantId });
    if (occupantId) queryOr.push({ bookingReferenceId: occupantId }, { slotBookingId: occupantId });
    if (slotBookingId) queryOr.push({ slotBookingId });
    if (bookingReferenceId) queryOr.push({ bookingReferenceId });

    if (queryOr.length === 0) {
      return res.status(400).json({ success: false, message: 'No identifier provided for checkout.' });
    }

    const updated = await Booking.findOneAndUpdate(
      { $or: queryOr },
      { $set: { status: 'CHECKED_OUT' } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.json({
      success: true,
      message: 'Occupant status marked as CHECKED_OUT.',
      booking: updated,
    });
  } catch (error) {
    console.error('Checkout occupant error:', error);
    return next(error);
  }
};

// @desc    Cascade delete all bookings for a deleted room
// @route   POST /api/bookings/room/cascade-delete
// @access  Private / Host
export const cascadeDeleteRoomBookings = async (req, res, next) => {
  try {
    const { stayId, roomNumber } = req.body;

    if (!stayId || !roomNumber) {
      return res.status(400).json({ success: false, message: 'stayId and roomNumber are required.' });
    }

    const result = await Booking.deleteMany({
      stayId,
      roomNumber: String(roomNumber).trim(),
    });

    return res.json({
      success: true,
      message: `Cascade deleted ${result.deletedCount} booking(s) for Room ${roomNumber}.`,
      deletedCount: result.deletedCount,
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
    const userId = req.user?.id || req.user?._id;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const isHost = req.user?.role === 'host' || Boolean(req.user?.isHost) || Boolean(req.hostAccount);
    const isAdmin = req.user?.role === 'admin' || Boolean(req.user?.isAdmin) || Boolean(req.isAdminKey);

    const queryOr = [];
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryOr.push({ _id: id });
    }
    queryOr.push({ bookingReferenceId: id }, { slotBookingId: id });

    // Phone / reference fallback
    const cleanDigits = String(id).replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10) {
      queryOr.push({ phone: { $regex: cleanDigits + '$' } });
    }

    const booking = await Booking.findOne({ $or: queryOr });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const bookingUserEmail = (booking.email || '').toLowerCase().trim();
    const isOwner =
      Boolean(userId && booking.userId && String(booking.userId) === String(userId)) ||
      Boolean(userEmail && bookingUserEmail && bookingUserEmail === userEmail);

    let isPropertyHost =
      Boolean(isHost && userId && booking.hostId && String(booking.hostId) === String(userId));

    if (!isPropertyHost && (isHost || isAdmin || userEmail)) {
      isPropertyHost = true;
    }

    if (!isAdmin && !isOwner && !isPropertyHost) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this booking.' });
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

    const bookings = await Booking.find({
      stayId,
      status: { $nin: ['CANCELLED', 'REJECTED', 'CHECKED_OUT', 'EXPIRED'] },
    })
      .select('roomNumber roomType checkIn checkOut status fullName durationDisplay rateUnit userId phone email')
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
          const endM = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), 1));
          while (currM <= endM) {
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