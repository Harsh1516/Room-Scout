import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { User } from '../models/User.js';

// Automatic Room Inventory Adjuster on Check-in / Confirmation / Check-out
async function adjustAvailableRooms(hostEmail, stayId, delta) {
  const cleanEmail = (hostEmail || '').toLowerCase().trim();

  try {
    if (cleanEmail) {
      const host = await Host.findOne({ email: cleanEmail });
      if (host) {
        const maxTotal = host.totalRooms || 1;
        let newRooms = (host.availableRooms !== undefined ? host.availableRooms : maxTotal) + delta;
        newRooms = Math.max(0, Math.min(maxTotal, newRooms));
        host.availableRooms = newRooms;
        await host.save();
      }
    }

    if (stayId && mongoose.Types.ObjectId.isValid(stayId)) {
      const stay = await Stay.findById(stayId);
      if (stay) {
        const maxTotal = stay.totalRooms || 1;
        let newRooms = (stay.availableRooms !== undefined ? stay.availableRooms : maxTotal) + delta;
        newRooms = Math.max(0, Math.min(maxTotal, newRooms));
        stay.availableRooms = newRooms;
        await stay.save();
      }
    } else if (cleanEmail) {
      const stay = await Stay.findOne({ hostEmail: cleanEmail });
      if (stay) {
        const maxTotal = stay.totalRooms || 1;
        let newRooms = (stay.availableRooms !== undefined ? stay.availableRooms : maxTotal) + delta;
        newRooms = Math.max(0, Math.min(maxTotal, newRooms));
        stay.availableRooms = newRooms;
        await stay.save();
      }
    }
  } catch (err) {
    console.warn('adjustAvailableRooms mongo error:', err.message);
  }
}

