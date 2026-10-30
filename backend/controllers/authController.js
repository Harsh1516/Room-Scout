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
import { uploadSecureImage } from '../utils/imageSecurity.js';
import { OAuth2Client } from 'google-auth-library';

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
        hasPassword: true,
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
      hasPassword: true,
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
        const isUserAccount = await User.findOne({ email: cleanEmail });
        if (isUserAccount) {
          return res.status(403).json({
            message: 'This email belongs to a Student/Guest account. Guests must log in through the Search tab only.',
          });
        }
        return res.status(404).json({ message: 'Host account not found. Please register as a Host through the Upload tab.' });
      }

      if (!host.password) {
        return res.status(400).json({
          message: 'This account was registered through Google Sign-In and has no password yet. Please log in with Google, or set a password in your account settings.',
        });
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
        hasPassword: true,
      };
    } else if (targetRole === 'user') {
      const user = await User.findOne({ email: cleanEmail }).select('+password');
      if (!user) {
        const isHostAccount = await Host.findOne({ email: cleanEmail });
        if (isHostAccount) {
          return res.status(403).json({
            message: 'This email belongs to a Property Host account. Hosts must log in through the Upload tab only.',
          });
        }
        return res.status(404).json({ message: 'User account not found. Please register as a Guest through the Search tab.' });
      }

      if (!user.password) {
        return res.status(400).json({
          message: 'This account was registered through Google Sign-In and has no password yet. Please log in with Google, or set a password in your account settings.',
        });
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
        hasPassword: true,
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

      if (!account.password) {
        return res.status(400).json({
          message: 'This account was registered through Google Sign-In and has no password yet. Please log in with Google, or set a password in your account settings.',
        });
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
        authProvider: account.authProvider || 'local',
        hasPassword: true,
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
      authProvider: authenticatedAccount.authProvider,
      hasPassword: true,
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return next(error);
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Authenticate with Google OAuth ID Token
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { credential, role } = req.body;
    const targetRole = role === 'host' ? 'host' : 'user';

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: 'GOOGLE_CLIENT_ID environment variable is missing on server.' });
    }

    // Verify Google ID Token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error('Google token verification error:', err.message);
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Unable to retrieve verified email from Google.' });
    }

    const googleEmail = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name || payload.given_name || 'Room Scout User';
    const avatar = payload.picture || (targetRole === 'host' ? 'HO' : 'US');

    let authenticatedAccount = null;
    let token = null;

    if (targetRole === 'host') {
      // Prevent cross-role collision: Guest accounts cannot login as Host
      const existingUser = await User.findOne({ email: googleEmail });
      if (existingUser) {
        return res.status(403).json({
          message: 'This Google account is already registered as a Student/Guest account. Hosts must use a separate host email.',
        });
      }

      let host = await Host.findOne({ $or: [{ googleId }, { email: googleEmail }] }).select('+password');
      if (!host) {
        // Register new Host with Google
        host = await Host.create({
          name,
          email: googleEmail,
          googleId,
          authProvider: 'google',
          avatar,
          role: 'host',
          status: 'Pending Approval',
          isApproved: false,
        });
      } else {
        if (!host.googleId) {
          host.googleId = googleId;
          if (payload.picture && (!host.avatar || host.avatar === 'HO')) {
            host.avatar = payload.picture;
          }
          await host.save();
        }
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
        isApproved: host.isApproved,
        authProvider: host.authProvider || 'google',
        hasPassword: Boolean(host.password),
      };
    } else {
      // Regular user / student / guest
      // Prevent cross-role collision: Host accounts cannot login as Guest
      const existingHost = await Host.findOne({ email: googleEmail });
      if (existingHost) {
        return res.status(403).json({
          message: 'This Google account is registered as a Property Host. Guests must log in with a student/guest email.',
        });
      }

      let user = await User.findOne({ $or: [{ googleId }, { email: googleEmail }] }).select('+password');
      if (!user) {
        // Register new User with Google
        user = await User.create({
          name,
          email: googleEmail,
          googleId,
          authProvider: 'google',
          avatar,
          role: 'user',
        });
      } else {
        if (!user.googleId) {
          user.googleId = googleId;
          if (payload.picture && (!user.avatar || user.avatar === 'US')) {
            user.avatar = payload.picture;
          }
          await user.save();
        }
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
        isAdmin: user.role === 'admin',
        authProvider: user.authProvider || 'google',
        hasPassword: Boolean(user.password),
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
      isApproved: authenticatedAccount.isApproved,
      authProvider: authenticatedAccount.authProvider,
      hasPassword: authenticatedAccount.hasPassword,
      token,
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
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
    const userId = req.user._id;
    const { name, phone, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : '';

    let cleanAvatar = cleanName.slice(0, 2).toUpperCase();
    if (avatar && typeof avatar === 'string' && avatar.trim()) {
      const trimmedAv = avatar.trim();
      if (trimmedAv.startsWith('data:image/') || trimmedAv.startsWith('http://') || trimmedAv.startsWith('https://')) {
        cleanAvatar = await uploadSecureImage(trimmedAv, 'roomscout/avatars');
      } else if (trimmedAv.length <= 4) {
        cleanAvatar = trimmedAv.toUpperCase();
      }
    }
    const isHostRole = req.user.role === 'host';

    let updatedAccount = null;

    if (isHostRole) {
      const host = await Host.findById(userId).select('+password');
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
          isApproved: host.isApproved,
          authProvider: host.authProvider || 'local',
          hasPassword: Boolean(host.password),
        };
      }
    } else {
      const user = await User.findById(userId).select('+password');
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
          authProvider: user.authProvider || 'local',
          hasPassword: Boolean(user.password),
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
    const userId = req.user._id;
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

    if (!account.password) {
      return res.status(400).json({
        message: 'This account does not have a password set yet. Please use the Set Password option.',
      });
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
      hasPassword: true,
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return next(error);
  }
};

// @desc    Set Password for accounts with no password (e.g., Google-authenticated)
// @route   POST /api/auth/set-password
// @access  Private
export const setPassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isHostRole = req.user.role === 'host';
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const account = isHostRole
      ? await Host.findById(userId).select('+password')
      : await User.findById(userId).select('+password');

    if (!account) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (account.password) {
      return res.status(400).json({
        message: 'A password is already set for this account. Please use the Change Password form instead.',
      });
    }

    account.password = newPassword;
    await account.save();

    const updatedAccount = {
      _id: account._id.toString(),
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      phone: account.phone || '',
      avatar: account.avatar || (isHostRole ? 'HO' : 'US'),
      role: account.role || (isHostRole ? 'host' : 'user'),
      status: account.status,
      isApproved: account.isApproved,
      authProvider: account.authProvider || 'google',
      hasPassword: true,
      hasProperty: Boolean(account.hasProperty),
    };

    const token = await account.generateToken();
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Password created successfully! You can now log in using either Google or your email and password.',
      user: updatedAccount,
      token,
      hasPassword: true,
    });
  } catch (error) {
    console.error('Set Password Error:', error);
    return next(error);
  }
};

// @desc    Delete Account permanently from Database
// @route   DELETE /api/auth/delete-account
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
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

    const userId = req.user._id;

    if (req.user.role === 'host') {
      const host = await Host.findById(userId).select('+password');
      if (host) {
        const hostObj = host.toObject();
        hostObj.hasPassword = Boolean(host.password);
        delete hostObj.password;
        return res.json(hostObj);
      }
    } else {
      const user = await User.findById(userId).select('+password');
      if (user) {
        const userObj = user.toObject();
        userObj.hasPassword = Boolean(user.password);
        delete userObj.password;
        return res.json(userObj);
      }
    }

    // Secondary fallback in case of role mismatch
    const fallbackHost = await Host.findById(userId).select('+password');
    if (fallbackHost) {
      const hostObj = fallbackHost.toObject();
      hostObj.hasPassword = Boolean(fallbackHost.password);
      delete hostObj.password;
      return res.json(hostObj);
    }

    const fallbackUser = await User.findById(userId).select('+password');
    if (fallbackUser) {
      const userObj = fallbackUser.toObject();
      userObj.hasPassword = Boolean(fallbackUser.password);
      delete userObj.password;
      return res.json(userObj);
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