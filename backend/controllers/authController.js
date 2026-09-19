import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';
import { Stay } from '../models/Stay.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Wishlist } from '../models/Wishlist.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { sendPasswordResetEmail, testEmailConnection } from '../services/emailService.js';

// Helper to create Nodemailer Gmail Transporter
function getMailTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : null;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// Generate random 10-character password
function generateRandom10DigitPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  let password = '';
  password += uppers[Math.floor(Math.random() * uppers.length)];
  password += lowers[Math.floor(Math.random() * lowers.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 3; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Issue httpOnly, Secure cookie
function setAuthCookie(res, token) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('roomscout_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  } catch (err) {
    console.warn('Cookie set error:', err.message);
  }
}

// @desc    Register a new user or host (Strict collection separation)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role === 'host' ? 'host' : 'user';
    const avatar = name.trim().slice(0, 2).toUpperCase();

    const userExists = await User.findOne({ email: cleanEmail });
    const hostExists = await Host.findOne({ email: cleanEmail });

    if (userExists) {
      return res.status(400).json({
        message: 'An account with this email is already registered as a Guest. Please login.',
      });
    }
    if (hostExists) {
      return res.status(400).json({
        message: 'An account with this email is already registered as a Host. Please login.',
      });
    }

    // 1. HOST REGISTRATION -> strictly in Host collection
    if (cleanRole === 'host') {
      const hostDoc = await Host.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone ? phone.trim() : '',
        role: 'host',
        avatar,
        status: 'Pending Approval',
      });

      const token = await hostDoc.generateToken();
      setAuthCookie(res, token);

      return res.status(201).json({
        _id: hostDoc._id,
        id: hostDoc._id.toString(),
        name: hostDoc.name,
        email: hostDoc.email,
        phone: hostDoc.phone,
        avatar: hostDoc.avatar,
        role: 'host',
        status: hostDoc.status,
        token,
      });
    }

    // 2. GUEST REGISTRATION -> strictly in User collection
    const userDoc = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      phone: phone ? phone.trim() : '',
      role: 'user',
      avatar,
    });

    const token = await userDoc.generateToken();
    setAuthCookie(res, token);

    return res.status(201).json({
      _id: userDoc._id,
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      phone: userDoc.phone,
      avatar: userDoc.avatar,
      role: 'user',
      token,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return next(error);
  }
};

