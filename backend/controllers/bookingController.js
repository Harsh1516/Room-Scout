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

    const rawAadhar = guestAadhar || aadharId || '';
    const cleanAadharDigits = String(rawAadhar).replace(/\D/g, '').slice(0, 12);
    const resolvedAadhar = cleanAadharDigits.length === 12
      ? cleanAadharDigits.replace(/(\d{4})(?=\d)/g, '$1 ')
      : String(rawAadhar).trim();

    if (!resolvedFullName) {
      return res.status(400).json({ message: 'User / Guest name is required to book.' });
    }
    // Ensure name field contains text only (letters and spaces)
    if (!/^[a-zA-Z\s]{2,50}$/.test(resolvedFullName)) {
      return res.status(400).json({ message: 'Guest name must contain text/letters only (no numbers or special characters).' });
    }
    if (!resolvedPhone && !resolvedEmail) {
      return res.status(400).json({ message: 'A 10-digit mobile number is required to book.' });
    }
    if (resolvedPhone && resolvedPhone.length !== 10) {
      return res.status(400).json({ message: 'Mobile number must be a valid 10-digit number.' });
    }

    // 🔒 Unique Mobile Number Enforcement: Each booking must be uniquely identified by mobile number
    if (resolvedPhone && roomNumber) {
      const existingBookings = await Booking.find({
        $or: [{ phone: resolvedPhone }, { userPhone: resolvedPhone }, { guestPhone: resolvedPhone }],
        stayId: stayId,
        roomNumber: roomNumber,
        status: { $nin: ['CANCELLED', 'REJECTED'] }
      });
      if (existingBookings.length > 0) {
        return res.status(400).json({
          message: `Duplicate Mobile Number: A reservation with mobile number ${resolvedPhone} already exists for this room. Each booking must be uniquely identified by a unique mobile number.`,
        });
      }
    }

    if (!resolvedEmail && resolvedPhone) {
      resolvedEmail = `${resolvedFullName.toLowerCase().replace(/\s+/g, '')}${resolvedPhone.slice(-4)}@stayhub.local`;
    }

    // Determine target user id and ensure unique user record in DB
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
      // Auto-register unique user in DB
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

    const bookingReferenceId = clientRef || bookingId || ('STAY-' + Math.floor(100000 + Math.random() * 900000));
    const calculatedDuration = durationDisplay || (durationMonths ? `${durationMonths} Months` : '1 Month');

    const bookingPayload = {
      user: targetUserId,
      userId: targetUserId,
      userEmail: targetUserEmail,
      email: targetUserEmail,
      guestEmail: targetUserEmail,
      hostId: hostId || (req.user?.role === 'host' ? req.user?._id?.toString() : ''),
      hostEmail: hostEmail ? hostEmail.toLowerCase().trim() : (req.user?.role === 'host' ? req.user?.email?.toLowerCase().trim() : ''),
      stayId: stayId || '',
      stayTitle: resolvedTitle,
      location: location || 'Nainital, Uttarakhand',
      fullName: resolvedFullName,
      phone: resolvedPhone,
      guestGender: guestGender || req.body.gender || 'Male',
      gender: req.body.gender || guestGender || 'Male',
      moveInDate: moveInDate || checkInISO || checkIn || new Date().toISOString().split('T')[0],
      durationMonths: Number(durationMonths) || 1,
      durationDays: Number(durationDays) || 0,
      durationDisplay: calculatedDuration,
      sharingType: sharingType || roomType || 'Room',
      totalAmount: Number(totalAmount) || 0,
      bookingReferenceId,
      slotBookingId: req.body.slotBookingId || '',
      bookingSource: req.body.bookingSource || 'ONLINE',
      roomNumber: roomNumber || '',
      roomType: roomType || '',
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      checkInISO: checkInISO || '',
      checkOutISO: checkOutISO || '',
      bookedDates: Array.isArray(bookedDates) ? bookedDates : [],
      bookedMonths: Array.isArray(bookedMonths) ? bookedMonths : [],
      rateUnit: rateUnit || '/month',
      guestName: guestName || resolvedFullName,
      userName: userName || resolvedFullName,
      guestPhone: guestPhone || resolvedPhone,
      userPhone: userPhone || resolvedPhone,
      guestAadhar: resolvedAadhar,
      aadharId: resolvedAadhar,
      aadhar: resolvedAadhar,
      aadharNumber: resolvedAadhar,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
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

    // 🏛️ Link booking to native User.bookedPlaces
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

    // Automatically decrement available rooms by 1 ONLY upon confirmed booking
    if (createdMongo.status === 'CONFIRMED' || createdMongo.status === 'APPROVED') {
      await adjustAvailableRooms(createdMongo.hostEmail, createdMongo.stayId, -1);
    }

    console.log(`✅ Booking Confirmed in bookings collection [${targetUserEmail || targetUserId}]: ${resolvedTitle} (Room ${roomNumber})`);
    return res.status(201).json(createdMongo);
  } catch (error) {
    console.error('Booking Creation Error:', error);
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

    const newName = userName || fullName || guestName;
    const newPhone = userPhone || phone || guestPhone;
    const newEmail = userEmail || email || guestEmail;
    const rawAadhar = guestAadhar || aadharId || aadhar || aadharNumber;
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
    const targetStayId = b.stayId || '';

    if (status) b.status = status.toUpperCase();
    if (newName) {
      b.fullName = newName;
      b.userName = newName;
      b.guestName = newName;
    }
    if (newPhone) {
      b.phone = newPhone;
      b.userPhone = newPhone;
      b.guestPhone = newPhone;
    }
    if (newEmail) {
      b.email = newEmail;
      b.userEmail = newEmail;
      b.guestEmail = newEmail;
    }
    if (rawAadhar !== undefined) {
      b.guestAadhar = formattedAadhar;
      b.aadharId = formattedAadhar;
      b.aadhar = formattedAadhar;
      b.aadharNumber = formattedAadhar;
    }
    if (adults !== undefined) b.adults = Number(adults) || 1;
    if (children !== undefined) b.children = Number(children) || 0;
    if (gender || guestGender) {
      b.gender = gender || guestGender;
      b.guestGender = guestGender || gender;
    }
    await b.save();

    const newStatus = status ? status.toUpperCase() : oldStatus;
    const wasActive = oldStatus === 'CONFIRMED' || oldStatus === 'CHECKED_IN';
    const nowActive = newStatus === 'CONFIRMED' || newStatus === 'CHECKED_IN';

    if (!wasActive && nowActive) {
      await adjustAvailableRooms(targetHostEmail, targetStayId, -1);
    } else if (wasActive && !nowActive) {
      await adjustAvailableRooms(targetHostEmail, targetStayId, 1);
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
      conditions.push({ user: currentUserId }, { userId: currentUserId });
      if (mongoose.Types.ObjectId.isValid(currentUserId)) {
        conditions.push({ user: new mongoose.Types.ObjectId(currentUserId) });
      }
    }
    if (currentUserEmail) {
      const emailRegex = new RegExp(`^${currentUserEmail.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i');
      conditions.push(
        { userEmail: emailRegex },
        { email: emailRegex },
        { guestEmail: emailRegex }
      );
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    const mongoBookings = await Booking.find({ $or: conditions }).sort({ createdAt: -1 }).lean();
    
    const mapped = mongoBookings.map(b => ({
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
    
    const orConditions = [
      { stayId: stayId }
    ];
    
    if (mongoose.Types.ObjectId.isValid(stayId)) {
      orConditions.push({ stayId: new mongoose.Types.ObjectId(stayId) });
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

    const mapped = mongoBookings.map(b => ({
      ...b,
      id: b._id?.toString() || b.id,
      _id: b._id?.toString() || b.id,
    }));

    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove an occupant from a host's property and completely delete their booking record from the database
// @route   POST /api/bookings/occupant/remove
// @access  Public / Host
export const removeOccupantBooking = async (req, res, next) => {
  try {
    const {
      hostEmail,
      roomNumber,
      roomId,
      occupantId,
      slotBookingId,
      bookingReferenceId,
      phone,
      guestPhone,
      name,
      guestName,
      bookedDates,
      bookedMonths,
    } = req.body;

    const cleanEmail = (hostEmail || '').toLowerCase().trim();
    const cleanPhone = (phone || guestPhone || '').replace(/\D/g, '').slice(-10);
    const cleanRoomNum = (roomNumber || '').replace(/[^0-9]/g, '');

    // 1. Permanently delete from Booking collection
    const bookingOrConditions = [];
    if (occupantId && mongoose.Types.ObjectId.isValid(occupantId)) {
      bookingOrConditions.push({ _id: new mongoose.Types.ObjectId(occupantId) });
    }
    if (occupantId) {
      bookingOrConditions.push(
        { id: occupantId },
        { bookingId: occupantId },
        { slotBookingId: occupantId }
      );
    }
    if (slotBookingId && mongoose.Types.ObjectId.isValid(slotBookingId)) {
      bookingOrConditions.push({ _id: new mongoose.Types.ObjectId(slotBookingId) });
    }
    if (slotBookingId) {
      bookingOrConditions.push(
        { slotBookingId: slotBookingId },
        { id: slotBookingId }
      );
    }
    if (bookingReferenceId) {
      bookingOrConditions.push(
        { bookingReferenceId: bookingReferenceId },
        { id: bookingReferenceId }
      );
    }
    if (cleanPhone && (cleanEmail || cleanRoomNum)) {
      const phoneFilter = {
        $or: [
          { phone: new RegExp(cleanPhone) },
          { userPhone: new RegExp(cleanPhone) },
          { guestPhone: new RegExp(cleanPhone) },
        ],
      };
      if (cleanEmail) phoneFilter.hostEmail = cleanEmail;
      bookingOrConditions.push(phoneFilter);
    }

    if (bookingOrConditions.length > 0) {
      await Booking.deleteMany({ $or: bookingOrConditions });
    }

    // 2. Permanently remove from Host.rooms and Stay.rooms in MongoDB
    if (cleanEmail) {
      const host = await Host.findOne({ email: cleanEmail });
      if (host && Array.isArray(host.rooms)) {
        let hostModified = false;
        const targetDatesToRemove = new Set(Array.isArray(bookedDates) ? bookedDates : []);
        const targetMonthsToRemove = new Set(Array.isArray(bookedMonths) ? bookedMonths : []);

        host.rooms = host.rooms.map((rm) => {
          const rmNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
          const matchRoom =
            (roomId && rm.id === roomId) ||
            (cleanRoomNum && rmNum === cleanRoomNum) ||
            !cleanRoomNum;

          if (!matchRoom) return rm;

          if (Array.isArray(rm.slotBookings)) {
            const initialCount = rm.slotBookings.length;
            const removedSlots = [];

            rm.slotBookings = rm.slotBookings.filter((sb) => {
              const sbPhone = (sb.phone || sb.guestPhone || sb.userPhone || '').replace(/\D/g, '').slice(-10);
              const sbRef = sb.bookingReferenceId || sb.slotBookingId || sb.id || '';
              const matchThis =
                (occupantId && (sb.id === occupantId || sb.slotBookingId === occupantId)) ||
                (slotBookingId && (sb.slotBookingId === slotBookingId || sb.id === slotBookingId)) ||
                (bookingReferenceId && sbRef === bookingReferenceId) ||
                (cleanPhone && sbPhone && sbPhone === cleanPhone);

              if (matchThis) {
                removedSlots.push(sb);
                return false;
              }
              return true;
            });

            if (rm.slotBookings.length !== initialCount || removedSlots.length > 0) {
              hostModified = true;

              // Collect all months and dates that were booked by this occupant
              removedSlots.forEach((s) => {
                if (Array.isArray(s.bookedMonths)) {
                  s.bookedMonths.forEach((m) => targetMonthsToRemove.add(m));
                }
                if (Array.isArray(s.bookedDates)) {
                  s.bookedDates.forEach((d) => targetDatesToRemove.add(d));
                }
              });

              if (Array.isArray(rm.bookedMonths)) {
                rm.bookedMonths = rm.bookedMonths.filter((m) => !targetMonthsToRemove.has(m));
              }
              if (Array.isArray(rm.bookedDates)) {
                rm.bookedDates = rm.bookedDates.filter((d) => !targetDatesToRemove.has(d));
              }

              const hasRemaining =
                (Array.isArray(rm.bookedMonths) && rm.bookedMonths.length > 0) ||
                (Array.isArray(rm.bookedDates) && rm.bookedDates.length > 0) ||
                (Array.isArray(rm.slotBookings) && rm.slotBookings.length > 0);

              rm.status = hasRemaining ? 'Occupied' : 'Available';
            }
          }
          return rm;
        });

        if (hostModified) {
          host.markModified('rooms');
          const availableCount = host.rooms.filter((r) => r.status === 'Available').length;
          host.availableRooms = availableCount;
          await host.save();

          // Also synchronize changes to Stay collection if exists
          await Stay.updateOne(
            { hostEmail: cleanEmail },
            {
              $set: {
                rooms: host.rooms,
                availableRooms: availableCount,
              },
            }
          );
        }
      }
    }

    return res.json({
      success: true,
      message: 'Occupant deleted from database and slots released successfully.',
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
        $or: [{ id: id }, { bookingReferenceId: id }, { slotBookingId: id }],
      });
    }
    if (deleted && deleted._id) {
      await User.updateMany(
        { bookedPlaces: deleted._id },
        { $pull: { bookedPlaces: deleted._id } }
      ).catch(() => {});
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

