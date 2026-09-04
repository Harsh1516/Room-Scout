import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');

// File-based persistent users store helper
function readUsersFromFile() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users store:', err);
    return [];
  }
}

function writeUsersToFile(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users store:', err);
  }
}

function readHostsFromFile() {
  try {
    if (!fs.existsSync(HOSTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(HOSTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading hosts file:', err);
    return [];
  }
}

function writeHostsToFile(hosts) {
  try {
    fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing hosts file:', err);
  }
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
    const isDbConnected = mongoose.connection.readyState === 1;

    // Check across stores to prevent cross-role email collisions
    const fileUsers = readUsersFromFile();
    const fileHosts = readHostsFromFile();

    const existingFileUser = fileUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const existingFileHost = fileHosts.find((h) => h.email.toLowerCase() === cleanEmail);

    if (existingFileUser) {
      return res.status(400).json({
        message: 'An account with this email is already registered as a Guest. Please login.',
      });
    }
    if (existingFileHost) {
      return res.status(400).json({
        message: 'An account with this email is already registered as a Host. Please login.',
      });
    }

    if (isDbConnected) {
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
    }

    // 1. HOST REGISTRATION -> strictly in 'hosts' collection
    if (cleanRole === 'host') {
      let hostId = 'host_' + Date.now();
      let hostDoc = null;

      if (isDbConnected) {
        hostDoc = await Host.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          phone: phone ? phone.trim() : '',
          role: 'host',
          avatar,
          status: 'Pending Approval',
        });
        if (hostDoc) {
          hostId = hostDoc._id.toString();
        }
      }

      const newHost = {
        _id: hostId,
        id: hostId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        password: hashedPassword,
        avatar,
        role: 'host',
        status: 'Pending Approval',
        createdAt: new Date().toISOString(),
      };

      fileHosts.push(newHost);
      writeHostsToFile(fileHosts);

      const token = hostDoc ? await hostDoc.generateToken() : generateToken(newHost);

      return res.status(201).json({
        _id: hostId,
        name: newHost.name,
        email: newHost.email,
        phone: newHost.phone,
        avatar: newHost.avatar,
        role: 'host',
        token,
      });
    }

    // 2. GUEST / USER REGISTRATION -> strictly in 'users' collection
    let userId = 'usr_' + Date.now();
    let userDoc = null;

    if (isDbConnected) {
      userDoc = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone ? phone.trim() : '',
        role: 'user',
        avatar,
      });
      if (userDoc) {
        userId = userDoc._id.toString();
      }
    }

    const newUser = {
      _id: userId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      avatar,
      role: 'user',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    fileUsers.push(newUser);
    writeUsersToFile(fileUsers);

    const token = userDoc ? await userDoc.generateToken() : generateToken(newUser);

    return res.status(201).json({
      _id: userId,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      avatar: newUser.avatar,
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
    const isDbConnected = mongoose.connection.readyState === 1;

    let authenticatedAccount = null;
    let token = null;

    // 1. If looking for Host Account
    if (targetRole === 'host') {
      if (isDbConnected) {
        const host = await Host.findOne({ email: cleanEmail });
        if (host) {
          const isMatch = await host.matchPassword(password);
          if (isMatch) {
            token = await host.generateToken();
            authenticatedAccount = {
              _id: host._id.toString(),
              name: host.name,
              email: host.email,
              phone: host.phone || '',
              avatar: host.avatar || 'HO',
              role: 'host',
            };
          }
        }
      }

      if (!authenticatedAccount) {
        const hosts = readHostsFromFile();
        const host = hosts.find((h) => h.email.toLowerCase() === cleanEmail);
        if (host) {
          const isMatch = await bcrypt.compare(password, host.password);
          if (isMatch) {
            authenticatedAccount = {
              _id: host._id || host.id,
              name: host.name,
              email: host.email,
              phone: host.phone || '',
              avatar: host.avatar || 'HO',
              role: 'host',
            };
            token = generateToken(authenticatedAccount);
          }
        }
      }

      if (!authenticatedAccount) {
        // Check if they accidentally entered a Guest account on Host portal
        const fileUsers = readUsersFromFile();
        if (fileUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return res.status(403).json({
            message: 'Access Denied: This is a Guest account. Please login through the Guest Portal or register as a Host.',
          });
        }
        return res.status(401).json({ message: 'Invalid host email or password.' });
      }
    } else {
      // 2. Default: Guest / User Account
      if (isDbConnected) {
        const user = await User.findOne({ email: cleanEmail });
        if (user) {
          const isMatch = await user.matchPassword(password);
          if (isMatch) {
            token = await user.generateToken();
            authenticatedAccount = {
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || 'US',
              role: user.role || 'user',
            };
          }
        }
      }

      if (!authenticatedAccount) {
        const users = readUsersFromFile();
        const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (user) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            authenticatedAccount = {
              _id: user._id || user.id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || 'US',
              role: user.role || 'user',
            };
            token = generateToken(authenticatedAccount);
          }
        }
      }

      // Check if they accidentally entered a Host account on Guest portal
      if (!authenticatedAccount && targetRole === 'user') {
        const fileHosts = readHostsFromFile();
        if (fileHosts.some((h) => h.email.toLowerCase() === cleanEmail)) {
          return res.status(403).json({
            message: 'Access Denied: This is a Host account. Please use the Host Portal to login.',
          });
        }
      }

      if (!authenticatedAccount) {
        return res.status(401).json({ message: 'Invalid email address or password.' });
      }
    }

    if (!token) {
      token = generateToken(authenticatedAccount);
    }

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
    const isDbConnected = mongoose.connection.readyState === 1;
    const isHostTarget = role === 'host';

    const newPassword = generateRandom10DigitPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    let accountFound = false;
    let userName = 'User';

    if (isHostTarget) {
      if (isDbConnected) {
        const host = await Host.findOne({ email: cleanEmail });
        if (host) {
          host.password = hashedPassword;
          await host.save();
          accountFound = true;
          userName = host.name || 'Host';
        }
      }

      const fileHosts = readHostsFromFile();
      const hostIdx = fileHosts.findIndex((h) => h.email.toLowerCase() === cleanEmail);
      if (hostIdx >= 0) {
        fileHosts[hostIdx].password = hashedPassword;
        writeHostsToFile(fileHosts);
        accountFound = true;
        userName = fileHosts[hostIdx].name || userName;
      }
    } else {
      if (isDbConnected) {
        const user = await User.findOne({ email: cleanEmail });
        if (user) {
          user.password = hashedPassword;
          await user.save();
          accountFound = true;
          userName = user.name || 'Guest';
        }
      }

      const fileUsers = readUsersFromFile();
      const userIdx = fileUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (userIdx >= 0) {
        fileUsers[userIdx].password = hashedPassword;
        writeUsersToFile(fileUsers);
        accountFound = true;
        userName = fileUsers[userIdx].name || userName;
      }
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
    const isDbConnected = mongoose.connection.readyState === 1;
    const isHostRole = req.user.role === 'host';

    let updatedAccount = null;

    if (isHostRole) {
      if (isDbConnected) {
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
            await Stay.updateMany(
              { hostEmail: host.email.toLowerCase() },
              { $set: { hostName: cleanName, hostPhone: cleanPhone } }
            );
          } catch (stayErr) {
            console.warn('Stay sync on host profile update error:', stayErr.message);
          }
        }
      }

      const fileHosts = readHostsFromFile();
      const hostIdx = fileHosts.findIndex(
        (h) => String(h._id) === String(userId) || String(h.id) === String(userId) || h.email.toLowerCase() === req.user.email?.toLowerCase()
      );
      if (hostIdx >= 0) {
        fileHosts[hostIdx].name = cleanName;
        fileHosts[hostIdx].phone = cleanPhone;
        fileHosts[hostIdx].avatar = cleanAvatar;
        if (bio) fileHosts[hostIdx].bio = bio;
        writeHostsToFile(fileHosts);
        if (!updatedAccount) {
          updatedAccount = {
            _id: fileHosts[hostIdx]._id || fileHosts[hostIdx].id,
            name: cleanName,
            email: fileHosts[hostIdx].email,
            phone: cleanPhone,
            avatar: cleanAvatar,
            role: 'host',
          };
        }
      }
    } else {
      if (isDbConnected) {
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

      const fileUsers = readUsersFromFile();
      const userIdx = fileUsers.findIndex(
        (u) => String(u._id) === String(userId) || String(u.id) === String(userId) || u.email.toLowerCase() === req.user.email?.toLowerCase()
      );
      if (userIdx >= 0) {
        fileUsers[userIdx].name = cleanName;
        fileUsers[userIdx].phone = cleanPhone;
        fileUsers[userIdx].avatar = cleanAvatar;
        if (bio) fileUsers[userIdx].bio = bio;
        writeUsersToFile(fileUsers);
        if (!updatedAccount) {
          updatedAccount = {
            _id: fileUsers[userIdx]._id || fileUsers[userIdx].id,
            name: cleanName,
            email: fileUsers[userIdx].email,
            phone: cleanPhone,
            avatar: cleanAvatar,
            role: 'user',
          };
        }
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

    const isDbConnected = mongoose.connection.readyState === 1;
    let isMatch = false;

    if (isHostRole) {
      if (isDbConnected) {
        const query = {
          $or: [
            ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
            { email: userEmail },
          ],
        };
        const host = await Host.findOne(query);
        if (host) isMatch = await host.matchPassword(oldPassword);
      }
      if (!isMatch) {
        const fileHosts = readHostsFromFile();
        const host = fileHosts.find((h) => h.email.toLowerCase() === userEmail);
        if (host) isMatch = await bcrypt.compare(oldPassword, host.password);
      }
    } else {
      if (isDbConnected) {
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
        const fileUsers = readUsersFromFile();
        const user = fileUsers.find((u) => u.email.toLowerCase() === userEmail);
        if (user) isMatch = await bcrypt.compare(oldPassword, user.password);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password. Please verify your current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    if (isHostRole) {
      if (isDbConnected) {
        await Host.findOneAndUpdate({ email: userEmail }, { password: hashedNewPassword });
      }
      const fileHosts = readHostsFromFile();
      const hostIdx = fileHosts.findIndex((h) => h.email.toLowerCase() === userEmail);
      if (hostIdx >= 0) {
        fileHosts[hostIdx].password = hashedNewPassword;
        writeHostsToFile(fileHosts);
      }
    } else {
      if (isDbConnected) {
        await User.findOneAndUpdate({ email: userEmail }, { password: hashedNewPassword });
      }
      const fileUsers = readUsersFromFile();
      const userIdx = fileUsers.findIndex((u) => u.email.toLowerCase() === userEmail);
      if (userIdx >= 0) {
        fileUsers[userIdx].password = hashedNewPassword;
        writeUsersToFile(fileUsers);
      }
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
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isHostRole) {
      if (isDbConnected) {
        await Host.deleteMany({ $or: [{ _id: userId }, { email: userEmail }] });
      }
      const fileHosts = readHostsFromFile();
      const updated = fileHosts.filter((h) => h.email.toLowerCase() !== userEmail);
      writeHostsToFile(updated);
    } else {
      if (isDbConnected) {
        await User.deleteMany({ $or: [{ _id: userId }, { email: userEmail }] });
      }
      const fileUsers = readUsersFromFile();
      const updated = fileUsers.filter((u) => u.email.toLowerCase() !== userEmail);
      writeUsersToFile(updated);
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

    const isDbConnected = mongoose.connection.readyState === 1;
    const userId = req.user.id || req.user._id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    if (req.user.role === 'host') {
      if (isDbConnected) {
        const query = {
          $or: [
            ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        };
        const host = await Host.findOne(query).select('-password');
        if (host) return res.json(host);
      }
      const hosts = readHostsFromFile();
      const host = hosts.find((h) => String(h._id) === String(userId) || String(h.id) === String(userId) || h.email.toLowerCase() === userEmail);
      if (host) {
        const { password, ...safeHost } = host;
        return res.json(safeHost);
      }
    } else {
      if (isDbConnected) {
        const query = {
          $or: [
            ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        };
        const user = await User.findOne(query).select('-password');
        if (user) return res.json(user);
      }
      const users = readUsersFromFile();
      const user = users.find((u) => String(u._id) === String(userId) || String(u.id) === String(userId) || u.email.toLowerCase() === userEmail);
      if (user) {
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      }
    }

    return res.status(401).json({ status: 'ACCOUNT_DELETED', message: 'Account not found or deleted from database.' });
  } catch (error) {
    return next(error);
  }
};