// @desc    Authenticate user & get JWT token (Explicit role separation)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password, requiredRole, role } = req.body;
    const targetRole = requiredRole || role || null;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let authenticatedAccount = null;
    let token = null;

    if (targetRole === 'host') {
      const host = await Host.findOne({ email: cleanEmail }).select('+password');
      if (!host) {
        return res.status(404).json({ message: 'Host account not found. Please register first.' });
      }

      const isMatch = await host.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await host.generateToken();
      authenticatedAccount = {
        _id: host._id.toString(),
        id: host._id.toString(),
        name: host.name,
        email: host.email,
        phone: host.phone || '',
        avatar: host.avatar || 'HO',
        role: 'host',
        status: host.status,
      };
    } else if (targetRole === 'user') {
      const user = await User.findOne({ email: cleanEmail }).select('+password');
      if (!user) {
        return res.status(404).json({ message: 'User account not found. Please register first.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await user.generateToken();
      authenticatedAccount = {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || 'US',
        role: user.role || 'user',
      };
    } else {
      let account = await User.findOne({ email: cleanEmail }).select('+password');
      let detectedRole = 'user';

      if (!account) {
        account = await Host.findOne({ email: cleanEmail }).select('+password');
        detectedRole = 'host';
      }

      if (!account) {
        return res.status(404).json({ message: 'Account not found. Please register first.' });
      }

      const isMatch = await account.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await account.generateToken();
      authenticatedAccount = {
        _id: account._id.toString(),
        id: account._id.toString(),
        name: account.name,
        email: account.email,
        phone: account.phone || '',
        avatar: account.avatar || (detectedRole === 'host' ? 'HO' : 'US'),
        role: account.role || detectedRole,
        status: account.status,
      };
    }

    setAuthCookie(res, token);

    return res.json({
      _id: authenticatedAccount._id,
      id: authenticatedAccount._id,
      name: authenticatedAccount.name,
      email: authenticatedAccount.email,
      phone: authenticatedAccount.phone,
      avatar: authenticatedAccount.avatar,
      role: authenticatedAccount.role,
      status: authenticatedAccount.status,
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return next(error);
  }
};

// @desc    Forgot Password - Dispatches secure reset password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide your registered email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isHostTarget = role === 'host';

    let account = null;
    let userName = 'User';

    if (isHostTarget) {
      account = await Host.findOne({ email: cleanEmail });
      if (account) userName = account.name || 'Host';
    } else {
      account = await User.findOne({ email: cleanEmail });
      if (account) userName = account.name || 'Guest';
    }

    if (!account) {
      return res.status(404).json({ message: 'Account not found with this email address.' });
    }

    const newPassword = generateRandom10DigitPassword();
    let emailSent = false;
    let deliveryError = null;

    const transporter = getMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"RoomScout Support" <${process.env.EMAIL_USER}>`,
          to: cleanEmail,
          subject: 'Your RoomScout Temporary Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">RoomScout Password Reset</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">Hello ${userName},</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">We received a request to reset the password for your ${isHostTarget ? 'Host' : 'Guest'} account. Use the temporary password below to sign in:</p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 20px; font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #15803d; border-radius: 10px; text-align: center; margin: 20px 0;">
                ${newPassword}
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0;">Once logged in, navigate to your Account Settings to set your permanent password.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        deliveryError = err.message;
      }
    }

    if (!emailSent && typeof sendPasswordResetEmail === 'function') {
      try {
        const emailResult = await sendPasswordResetEmail({
          to: cleanEmail,
          name: userName,
          tempPassword: newPassword,
          role: role || 'user',
        });
        if (emailResult && emailResult.success) emailSent = true;
      } catch (svcErr) {
        deliveryError = deliveryError || svcErr.message;
      }
    }

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: deliveryError
          ? `Failed to deliver email: ${deliveryError}`
          : 'SMTP transporter not configured. Please verify EMAIL_USER and EMAIL_PASS in backend/.env.',
      });
    }

    account.password = newPassword;
    await account.save();

    return res.json({
      success: true,
      message: `A fresh password has been sent to ${cleanEmail}.`,
      email: cleanEmail,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return next(error);
  }
};

// @desc    Update authenticated user or host profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, phone, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : '';
    const cleanAvatar = avatar ? avatar.trim().slice(0, 2).toUpperCase() : cleanName.slice(0, 2).toUpperCase();
    const isHostRole = req.user.role === 'host';

    let updatedAccount = null;

    if (isHostRole) {
      const host = await Host.findById(userId);
      if (host) {
        host.name = cleanName;
        host.phone = cleanPhone;
        host.avatar = cleanAvatar;
        await host.save();

        updatedAccount = {
          _id: host._id.toString(),
          id: host._id.toString(),
          name: host.name,
          email: host.email,
          phone: host.phone,
          avatar: host.avatar,
          role: 'host',
          status: host.status,
        };
      }
    } else {
      const user = await User.findById(userId);
      if (user) {
        user.name = cleanName;
        user.phone = cleanPhone;
        user.avatar = cleanAvatar;
        await user.save();

        updatedAccount = {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: 'user',
        };
      }
    }

    if (!updatedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const token = generateToken(updatedAccount);

    return res.json({
      success: true,
      message: 'Profile details updated successfully!',
      user: updatedAccount,
      token,
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return next(error);
  }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const isHostRole = req.user.role === 'host';
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide both your old and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const account = isHostRole
      ? await Host.findById(userId).select('+password')
      : await User.findById(userId).select('+password');

    if (!account) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const isMatch = await account.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    account.password = newPassword;
    await account.save();

    return res.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return next(error);
  }
};

// @desc    Delete Account permanently from Database
// @route   DELETE /api/auth/delete-account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const isHostRole = req.user.role === 'host';

    if (isHostRole) {
      const stays = await Stay.find({ hostId: userId }).select('_id');
      const stayIds = stays.map((s) => s._id);

      await Host.findByIdAndDelete(userId);
      await Stay.deleteMany({ hostId: userId });
      await Booking.deleteMany({ hostId: userId });
      await Payment.deleteMany({ hostId: userId });
      if (stayIds.length > 0) {
        await Wishlist.deleteMany({ stayId: { $in: stayIds } });
      }
    } else {
      await User.findByIdAndDelete(userId);
      await Booking.deleteMany({ userId });
      await Payment.deleteMany({ userId });
      await Wishlist.deleteMany({ userId });
    }

    return res.json({
      success: true,
      message: 'Your account and associated records have been permanently deleted.',
    });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return next(error);
  }
};

// @desc    Get authenticated user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Account not found or deleted from database.' });
    }

    const userId = req.user.id || req.user._id;

    if (req.user.role === 'host') {
      const host = await Host.findById(userId).select('-password');
      if (host) return res.json(host);
    } else {
      const user = await User.findById(userId).select('-password');
      if (user) return res.json(user);
    }

    return res.status(401).json({ message: 'Account not found or deleted from database.' });
  } catch (error) {
    return next(error);
  }
};

// @desc    Diagnostic test for SMTP email connectivity
// @route   POST /api/auth/test-email
// @access  Public / Admin
export const testEmailService = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const targetEmail = email ? email.trim().toLowerCase() : process.env.EMAIL_USER;

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'No target email provided.' });
    }

    const transporter = getMailTransporter();
    if (transporter) {
      await transporter.verify();
      await transporter.sendMail({
        from: `"RoomScout Test" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        subject: 'RoomScout SMTP Test',
        text: 'Your SMTP configuration is active and working perfectly!',
      });
      return res.json({ success: true, message: `Test email sent successfully to ${targetEmail}` });
    }

    if (typeof testEmailConnection === 'function') {
      const result = await testEmailConnection(targetEmail);
      return res.json(result);
    }

    return res.status(400).json({
      success: false,
      message: 'Missing EMAIL_USER and EMAIL_PASS environment variables.',
    });
  } catch (error) {
    console.error('Diagnostic Email Test Error:', error);
    return next(error);
  }
};