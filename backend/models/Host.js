import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const hostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      select: false, // Prevents password leaking in default find queries
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
      default: 'Pending Approval',
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    hasBeenApproved: {
      type: Boolean,
      default: false,
    },
    upiSettings: {
      upiId: {
        type: String,
        trim: true,
        default: '',
      },
      payeeName: {
        type: String,
        trim: true,
        default: '',
      },
      qrCodeUrl: {
        type: String,
        default: '',
      },
      isConfigured: {
        type: Boolean,
        default: false,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    revenueResetSettings: {
      resetAt: { type: Date, default: null },
      baselineTotal: { type: Number, default: 0 },
      baselineOnline: { type: Number, default: 0 },
      baselineOffline: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Password Encryption Pre-Save Hook
hostSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const isBcrypt = /^\$2[abxy]\$\d+\$/.test(this.password);
  if (!isBcrypt) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
hostSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token method
hostSchema.methods.generateToken = async function () {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
  }
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
    { expiresIn: '7d' }
  );
};

export const Host = mongoose.model('Host', hostSchema);