import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import { User } from '../models/User.js';
import { Stay, computeLowestStartingPrice } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';
import { Wishlist } from '../models/Wishlist.js';
import { Payment } from '../models/Payment.js';
import { generateToken } from '../middleware/authMiddleware.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (imageString, folder = 'roomscout/properties') => {
  if (!imageString || typeof imageString !== 'string') return '';
  if (imageString.startsWith('http://') || imageString.startsWith('https://')) return imageString;
  if (imageString.startsWith('data:image')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(imageString, {
        folder,
        resource_type: 'image',
      });
      return uploadRes.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      return imageString;
    }
  }
  return imageString;
};

// @desc    Get all users list (Online Accounts + Offline Booking Occupants)
// @route   GET /api/admin/users
// @access  Public / Admin
export const getUsers = async (req, res, next) => {
  try {
    const mongoUsers = await User.find({ role: { $ne: 'host' } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const onlineUsers = mongoUsers.map((u) => ({
      _id: u._id.toString(),
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || '—',
      avatar: u.avatar || u.name?.slice(0, 2).toUpperCase() || 'US',
      role: u.role || 'user',
      createdAt: u.createdAt,
      status: 'Active',
      source: 'Online',
      isOffline: false,
    }));

    const offlineBookings = await Booking.find({ bookingSource: 'OFFLINE_HOST' })
      .sort({ createdAt: -1 })
      .lean();

    const offlineGuests = offlineBookings.map((b) => ({
      _id: b._id.toString(),
      id: b._id.toString(),
      bookingId: b.bookingReferenceId,
      name: b.fullName,
      email: b.email || '—',
      phone: b.phone || '—',
      aadharNumber: b.aadharNumber || '—',
      adults: b.adults,
      children: b.children,
      propertyName: b.stayTitle,
      category: b.roomType,
      roomNumber: b.roomNumber,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      duration: b.durationDisplay || '1 Month',
      paidAmount: `₹${Number(b.totalAmount || 0).toLocaleString('en-IN')}`,
      avatar: b.fullName.slice(0, 2).toUpperCase() || 'OG',
      role: 'user',
      status: b.status,
      source: 'Offline',
      isOffline: true,
      createdAt: b.createdAt,
    }));

    const allUsers = [...onlineUsers, ...offlineGuests];

    return res.json({
      success: true,
      count: allUsers.length,
      users: allUsers,
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return next(error);
  }
};

// @desc    Delete a user by ID
// @route   DELETE /api/admin/users/:id
// @access  Public / Admin
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.Types.ObjectId.isValid(id)) {
      // 1. If it's a registered user account in User collection:
      const deletedUser = await User.findByIdAndDelete(id);
      if (deletedUser) {
        const userEmail = (deletedUser.email || '').toLowerCase().trim();
        await Booking.deleteMany({
          $or: [
            { userId: id },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        });
        await Payment.deleteMany({
          $or: [
            { userId: id },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        });
        await Wishlist.deleteMany({ userId: id });
      }

      // 2. If it's a direct booking document (e.g. offline guest record in bookings collection):
      const deletedBooking = await Booking.findByIdAndDelete(id);
      if (deletedBooking) {
        await Payment.deleteMany({ bookingId: deletedBooking._id });
      }
    } else {
      // 3. Fallback for non-ObjectId booking references (e.g. OFF-..., BK-..., slot_...)
      const deletedBookings = await Booking.find({
        $or: [{ bookingReferenceId: id }, { slotBookingId: id }],
      }).select('_id');
      const bookingIds = deletedBookings.map((b) => b._id);
      if (bookingIds.length > 0) {
        await Booking.deleteMany({ _id: { $in: bookingIds } });
        await Payment.deleteMany({ bookingId: { $in: bookingIds } });
      }
    }

    return res.json({
      success: true,
      message: 'Record deleted successfully from database.',
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting user/booking record:', error);
    return next(error);
  }
};

// @desc    Get all hosts with populated Stays
// @route   GET /api/admin/hosts
// @access  Public / Admin
export const getHosts = async (req, res, next) => {
  try {
    const adminKeyHeader = req.headers['x-admin-key'];
    const isAdmin =
      (adminKeyHeader && process.env.ADMIN_KEY && adminKeyHeader.trim() === process.env.ADMIN_KEY.trim()) ||
      (req.user && (req.user.role === 'admin' || req.user.isAdmin));

    const query = isAdmin ? {} : { status: 'Approved' };
    const hosts = await Host.find(query).sort({ createdAt: -1 }).lean();

    const hostIds = hosts.map((h) => h._id);
    const stays = await Stay.find({ hostId: { $in: hostIds } }).lean();

    const stayMap = new Map();
    stays.forEach((s) => stayMap.set(s.hostId.toString(), s));

    const hostsList = hosts.map((h) => {
      const hId = h._id.toString();
      const s = stayMap.get(hId) || {};

      return {
        id: hId,
        _id: hId,
        name: h.name,
        email: h.email,
        phone: h.phone,
        avatar: h.avatar,
        role: h.role,
        status: h.status,
        propertyName: s.title || `${h.name}'s Stay`,
        propertyType: s.type || 'PG',
        genderType: s.genderType || 'Both',
        location: s.location || '',
        address: s.address || '',
        city: s.city || '',
        state: s.state || '',
        roadArea: s.roadArea || '',
        pincode: s.pincode || '',
        latitude: s.latitude,
        longitude: s.longitude,
        description: s.description || '',
        instagramVideoUrl: s.instagramVideoUrl || '',
        availableRooms: s.availableRooms || 0,
        totalRooms: s.totalRooms || 0,
        price: s.price ? `₹${Number(s.price).toLocaleString('en-IN')}` : '₹4,000',
        rateUnit: s.rateUnit || '/month',
        rating: s.rating || 5.0,
        image: s.image || '',
        images: s.images || [],
        rooms: s.rooms || [],
        roomRates: s.roomRates || [],
        facilities: s.facilities || [],
        rules: s.rules || [],
        createdAt: h.createdAt,
      };
    });

    return res.json({
      success: true,
      count: hostsList.length,
      hosts: hostsList,
    });
  } catch (error) {
    console.error('Error fetching admin hosts:', error);
    return next(error);
  }
};

// @desc    Get host by email
// @route   GET /api/admin/hosts/by-email/:email
// @access  Public / Admin
export const getHostByEmail = async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();
    const host = await Host.findOne({ email: cleanEmail }).lean();

    if (!host) {
      return res.json({ success: true, hasProperty: false, host: null, stay: null });
    }

    const stay = await Stay.findOne({ hostId: host._id }).lean();

    const mergedHost = {
      ...host,
      id: host._id.toString(),
      _id: host._id.toString(),
      ...(stay
        ? {
            propertyName: stay.title,
            title: stay.title,
            propertyType: stay.type,
            type: stay.type,
            genderType: stay.genderType || 'Both',
            location: stay.location || '',
            address: stay.address || '',
            roadArea: stay.roadArea || '',
            city: stay.city || '',
            state: stay.state || '',
            pincode: stay.pincode || '',
            latitude: stay.latitude,
            longitude: stay.longitude,
            price: stay.price ? `₹${Number(stay.price).toLocaleString('en-IN')}` : '₹4,000',
            rawPrice: stay.price,
            rateUnit: stay.rateUnit || '/month',
            rating: stay.rating || 5.0,
            facilities: stay.facilities || [],
            amenities: stay.facilities || [],
            rules: stay.rules || [],
            image: stay.image || '',
            images: stay.images || [],
            instagramVideoUrl: stay.instagramVideoUrl || '',
            description: stay.description || '',
            rooms: stay.rooms || [],
            roomRates: stay.roomRates || [],
            totalRooms: stay.totalRooms || 0,
            availableRooms: stay.availableRooms || 0,
            property: stay,
          }
        : {}),
    };

    return res.json({
      success: true,
      hasProperty: Boolean(stay),
      host: mergedHost,
      stay,
    });
  } catch (error) {
    console.error('Error getting host by email:', error);
    return next(error);
  }
};

// @desc    Register or Update Host & Property Catalog
// @route   POST /api/admin/hosts
// @access  Public / Admin
export const createHost = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      propertyName,
      title,
      propertyType,
      type,
      genderType,
      location,
      city,
      state,
      pincode,
      roadArea,
      address,
      latitude,
      longitude,
      price,
      rateUnit,
      rooms,
      roomRates,
      facilities,
      amenities,
      rules,
      image,
      images,
      instagramVideoUrl,
      description,
      status,
    } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Host email is required.' });
    }

    let host = await Host.findOne({ email: cleanEmail });

    if (!host) {
      host = await Host.create({
        name: (name || 'Host').trim(),
        email: cleanEmail,
        password: password || 'DefaultPass@123',
        phone: phone ? phone.trim() : '',
        role: 'host',
        avatar: (name || 'HO').trim().slice(0, 2).toUpperCase(),
        status: status || 'Pending Approval',
      });
    } else {
      if (name) host.name = name.trim();
      if (phone) host.phone = phone.trim();
      if (status && ['Active', 'Pending Approval', 'Approved', 'Rejected', 'Draft'].includes(status)) {
        host.status = status;
      }
      await host.save();
    }

    const existingStay = await Stay.findOne({ hostId: host._id });

    const cleanPrimaryImage = await uploadToCloudinary(image);
    let processedImages = [];
    if (Array.isArray(images) && images.length > 0) {
      processedImages = await Promise.all(images.map((img) => uploadToCloudinary(img)));
    } else if (cleanPrimaryImage) {
      processedImages = [cleanPrimaryImage];
    } else if (existingStay?.images?.length > 0) {
      processedImages = existingStay.images;
    }

    const resolvedTitle = propertyName || title || existingStay?.title || `${host.name}'s Stay`;
    const resolvedType = propertyType || type || existingStay?.type || 'PG';
    const resolvedGender = genderType || existingStay?.genderType || 'Both';
    const resolvedRoadArea = roadArea !== undefined ? roadArea : (existingStay?.roadArea || '');
    const resolvedCity = city !== undefined ? city : (existingStay?.city || '');
    const resolvedState = state !== undefined ? state : (existingStay?.state || '');
    const resolvedPincode = pincode !== undefined ? pincode : (existingStay?.pincode || '');
    const resolvedAddress = address !== undefined ? address : (existingStay?.address || '');
    const resolvedLocation =
      location ||
      (resolvedCity ? `${resolvedCity}${resolvedState ? `, ${resolvedState}` : ''}` : '') ||
      existingStay?.location ||
      'Location not specified';

    const parsedLat =
      latitude !== undefined && latitude !== null && !isNaN(Number(latitude))
        ? Number(latitude)
        : (existingStay?.latitude ?? 29.3919);
    const parsedLng =
      longitude !== undefined && longitude !== null && !isNaN(Number(longitude))
        ? Number(longitude)
        : (existingStay?.longitude ?? 79.4542);

    const parsedPrice =
      price !== undefined && price !== null
        ? typeof price === 'number'
          ? price
          : parseInt(String(price).replace(/[^0-9]/g, ''), 10) || 4000
        : (existingStay?.price ?? 4000);

    const resolvedFacilities =
      facilities !== undefined
        ? Array.isArray(facilities)
          ? facilities
          : []
        : amenities !== undefined
        ? Array.isArray(amenities)
          ? amenities
          : []
        : (existingStay?.facilities || []);

    const resolvedRules =
      rules !== undefined
        ? Array.isArray(rules)
          ? rules
          : []
        : (existingStay?.rules || []);

    const resolvedRoomRates =
      roomRates !== undefined
        ? Array.isArray(roomRates)
          ? roomRates
          : []
        : (existingStay?.roomRates || []);

    const resolvedRooms =
      rooms !== undefined
        ? Array.isArray(rooms)
          ? rooms
          : []
        : (existingStay?.rooms || []);

    const cleanedRooms = (Array.isArray(resolvedRooms) ? resolvedRooms : []).map((rm) => ({
      roomNumber: rm.roomNumber,
      roomNumInt: rm.roomNumInt || parseInt(String(rm.roomNumber).replace(/\D/g, ''), 10) || 0,
      type: rm.type || 'Standard',
      price: rm.price || 0,
      rateUnit: rm.rateUnit || '/month',
      floor: rm.floor || 'Floor 1',
      status: rm.status || 'Available',
    }));

    const finalTotalRooms = cleanedRooms.length > 0 ? cleanedRooms.length : (existingStay?.totalRooms || 1);
    const finalAvailRooms =
      cleanedRooms.length > 0
        ? cleanedRooms.filter((r) => r.status === 'Available').length
        : (existingStay?.availableRooms || 1);

    const startingPricing = computeLowestStartingPrice(
      resolvedRoomRates,
      cleanedRooms,
      parsedPrice,
      rateUnit || existingStay?.rateUnit || '/month'
    );

    const stayPayload = {
      hostId: host._id,
      title: resolvedTitle,
      type: resolvedType,
      genderType: resolvedGender,
      location: resolvedLocation,
      address: resolvedAddress,
      roadArea: resolvedRoadArea,
      city: resolvedCity,
      state: resolvedState,
      pincode: resolvedPincode,
      latitude: parsedLat,
      longitude: parsedLng,
      price: startingPricing.price,
      rateUnit: startingPricing.rateUnit,
      facilities: resolvedFacilities,
      rules: resolvedRules,
      roomRates: resolvedRoomRates,
      rooms: cleanedRooms,
      totalRooms: finalTotalRooms,
      availableRooms: finalAvailRooms,
      image: cleanPrimaryImage || existingStay?.image || processedImages[0] || '',
      images: processedImages,
      instagramVideoUrl: instagramVideoUrl !== undefined ? instagramVideoUrl : (existingStay?.instagramVideoUrl || ''),
      description: description !== undefined ? description : (existingStay?.description || ''),
      isPublished: host.status === 'Approved',
    };

    const updatedStay = await Stay.findOneAndUpdate(
      { hostId: host._id },
      { $set: stayPayload },
      { upsert: true, new: true }
    );

    const mergedHost = {
      id: host._id.toString(),
      _id: host._id.toString(),
      name: host.name,
      email: host.email,
      phone: host.phone,
      avatar: host.avatar,
      role: host.role,
      status: host.status,
      // Property / Stay fields
      propertyName: updatedStay.title,
      title: updatedStay.title,
      propertyType: updatedStay.type,
      type: updatedStay.type,
      genderType: updatedStay.genderType,
      location: updatedStay.location,
      address: updatedStay.address,
      roadArea: updatedStay.roadArea,
      city: updatedStay.city,
      state: updatedStay.state,
      pincode: updatedStay.pincode,
      latitude: updatedStay.latitude,
      longitude: updatedStay.longitude,
      price: `₹${Number(updatedStay.price).toLocaleString('en-IN')}`,
      rawPrice: updatedStay.price,
      rateUnit: updatedStay.rateUnit,
      rating: updatedStay.rating,
      facilities: updatedStay.facilities,
      amenities: updatedStay.facilities,
      rules: updatedStay.rules,
      image: updatedStay.image,
      images: updatedStay.images,
      instagramVideoUrl: updatedStay.instagramVideoUrl,
      description: updatedStay.description,
      rooms: updatedStay.rooms,
      roomRates: updatedStay.roomRates,
      totalRooms: updatedStay.totalRooms,
      availableRooms: updatedStay.availableRooms,
      property: updatedStay,
    };

    return res.status(200).json({
      success: true,
      message: 'Property details saved successfully!',
      host: mergedHost,
      stay: updatedStay,
    });
  } catch (error) {
    console.error('Error in createHost:', error);
    return next(error);
  }
};