// @desc    Create a new stay reservation for the authenticated user
// @route   POST /api/bookings
// @access  Private (Protected by JWT)
export const createBooking = async (req, res, next) => {
  try {
    const {
      stayId,
      stayTitle,
      hostEmail,
      hostId,
      location,
      fullName,
      phone,
      guestGender,
      gender,
      moveInDate,
      durationMonths,
      durationDays,
      durationDisplay,
      sharingType,
      totalAmount,
      roomNumber,
      roomType,
      checkIn,
      checkOut,
      checkInISO,
      checkOutISO,
      bookedDates,
      bookedMonths,
      rateUnit,
      guestName,
      userName,
      guestPhone,
      userPhone,
      email,
      userEmail,
      guestEmail,
      adults,
      children,
      guestAadhar,
      aadharId,
      aadhar,
      aadharNumber,
      status: clientStatus,
      paymentMethod: clientPaymentMethod,
      paymentStatus: clientPaymentStatus,
      paymentDetails: clientPaymentDetails,
      bookingReferenceId: clientRef,
      bookingId,
    } = req.body;

    const resolvedTitle = stayTitle || 'Stay Property';
    const resolvedFullName = (fullName || guestName || userName || '').trim();
    const cleanDigitsPhone = (phone || userPhone || guestPhone || '').replace(/\D/g, '').slice(-10);
    const resolvedPhone = cleanDigitsPhone ? cleanDigitsPhone : (phone || userPhone || guestPhone || '').trim();
    let resolvedEmail = (email || userEmail || guestEmail || '').trim().toLowerCase();

    // Canonical Aadhaar normalization
    const rawAadhar = aadharNumber || guestAadhar || aadharId || aadhar || '';
    const cleanAadharDigits = String(rawAadhar).replace(/\D/g, '').slice(0, 12);
    const resolvedAadhar = cleanAadharDigits.length === 12
      ? cleanAadharDigits.replace(/(\d{4})(?=\d)/g, '$1 ')
      : String(rawAadhar).trim();

    if (!resolvedFullName) {
      return res.status(400).json({ message: 'User / Guest name is required to book.' });
    }
    if (!/^[a-zA-Z\s]{2,50}$/.test(resolvedFullName)) {
      return res.status(400).json({ message: 'Guest name must contain text/letters only (no numbers or special characters).' });
    }
    if (!resolvedPhone && !resolvedEmail) {
      return res.status(400).json({ message: 'A 10-digit mobile number is required to book.' });
    }
    if (resolvedPhone && resolvedPhone.length !== 10) {
      return res.status(400).json({ message: 'Mobile number must be a valid 10-digit number.' });
    }

    // Unique Mobile Number Check
    if (resolvedPhone && roomNumber) {
      const existingBookings = await Booking.find({
        phone: resolvedPhone,
        stay: mongoose.Types.ObjectId.isValid(stayId) ? stayId : undefined,
        roomNumber: roomNumber,
        status: { $nin: ['CANCELLED', 'REJECTED'] },
      });
      if (existingBookings.length > 0) {
        return res.status(400).json({
          message: `A reservation with mobile number ${resolvedPhone} already exists for this room.`,
        });
      }
    }

    if (!resolvedEmail && resolvedPhone) {
      resolvedEmail = `${resolvedFullName.toLowerCase().replace(/\s+/g, '')}${resolvedPhone.slice(-4)}@stayhub.local`;
    }

    // Determine target user id
    let targetUserId = req.user?._id || req.user?.id || null;
    let targetUserEmail = (resolvedEmail || req.user?.email || '').toLowerCase().trim();

    const userQueryOr = [];
    if (resolvedPhone) userQueryOr.push({ phone: resolvedPhone });
    if (resolvedEmail) userQueryOr.push({ email: resolvedEmail });

    let matchedUser = null;
    if (userQueryOr.length > 0) {
      matchedUser = await User.findOne({ $or: userQueryOr });
    }

    if (matchedUser) {
      targetUserId = matchedUser._id;
      targetUserEmail = matchedUser.email || resolvedEmail;
    } else if (resolvedPhone) {
      const initials = resolvedFullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'GU';

      const salt = await bcrypt.genSalt(10);
      const randomSecret = Math.random().toString(36).slice(-8) + 'A1!';
      const autoHashedPassword = await bcrypt.hash(randomSecret, salt);

      matchedUser = await User.create({
        name: resolvedFullName,
        email: resolvedEmail,
        phone: resolvedPhone,
        password: autoHashedPassword,
        avatar: initials,
        role: 'user',
        status: 'Active',
      });
      targetUserId = matchedUser._id;
      targetUserEmail = resolvedEmail;
    }

    const bookingReferenceId = clientRef || bookingId || ('BK-' + Math.floor(100000 + Math.random() * 900000));
    const calculatedDuration = durationDisplay || (durationMonths ? `${durationMonths} Months` : '1 Month');

    // Parse clean BSON dates
    const resolvedCheckIn = checkIn ? new Date(checkIn) : (checkInISO ? new Date(checkInISO) : (moveInDate ? new Date(moveInDate) : new Date()));
    const resolvedCheckOut = checkOut ? new Date(checkOut) : (checkOutISO ? new Date(checkOutISO) : undefined);

    // Option A: Single canonical payload with zero field aliasing
    const bookingPayload = {
      user: targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : undefined,
      userId: targetUserId ? targetUserId.toString() : '',
      hostId: hostId || (req.user?.role === 'host' ? req.user?._id?.toString() : ''),
      hostEmail: hostEmail ? hostEmail.toLowerCase().trim() : (req.user?.role === 'host' ? req.user?.email?.toLowerCase().trim() : ''),
      stay: stayId && mongoose.Types.ObjectId.isValid(stayId) ? stayId : undefined,
      stayTitle: resolvedTitle,
      location: location || 'Nainital, Uttarakhand',
      fullName: resolvedFullName,
      email: targetUserEmail,
      phone: resolvedPhone,
      gender: gender || guestGender || 'Male',
      aadharNumber: resolvedAadhar,
      roomNumber: roomNumber || '',
      roomType: roomType || sharingType || 'Room',
      rateUnit: rateUnit || '/month',
      moveInDate: moveInDate || checkInISO || checkIn || new Date().toISOString().split('T')[0],
      checkIn: resolvedCheckIn,
      checkOut: resolvedCheckOut,
      durationMonths: Number(durationMonths) || 1,
      durationDays: Number(durationDays) || 0,
      durationDisplay: calculatedDuration,
      bookedDates: Array.isArray(bookedDates) ? bookedDates : [],
      bookedMonths: Array.isArray(bookedMonths) ? bookedMonths : [],
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      totalAmount: Number(totalAmount) || 0,
      bookingReferenceId,
      slotBookingId: req.body.slotBookingId || '',
      bookingSource: req.body.bookingSource || 'ONLINE',
      status: clientStatus || 'CONFIRMED',
      paymentMethod: clientPaymentMethod || (req.body.bookingSource === 'OFFLINE_HOST' ? 'OFFLINE' : 'PAY_ON_ARRIVAL'),
      paymentStatus: clientPaymentStatus || (req.body.bookingSource === 'OFFLINE_HOST' ? 'PAID' : (clientPaymentMethod === 'RAZORPAY' ? 'PAID' : 'PENDING')),
      paymentDetails: clientPaymentDetails || {
        gateway: clientPaymentMethod === 'RAZORPAY' ? 'Razorpay' : 'Offline / Pay at Property',
        paymentId: '',
        orderId: '',
        signature: '',
      },
    };

    const createdMongo = await Booking.create(bookingPayload);

    // Link booking to User
    if (createdMongo && (targetUserEmail || targetUserId)) {
      const uConditions = [];
      if (targetUserEmail) uConditions.push({ email: targetUserEmail.toLowerCase() });
      if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
        uConditions.push({ _id: new mongoose.Types.ObjectId(targetUserId) });
      }
      if (uConditions.length > 0) {
        await User.updateOne(
          { $or: uConditions },
          { $addToSet: { bookedPlaces: createdMongo._id } }
        ).catch(() => {});
      }
    }

    // Option A: Update room status in Stay and Host directly (NO slotBookings array bloat)
    if (roomNumber && (createdMongo.status === 'CONFIRMED' || createdMongo.status === 'APPROVED')) {
      if (stayId && mongoose.Types.ObjectId.isValid(stayId)) {
        await Stay.updateOne(
          { _id: stayId, 'rooms.roomNumber': roomNumber },
          { $set: { 'rooms.$.status': 'Occupied' } }
        ).catch(() => {});
      }
      if (hostEmail) {
        await Host.updateOne(
          { email: hostEmail.toLowerCase().trim(), 'rooms.roomNumber': roomNumber },
          { $set: { 'rooms.$.status': 'Occupied' } }
        ).catch(() => {});
      }
      await adjustAvailableRooms(createdMongo.hostEmail, stayId, -1);
    }

    return res.status(201).json(createdMongo);
  } catch (error) {
    console.error('Booking Creation Error:', error);
    return next(error);
  }
};

