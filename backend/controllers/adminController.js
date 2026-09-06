import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';
import { Wishlist } from '../models/Wishlist.js';
import { generateToken } from '../middleware/authMiddleware.js';

// @desc    Get all users list from database (Guest & Student accounts only)
// @route   GET /api/admin/users
// @access  Public / Admin
export const getUsers = async (req, res, next) => {
  try {
    const mongoUsers = await User.find({ role: { $ne: 'host' } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const finalUsers = mongoUsers.map((u) => ({
      _id: u._id?.toString() || u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      avatar: u.avatar || u.name?.slice(0, 2).toUpperCase() || 'US',
      role: u.role || 'user',
      createdAt: u.createdAt || new Date(),
      status: 'Active',
      source: 'MongoDB',
    }));

    return res.json({
      success: true,
      count: finalUsers.length,
      users: finalUsers,
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
    let mongoDeleted = false;
    let targetEmail = '';

    if (mongoose.Types.ObjectId.isValid(id)) {
      const resMongo = await User.findByIdAndDelete(id);
      if (resMongo) {
        mongoDeleted = true;
        targetEmail = resMongo.email;
      }
    } else {
      const resMongo = await User.findOneAndDelete({ $or: [{ id }, { email: id }] });
      if (resMongo) {
        mongoDeleted = true;
        targetEmail = resMongo.email;
      }
    }

    // Clean up associated user bookings and wishlists
    if (targetEmail) {
      const cleanTargetEmail = targetEmail.toLowerCase();
      await Booking.deleteMany({
        $or: [{ userEmail: cleanTargetEmail }, { email: cleanTargetEmail }, { guestEmail: cleanTargetEmail }],
      }).catch(() => {});
      await Wishlist.deleteMany({ userEmail: cleanTargetEmail }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `User deleted permanently from database.`,
      deletedId: id,
      mongoDeleted,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return next(error);
  }
};

// @desc    Get all hosts list from database (with approval status)
// @route   GET /api/admin/hosts
// @access  Public / Admin
export const getHosts = async (req, res, next) => {
  try {
    const normalizeRateUnit = (unit) => {
      if (!unit) return '/month';
      const u = String(unit).toLowerCase().trim();
      return (u.includes('night') || u.includes('day')) ? '/night' : '/month';
    };

    const adminKeyHeader = req.headers['x-admin-key'];
    const isAdmin = (adminKeyHeader && process.env.ADMIN_KEY && adminKeyHeader.trim() === process.env.ADMIN_KEY.trim()) ||
                    (req.user && (req.user.role === 'admin' || req.user.isAdmin));

    const query = isAdmin ? {} : { status: 'Approved' };
    const mongoHosts = await Host.find(query).sort({ createdAt: -1 }).lean();
    const hostsList = mongoHosts.map((h) => {
      const p = h.property || {};
      const d = h.hostDetails || {};
      const hostRules = Array.isArray(p.rules) && p.rules.length > 0
        ? p.rules
        : (Array.isArray(h.rules) ? h.rules : (Array.isArray(h.houseRules) ? h.houseRules : []));
      const hostFacilities = Array.isArray(p.facilities) && p.facilities.length > 0
        ? p.facilities
        : (Array.isArray(h.facilities) ? h.facilities : (Array.isArray(h.amenities) ? h.amenities : ['Wifi', 'Attached Bath', 'Power Backup']));

      return {
        id: h._id?.toString() || h.id,
        _id: h._id?.toString(),
        name: d.name || h.name,
        email: d.email || h.email,
        phone: d.phone || h.phone,
        propertyName: p.propertyName || h.propertyName || (p.properties && p.properties[0]) || `${d.name || h.name}'s Stay`,
        properties: p.properties || h.properties || (p.propertyName ? [p.propertyName] : []),
        propertyType: p.propertyType || h.propertyType || 'PG',
        genderType: p.genderType || h.genderType || 'Both',
        location: p.location || h.location || '',
        address: p.address || h.address || p.location || h.location || '',
        roadArea: p.roadArea || h.roadArea || '',
        pincode: p.pincode || h.pincode || '',
        city: p.city || h.city || '',
        state: p.state || h.state || '',
        latitude: p.latitude ?? h.latitude,
        longitude: p.longitude ?? h.longitude,
        availableRooms: p.availableRooms !== undefined ? p.availableRooms : (h.availableRooms !== undefined ? h.availableRooms : 0),
        totalRooms: p.totalRooms !== undefined ? p.totalRooms : (h.totalRooms !== undefined ? h.totalRooms : 0),
        rating: p.rating || h.rating || 5.0,
        price: p.price || h.price || '₹4,000',
        rateUnit: normalizeRateUnit(p.rateUnit || h.rateUnit),
        roomRates: (h.roomRates || []).map((r) => ({
          ...r,
          rateUnit: normalizeRateUnit(r.rateUnit),
        })),
        rooms: (h.rooms || []).map((rm) => ({
          ...rm,
          rateUnit: normalizeRateUnit(rm.rateUnit),
        })),
        facilities: hostFacilities,
        amenities: hostFacilities,
        rules: hostRules,
        image: p.image || h.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        images: p.images || h.images || [],
        instagramVideoUrl: p.instagramVideoUrl || h.instagramVideoUrl || '',
        status: d.status || h.status || 'Pending Approval',
        description: p.description || h.description || h.bio || '',
        property: p,
        hostDetails: d,
        createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : (h.joinedDate || '2026-08-25T10:00:00.000Z'),
        joinedDate: h.createdAt ? new Date(h.createdAt).toISOString() : (h.joinedDate || '2026-08-25T10:00:00.000Z'),
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

// @desc    Get host by email (One Host = One Property)
// @route   GET /api/admin/hosts/by-email/:email
// @access  Public / Admin
export const getHostByEmail = async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();

    const mongoHost = await Host.findOne({
      $or: [{ email: cleanEmail }, { 'hostDetails.email': cleanEmail }],
    }).lean();

    if (mongoHost) {
      const prop = mongoHost.property || {};
      const hostDet = mongoHost.hostDetails || {};
      const hostRules = Array.isArray(prop.rules) && prop.rules.length > 0
        ? prop.rules
        : (Array.isArray(mongoHost.rules) && mongoHost.rules.length > 0 ? mongoHost.rules : (Array.isArray(mongoHost.houseRules) ? mongoHost.houseRules : []));
      const hostFacilities = Array.isArray(prop.facilities) && prop.facilities.length > 0
        ? prop.facilities
        : (Array.isArray(mongoHost.facilities) && mongoHost.facilities.length > 0 ? mongoHost.facilities : (Array.isArray(mongoHost.amenities) ? mongoHost.amenities : []));

      return res.json({
        success: true,
        hasProperty: true,
        host: {
          ...prop,
          ...mongoHost,
          id: mongoHost._id?.toString() || mongoHost.id,
          name: hostDet.name || mongoHost.name,
          email: hostDet.email || mongoHost.email,
          phone: hostDet.phone || mongoHost.phone,
          status: hostDet.status || mongoHost.status || 'Pending Approval',
          role: hostDet.role || mongoHost.role || 'host',
          avatar: hostDet.avatar || mongoHost.avatar || 'HO',
          propertyName: prop.propertyName || mongoHost.propertyName || '',
          properties: prop.properties || mongoHost.properties || (prop.propertyName ? [prop.propertyName] : []),
          propertyType: prop.propertyType || mongoHost.propertyType || 'PG',
          genderType: prop.genderType || mongoHost.genderType || 'Boys',
          location: prop.location || mongoHost.location || '',
          roadArea: prop.roadArea || mongoHost.roadArea || '',
          pincode: prop.pincode || mongoHost.pincode || '',
          city: prop.city || mongoHost.city || '',
          state: prop.state || mongoHost.state || '',
          address: prop.address || mongoHost.address || prop.location || '',
          latitude: prop.latitude ?? mongoHost.latitude,
          longitude: prop.longitude ?? mongoHost.longitude,
          availableRooms: prop.availableRooms !== undefined ? prop.availableRooms : (mongoHost.availableRooms !== undefined ? mongoHost.availableRooms : 0),
          totalRooms: prop.totalRooms !== undefined ? prop.totalRooms : (mongoHost.totalRooms !== undefined ? mongoHost.totalRooms : 0),
          price: prop.price || mongoHost.price || '₹4,000',
          rateUnit: prop.rateUnit || mongoHost.rateUnit || '/month',
          rating: prop.rating || mongoHost.rating || 5.0,
          rules: hostRules,
          facilities: hostFacilities,
          amenities: hostFacilities,
          image: prop.image || mongoHost.image || '',
          images: prop.images || mongoHost.images || [],
          instagramVideoUrl: prop.instagramVideoUrl || mongoHost.instagramVideoUrl || '',
          description: prop.description || mongoHost.description || mongoHost.bio || '',
          property: prop,
          hostDetails: hostDet,
        },
      });
    }

    return res.json({
      success: true,
      hasProperty: false,
      host: null,
    });
  } catch (error) {
    console.error('Error checking host by email:', error);
    return next(error);
  }
};

// @desc    Request Upload / Register a Host Property (Status: Pending Approval)
// @route   POST /api/admin/hosts
// @access  Public / Admin
export const createHost = async (req, res, next) => {
  try {
    // 🔒 Strict Role Check: Reject any request from Guest users
    if (req.user && req.user.role === 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Guests cannot list or upload properties. A Property Host account is strictly required.',
      });
    }

    const {
      name,
      email,
      phone,
      password,
      propertyName,
      propertyType,
      genderType,
      location,
      roadArea,
      pincode,
      city,
      state,
      address,
      latitude,
      longitude,
      availableRooms,
      totalRooms,
      rating,
      roomRates,
      facilities,
      amenities,
      rules,
      houseRules,
      image,
      images,
      instagramVideoUrl,
      description,
      bio,
    } = req.body;

    if (!name || !email || !phone || !propertyName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Host name, email, phone, and property name.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const validPropertyTypes = ['PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat'];
    const cleanType = validPropertyTypes.find(
      (t) => t.toLowerCase() === propertyType?.trim().toLowerCase()
    ) || 'PG';

    const validGenderTypes = ['Boys', 'Girls', 'Both', 'Family'];
    const cleanGender = validGenderTypes.find(
      (g) => g.toLowerCase() === genderType?.trim().toLowerCase()
    ) || 'Both';

    const cleanImage =
      image ||
      (Array.isArray(images) && images[0]) ||
      '';

    const parsedRates = Array.isArray(roomRates)
      ? roomRates
          .map((r, i) => ({
            id: r.id || `rate_${Date.now()}_${i}`,
            type: (r.type || '').trim(),
            price: (r.price || '').trim(),
            rateUnit: r.rateUnit || '',
          }))
          .filter((r) => r.id || r.type !== '')
      : [];

    const rawFacilities = Array.isArray(facilities) && facilities.length > 0
      ? facilities
      : (Array.isArray(amenities) ? amenities : []);
    const parsedFacilities = rawFacilities.map((f) => String(f).trim()).filter(Boolean);

    const rawRules = Array.isArray(rules) && rules.length > 0
      ? rules
      : (Array.isArray(houseRules) && houseRules.length > 0
      ? houseRules
      : []);
    const parsedRules = rawRules.map((r) => String(r).trim()).filter(Boolean);

    const formattedLocation = location || (city ? `${city}, ${state || ''}`.trim() : '');
    const formattedAddress = address || [roadArea, city, state, pincode].filter(Boolean).join(', ') || formattedLocation;

    const manualRooms = Array.isArray(req.body.rooms) ? req.body.rooms : [];
    const calculatedTotalRooms = manualRooms.length > 0
      ? manualRooms.length
      : (Number(totalRooms) >= 0 ? Number(totalRooms) : 0);
    const calculatedAvailableRooms = manualRooms.length > 0
      ? manualRooms.filter((r) => r.status === 'Available').length
      : (Number(availableRooms) >= 0 ? Number(availableRooms) : 0);

    const propertyData = {
      propertyName: propertyName.trim(),
      properties: [propertyName.trim()],
      propertyType: cleanType,
      genderType: cleanGender,
      location: formattedLocation.trim(),
      roadArea: roadArea ? roadArea.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      address: formattedAddress.trim(),
      latitude: Number(latitude) || 29.3919,
      longitude: Number(longitude) || 79.4542,
      availableRooms: calculatedAvailableRooms,
      totalRooms: calculatedTotalRooms,
      price: (parsedRates.length > 0 && parsedRates[0]?.price)
        ? String(parsedRates[0].price).trim()
        : (req.body.price ? String(req.body.price).trim() : '₹4,000'),
      rateUnit: (parsedRates.length > 0 && parsedRates[0]?.rateUnit)
        ? parsedRates[0].rateUnit
        : (req.body.rateUnit || '/month'),
      rating: Number(rating) || 5.0,
      facilities: parsedFacilities,
      rules: parsedRules,
      image: cleanImage,
      images: Array.isArray(images) && images.length > 0 ? images.slice(0, 5) : (cleanImage ? [cleanImage] : []),
      instagramVideoUrl: (instagramVideoUrl || '').trim(),
      description: description ? description.trim() : (bio ? bio.trim() : ''),
    };

    const hostDetailsData = {
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      avatar: 'HO',
      role: 'host',
      status: 'Pending Approval',
    };

    // Determine status according to business requirements:
    // - If host deletes all rooms (manualRooms.length === 0): status resets to 'Pending Approval'.
    // - If host did not create its first room card yet: status is 'Pending Approval'.
    // - Only keep 'Approved' if already approved AND still has at least 1 room card inside a category.
    const existing = await Host.findOne({ email: cleanEmail });
    let targetStatus = 'Pending Approval';
    if (manualRooms.length > 0 && parsedRates.length > 0 && existing && (existing.status === 'Approved' || existing.hostDetails?.status === 'Approved')) {
      targetStatus = 'Approved';
    } else {
      targetStatus = 'Pending Approval';
    }

    hostDetailsData.status = targetStatus;

    if (manualRooms.length === 0) {
      await Stay.deleteOne({ hostEmail: cleanEmail }).catch(() => {});
    }

    const hostPayload = {
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      avatar: 'HO',
      role: 'host',
      status: targetStatus,

      // 👤 Host Account Details
      hostDetails: hostDetailsData,

      // 🏨 Property Details Sub-document (ALL property related fields live strictly inside here)
      property: propertyData,

      rooms: manualRooms,
      roomRates: parsedRates,
    };

    // 🔒 Strict Guest Check: If email exists in User collection, reject property creation
    const guestAccount = await User.findOne({ email: cleanEmail });
    if (guestAccount) {
      return res.status(403).json({
        success: false,
        message: 'This email is registered as a Guest account. Guests cannot list or upload properties. Please sign in with a Property Host account.',
      });
    }

    if (existing) {
      await Host.findOneAndUpdate(
        { email: cleanEmail },
        {
          $set: hostPayload,
          $unset: {
            propertyName: '',
            properties: '',
            propertyType: '',
            genderType: '',
            location: '',
            roadArea: '',
            pincode: '',
            city: '',
            state: '',
            address: '',
            latitude: '',
            longitude: '',
            availableRooms: '',
            totalRooms: '',
            price: '',
            rateUnit: '',
            rating: '',
            facilities: '',
            rules: '',
            image: '',
            images: '',
            instagramVideoUrl: '',
            description: '',
            bio: '',
            videos: '',
            houseRules: '',
            amenities: '',
          },
        },
        { new: true }
      );
      hostPayload._id = existing._id.toString();

      // If approved, also sync changes to Stay collection in real-time
      if (targetStatus === 'Approved') {
        const firstRate = hostPayload.roomRates?.[0];
        const basePrice = firstRate?.price
          ? (parseInt(String(firstRate.price).replace(/[^0-9]/g, '')) || 0)
          : (propertyData.price
            ? (parseInt(String(propertyData.price).replace(/[^0-9]/g, '')) || 0)
            : 3500);
        const rateUnit = firstRate?.rateUnit || propertyData.rateUnit || '/month';

        const stayDoc = {
          title: propertyData.propertyName,
          type: propertyData.propertyType,
          genderType: propertyData.genderType,
          location: propertyData.location,
          address: propertyData.address,
          roadArea: propertyData.roadArea,
          city: propertyData.city,
          state: propertyData.state,
          pincode: propertyData.pincode,
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          price: basePrice,
          rateUnit: rateUnit,
          tags: propertyData.facilities,
          facilities: propertyData.facilities,
          rules: propertyData.rules,
          roomRates: hostPayload.roomRates,
          availableRooms: hostPayload.rooms ? hostPayload.rooms.filter(r => r.status === 'Available').length : propertyData.availableRooms,
          totalRooms: hostPayload.rooms ? hostPayload.rooms.length : propertyData.totalRooms,
          rooms: hostPayload.rooms || [],
          image: propertyData.image || (propertyData.images && propertyData.images[0]) || '',
          images: propertyData.images || [],
          instagramVideoUrl: propertyData.instagramVideoUrl,
          description: propertyData.description,
          hostName: hostDetailsData.name,
          hostPhone: hostDetailsData.phone,
          hostEmail: hostDetailsData.email,
          updatedAt: new Date(),
        };
        await Stay.updateOne(
          { hostEmail: cleanEmail },
          {
            $set: stayDoc,
            $unset: { videos: '', houseRules: '', bio: '', amenities: '' },
          },
          { upsert: true }
        );
      } else {
        await Stay.deleteMany({ hostEmail: cleanEmail }).catch(() => {});
      }
    } else {
      if (!hostPayload.password && !password) {
        return res.status(400).json({
          success: false,
          message: 'Host registration required. Please register as a Property Host before listing properties.',
        });
      }
      if (password && !hostPayload.password) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        hostPayload.password = hashed;
        hostPayload.hostDetails.password = hashed;
      }
      const createdHost = await Host.create(hostPayload);
      if (createdHost) {
        hostPayload._id = createdHost._id.toString();
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Property upload request submitted successfully! Awaiting admin approval.',
      host: hostPayload,
    });
  } catch (error) {
    console.error('Error requesting host upload:', error);
    return next(error);
  }
};

// @desc    Admin Approve Host Request (Activates listing on website)
// @route   PUT /api/admin/hosts/:id/approve
// @access  Public / Admin
export const approveHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    let hostDoc = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      hostDoc = await Host.findById(id);
    } else {
      hostDoc = await Host.findOne({ $or: [{ id }, { email: id }] });
    }

    if (!hostDoc) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    // Only allow changing status from pending to approved when host has at least one room card inside at least one room category
    const hasRooms = Array.isArray(hostDoc.rooms) && hostDoc.rooms.length > 0;
    const hasCategories = Array.isArray(hostDoc.roomRates) && hostDoc.roomRates.length > 0;
    if (!hasRooms || !hasCategories) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve host: Host must have at least one room card inside at least one room category before approval.',
      });
    }

    const targetHost = await Host.findByIdAndUpdate(
      hostDoc._id,
      { status: 'Approved', 'hostDetails.status': 'Approved' },
      { new: true }
    );

    // Publish active listing to Stay database
    const p = targetHost.property || {};
    const d = targetHost.hostDetails || {};
    const cleanEmail = (d.email || targetHost.email || '').toLowerCase().trim();

    const propName = p.propertyName || targetHost.propertyName || `${d.name || targetHost.name}'s Stay`;
    const propType = p.propertyType || targetHost.propertyType || 'PG';
    const genderType = p.genderType || targetHost.genderType || 'Boys';
    const location = p.location || targetHost.location || (p.city && p.state ? `${p.city}, ${p.state}` : (p.city || ''));
    const address = p.address || targetHost.address || location;
    const roadArea = p.roadArea || targetHost.roadArea || '';
    const city = p.city || targetHost.city || '';
    const state = p.state || targetHost.state || '';
    const pincode = p.pincode || targetHost.pincode || '';
    const latitude = Number(p.latitude ?? targetHost.latitude) || 0;
    const longitude = Number(p.longitude ?? targetHost.longitude) || 0;

    const facilities = (Array.isArray(p.facilities) && p.facilities.length > 0)
      ? p.facilities
      : (Array.isArray(targetHost.facilities) && targetHost.facilities.length > 0
        ? targetHost.facilities
        : (Array.isArray(targetHost.amenities) ? targetHost.amenities : []));

    const rules = (Array.isArray(p.rules) && p.rules.length > 0)
      ? p.rules
      : (Array.isArray(targetHost.rules) && targetHost.rules.length > 0 ? targetHost.rules : []);

    const images = (Array.isArray(p.images) && p.images.length > 0)
      ? p.images
      : (Array.isArray(targetHost.images) && targetHost.images.length > 0
        ? targetHost.images
        : (p.image ? [p.image] : (targetHost.image ? [targetHost.image] : [])));
    const image = p.image || images[0] || targetHost.image || '';
    const videoUrl = p.instagramVideoUrl || targetHost.instagramVideoUrl || '';
    const description = p.description || targetHost.description || '';

    const firstRate = targetHost.roomRates?.[0];
    const basePrice = firstRate?.price
      ? (parseInt(String(firstRate.price).replace(/[^0-9]/g, '')) || 0)
      : (p.price
        ? (parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0)
        : (targetHost.price ? (parseInt(String(targetHost.price).replace(/[^0-9]/g, '')) || 0) : 0));
    const rateUnit = firstRate?.rateUnit || p.rateUnit || '/month';

    const stayPayload = {
      title: propName,
      type: propType,
      genderType: genderType,
      location: location,
      address: address,
      roadArea: roadArea,
      city: city,
      state: state,
      pincode: pincode,
      latitude: latitude,
      longitude: longitude,
      price: basePrice,
      rateUnit: rateUnit,
      rating: Number(p.rating ?? targetHost.rating) || 5.0,
      badge: 'VERIFIED HOST',
      tags: facilities,
      facilities: facilities,
      rules: rules,
      roomRates: Array.isArray(targetHost.roomRates) ? targetHost.roomRates : [],
      availableRooms: Array.isArray(targetHost.rooms)
        ? targetHost.rooms.filter((r) => r.status === 'Available').length
        : (Number(p.availableRooms ?? targetHost.availableRooms) || 0),
      totalRooms: Array.isArray(targetHost.rooms)
        ? targetHost.rooms.length
        : (Number(p.totalRooms ?? targetHost.totalRooms) || 0),
      rooms: Array.isArray(targetHost.rooms) ? targetHost.rooms : [],
      image: image,
      images: images,
      instagramVideoUrl: videoUrl,
      description: description,
      hostId: targetHost.id || targetHost._id?.toString(),
      hostName: d.name || targetHost.name,
      hostEmail: cleanEmail,
      hostPhone: d.phone || targetHost.phone,
    };

    await Stay.findOneAndUpdate(
      { hostEmail: cleanEmail },
      {
        $set: stayPayload,
        $unset: { videos: '', houseRules: '', bio: '', amenities: '' },
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: `Property "${stayPayload.title}" approved successfully and published to website!`,
      host: targetHost,
    });
  } catch (error) {
    console.error('Error approving host:', error);
    return next(error);
  }
};

// @desc    Admin Reject Host Request
// @route   PUT /api/admin/hosts/:id/reject
// @access  Public / Admin
export const rejectHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    let targetEmail = '';

    const found = await Host.findOneAndUpdate({ $or: [{ _id: id }, { id }, { email: id }] }, { status: 'Rejected' });
    if (found) targetEmail = found.email;

    // Remove published stay if any
    if (targetEmail) {
      const staysToDelete = await Stay.find({ hostEmail: targetEmail.toLowerCase() });
      const stayIds = staysToDelete.map(s => String(s._id));
      
      await Stay.deleteMany({ hostEmail: targetEmail.toLowerCase() });
      
      await Booking.deleteMany({ hostEmail: targetEmail.toLowerCase() });
      if (stayIds.length > 0) {
        await Wishlist.deleteMany({ stayId: { $in: stayIds } });
      }
    }

    return res.json({
      success: true,
      message: 'Host property request rejected.',
    });
  } catch (error) {
    console.error('Error rejecting host:', error);
    return next(error);
  }
};