// @desc    Approve host and publish stay
// @route   PUT /api/admin/hosts/:id/approve
// @access  Public / Admin
export const approveHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const host = await Host.findByIdAndUpdate(id, { $set: { status: 'Approved' } }, { new: true });

    if (!host) return res.status(404).json({ success: false, message: 'Host not found' });

    const stay = await Stay.findOneAndUpdate(
      { hostId: host._id },
      { $set: { isPublished: true } },
      { new: true }
    );

    return res.json({
      success: true,
      message: `Property approved and published successfully!`,
      host,
      stay,
    });
  } catch (error) {
    console.error('Error approving host:', error);
    return next(error);
  }
};

// @desc    Reject host
// @route   PUT /api/admin/hosts/:id/reject
// @access  Public / Admin
export const rejectHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const host = await Host.findByIdAndUpdate(id, { $set: { status: 'Rejected' } });

    if (!host) return res.status(404).json({ success: false, message: 'Host not found' });

    await Stay.updateMany({ hostId: host._id }, { $set: { isPublished: false } });

    return res.json({ success: true, message: 'Host application rejected.' });
  } catch (error) {
    console.error('Error rejecting host:', error);
    return next(error);
  }
};

// @desc    Get all occupants for a host directly from Booking collection
// @route   GET /api/admin/hosts/my-guests/:email
// @access  Public / Host
export const getHostGuests = async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();
    const host = await Host.findOne({ email: cleanEmail }).lean();

    if (!host) {
      return res.json({ success: true, count: 0, guests: [] });
    }

    const hostStays = await Stay.find({ hostId: host._id }).select('_id').lean();
    const stayIds = hostStays.map((s) => s._id);

    const bookings = await Booking.find({
      $or: [
        { hostId: host._id },
        ...(stayIds.length > 0 ? [{ stayId: { $in: stayIds } }] : []),
      ],
      status: { $nin: ['CANCELLED', 'REJECTED'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const guests = bookings.map((b) => ({
      _id: b._id.toString(),
      id: b._id.toString(),
      bookingId: b.bookingReferenceId,
      bookingReferenceId: b.bookingReferenceId,
      roomNumber: b.roomNumber,
      roomType: b.roomType,
      rateUnit: b.rateUnit,
      checkIn: b.checkIn,
      checkInISO: b.checkIn ? new Date(b.checkIn).toISOString() : '',
      checkOut: b.checkOut,
      checkOutISO: b.checkOut ? new Date(b.checkOut).toISOString() : '',
      email: b.email,
      guestEmail: b.email,
      fullName: b.fullName,
      userName: b.fullName,
      guestName: b.fullName,
      phone: b.phone,
      guestPhone: b.phone,
      userPhone: b.phone,
      guestAadhar: b.aadharNumber,
      aadharId: b.aadharNumber,
      adults: b.adults,
      children: b.children,
      gender: b.gender,
      duration: b.durationDisplay || '1 Month',
      totalAmount: b.totalAmount,
      stayTitle: b.stayTitle,
      status: b.status,
      bookingSource: b.bookingSource,
      createdAt: b.createdAt,
    }));

    return res.json({
      success: true,
      count: guests.length,
      guests,
    });
  } catch (error) {
    console.error('Error fetching host guests:', error);
    return next(error);
  }
};

// @desc    Delete host and cascade clean property, bookings, and payments
// @route   DELETE /api/admin/hosts/:id
// @access  Public / Admin
export const deleteHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const host = await Host.findByIdAndDelete(id);

    if (host) {
      await Stay.deleteMany({ hostId: host._id });
      await Booking.deleteMany({ hostId: host._id });
      await Payment.deleteMany({ hostId: host._id });
    }

    return res.json({
      success: true,
      message: 'Host and associated catalog deleted permanently.',
    });
  } catch (error) {
    console.error('Error deleting host:', error);
    return next(error);
  }
};

