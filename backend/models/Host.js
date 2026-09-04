import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const hostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add host name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add host email'],
      unique: true,
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
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      type: String,
      default: 'HO',
    },
    role: {
      type: String,
      default: 'host',
    },
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
      default: 1,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
    rooms: [
      {
        id: { type: String },
        roomNumber: { type: String },
        roomNumInt: { type: Number },
        status: { type: String, default: 'Available' },
        type: { type: String },
        price: { type: String },
        rateUnit: { type: String, default: '/month' },
        floor: { type: String },
      },
    ],
    rating: {
      type: Number,
      default: 4.8,
    },
    roomRates: [
      {
        id: { type: String },
        type: { type: String },
        price: { type: String },
        rateUnit: { type: String, default: '/month' },
      },
    ],
    amenities: [
      {
        type: String,
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
    videos: [
      {
        type: String,
      },
    ],
    instagramVideoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Pending Approval', 'Approved', 'Rejected'],
      default: 'Pending Approval',
    },
    description: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Bcrypt Password Encryption Pre-Save Hook
hostSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    if (typeof next === 'function') next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (typeof next === 'function') next();
});

// Compare Password Instance Method
hostSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token Instance Method
hostSchema.methods.generateToken = async function () {
  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_stayhub_2026';
    return jwt.sign(
      {
        userId: this._id.toString(),
        id: this._id.toString(),
        name: this.name,
        email: this.email,
        role: 'host',
        isAdmin: false,
      },
      secret,
      {
        expiresIn: '30d',
      }
    );
  } catch (error) {
    console.error('Error generating token in host model:', error);
    throw error;
  }
};

export const Host = mongoose.model('Host', hostSchema);
