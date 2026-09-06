import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 👤 Default Host Details Sub-Schema
const hostDetailsSubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add host name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add host email'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add contact number'],
      trim: true,
    },
    password: {
      type: String,
    },
    avatar: {
      type: String,
      default: 'HO',
    },
    role: {
      type: String,
      default: 'host',
    },
    status: {
      type: String,
      enum: ['Active', 'Pending Approval', 'Approved', 'Rejected', 'Draft'],
      default: 'Draft',
    },
  },
  { _id: false }
);

// 🏨 Default Property Sub-Schema
const propertySubSchema = new mongoose.Schema(
  {
    propertyName: {
      type: String,
      trim: true,
      default: '',
    },
    properties: [
      {
        type: String,
        trim: true,
      },
    ],
    propertyType: {
      type: String,
      enum: ['PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat'],
      default: 'PG',
    },
    genderType: {
      type: String,
      enum: ['Boys', 'Girls', 'Both', 'Family'],
      default: 'Boys',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    roadArea: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    availableRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    price: {
      type: mongoose.Schema.Types.Mixed,
      default: '₹4,000',
    },
    rateUnit: {
      type: String,
      default: '/month',
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    rules: [
      {
        type: String,
        trim: true,
      },
    ],
    image: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    instagramVideoUrl: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

// 🛏️ Option A: Clean Room Inventory Sub-Schema (Zero Booking/Guest Duplication)
const roomSubSchema = new mongoose.Schema(
  {
    id: { type: String },
    roomNumber: { type: String, trim: true },
    roomNumInt: { type: Number },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Maintenance'],
      default: 'Available',
    },
    type: { type: String, trim: true },
    price: { type: mongoose.Schema.Types.Mixed, default: '₹4,000' },
    rateUnit: { type: String, default: '/month' },
    floor: { type: String, trim: true },
    bookedDates: [{ type: String }],
    bookedMonths: [{ type: String }],
  },
  { _id: false }
);

const hostSchema = new mongoose.Schema(
  {
    // 🏛️ Domain Sub-documents
    hostDetails: {
      type: hostDetailsSubSchema,
      required: true,
    },
    property: {
      type: propertySubSchema,
      required: true,
    },
    rooms: [roomSubSchema],
    roomRates: [
      {
        id: { type: String },
        type: { type: String },
        price: { type: mongoose.Schema.Types.Mixed },
        rateUnit: { type: String, default: '/month' },
      },
    ],

    // Root account identifiers for index & authentication lookups
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
    },
    avatar: {
      type: String,
      default: 'HO',
    },
    role: {
      type: String,
      default: 'host',
    },
    status: {
      type: String,
      enum: ['Active', 'Pending Approval', 'Approved', 'Rejected', 'Draft'],
      default: 'Draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Bcrypt Password Encryption Pre-Save Hook & Structure Normalization
hostSchema.pre('save', async function (next) {
  // Sync hostDetails
  const currentName = this.name || this.hostDetails?.name || '';
  const currentEmail = (this.email || this.hostDetails?.email || '').toLowerCase().trim();
  const currentPhone = this.phone || this.hostDetails?.phone || '';
  const currentAvatar = this.avatar || this.hostDetails?.avatar || 'HO';
  const currentRole = this.role || this.hostDetails?.role || 'host';
  const currentStatus = this.status || this.hostDetails?.status || 'Pending Approval';
  let currentPassword = this.password || this.hostDetails?.password || '';

  if (currentPassword) {
    const isBcrypt = /^\$2[abxy]\$\d+\$/.test(currentPassword);
    if (!isBcrypt) {
      const salt = await bcrypt.genSalt(10);
      currentPassword = await bcrypt.hash(currentPassword, salt);
    }
  }

  this.name = currentName;
  this.email = currentEmail;
  this.phone = currentPhone;
  this.avatar = currentAvatar;
  this.role = currentRole;
  this.status = currentStatus;
  this.password = currentPassword;

  this.hostDetails = {
    name: currentName,
    email: currentEmail,
    phone: currentPhone,
    password: currentPassword,
    avatar: currentAvatar,
    role: currentRole,
    status: currentStatus,
  };

  // Sync property subdocument
  const p = this.property || {};
  const currentPropName = p.propertyName || '';
  const currentProps = (Array.isArray(p.properties) && p.properties.length > 0)
    ? p.properties
    : (currentPropName ? [currentPropName] : []);
  const currentPropType = p.propertyType || 'PG';
  const currentGenderType = p.genderType || 'Boys';
  const currentLocation = p.location || '';
  const currentRoadArea = p.roadArea || '';
  const currentPincode = p.pincode || '';
  const currentCity = p.city || '';
  const currentState = p.state || '';
  const currentAddress = p.address || '';
  const currentLat = p.latitude ?? 29.3919;
  const currentLng = p.longitude ?? 79.4542;
  const currentRoomsList = Array.isArray(this.rooms) ? this.rooms : (p.rooms || []);
  const currentTotalRooms = currentRoomsList.length > 0 ? currentRoomsList.length : (p.totalRooms ?? 0);
  const currentAvailRooms = currentRoomsList.length > 0
    ? currentRoomsList.filter((r) => r.status === 'Available').length
    : (p.availableRooms ?? 0);
  const currentPrice = p.price || (this.roomRates?.[0]?.price || '₹4,000');
  const currentRateUnit = p.rateUnit || (this.roomRates?.[0]?.rateUnit || '/month');
  const currentRating = p.rating ?? 5.0;
  const currentFacilities = (Array.isArray(p.facilities) && p.facilities.length > 0)
    ? p.facilities
    : [];
  const currentRules = (Array.isArray(p.rules) && p.rules.length > 0)
    ? p.rules
    : [];
  const currentImages = (Array.isArray(p.images) && p.images.length > 0)
    ? p.images
    : [];
  const currentImage = p.image || currentImages[0] || '';
  const currentVideoUrl = p.instagramVideoUrl || '';
  const currentDesc = p.description || '';

  this.property = {
    propertyName: currentPropName,
    properties: currentProps,
    propertyType: currentPropType,
    genderType: currentGenderType,
    location: currentLocation,
    roadArea: currentRoadArea,
    pincode: currentPincode,
    city: currentCity,
    state: currentState,
    address: currentAddress,
    latitude: currentLat,
    longitude: currentLng,
    availableRooms: currentAvailRooms,
    totalRooms: currentTotalRooms,
    price: currentPrice,
    rateUnit: currentRateUnit,
    rating: currentRating,
    facilities: currentFacilities,
    rules: currentRules,
    image: currentImage,
    images: currentImages,
    instagramVideoUrl: currentVideoUrl,
    description: currentDesc,
  };

  this.rooms = currentRoomsList;
  if (!Array.isArray(this.roomRates)) {
    this.roomRates = [];
  }

  if (typeof next === 'function') next();
});

// Compare Password Instance Method
hostSchema.methods.matchPassword = async function (enteredPassword) {
  const hash = this.password || this.hostDetails?.password;
  if (!hash) return false;
  return await bcrypt.compare(enteredPassword, hash);
};

// Generate JWT Token Instance Method
hostSchema.methods.generateToken = async function () {
  try {
    const secret = process.env.JWT_SECRET || 'dev_temporary_fallback_secret_key_roomscout_2026';
    return jwt.sign(
      {
        userId: this._id.toString(),
        id: this._id.toString(),
        name: this.name || this.hostDetails?.name,
        email: this.email || this.hostDetails?.email,
        role: 'host',
        isAdmin: false,
      },
      secret,
      {
        expiresIn: '7d',
      }
    );
  } catch (error) {
    console.error('Error generating token in host model:', error);
    throw error;
  }
};

export const Host = mongoose.model('Host', hostSchema);