// @desc    Get platform stats summary
// @route   GET /api/admin/stats
// @access  Public / Admin
export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'host' } });
    const totalHosts = await Host.countDocuments();
    const totalStays = await Stay.countDocuments();
    const totalBookings = await Booking.countDocuments();

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalHosts,
        totalStays,
        totalBookings,
        activeLocations: 6,
        satisfactionRate: '98.6%',
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return next(error);
  }
};

// @desc    Admin Impersonation Login
// @route   POST /api/admin/impersonate
// @access  Public / Admin
export const impersonateAccount = async (req, res, next) => {
  try {
    const { email, role, id } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const isHost = role === 'host';

    let targetAccount = null;

    if (isHost) {
      targetAccount = id
        ? await Host.findById(id)
        : await Host.findOne({ email: cleanEmail });

      if (!targetAccount) return res.status(404).json({ message: 'Host not found' });

      const safeHost = {
        _id: targetAccount._id.toString(),
        id: targetAccount._id.toString(),
        name: targetAccount.name,
        email: targetAccount.email,
        phone: targetAccount.phone,
        role: 'host',
        status: targetAccount.status,
      };

      return res.json({
        success: true,
        user: safeHost,
        token: generateToken(safeHost),
      });
    }

    targetAccount = id
      ? await User.findById(id)
      : await User.findOne({ email: cleanEmail });

    if (!targetAccount) return res.status(404).json({ message: 'User not found' });

    const safeUser = {
      _id: targetAccount._id.toString(),
      id: targetAccount._id.toString(),
      name: targetAccount.name,
      email: targetAccount.email,
      phone: targetAccount.phone,
      role: 'user',
    };

    return res.json({
      success: true,
      user: safeUser,
      token: generateToken(safeUser),
    });
  } catch (error) {
    console.error('Impersonate Account Error:', error);
    return next(error);
  }
};