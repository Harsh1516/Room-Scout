import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide a valid email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
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
    bookedPlaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const isBcrypt = /^\$2[abxy]\$\d+\$/.test(this.password);
  if (!isBcrypt) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateToken = async function () {
  const secret = process.env.JWT_SECRET || 'dev_temporary_fallback_secret_key_roomscout_2026';
  return jwt.sign(
    {
      userId: this._id.toString(),
      id: this._id.toString(),
      name: this.name,
      email: this.email,
      role: this.role,
      isAdmin: this.role === 'admin',
    },
    secret,
    { expiresIn: '7d' }
  );
};

export const User = mongoose.model('User', userSchema);