// @desc    Get all users who booked this host's place (Users Visited)
// @route   GET /api/admin/hosts/my-guests/:email
// @access  Public / Host
export const getHostGuests = async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();

    const currentHost = await Host.findOne({ email: cleanEmail });
    let guestBookings = [];

    const mongoBookings = await Booking.find({
      $or: [
        { hostEmail: cleanEmail },
        { hostId: currentHost?.id },
        { hostId: currentHost?._id },
      ],
    }).sort({ createdAt: -1 }).lean();

    if (mongoBookings && mongoBookings.length > 0) {
      guestBookings = mongoBookings;
    }

    // Extract and sync offline slotBookings saved directly on host rooms
    if (currentHost && Array.isArray(currentHost.rooms)) {
      currentHost.rooms.forEach((rm) => {
        if (Array.isArray(rm.slotBookings)) {
          rm.slotBookings.forEach((sb) => {
            const rawPhone = (sb.guestPhone || sb.userPhone || sb.phone || '').trim();
            const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
            const slotRef = sb.bookingReferenceId || sb.id || sb.slotBookingId || (cleanDigits ? `BK-${cleanDigits}` : '');

            // Check if this booking is already in guestBookings
            const alreadyInGuests = guestBookings.some((gb) => {
              const gbPhone = (gb.phone || gb.userPhone || gb.guestPhone || '').replace(/\D/g, '').slice(-10);
              const gbRef = gb.bookingReferenceId || gb.slotBookingId || gb._id || gb.id;
              return (cleanDigits && gbPhone && cleanDigits === gbPhone) || (slotRef && gbRef && slotRef === gbRef);
            });

            if (!alreadyInGuests) {
              const dates = Array.isArray(sb.bookedDates) ? sb.bookedDates : [];
              const months = Array.isArray(sb.bookedMonths) ? sb.bookedMonths : [];
              const checkInDate = sb.checkIn || (dates.length > 0 ? `${dates[0]} (12:00 PM)` : '');
              const checkOutDate = sb.checkOut || (dates.length > 0 ? `${dates[dates.length - 1]} (11:59 AM)` : '');
              const checkInISO = sb.checkInISO || (dates.length > 0 ? dates[0] : (months.length > 0 ? `${months[0]}-01` : ''));
              const checkOutISO = sb.checkOutISO || (dates.length > 0 ? dates[dates.length - 1] : '');

              const offlineBooking = {
                _id: sb.id || sb.slotBookingId || (cleanDigits ? `book_${cleanDigits}` : `book_${Date.now()}`),
                id: sb.id || sb.slotBookingId || (cleanDigits ? `book_${cleanDigits}` : `book_${Date.now()}`),
                bookingId: sb.id || sb.slotBookingId || (cleanDigits ? `book_${cleanDigits}` : `book_${Date.now()}`),
                bookingReferenceId: slotRef || `STAY-${Math.floor(100000 + Math.random() * 900000)}`,
                slotBookingId: sb.slotBookingId || sb.id || `res_${cleanDigits}`,
                stayId: currentHost.id || currentHost._id || '',
                stayTitle: currentHost.propertyName || 'Host Property',
                roomNumber: rm.roomNumber || '',
                roomType: rm.type || '',
                hostEmail: currentHost.email || cleanEmail,
                hostId: currentHost.id || currentHost._id || '',
                fullName: sb.guestName || sb.userName || sb.fullName || 'Offline Guest',
                userName: sb.userName || sb.guestName || sb.fullName || 'Offline Guest',
                guestName: sb.guestName || sb.userName || sb.fullName || 'Offline Guest',
                phone: rawPhone,
                userPhone: rawPhone,
                guestPhone: rawPhone,
                email: sb.guestEmail || sb.userEmail || sb.email || '',
                userEmail: sb.userEmail || sb.guestEmail || sb.email || '',
                guestEmail: sb.guestEmail || sb.userEmail || sb.email || '',
                guestAadhar: sb.guestAadhar || sb.aadharId || '',
                aadharId: sb.aadharId || sb.guestAadhar || '',
                adults: Number(sb.adults) || 1,
                children: Number(sb.children) || 0,
                gender: sb.guestGender || sb.userGender || sb.gender || 'Male',
                guestGender: sb.guestGender || sb.userGender || sb.gender || 'Male',
                bookedDates: dates,
                bookedMonths: months,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                checkInISO: checkInISO,
                checkOutISO: checkOutISO,
                rateUnit: sb.rateUnit || rm.rateUnit || '/night',
                totalAmount: sb.totalAmount || 0,
                status: sb.status || 'CONFIRMED',
                bookingSource: 'OFFLINE_HOST',
                createdAt: sb.createdAt || new Date().toISOString(),
              };

              guestBookings.push(offlineBooking);
            }
          });
        }
      });
    }

    const formatAadhar = (val) => {
      if (!val) return '';
      const digits = String(val).replace(/\D/g, '').slice(0, 12);
      if (digits.length === 12) {
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
      }
      return String(val).trim();
    };

    const formattedGuests = guestBookings.map((b) => ({
      _id: b._id?.toString() || b.id || b.bookingReferenceId,
      id: b._id?.toString() || b.id || b.bookingReferenceId,
      bookingId: b._id?.toString() || b.id || b.bookingReferenceId,
      bookingReferenceId: b.bookingReferenceId || 'STAY-94820',
      slotBookingId: b.slotBookingId || '',
      roomNumber: b.roomNumber || '',
      roomType: b.roomType || '',
      bookedDates: Array.isArray(b.bookedDates) ? b.bookedDates : [],
      bookedMonths: Array.isArray(b.bookedMonths) ? b.bookedMonths : [],
      rateUnit: b.rateUnit || '',
      checkIn: b.checkIn || '',
      checkOut: b.checkOut || '',
      checkInISO: b.checkInISO || '',
      checkOutISO: b.checkOutISO || '',
      email: b.email || b.userEmail || b.guestEmail || '',
      userEmail: b.userEmail || b.email || b.guestEmail || '',
      guestEmail: b.guestEmail || b.email || '',
      userName: b.fullName || b.userName || b.guestName || 'Guest User',
      fullName: b.fullName || b.userName || b.guestName || 'Guest User',
      contactNo: b.phone || b.userPhone || b.guestPhone || '—',
      phone: b.phone || b.userPhone || b.guestPhone || '',
      userPhone: b.userPhone || b.phone || b.guestPhone || '',
      guestPhone: b.guestPhone || b.phone || b.userPhone || '',
      guestAadhar: formatAadhar(b.guestAadhar || b.aadharId),
      aadharId: formatAadhar(b.aadharId || b.guestAadhar),
      adults: Number(b.adults) || 1,
      children: Number(b.children) || 0,
      gender: b.guestGender || b.gender || 'Male',
      guestGender: b.guestGender || b.gender || 'Male',
      moveInDate: b.moveInDate || b.checkInISO || '2026-08-25',
      duration: b.durationDisplay || (b.durationMonths ? `${b.durationMonths} Months` : '3 Months'),
      durationMonths: b.durationMonths || 3,
      durationDays: b.durationDays || 0,
      totalAmount: b.totalAmount || 0,
      sharingType: b.sharingType || b.roomType || 'Double Sharing',
      stayTitle: b.stayTitle || currentHost?.propertyName || 'Property Stay',
      status: b.status || 'CONFIRMED',
      bookingSource: b.bookingSource || 'ONLINE',
      createdAt: b.createdAt || new Date().toISOString(),
    }));

    return res.json({
      success: true,
      count: formattedGuests.length,
      guests: formattedGuests,
    });
  } catch (error) {
    console.error('Error fetching host guests:', error);
    return next(error);
  }
};

