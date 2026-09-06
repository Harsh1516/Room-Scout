import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userDetailsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
    },
    avatar: {
      type: String,
      default: 'US',
    },
    role: {
      type: String,
      enum: ['user', 'host', 'admin'],
      default: 'user',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Default Sub-documents
    userDetails: {
      type: userDetailsSchema,
    },
    wishlist: [
      {
        stayId: { type: String, required: true },
        stay: { type: Object },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    bookedPlaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],

    // Top-level fields for seamless backward compatibility
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
    },
    avatar: {
      type: String,
      default: 'US',
    },
    role: {
      type: String,
      enum: ['user', 'host', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Bcrypt Password Encryption Pre-Save Hook & Structure Sync
userSchema.pre('save', async function (next) {
  const currentName = this.name || this.userDetails?.name || '';
  const currentEmail = (this.email || this.userDetails?.email || '').toLowerCase().trim();
  const currentPhone = this.phone || this.userDetails?.phone || '';
  const currentAvatar = this.avatar || this.userDetails?.avatar || (currentName ? currentName.slice(0, 2).toUpperCase() : 'US');
  const currentRole = this.role || this.userDetails?.role || 'user';
  let currentPassword = this.password || this.userDetails?.password || '';

  // Password hashing if modified or not yet bcrypt hash
  const isBcrypt = /^\$2[abxy]\$\d+\$/.test(currentPassword);
  if (currentPassword && !isBcrypt) {
    const salt = await bcrypt.genSalt(10);
    currentPassword = await bcrypt.hash(currentPassword, salt);
  }

  this.name = currentName;
  this.email = currentEmail;
  this.phone = currentPhone;
  this.avatar = currentAvatar;
  this.role = currentRole;
  this.password = currentPassword;

  // Enforce native default userDetails sub-document
  this.userDetails = {
    name: currentName,
    email: currentEmail,
    phone: currentPhone,
    password: currentPassword,
    avatar: currentAvatar,
    role: currentRole,
  };

  if (!Array.isArray(this.wishlist)) {
    this.wishlist = [];
  }
  if (!Array.isArray(this.bookedPlaces)) {
    this.bookedPlaces = [];
  }

  if (typeof next === 'function') next();
});

// Compare Password Instance Method
userSchema.methods.matchPassword = async function (enteredPassword) {
  const hash = this.password || this.userDetails?.password;
  if (!hash) return false;
  return await bcrypt.compare(enteredPassword, hash);
};

// Generate JWT Token Instance Method
userSchema.methods.generateToken = async function () {
  try {
    const secret = process.env.JWT_SECRET || 'dev_temporary_fallback_secret_key_roomscout_2026';
    return jwt.sign(
      {
        userId: this._id.toString(),
        id: this._id.toString(),
        name: this.name || this.userDetails?.name,
        email: this.email || this.userDetails?.email,
        role: this.role || this.userDetails?.role || 'user',
        isAdmin: (this.role || this.userDetails?.role) === 'admin',
      },
      secret,
      {
        expiresIn: '7d',
      }
    );
  } catch (error) {
    console.error('Error generating token in user model:', error);
    throw error;
  }
};

export const User = mongoose.model('User', userSchema);
