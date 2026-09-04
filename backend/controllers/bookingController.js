import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKINGS_FILE = path.join(__dirname, '../data/bookings_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');
const USERS_FILE = path.join(__dirname, '../data/users_store.json');

function readUsersFromFile() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function writeUsersToFile(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

function readBookingsFromFile() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading bookings file:', err);
    return [];
  }
}

function writeBookingsToFile(bookings) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing bookings file:', err);
  }
}

function readHostsFromFile() {
  try {
    if (!fs.existsSync(HOSTS_FILE)) return [];
    const data = fs.readFileSync(HOSTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading hosts file:', err);
    return [];
  }
}

function writeHostsToFile(hosts) {
  try {
    fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing hosts file:', err);
  }
}

// Automatic Room Inventory Adjuster on Check-in / Confirmation / Check-out
async function adjustAvailableRooms(hostEmail, stayId, delta) {
  const cleanEmail = (hostEmail || '').toLowerCase().trim();

  // 1. Update MongoDB Host and Stay collections
  if (mongoose.connection.readyState === 1) {
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

  // 2. Update persistent file store
  try {
    const fileHosts = readHostsFromFile();
    const hIdx = fileHosts.findIndex(
      (h) => (h.email && h.email.toLowerCase() === cleanEmail) || String(h.id) === String(stayId) || String(h._id) === String(stayId)
    );
    if (hIdx >= 0) {
      const maxTotal = fileHosts[hIdx].totalRooms || 1;
      let newRooms = (fileHosts[hIdx].availableRooms !== undefined ? fileHosts[hIdx].availableRooms : maxTotal) + delta;
      newRooms = Math.max(0, Math.min(maxTotal, newRooms));
      fileHosts[hIdx].availableRooms = newRooms;
      writeHostsToFile(fileHosts);
    }
  } catch (err) {
    console.warn('adjustAvailableRooms file error:', err.message);
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
      bookingReferenceId: clientRef,
      bookingId,
    } = req.body;

    const resolvedTitle = stayTitle || 'Stay Property';
    const resolvedFullName = (fullName || guestName || userName || '').trim();
    const cleanDigitsPhone = (phone || userPhone || guestPhone || '').replace(/\D/g, '').slice(-10);
    const resolvedPhone = cleanDigitsPhone ? cleanDigitsPhone : (phone || userPhone || guestPhone || '').trim();
    let resolvedEmail = (email || userEmail || guestEmail || '').trim().toLowerCase();

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
      const existingBookings = readBookingsFromFile();
      const isDuplicateMobileBooking = existingBookings.some((b) => {
        if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
        const bPhone = (b.phone || b.userPhone || b.guestPhone || '').replace(/\D/g, '').slice(-10);
        const sameStay = String(b.stayId) === String(stayId);
        const sameRoom = String(b.roomNumber || '') === String(roomNumber || '');
        return bPhone === resolvedPhone && sameStay && sameRoom;
      });
      if (isDuplicateMobileBooking) {
        return res.status(400).json({
          message: `Duplicate Mobile Number: A reservation with mobile number ${resolvedPhone} already exists for this room. Each booking must be uniquely identified by a unique mobile number.`,
        });
      }
    }

    if (!resolvedEmail && resolvedPhone) {
      resolvedEmail = `${resolvedFullName.toLowerCase().replace(/\s+/g, '')}${resolvedPhone.slice(-4)}@stayhub.local`;
    }

    // Determine target user id and ensure unique user record in users_store.json
    let targetUserId = (req.user?._id || req.user?.id || 'usr_guest')?.toString();
    let targetUserEmail = (resolvedEmail || req.user?.email || '').toLowerCase().trim();

    // Check existing unique user in users_store.json by phone or email
    const fileUsers = readUsersFromFile();
    let matchedUser = fileUsers.find((u) => {
      const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
      const isPhoneMatch = resolvedPhone && uPhone && uPhone === resolvedPhone;
      const isEmailMatch = resolvedEmail && u.email && u.email.toLowerCase().trim() === resolvedEmail;
      return isPhoneMatch || isEmailMatch;
    });

    if (matchedUser) {
      targetUserId = (matchedUser._id || matchedUser.id)?.toString();
      targetUserEmail = matchedUser.email || resolvedEmail;
    } else if (resolvedPhone) {
      // Auto-register unique user in users_store.json
      const newUserId = 'usr_' + Date.now();
      const initials = resolvedFullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'GU';
      const newUserRecord = {
        _id: newUserId,
        name: resolvedFullName,
        email: resolvedEmail,
        phone: resolvedPhone,
        avatar: initials,
        role: 'user',
        status: 'Active',
        createdAt: new Date().toISOString(),
      };
      fileUsers.push(newUserRecord);
      writeUsersToFile(fileUsers);
      targetUserId = newUserId;
      targetUserEmail = resolvedEmail;
    }

    const bookingReferenceId = clientRef || bookingId || ('STAY-' + Math.floor(100000 + Math.random() * 900000));
    const calculatedDuration = durationDisplay || (durationMonths ? `${durationMonths} Months` : '3 Months');

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
      guestGender: guestGender || 'Male',
      moveInDate: resolvedMoveInDate,
      durationMonths: Number(durationMonths) || 3,
      durationDays: Number(durationDays) || 0,
      durationDisplay: calculatedDuration,
      sharingType: sharingType || roomType || 'Double Sharing',
      totalAmount: resolvedTotalAmount,
      bookingReferenceId,
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
      guestAadhar: guestAadhar || aadharId || '',
      aadharId: guestAadhar || aadharId || '',
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      status: clientStatus || 'Pending Host Approval',
      createdAt: new Date().toISOString(),
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const createdMongo = await Booking.create(bookingPayload);
        if (createdMongo) {
          bookingPayload._id = createdMongo._id.toString();
        }
      } catch (mongoErr) {
        console.warn('MongoDB Booking creation fallback:', mongoErr.message);
      }
    }

    if (!bookingPayload._id) {
      bookingPayload._id = 'book_' + Date.now();
    }

    // Save to persistent file storage
    const fileBookings = readBookingsFromFile();
    fileBookings.unshift(bookingPayload);
    writeBookingsToFile(fileBookings);

    // Automatically decrement available rooms by 1 ONLY upon confirmed booking
    if (bookingPayload.status === 'CONFIRMED' || bookingPayload.status === 'APPROVED') {
      await adjustAvailableRooms(bookingPayload.hostEmail, bookingPayload.stayId, -1);
    }

    console.log(`✅ Booking Confirmed for User [${currentUserEmail || currentUserId}]: ${stayTitle} (1 room allocated)`);
    return res.status(201).json(bookingPayload);
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
    const { status, hostEmail, fullName, userName, guestName, phone, userPhone, guestPhone, email, userEmail, guestEmail } = req.body;

    const newName = userName || fullName || guestName;
    const newPhone = userPhone || phone || guestPhone;
    const newEmail = userEmail || email || guestEmail;

    let updatedBooking = null;
    let oldStatus = 'CONFIRMED';
    let targetHostEmail = hostEmail || '';
    let targetStayId = '';

    // 1. Update in MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const orConds = [{ bookingReferenceId: id }, { slotBookingId: id }, { id: id }];
        if (mongoose.Types.ObjectId.isValid(id)) {
          orConds.unshift({ _id: new mongoose.Types.ObjectId(id) });
        } else {
          orConds.unshift({ _id: id });
        }
        const b = await Booking.findOne({ $or: orConds });
        if (b) {
          oldStatus = b.status || 'CONFIRMED';
          targetHostEmail = b.hostEmail || targetHostEmail;
          targetStayId = b.stayId || targetStayId;
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
          await b.save();
          updatedBooking = b.toObject();
        }
      } catch (mongoErr) {
        console.warn('MongoDB updateBookingStatus error:', mongoErr.message);
      }
    }

    // 2. Update in persistent file storage
    const fileBookings = readBookingsFromFile();
    const idx = fileBookings.findIndex(
      (b) =>
        String(b._id) === String(id) ||
        String(b.id) === String(id) ||
        b.bookingReferenceId === id ||
        b.slotBookingId === id
    );

    if (idx >= 0) {
      oldStatus = fileBookings[idx].status || oldStatus;
      targetHostEmail = fileBookings[idx].hostEmail || targetHostEmail;
      targetStayId = fileBookings[idx].stayId || targetStayId;
      if (status) fileBookings[idx].status = status.toUpperCase();
      if (newName) {
        fileBookings[idx].fullName = newName;
        fileBookings[idx].userName = newName;
        fileBookings[idx].guestName = newName;
      }
      if (newPhone) {
        fileBookings[idx].phone = newPhone;
        fileBookings[idx].userPhone = newPhone;
        fileBookings[idx].guestPhone = newPhone;
      }
      if (newEmail) {
        fileBookings[idx].email = newEmail;
        fileBookings[idx].userEmail = newEmail;
        fileBookings[idx].guestEmail = newEmail;
      }
      if (!updatedBooking) updatedBooking = fileBookings[idx];
      writeBookingsToFile(fileBookings);
    }

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

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
      booking: updatedBooking,
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

    let userBookings = [];
    const existingIds = new Set();

    // 1. Query MongoDB for this specific user
    if (mongoose.connection.readyState === 1) {
      try {
        const conditions = [];
        if (currentUserId) {
          conditions.push({ user: currentUserId }, { userId: currentUserId });
          if (mongoose.Types.ObjectId.isValid(currentUserId)) {
            conditions.push({ user: new mongoose.Types.ObjectId(currentUserId) });
          }
        }
        if (currentUserEmail) {
          const emailRegex = new RegExp(`^${currentUserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          conditions.push(
            { userEmail: emailRegex },
            { email: emailRegex },
            { guestEmail: emailRegex }
          );
        }

        const mongoBookings = await Booking.find({ $or: conditions }).sort({ createdAt: -1 }).lean();
        if (mongoBookings && mongoBookings.length > 0) {
          mongoBookings.forEach((b) => {
            const bId = String(b._id?.toString() || b.id || b.bookingReferenceId);
            existingIds.add(bId);
            if (b.bookingReferenceId) existingIds.add(String(b.bookingReferenceId));
            userBookings.push({
              ...b,
              _id: b._id?.toString() || b.id,
              id: b._id?.toString() || b.id,
            });
          });
        }
      } catch (err) {
        console.warn('MongoDB read my-bookings error:', err.message);
      }
    }

    // 2. Merge with persistent file bookings matching this user
    const fileBookings = readBookingsFromFile();
    fileBookings.forEach((b) => {
      const matchId = currentUserId && (String(b.user) === currentUserId || String(b.userId) === currentUserId);
      const bookingEmail = (b.userEmail || b.email || b.guestEmail || '').toLowerCase().trim();
      const matchEmail = currentUserEmail && bookingEmail === currentUserEmail;

      const bId = String(b._id || b.id || b.bookingReferenceId);
      if ((matchId || matchEmail) && !existingIds.has(bId) && !existingIds.has(String(b.bookingReferenceId))) {
        existingIds.add(bId);
        if (b.bookingReferenceId) existingIds.add(String(b.bookingReferenceId));
        userBookings.push({
          ...b,
          _id: b._id || b.id || b.bookingReferenceId,
          id: b._id || b.id || b.bookingReferenceId,
        });
      }
    });

    // 3. Scan host properties' slotBookings to ensure room slot bookings are always fetched in user dashboard
    try {
      const fileHosts = readHostsFromFile();
      fileHosts.forEach((host) => {
        if (!host || !Array.isArray(host.rooms)) return;
        host.rooms.forEach((room) => {
          if (!Array.isArray(room.slotBookings)) return;
          room.slotBookings.forEach((sb) => {
            const sbEmail = (sb.guestEmail || sb.userEmail || sb.email || '').toLowerCase().trim();
            if (currentUserEmail && sbEmail === currentUserEmail) {
              const bookingRef = sb.id || `SLOT-${host.id || host._id}-${room.roomNumber}-${(sb.bookedDates || []).join('-')}`;
              if (!existingIds.has(String(bookingRef)) && !existingIds.has(String(sb.id))) {
                existingIds.add(String(bookingRef));
                if (sb.id) existingIds.add(String(sb.id));
                const dates = Array.isArray(sb.bookedDates) ? sb.bookedDates : [];
                userBookings.push({
                  _id: bookingRef,
                  id: bookingRef,
                  bookingReferenceId: sb.bookingReferenceId || bookingRef,
                  stayId: host._id || host.id,
                  stayTitle: host.title || host.propertyName || 'Host Stay',
                  stayImage: Array.isArray(host.images) && host.images[0] ? host.images[0] : (host.image || ''),
                  location: host.city || host.location || 'Nainital, Uttarakhand',
                  roomNumber: room.roomNumber || '',
                  roomType: room.type || host.propertyType || 'Room',
                  checkIn: sb.checkIn || (dates[0] ? `${dates[0]} (${sb.rateUnit === '/month' || sb.rateUnit === '/mo' || (Array.isArray(sb.bookedMonths) && sb.bookedMonths.length > 0) ? '12:00 AM' : '12:00 PM'})` : ''),
                  checkOut: sb.checkOut || (dates[dates.length - 1] ? `${dates[dates.length - 1]} (${sb.rateUnit === '/month' || sb.rateUnit === '/mo' || (Array.isArray(sb.bookedMonths) && sb.bookedMonths.length > 0) ? '11:59 PM' : '11:59 AM'})` : ''),
                  checkInISO: dates[0] || '',
                  checkOutISO: dates[dates.length - 1] || '',
                  bookedDates: dates,
                  fullName: sb.guestName || sb.userName || req.user?.name || 'User',
                  userName: sb.guestName || sb.userName || req.user?.name || 'User',
                  userEmail: currentUserEmail,
                  email: currentUserEmail,
                  guestEmail: currentUserEmail,
                  totalAmount: sb.totalAmount || 0,
                  status: 'CONFIRMED',
                  paymentStatus: 'COMPLETED',
                  source: 'slotBooking',
                  createdAt: sb.createdAt || new Date().toISOString(),
                });
              }
            }
          });
        });
      });
    } catch (e) {
      console.warn('Error reading slotBookings for user:', e.message);
    }

    // Ensure stayTitle uses the actual propertyName from hosts_store if it was recorded as fallback
    try {
      const allHosts = readHostsFromFile();
      userBookings = userBookings.map((b) => {
        const hostMatch = allHosts.find(
          (h) =>
            String(h._id) === String(b.stayId || b.hostId) ||
            String(h.id) === String(b.stayId || b.hostId) ||
            (Array.isArray(h.previousIds) && h.previousIds.some((pid) => pid === String(b.stayId || b.hostId))) ||
            ((h.email || '').toLowerCase() === (b.hostEmail || '').toLowerCase())
        );
        const realName = hostMatch?.propertyName || hostMatch?.title || hostMatch?.name;
        if (realName && (!b.stayTitle || b.stayTitle === 'Host Room Stay' || b.stayTitle === 'Host Stay')) {
          return {
            ...b,
            stayTitle: realName,
          };
        }
        return b;
      });
    } catch (err) {
      console.warn('Error enriching booking stay titles:', err.message);
    }

    // Sort newest bookings first
    userBookings.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return res.json(userBookings);
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
    let stayBookings = [];

    const fileHosts = readHostsFromFile();
    const matchedHost =
      fileHosts.find((h) => {
        if (!h) return false;
        return (
          String(h.id) === String(stayId) ||
          String(h._id) === String(stayId) ||
          (Array.isArray(h.previousIds) && h.previousIds.some((pid) => String(pid) === String(stayId))) ||
          h.email === stayId
        );
      }) ||
      fileHosts.find((h) => {
        if (!h) return false;
        return h.propertyName && (
          String(stayId).toLowerCase().includes(h.propertyName.toLowerCase()) ||
          h.propertyName.toLowerCase().includes(String(stayId).toLowerCase())
        );
      });

    const validStayIds = new Set([
      String(stayId),
      ...(matchedHost?.id ? [String(matchedHost.id)] : []),
      ...(matchedHost?._id ? [String(matchedHost._id)] : []),
      ...(Array.isArray(matchedHost?.previousIds) ? matchedHost.previousIds.map(String) : []),
    ]);

    const hostEmail = matchedHost?.email?.toLowerCase();
    const propertyTitle = matchedHost?.propertyName?.toLowerCase();

    if (mongoose.connection.readyState === 1) {
      try {
        const orConditions = [
          { stayId: { $in: Array.from(validStayIds) } },
        ];
        if (hostEmail) orConditions.push({ hostEmail: hostEmail });
        if (propertyTitle) orConditions.push({ stayTitle: new RegExp(`^${propertyTitle}$`, 'i') });

        const mongoBookings = await Booking.find({
          $or: orConditions,
          status: { $nin: ['REJECTED', 'CANCELLED', 'Rejected', 'Cancelled'] },
        }).lean();
        if (mongoBookings) {
          stayBookings = mongoBookings.map((b) => ({
            ...b,
            id: b._id?.toString() || b.id,
            _id: b._id?.toString() || b.id,
          }));
        }
      } catch (err) {
        console.warn('MongoDB getBookingsByStay error:', err.message);
      }
    }

    const fileBookings = readBookingsFromFile();
    fileBookings.forEach((b) => {
      if (!b) return;
      const bStatus = String(b.status || '');
      if (
        bStatus === 'REJECTED' ||
        bStatus === 'CANCELLED' ||
        bStatus === 'Rejected' ||
        bStatus === 'Cancelled'
      ) {
        return;
      }

      const idMatch = validStayIds.has(String(b.stayId));
      const emailMatch = hostEmail && b.hostEmail && b.hostEmail.toLowerCase() === hostEmail;
      const titleMatch = propertyTitle && b.stayTitle && b.stayTitle.toLowerCase() === propertyTitle;

      if (idMatch || emailMatch || titleMatch) {
        const bId = String(b.id || b._id || b.bookingReferenceId);
        if (!stayBookings.some((x) => String(x.id || x._id || x.bookingReferenceId) === bId)) {
          stayBookings.push({
            ...b,
            id: bId,
            _id: bId,
          });
        }
      }
    });

    return res.json(stayBookings);
  } catch (error) {
    return next(error);
  }
};
