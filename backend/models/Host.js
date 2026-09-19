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
    password: {
      type: String,
      required: [true, 'Please provide a password'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual Getter: Exposes hostDetails without duplicate schema fields
hostSchema.virtual('hostDetails').get(function () {
  return {
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    avatar: this.avatar || 'HO',
    role: this.role || 'host',
    status: this.status || 'Pending Approval',
  };
});

// Password Encryption Pre-Save Hook
hostSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const isBcrypt = /^\$2[abxy]\$\d+\$/.test(this.password);
  if (!isBcrypt) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
hostSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token method
hostSchema.methods.generateToken = async function () {
  const secret = process.env.JWT_SECRET || 'dev_temporary_fallback_secret_key_roomscout_2026';
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