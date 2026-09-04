import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
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
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
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
    },
  },
  {
    timestamps: true,
  }
);

// Bcrypt Password Encryption Pre-Save Hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    if (typeof next === 'function') next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (typeof next === 'function') next();
});

// Compare Password Instance Method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token Instance Method
userSchema.methods.generateToken = async function () {
  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_stayhub_2026';
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
      {
        expiresIn: '30d',
      }
    );
  } catch (error) {
    console.error('Error generating token in user model:', error);
    throw error;
  }
};

export const User = mongoose.model('User', userSchema);