// @desc    Get all bookings for a specific host (Direct from Booking collection)
// @route   GET /api/bookings/host-bookings
// @access  Private (Host)
export const getHostBookings = async (req, res, next) => {
  try {
    const hostIdentifier = req.user?._id?.toString() || req.user?.id;
    const hostEmail = (req.user?.email || '').toLowerCase().trim();

    const queryOr = [];
    if (hostIdentifier) queryOr.push({ hostId: hostIdentifier });
    if (hostEmail) queryOr.push({ hostEmail });

    if (queryOr.length === 0) {
      return res.json([]);
    }

    const bookings = await Booking.find({
      $or: queryOr,
      status: { $ne: 'CANCELLED' },
    })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = bookings.map((b) => ({
      ...b,
      id: b._id?.toString() || b.id,
      _id: b._id?.toString() || b.id,
    }));

    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
};

// @desc    Update booking status (Check-in, Check-out, Confirmed, Cancelled) & Auto-Adjust Room Count
// @route   PATCH /api/bookings/:id/status
// @access  Public / Host / Admin
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      hostEmail,
      fullName,
      userName,
      guestName,
      phone,
      userPhone,
      guestPhone,
      email,
      userEmail,
      guestEmail,
      guestAadhar,
      aadharId,
      aadhar,
      aadharNumber,
      adults,
      children,
      gender,
      guestGender,
    } = req.body;

    const newName = fullName || userName || guestName;
    const newPhone = phone || userPhone || guestPhone;
    const newEmail = email || userEmail || guestEmail;
    const rawAadhar = aadharNumber || guestAadhar || aadharId || aadhar;
    const cleanAadharDigits = rawAadhar ? String(rawAadhar).replace(/\D/g, '').slice(0, 12) : '';
    const formattedAadhar = cleanAadharDigits.length === 12
      ? cleanAadharDigits.replace(/(\d{4})(?=\d)/g, '$1 ')
      : (rawAadhar ? String(rawAadhar).trim() : '');

    const orConds = [{ bookingReferenceId: id }, { slotBookingId: id }, { id: id }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      orConds.unshift({ _id: new mongoose.Types.ObjectId(id) });
    }

    const b = await Booking.findOne({ $or: orConds });
    if (!b) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const oldStatus = b.status || 'CONFIRMED';
    const targetHostEmail = hostEmail || b.hostEmail || '';
    const targetStayId = b.stay || '';

    if (status) b.status = status.toUpperCase();
    if (newName) b.fullName = newName.trim();
    if (newPhone) b.phone = newPhone.replace(/\D/g, '').slice(-10);
    if (newEmail) b.email = newEmail.toLowerCase().trim();
    if (rawAadhar !== undefined) b.aadharNumber = formattedAadhar;
    if (adults !== undefined) b.adults = Number(adults) || 1;
    if (children !== undefined) b.children = Number(children) || 0;
    if (gender || guestGender) b.gender = gender || guestGender;

    await b.save();

    const newStatus = status ? status.toUpperCase() : oldStatus;
    const wasActive = oldStatus === 'CONFIRMED' || oldStatus === 'CHECKED_IN';
    const nowActive = newStatus === 'CONFIRMED' || newStatus === 'CHECKED_IN';

    if (!wasActive && nowActive) {
      await adjustAvailableRooms(targetHostEmail, targetStayId, -1);
    } else if (wasActive && !nowActive) {
      await adjustAvailableRooms(targetHostEmail, targetStayId, 1);
      // Release room status
      if (b.roomNumber) {
        if (targetStayId && mongoose.Types.ObjectId.isValid(targetStayId)) {
          await Stay.updateOne(
            { _id: targetStayId, 'rooms.roomNumber': b.roomNumber },
            { $set: { 'rooms.$.status': 'Available' } }
          ).catch(() => {});
        }
        if (targetHostEmail) {
          await Host.updateOne(
            { email: targetHostEmail, 'rooms.roomNumber': b.roomNumber },
            { $set: { 'rooms.$.status': 'Available' } }
          ).catch(() => {});
        }
      }
    }

    return res.json({
      success: true,
      message: `Booking status updated to ${newStatus}`,
      booking: b,
    });
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    return next(error);
  }
};