// @desc    Delete a host by ID from MongoDB and persistent storage
// @route   DELETE /api/admin/hosts/:id
// @access  Public / Admin
export const deleteHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    let mongoDeleted = false;
    let targetEmail = '';

    if (mongoose.Types.ObjectId.isValid(id)) {
      const resMongo = await Host.findByIdAndDelete(id);
      if (resMongo) {
        mongoDeleted = true;
        targetEmail = resMongo.email;
      }
    } else {
      const resMongo = await Host.findOneAndDelete({ $or: [{ id }, { email: id }] });
      if (resMongo) {
        mongoDeleted = true;
        targetEmail = resMongo.email;
      }
    }

    // Remove published stay if any
    if (targetEmail) {
      const staysToDelete = await Stay.find({ hostEmail: targetEmail.toLowerCase() });
      const stayIds = staysToDelete.map(s => String(s._id));
      
      await Stay.deleteMany({ hostEmail: targetEmail.toLowerCase() });
      
      // Also clean up wishlists and bookings associated with this host's stays
      await Booking.deleteMany({ hostEmail: targetEmail.toLowerCase() });
      if (stayIds.length > 0) {
        await Wishlist.deleteMany({ stayId: { $in: stayIds } });
      }
    }

    return res.json({
      success: true,
      message: `Host deleted permanently from database.`,
      deletedId: id,
      mongoDeleted,
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

// @desc    Admin Direct Portal Login / Impersonation (No password required)
// @route   POST /api/admin/impersonate
// @access  Public / Admin
export const impersonateAccount = async (req, res, next) => {
  try {
    const { email, role, id } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const isHost = role === 'host';

    let targetAccount = null;

    if (isHost) {
      const query = {
        $or: [
          ...(id && mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
          ...(id ? [{ id }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      };
      targetAccount = await Host.findOne(query);

      if (!targetAccount) {
        return res.status(404).json({ success: false, message: 'Host account not found in database' });
      }

      const safeHost = {
        _id: targetAccount._id?.toString() || targetAccount.id,
        id: targetAccount._id?.toString() || targetAccount.id,
        name: targetAccount.name,
        email: targetAccount.email,
        phone: targetAccount.phone,
        avatar: targetAccount.avatar || targetAccount.name?.slice(0, 2).toUpperCase(),
        role: 'host',
        status: targetAccount.status || 'Approved',
        propertyName: targetAccount.propertyName,
      };

      const token = generateToken(safeHost);
      return res.json({
        success: true,
        message: `Admin switched to Host session: ${safeHost.name}`,
        user: safeHost,
        token,
      });
    } else {
      const query = {
        $or: [
          ...(id && mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
          ...(id ? [{ id }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      };
      targetAccount = await User.findOne(query);

      if (!targetAccount) {
        return res.status(404).json({ success: false, message: 'User account not found in database' });
      }

      const safeUser = {
        _id: targetAccount._id?.toString() || targetAccount.id,
        id: targetAccount._id?.toString() || targetAccount.id,
        name: targetAccount.name,
        email: targetAccount.email,
        phone: targetAccount.phone,
        avatar: targetAccount.avatar || targetAccount.name?.slice(0, 2).toUpperCase(),
        role: 'user',
      };

      const token = generateToken(safeUser);
      return res.json({
        success: true,
        message: `Admin switched to User session: ${safeUser.name}`,
        user: safeUser,
        token,
      });
    }
  } catch (error) {
    console.error('Impersonate Account Error:', error);
    return next(error);
  }
};
