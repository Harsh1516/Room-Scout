import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';
import { generateToken } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');
const BOOKINGS_FILE = path.join(__dirname, '../data/bookings_store.json');

// Helper to read & write local persistent users
function readUsersFromFile() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
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

// Helper to read & write local persistent hosts
function readHostsFromFile() {
  try {
    if (!fs.existsSync(HOSTS_FILE)) {
      return [];
    }
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

// Helper to read & write local persistent bookings
function readBookingsFromFile() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) {
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

// @desc    Get all users list from database (Guest & Student accounts only)
// @route   GET /api/admin/users
// @access  Public / Admin
export const getUsers = async (req, res, next) => {
  try {
    let usersList = [];
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        const mongoUsers = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
        if (mongoUsers && mongoUsers.length > 0) {
          usersList = mongoUsers.map((u) => ({
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
        }
      } catch (err) {
        console.warn('Could not read users from MongoDB:', err.message);
      }
    }

    // Merge or fallback to persistent JSON storage
    const fileUsers = readUsersFromFile();
    const existingEmails = new Set(usersList.map((u) => u.email.toLowerCase()));

    fileUsers.forEach((u) => {
      if (!existingEmails.has(u.email.toLowerCase())) {
        usersList.push({
          _id: u._id || u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          avatar: u.avatar || u.name?.slice(0, 2).toUpperCase() || 'US',
          role: u.role || 'user',
          createdAt: u.createdAt || new Date(),
          status: u.status || 'Active',
          source: 'Database Store',
        });
      }
    });

    // Filter to only guest / student user accounts
    const finalUsers = usersList.filter((u) => u.role !== 'host');

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

    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const resMongo = await User.findByIdAndDelete(id);
          if (resMongo) mongoDeleted = true;
        } else {
          const resMongo = await User.deleteMany({ $or: [{ _id: id }, { email: id }] });
          if (resMongo.deletedCount > 0) mongoDeleted = true;
        }
      } catch (mongoErr) {
        console.warn('Mongo delete user error:', mongoErr.message);
      }
    }

    const fileUsers = readUsersFromFile();
    const updatedUsers = fileUsers.filter(
      (u) => String(u._id) !== String(id) && String(u.id) !== String(id) && String(u.email) !== String(id)
    );
    writeUsersToFile(updatedUsers);

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
    let hostsList = [];

    const normalizeRateUnit = (unit) => {
      if (!unit) return '/month';
      const u = String(unit).toLowerCase().trim();
      return (u.includes('night') || u.includes('day')) ? '/night' : '/month';
    };

    // 1. Read from MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const mongoHosts = await Host.find({}).sort({ createdAt: -1 }).lean();
        if (mongoHosts && mongoHosts.length > 0) {
          hostsList = mongoHosts.map((h) => ({
            id: h._id?.toString() || h.id,
            _id: h._id?.toString(),
            name: h.name,
            email: h.email,
            phone: h.phone,
            propertyName: h.propertyName || (h.properties && h.properties[0]) || `${h.name}'s Stay`,
            properties: h.properties || (h.propertyName ? [h.propertyName] : []),
            propertyType: h.propertyType || 'PG',
            genderType: h.genderType || 'Both',
            location: h.location,
            address: h.address || h.location,
            availableRooms: h.availableRooms !== undefined ? h.availableRooms : 0,
            totalRooms: h.totalRooms !== undefined ? h.totalRooms : 0,
            rating: h.rating || 4.8,
            price: h.price || '₹4,000',
            rateUnit: normalizeRateUnit(h.rateUnit),
            roomRates: (h.roomRates || []).map((r) => ({
              ...r,
              rateUnit: normalizeRateUnit(r.rateUnit),
            })),
            rooms: (h.rooms || []).map((rm) => ({
              ...rm,
              rateUnit: normalizeRateUnit(rm.rateUnit),
            })),
            amenities: h.amenities || ['Wifi', 'Attached Bath', 'Power Backup'],
            image: h.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            images: h.images || [],
            status: h.status || 'Pending Approval',
            description: h.description || h.bio || '',
            bio: h.bio || h.description || '',
            createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : (h.joinedDate || '2026-08-25T10:00:00.000Z'),
            joinedDate: h.createdAt ? new Date(h.createdAt).toISOString() : (h.joinedDate || '2026-08-25T10:00:00.000Z'),
          }));
        }
      } catch (err) {
        console.warn('Mongo read hosts error:', err.message);
      }
    }

    // 2. Merge with persistent JSON file store
    const fileHosts = readHostsFromFile();
    const existingEmails = new Set(hostsList.map((h) => h.email.toLowerCase()));

    fileHosts.forEach((h) => {
      if (!existingEmails.has(h.email.toLowerCase())) {
        hostsList.push({
          ...h,
          id: h.id || h._id,
          rateUnit: normalizeRateUnit(h.rateUnit),
          roomRates: (h.roomRates || []).map((r) => ({
            ...r,
            rateUnit: normalizeRateUnit(r.rateUnit),
          })),
          rooms: (h.rooms || []).map((rm) => ({
            ...rm,
            rateUnit: normalizeRateUnit(rm.rateUnit),
          })),
        });
      }
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

    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const mongoHost = await Host.findOne({ email: cleanEmail }).lean();
        if (mongoHost) {
          return res.json({
            success: true,
            hasProperty: true,
            host: {
              ...mongoHost,
              id: mongoHost._id?.toString() || mongoHost.id,
            },
          });
        }
      } catch (err) {
        console.warn('Mongo host check error:', err.message);
      }
    }

    // Check persistent file store
    const fileHosts = readHostsFromFile();
    const foundHost = fileHosts.find((h) => h.email.toLowerCase() === cleanEmail);

    if (foundHost) {
      return res.json({
        success: true,
        hasProperty: true,
        host: foundHost,
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
      amenities,
      rules,
      houseRules,
      image,
      images,
      videos,
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
            rateUnit: r.rateUnit || '/month',
          }))
          .filter((r) => r.type !== '')
      : [];

    const parsedAmenities = Array.isArray(amenities)
      ? amenities.map((a) => String(a).trim()).filter(Boolean)
      : [];

    const parsedRules = Array.isArray(rules) && rules.length > 0
      ? rules.map((r) => String(r).trim()).filter(Boolean)
      : (Array.isArray(houseRules) && houseRules.length > 0
      ? houseRules.map((r) => String(r).trim()).filter(Boolean)
      : []);

    const formattedLocation = location || (city ? `${city}, ${state || ''}`.trim() : '');
    const formattedAddress = address || [roadArea, city, state, pincode].filter(Boolean).join(', ') || formattedLocation;

    const manualRooms = Array.isArray(req.body.rooms) ? req.body.rooms : [];
    const calculatedTotalRooms = manualRooms.length > 0
      ? manualRooms.length
      : (Number(totalRooms) >= 0 ? Number(totalRooms) : 0);
    const calculatedAvailableRooms = manualRooms.length > 0
      ? manualRooms.filter((r) => r.status === 'Available').length
      : (Number(availableRooms) >= 0 ? Number(availableRooms) : 0);

    const fileHosts = readHostsFromFile();
    const existingIdx = fileHosts.findIndex((h) => h.email.toLowerCase() === cleanEmail);
    const existingHost = existingIdx >= 0 ? fileHosts[existingIdx] : null;

    const stableId = existingHost?.id || req.body.id || req.body._id || ('host_' + Date.now());
    const prevIds = Array.isArray(existingHost?.previousIds) ? [...existingHost.previousIds] : [];
    if (existingHost?.id && !prevIds.includes(existingHost.id)) prevIds.push(existingHost.id);
    if (existingHost?._id && !prevIds.includes(existingHost._id)) prevIds.push(existingHost._id);
    if (req.body.id && !prevIds.includes(req.body.id)) prevIds.push(req.body.id);

    const hostPayload = {
      id: stableId,
      _id: existingHost?._id || stableId,
      previousIds: prevIds,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
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
      price: req.body.price ? String(req.body.price).trim() : (parsedRates[0]?.price || '₹4,000'),
      rateUnit: req.body.rateUnit || parsedRates[0]?.rateUnit || '/month',
      rating: Number(rating) || 5.0,
      roomRates: parsedRates,
      amenities: parsedAmenities,
      rules: parsedRules,
      image: cleanImage,
      images: Array.isArray(images) && images.length > 0 ? images.slice(0, 5) : (cleanImage ? [cleanImage] : []),
      videos: Array.isArray(videos) ? videos : [],
      instagramVideoUrl: (instagramVideoUrl || '').trim(),
      rooms: manualRooms,
      status: 'Pending Approval',
      description: description ? description.trim() : (bio ? bio.trim() : ''),
      bio: bio ? bio.trim() : (description ? description.trim() : ''),
      createdAt: new Date().toISOString(),
      joinedDate: new Date().toISOString(),
    };

    // Sync name, phone and password in User store
    const fileUsers = readUsersFromFile();
    const userIdx = fileUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (userIdx >= 0) {
      if (hostPayload.name) fileUsers[userIdx].name = hostPayload.name;
      if (hostPayload.phone) fileUsers[userIdx].phone = hostPayload.phone;
      if (password && password.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        fileUsers[userIdx].password = await bcrypt.hash(password, salt);
      }
      writeUsersToFile(fileUsers);
    }

    // Save to MongoDB if connected (update if exists, else create)
    if (mongoose.connection.readyState === 1) {
      try {
        // Sync Host's name & phone in User collection as well
        await User.updateOne(
          { email: cleanEmail },
          { $set: { name: hostPayload.name, phone: hostPayload.phone } }
        ).catch(() => {});

        const existing = await Host.findOne({ email: cleanEmail });
        if (existing) {
          // If already approved, preserve approved status
          if (existing.status === 'Approved') {
            hostPayload.status = 'Approved';
          }
          Object.assign(existing, hostPayload);
          await existing.save();
          hostPayload._id = existing._id.toString();

          // If approved, also sync changes to Stay collection in real-time
          if (existing.status === 'Approved') {
            const basePrice =
              parseInt(String(hostPayload.price || hostPayload.roomRates?.[0]?.price || '3500').replace(/[^0-9]/g, '')) || 3500;
            const stayDoc = {
              title: hostPayload.propertyName,
              type: hostPayload.propertyType,
              genderType: hostPayload.genderType,
              location: hostPayload.location,
              address: hostPayload.address,
              roadArea: hostPayload.roadArea,
              city: hostPayload.city,
              state: hostPayload.state,
              pincode: hostPayload.pincode,
              latitude: hostPayload.latitude,
              longitude: hostPayload.longitude,
              price: basePrice,
              rateUnit: hostPayload.rateUnit || '/month',
              tags: hostPayload.amenities,
              rules: hostPayload.rules,
              roomRates: hostPayload.roomRates,
              availableRooms: hostPayload.availableRooms,
              totalRooms: hostPayload.totalRooms,
              rooms: hostPayload.rooms || [],
              image: hostPayload.image,
              images: hostPayload.images,
              videos: hostPayload.videos,
              instagramVideoUrl: hostPayload.instagramVideoUrl,
              description: hostPayload.description,
              hostName: hostPayload.name,
              hostPhone: hostPayload.phone,
              hostEmail: hostPayload.email,
              updatedAt: new Date(),
            };
            await Stay.updateOne({ hostEmail: cleanEmail }, { $set: stayDoc }, { upsert: true });
          }
        } else {
          const createdHost = await Host.create(hostPayload);
          if (createdHost) {
            hostPayload._id = createdHost._id.toString();
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB host save error:', dbErr.message);
      }
    }

    // Save/Update in persistent file store
    const fileHostsAfter = readHostsFromFile();
    const existingIdxAfter = fileHostsAfter.findIndex((h) => h.email.toLowerCase() === cleanEmail);
    if (existingIdxAfter >= 0) {
      if (fileHostsAfter[existingIdxAfter].status === 'Approved') {
        hostPayload.status = 'Approved';
      }
      const mergedPrevIds = Array.from(
        new Set([
          ...(fileHostsAfter[existingIdxAfter].previousIds || []),
          ...(hostPayload.previousIds || []),
          fileHostsAfter[existingIdxAfter].id,
          fileHostsAfter[existingIdxAfter]._id,
        ].filter(Boolean))
      );
      fileHostsAfter[existingIdxAfter] = {
        ...fileHostsAfter[existingIdxAfter],
        ...hostPayload,
        id: hostPayload.id,
        _id: hostPayload._id,
        previousIds: mergedPrevIds,
      };
    } else {
      fileHostsAfter.unshift(hostPayload);
    }
    writeHostsToFile(fileHostsAfter);

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
    let targetHost = null;

    // 1. Update in MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          targetHost = await Host.findByIdAndUpdate(id, { status: 'Approved' }, { new: true });
        } else {
          targetHost = await Host.findOneAndUpdate(
            { $or: [{ id }, { email: id }] },
            { status: 'Approved' },
            { new: true }
          );
        }
      } catch (err) {
        console.warn('Mongo approve error:', err.message);
      }
    }

    // 2. Update in persistent file store
    const fileHosts = readHostsFromFile();
    const hostIdx = fileHosts.findIndex(
      (h) => String(h.id) === String(id) || String(h._id) === String(id) || String(h.email) === String(id)
    );

    if (hostIdx >= 0) {
      fileHosts[hostIdx].status = 'Approved';
      if (!targetHost) targetHost = fileHosts[hostIdx];
      writeHostsToFile(fileHosts);
    }

    if (!targetHost) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }

    // 3. Publish active listing to Stay database with exact manual fields
    const basePrice = targetHost.price
      ? (parseInt(String(targetHost.price).replace(/[^0-9]/g, '')) || 0)
      : (targetHost.roomRates?.[0]?.price
        ? (parseInt(String(targetHost.roomRates[0].price).replace(/[^0-9]/g, '')) || 0)
        : 0);

    const stayPayload = {
      title: targetHost.propertyName || `${targetHost.name}'s Stay`,
      type: targetHost.propertyType || '',
      genderType: targetHost.genderType || '',
      location: targetHost.location || '',
      address: targetHost.address || targetHost.location || '',
      roadArea: targetHost.roadArea || '',
      city: targetHost.city || '',
      state: targetHost.state || '',
      pincode: targetHost.pincode || '',
      latitude: Number(targetHost.latitude) || 0,
      longitude: Number(targetHost.longitude) || 0,
      price: basePrice,
      rating: Number(targetHost.rating) || 5.0,
      badge: 'VERIFIED HOST',
      tags: Array.isArray(targetHost.amenities) ? targetHost.amenities : [],
      roomRates: Array.isArray(targetHost.roomRates) ? targetHost.roomRates : [],
      availableRooms: Number(targetHost.availableRooms) || 0,
      totalRooms: Number(targetHost.totalRooms) || 0,
      rooms: Array.isArray(targetHost.rooms) ? targetHost.rooms : [],
      image: targetHost.image || targetHost.images?.[0] || '',
      images: Array.isArray(targetHost.images) ? targetHost.images : (targetHost.image ? [targetHost.image] : []),
      videos: targetHost.videos || [],
      instagramVideoUrl: targetHost.instagramVideoUrl || '',
      description: targetHost.description || targetHost.bio || '',
      hostId: targetHost.id || targetHost._id?.toString(),
      hostName: targetHost.name,
      hostEmail: targetHost.email ? targetHost.email.toLowerCase() : '',
      hostPhone: targetHost.phone,
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const cleanEmail = targetHost.email ? targetHost.email.toLowerCase() : '';
        const existingStay = await Stay.findOne({ hostEmail: cleanEmail });
        if (existingStay) {
          Object.assign(existingStay, stayPayload);
          await existingStay.save();
        } else {
          await Stay.create(stayPayload);
        }
      } catch (stayErr) {
        console.warn('Stay publish error:', stayErr.message);
      }
    }

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

    if (mongoose.connection.readyState === 1) {
      try {
        const found = await Host.findOneAndUpdate({ $or: [{ _id: id }, { id }, { email: id }] }, { status: 'Rejected' });
        if (found) targetEmail = found.email;
      } catch (err) {
        console.warn('Mongo reject error:', err.message);
      }
    }

    const fileHosts = readHostsFromFile();
    const hostIdx = fileHosts.findIndex(
      (h) => String(h.id) === String(id) || String(h._id) === String(id) || String(h.email) === String(id)
    );
    if (hostIdx >= 0) {
      fileHosts[hostIdx].status = 'Rejected';
      if (!targetEmail) targetEmail = fileHosts[hostIdx].email;
      writeHostsToFile(fileHosts);
    }

    // Remove published stay if any
    if (targetEmail) {
      if (mongoose.connection.readyState === 1) {
        await Stay.deleteMany({ hostEmail: targetEmail.toLowerCase() });
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

    // Get host details to match property name
    const fileHosts = readHostsFromFile();
    const currentHost = fileHosts.find((h) => h.email.toLowerCase() === cleanEmail);
    const hostPropName = currentHost?.propertyName?.toLowerCase() || '';

    let guestBookings = [];

    // 1. Check MongoDB Bookings
    if (mongoose.connection.readyState === 1) {
      try {
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
      } catch (mongoErr) {
        console.warn('Mongo guest search error:', mongoErr.message);
      }
    }

    // 2. Check persistent file bookings
    const fileBookings = readBookingsFromFile();
    const existingBookingIds = new Set(guestBookings.map((b) => String(b._id || b.bookingReferenceId)));

    fileBookings.forEach((b) => {
      const matchEmail = b.hostEmail && b.hostEmail.toLowerCase() === cleanEmail;
      const matchStayTitle = hostPropName && b.stayTitle && b.stayTitle.toLowerCase().includes(hostPropName);

      if ((matchEmail || matchStayTitle) && !existingBookingIds.has(String(b._id || b.bookingReferenceId))) {
        guestBookings.push(b);
        existingBookingIds.add(String(b._id || b.bookingReferenceId));
      }
    });

    // 3. Extract and sync offline slotBookings saved directly on host rooms
    let hasNewOfflineBookings = false;
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

              // Auto-persist into fileBookings so it is permanently in database
              const alreadyInFile = fileBookings.some((fb) => {
                const fbPhone = (fb.phone || fb.userPhone || fb.guestPhone || '').replace(/\D/g, '').slice(-10);
                const fbRef = fb.bookingReferenceId || fb.slotBookingId || fb._id || fb.id;
                return (cleanDigits && fbPhone && cleanDigits === fbPhone) || (slotRef && fbRef && slotRef === fbRef);
              });
              if (!alreadyInFile) {
                fileBookings.push(offlineBooking);
                hasNewOfflineBookings = true;
              }

              // Also persist in Mongo if ready
              if (mongoose.connection.readyState === 1) {
                Booking.create(offlineBooking).catch((mErr) => {
                  console.warn('Mongo offline booking sync error:', mErr.message);
                });
              }
            }
          });
        }
      });
    }

    if (hasNewOfflineBookings) {
      writeBookingsToFile(fileBookings);
    }

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
      guestAadhar: b.guestAadhar || b.aadharId || '',
      aadharId: b.aadharId || b.guestAadhar || '',
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

    if (mongoose.connection.readyState === 1) {
      try {
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
      } catch (mongoErr) {
        console.warn('Mongo delete host error:', mongoErr.message);
      }
    }

    const fileHosts = readHostsFromFile();
    const hostIdx = fileHosts.findIndex(
      (h) => String(h.id) === String(id) || String(h._id) === String(id) || String(h.email) === String(id)
    );
    if (hostIdx >= 0) {
      if (!targetEmail) targetEmail = fileHosts[hostIdx].email;
    }
    const updatedHosts = fileHosts.filter(
      (h) => String(h.id) !== String(id) && String(h._id) !== String(id) && String(h.email) !== String(id)
    );
    writeHostsToFile(updatedHosts);

    // Remove published stay if any
    if (targetEmail) {
      if (mongoose.connection.readyState === 1) {
        try {
          await Stay.deleteMany({ hostEmail: targetEmail.toLowerCase() });
        } catch (sErr) {
          console.warn('Stay delete on host delete error:', sErr.message);
        }
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
    const fileUsers = readUsersFromFile();
    const fileHosts = readHostsFromFile();
    let mongoUsersCount = 0;
    let mongoHostsCount = 0;
    let mongoStaysCount = 0;
    let mongoBookingsCount = 0;

    if (mongoose.connection.readyState === 1) {
      try {
        mongoUsersCount = await User.countDocuments({ role: { $ne: 'host' } });
        mongoHostsCount = await Host.countDocuments();
        mongoStaysCount = await Stay.countDocuments();
        mongoBookingsCount = await Booking.countDocuments();
      } catch (err) {
        console.warn('Mongo count error:', err.message);
      }
    }

    const totalUsers = Math.max(mongoUsersCount, fileUsers.filter((u) => u.role !== 'host').length);
    const totalHosts = Math.max(mongoHostsCount, fileHosts.length);
    const totalStays = mongoStaysCount;
    const totalBookings = Math.max(mongoBookingsCount, 12);

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
    const isDbConnected = mongoose.connection.readyState === 1;

    let targetAccount = null;

    if (isHost) {
      if (isDbConnected) {
        const query = {
          $or: [
            ...(id && mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
            ...(id ? [{ id }] : []),
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        };
        targetAccount = await Host.findOne(query);
      }

      if (!targetAccount) {
        const fileHosts = readHostsFromFile();
        targetAccount = fileHosts.find(
          (h) => (id && (String(h.id) === String(id) || String(h._id) === String(id))) || (cleanEmail && h.email.toLowerCase() === cleanEmail)
        );
      }

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
      if (isDbConnected) {
        const query = {
          $or: [
            ...(id && mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
            ...(id ? [{ id }] : []),
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        };
        targetAccount = await User.findOne(query);
      }

      if (!targetAccount) {
        const fileUsers = readUsersFromFile();
        targetAccount = fileUsers.find(
          (u) => (id && (String(u.id) === String(id) || String(u._id) === String(id))) || (cleanEmail && u.email.toLowerCase() === cleanEmail)
        );
      }

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