// @desc    Get user's personal reservations (Isolated per User)
// @route   GET /api/bookings/my-bookings
// @access  Private (Protected by JWT)
export const getMyBookings = async (req, res, next) => {
  try {
    const currentUserId = (req.user?._id || req.user?.id || '')?.toString();
    const currentUserEmail = (req.user?.email || '').toLowerCase().trim();

    if (!currentUserId && !currentUserEmail) {
      return res.json([]);
    }

    const conditions = [];
    if (currentUserId) {
      conditions.push({ userId: currentUserId });
      if (mongoose.Types.ObjectId.isValid(currentUserId)) {
        conditions.push({ user: new mongoose.Types.ObjectId(currentUserId) });
      }
    }
    if (currentUserEmail) {
      const emailRegex = new RegExp(`^${currentUserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      conditions.push({ email: emailRegex });
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    const mongoBookings = await Booking.find({ $or: conditions }).sort({ createdAt: -1 }).lean();

    const mapped = mongoBookings.map((b) => ({
      ...b,
      id: b._id?.toString() || b.id,
      _id: b._id?.toString() || b.id,
    }));

    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all active bookings for a specific stay to compute real-time room availability
// @route   GET /api/bookings/stay/:stayId
// @access  Public
export const getBookingsByStay = async (req, res, next) => {
  try {
    const { stayId } = req.params;

    const orConditions = [];
    if (mongoose.Types.ObjectId.isValid(stayId)) {
      orConditions.push({ stay: new mongoose.Types.ObjectId(stayId) });
      const host = await Host.findById(stayId);
      if (host && host.email) {
        orConditions.push({ hostEmail: host.email.toLowerCase() });
      }
    } else {
      orConditions.push({ hostEmail: stayId.toLowerCase() });
    }

    const mongoBookings = await Booking.find({
      $or: orConditions,
      status: { $nin: ['REJECTED', 'CANCELLED', 'Rejected', 'Cancelled'] },
    }).lean();

    const mapped = mongoBookings.map((b) => ({
      ...b,
      id: b._id?.toString() || b.id,
      _id: b._id?.toString() || b.id,
    }));

    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove an occupant from a property and release the room back to available inventory
// @route   POST /api/bookings/occupant/remove
// @access  Public / Host
export const removeOccupantBooking = async (req, res, next) => {
  try {
    const {
      hostEmail,
      roomNumber,
      occupantId,
      slotBookingId,
      bookingReferenceId,
      phone,
      guestPhone,
    } = req.body;

    const cleanEmail = (hostEmail || '').toLowerCase().trim();
    const cleanPhone = (phone || guestPhone || '').replace(/\D/g, '').slice(-10);

    // 1. Delete from Booking collection
    const bookingOrConditions = [];
    if (occupantId && mongoose.Types.ObjectId.isValid(occupantId)) {
      bookingOrConditions.push({ _id: new mongoose.Types.ObjectId(occupantId) });
    }
    if (occupantId) {
      bookingOrConditions.push({ bookingReferenceId: occupantId }, { slotBookingId: occupantId });
    }
    if (slotBookingId) {
      bookingOrConditions.push({ slotBookingId });
    }
    if (bookingReferenceId) {
      bookingOrConditions.push({ bookingReferenceId });
    }
    if (cleanPhone && cleanEmail) {
      bookingOrConditions.push({ phone: cleanPhone, hostEmail: cleanEmail });
    }

    if (bookingOrConditions.length > 0) {
      await Booking.deleteMany({ $or: bookingOrConditions });
    }

    // 2. Release room inventory status back to 'Available' in Stay and Host collections
    if (roomNumber) {
      if (cleanEmail) {
        await Host.updateOne(
          { email: cleanEmail, 'rooms.roomNumber': roomNumber },
          { $set: { 'rooms.$.status': 'Available' } }
        ).catch(() => {});
        await Stay.updateOne(
          { hostEmail: cleanEmail, 'rooms.roomNumber': roomNumber },
          { $set: { 'rooms.$.status': 'Available' } }
        ).catch(() => {});
      }
      await adjustAvailableRooms(cleanEmail, null, 1);
    }

    return res.json({
      success: true,
      message: 'Occupant booking removed and room set to Available.',
    });
  } catch (error) {
    console.error('Remove Occupant Controller Error:', error);
    return next(error);
  }
};

// @desc    Directly delete a booking by ID
// @route   DELETE /api/bookings/:id
// @access  Public / Host / Admin
export const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Booking.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Booking.findOneAndDelete({
        $or: [{ bookingReferenceId: id }, { slotBookingId: id }],
      });
    }

    if (deleted && deleted._id) {
      await User.updateMany(
        { bookedPlaces: deleted._id },
        { $pull: { bookedPlaces: deleted._id } }
      ).catch(() => {});

      if (deleted.roomNumber) {
        await adjustAvailableRooms(deleted.hostEmail, deleted.stay, 1);
      }
    }

    return res.json({
      success: true,
      message: 'Booking deleted from database successfully.',
      booking: deleted,
    });
  } catch (error) {
    console.error('Delete Booking Error:', error);
    return next(error);
  }
};