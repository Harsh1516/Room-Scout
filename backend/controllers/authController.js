import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';
import { Stay } from '../models/Stay.js';
import { Booking } from '../models/Booking.js';
import { Wishlist } from '../models/Wishlist.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { sendPasswordResetEmail, testEmailConnection } from '../services/emailService.js';

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

// Issue httpOnly, Secure cookie to protect session tokens against XSS theft
function setAuthCookie(res, token) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('roomscout_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role === 'host' ? 'host' : 'user';
    const avatar = name.trim().slice(0, 2).toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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

    // 1. HOST REGISTRATION -> strictly in 'hosts' collection
    if (cleanRole === 'host') {
      const hostDoc = await Host.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : '',
        role: 'host',
        avatar,
        status: 'Pending Approval',
      });

      const token = await hostDoc.generateToken();
      setAuthCookie(res, token);

      return res.status(201).json({
        _id: hostDoc._id,
        name: hostDoc.name,
        email: hostDoc.email,
        phone: hostDoc.phone,
        avatar: hostDoc.avatar,
        role: 'host',
        token,
      });
    }

    // 2. GUEST / USER REGISTRATION -> strictly in 'users' collection
    const userDoc = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      role: 'user',
      avatar,
    });

    const token = await userDoc.generateToken();
    setAuthCookie(res, token);

    return res.status(201).json({
      _id: userDoc._id,
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

// @desc    Authenticate user & get JWT token (Strict role separation check)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password, requiredRole, role } = req.body;
    const targetRole = requiredRole || role || null;
    const cleanEmail = email.toLowerCase().trim();

    let authenticatedAccount = null;
    let token = null;

    // 1. If looking for Host Account
    if (targetRole === 'host') {
      const host = await Host.findOne({ email: cleanEmail });
      if (!host) {
        return res.status(404).json({ message: 'Register first' });
      }

      const isMatch = await host.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await host.generateToken();
      authenticatedAccount = {
        _id: host._id.toString(),
        name: host.name,
        email: host.email,
        phone: host.phone || '',
        avatar: host.avatar || 'HO',
        role: 'host',
      };
    } else if (targetRole === 'user') {
      // 2. Guest / User Account
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(404).json({ message: 'Register first' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await user.generateToken();
      authenticatedAccount = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || 'US',
        role: user.role || 'user',
      };
    } else {
      // 3. Unspecified Role
      let account = await User.findOne({ email: cleanEmail });
      let accountRole = 'user';
      if (!account) {
        account = await Host.findOne({ email: cleanEmail });
        accountRole = 'host';
      }

      if (!account) {
        return res.status(404).json({ message: 'Register first' });
      }

      const isMatch = await account.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      token = await account.generateToken();
      authenticatedAccount = {
        _id: account._id.toString(),
        name: account.name,
        email: account.email,
        phone: account.phone || '',
        avatar: account.avatar || (accountRole === 'host' ? 'HO' : 'US'),
        role: account.role || accountRole,
      };
    }

    if (!token) {
      token = generateToken(authenticatedAccount);
    }

    setAuthCookie(res, token);

    return res.json({
      _id: authenticatedAccount._id,
      name: authenticatedAccount.name,
      email: authenticatedAccount.email,
      phone: authenticatedAccount.phone,
      avatar: authenticatedAccount.avatar,
      role: authenticatedAccount.role,
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return next(error);
  }
};

// @desc    Forgot Password - Generates and sends a fresh 10-digit random password
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

    const newPassword = generateRandom10DigitPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    let accountFound = false;
    let userName = 'User';

    if (isHostTarget) {
      const host = await Host.findOne({ email: cleanEmail });
      if (host) {
        host.password = hashedPassword;
        await host.save();
        accountFound = true;
        userName = host.name || 'Host';
      }
    } else {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        user.password = hashedPassword;
        await user.save();
        accountFound = true;
        userName = user.name || 'Guest';
      }
    }

    if (!accountFound) {
      return res.status(404).json({ message: 'Account not found with this email address.' });
    }

    console.log(`🔑 Password Reset for [${cleanEmail}]: Fresh 10-character password = ${newPassword}`);

    // Dispatch real email via Nodemailer
    const emailResult = await sendPasswordResetEmail({
      to: cleanEmail,
      name: userName,
      tempPassword: newPassword,
      role: role || 'user',
    });

    return res.json({
      success: true,
      message: `A fresh 10-character password has been generated and sent to ${cleanEmail}. Check your email inbox!`,
      email: cleanEmail,
      tempPassword: newPassword,
      name: userName,
      emailSent: emailResult?.success ?? false,
      previewUrl: emailResult?.previewUrl || null,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return next(error);
  }
};

// @desc    Update authenticated user/host profile (My Details)
// @route   PUT /api/auth/profile
// @access  Private (Protected by JWT)
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, phone, avatar, bio } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : '';
    const cleanAvatar = avatar ? avatar.trim().slice(0, 2).toUpperCase() : cleanName.slice(0, 2).toUpperCase();
    const isHostRole = req.user.role === 'host';

    let updatedAccount = null;

    if (isHostRole) {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          { email: (req.user.email || '').toLowerCase() },
        ],
      };
      const host = await Host.findOne(query);
      if (host) {
        host.name = cleanName;
        host.phone = cleanPhone;
        host.avatar = cleanAvatar;
        if (bio) host.bio = bio;
        await host.save();
        updatedAccount = {
          _id: host._id.toString(),
          name: host.name,
          email: host.email,
          phone: host.phone,
          avatar: host.avatar,
          role: 'host',
        };

        // Also update the published Stay in stays collection with the new host name / phone!
        try {
          // Note: Stay model may need to be imported if this fails
          const Stay = mongoose.model('Stay');
          if (Stay) {
            await Stay.updateMany(
              { hostEmail: host.email.toLowerCase() },
              { $set: { hostName: cleanName, hostPhone: cleanPhone } }
            );
          }
        } catch (stayErr) {
          console.warn('Stay sync on host profile update error:', stayErr.message);
        }
      }
    } else {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          { email: (req.user.email || '').toLowerCase() },
        ],
      };
      const user = await User.findOne(query);
      if (user) {
        user.name = cleanName;
        user.phone = cleanPhone;
        user.avatar = cleanAvatar;
        await user.save();
        updatedAccount = {
          _id: user._id.toString(),
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

// @desc    Change Password (Confirm Old Password & Update to New Password)
// @route   PUT /api/auth/change-password
// @access  Private (Protected by JWT)
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userEmail = req.user.email?.toLowerCase().trim();
    const isHostRole = req.user.role === 'host';
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide both your old password and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    let isMatch = false;

    if (isHostRole) {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          { email: userEmail },
        ],
      };
      const host = await Host.findOne(query);
      if (host) isMatch = await host.matchPassword(oldPassword);
    } else {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          { email: userEmail },
        ],
      };
      const user = await User.findOne(query);
      if (user) isMatch = await user.matchPassword(oldPassword);
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password. Please verify your current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    if (isHostRole) {
      await Host.findOneAndUpdate({ email: userEmail }, { password: hashedNewPassword });
    } else {
      await User.findOneAndUpdate({ email: userEmail }, { password: hashedNewPassword });
    }

    return res.json({
      success: true,
      message: 'Password updated successfully! You can now use your new password.',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return next(error);
  }
};

// @desc    Delete Account permanently from Database
// @route   DELETE /api/auth/delete-account
// @access  Private (Protected by JWT)
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userEmail = req.user.email?.toLowerCase().trim();
    const isHostRole = req.user.role === 'host';

    if (isHostRole) {
      const staysToDelete = await Stay.find({ hostEmail: userEmail });
      const stayIds = staysToDelete.map(s => String(s._id));
      
      await Host.deleteMany({ $or: [{ _id: userId }, { email: userEmail }] });
      await Stay.deleteMany({ hostEmail: userEmail });
      await Booking.deleteMany({ hostEmail: userEmail });
      
      if (stayIds.length > 0) {
        await Wishlist.deleteMany({ stayId: { $in: stayIds } });
      }
    } else {
      await User.deleteMany({ $or: [{ _id: userId }, { email: userEmail }] });
      await Booking.deleteMany({ userEmail: userEmail });
      await Wishlist.deleteMany({ userEmail: userEmail });
    }

    return res.json({
      success: true,
      message: 'Your registered account has been permanently deleted from Room-Scout.',
    });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return next(error);
  }
};

// @desc    Get authenticated user profile
// @route   GET /api/auth/me
// @access  Private (Protected by JWT)
export const getUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'ACCOUNT_DELETED', message: 'Account not found or deleted from database.' });
    }

    const userId = req.user.id || req.user._id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    if (req.user.role === 'host') {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      };
      const host = await Host.findOne(query).select('-password');
      if (host) return res.json(host);
    } else {
      const query = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      };
      const user = await User.findOne(query).select('-password');
      if (user) return res.json(user);
    }

    return res.status(401).json({ status: 'ACCOUNT_DELETED', message: 'Account not found or deleted from database.' });
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
    const targetEmail = email ? email.trim().toLowerCase() : 'test@roomscout.com';
    const result = await testEmailConnection(targetEmail);
    return res.json(result);
  } catch (error) {
    console.error('Diagnostic Email Test Error:', error);
    return next(error);
  }
};

