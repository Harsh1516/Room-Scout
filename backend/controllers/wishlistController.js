import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Wishlist } from '../models/Wishlist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WISHLISTS_FILE = path.join(__dirname, '../data/wishlists_store.json');

function readWishlistsFromFile() {
  try {
    if (!fs.existsSync(WISHLISTS_FILE)) {
      fs.writeFileSync(WISHLISTS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(WISHLISTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading wishlists file:', err);
    return [];
  }
}

function writeWishlistsToFile(items) {
  try {
    fs.writeFileSync(WISHLISTS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing wishlists file:', err);
  }
}

// @desc    Get current user wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    const currentUserId = (req.user?._id || req.user?.id || '')?.toString();
    const currentUserEmail = (req.user?.email || '').toLowerCase().trim();

    if (!currentUserId && !currentUserEmail) {
      return res.json([]);
    }

    let items = [];

    // 1. Try MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const conditions = [];
        if (currentUserEmail) conditions.push({ userEmail: currentUserEmail });
        if (currentUserId) conditions.push({ userId: currentUserId });

        const mongoWishlists = await Wishlist.find({ $or: conditions }).sort({ createdAt: -1 }).lean();
        if (mongoWishlists && mongoWishlists.length > 0) {
          items = mongoWishlists.map((w) => ({
            ...w.stay,
            _id: w.stayId || w.stay?._id || w.stay?.id,
            id: w.stayId || w.stay?.id || w.stay?._id,
            wishlistId: w._id?.toString(),
          }));
        }
      } catch (err) {
        console.warn('MongoDB Wishlist read warning:', err.message);
      }
    }

    // 2. Fallback to file store if MongoDB returned 0 items
    if (items.length === 0) {
      const fileWishlists = readWishlistsFromFile();
      const matched = fileWishlists.filter((w) => {
        const emailMatch = currentUserEmail && w.userEmail && w.userEmail.toLowerCase() === currentUserEmail;
        const idMatch = currentUserId && w.userId && String(w.userId) === currentUserId;
        return emailMatch || idMatch;
      });

      items = matched.map((w) => ({
        ...w.stay,
        _id: w.stayId || w.stay?._id || w.stay?.id,
        id: w.stayId || w.stay?.id || w.stay?._id,
        wishlistId: w.id || w._id,
      }));
    }

    return res.json(items);
  } catch (error) {
    console.error('getWishlist Error:', error);
    return next(error);
  }
};

// @desc    Toggle item in user wishlist (add if missing, remove if present)
// @route   POST /api/wishlist/toggle
// @access  Private
export const toggleWishlist = async (req, res, next) => {
  try {
    const { stay } = req.body;
    if (!stay) {
      return res.status(400).json({ message: 'Stay data is required' });
    }

    const stayId = String(stay._id || stay.id || '').trim();
    if (!stayId) {
      return res.status(400).json({ message: 'Valid stayId is required' });
    }

    const currentUserId = (req.user?._id || req.user?.id || '')?.toString();
    const currentUserEmail = (req.user?.email || '').toLowerCase().trim();

    if (!currentUserEmail && !currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let isWishlisted = false;

    // 1. Handle in MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {
          stayId,
          $or: [
            ...(currentUserEmail ? [{ userEmail: currentUserEmail }] : []),
            ...(currentUserId ? [{ userId: currentUserId }] : []),
          ],
        };

        const existing = await Wishlist.findOne(query);
        if (existing) {
          await Wishlist.deleteOne({ _id: existing._id });
          isWishlisted = false;
        } else {
          await Wishlist.create({
            userEmail: currentUserEmail || '',
            userId: currentUserId || '',
            stayId,
            stay,
          });
          isWishlisted = true;
        }
      } catch (err) {
        console.warn('MongoDB Wishlist toggle warning:', err.message);
      }
    }

    // 2. Sync in file storage
    const fileWishlists = readWishlistsFromFile();
    const existingIdx = fileWishlists.findIndex((w) => {
      const stayMatch = String(w.stayId) === stayId;
      const emailMatch = currentUserEmail && w.userEmail && w.userEmail.toLowerCase() === currentUserEmail;
      const idMatch = currentUserId && w.userId && String(w.userId) === currentUserId;
      return stayMatch && (emailMatch || idMatch);
    });

    if (existingIdx >= 0) {
      fileWishlists.splice(existingIdx, 1);
      isWishlisted = false;
    } else {
      fileWishlists.unshift({
        id: 'wish_' + Date.now(),
        userEmail: currentUserEmail,
        userId: currentUserId,
        stayId,
        stay,
        createdAt: new Date().toISOString(),
      });
      isWishlisted = true;
    }
    writeWishlistsToFile(fileWishlists);

    return res.json({
      success: true,
      inWishlist: isWishlisted,
      stayId,
      message: isWishlisted ? 'Added to wishlist' : 'Removed from wishlist',
    });
  } catch (error) {
    console.error('toggleWishlist Error:', error);
    return next(error);
  }
};

// @desc    Remove item from user wishlist
// @route   DELETE /api/wishlist/:stayId
// @access  Private
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { stayId } = req.params;
    const currentUserId = (req.user?._id || req.user?.id || '')?.toString();
    const currentUserEmail = (req.user?.email || '').toLowerCase().trim();

    if (!stayId) {
      return res.status(400).json({ message: 'Stay ID is required' });
    }

    // 1. Delete from MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {
          stayId: String(stayId),
          $or: [
            ...(currentUserEmail ? [{ userEmail: currentUserEmail }] : []),
            ...(currentUserId ? [{ userId: currentUserId }] : []),
          ],
        };
        await Wishlist.deleteMany(query);
      } catch (err) {
        console.warn('MongoDB Wishlist delete warning:', err.message);
      }
    }

    // 2. Delete from file store
    const fileWishlists = readWishlistsFromFile();
    const filtered = fileWishlists.filter((w) => {
      const matchStay = String(w.stayId) === String(stayId);
      const matchUser =
        (currentUserEmail && w.userEmail && w.userEmail.toLowerCase() === currentUserEmail) ||
        (currentUserId && w.userId && String(w.userId) === currentUserId);
      return !(matchStay && matchUser);
    });
    writeWishlistsToFile(filtered);

    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('removeFromWishlist Error:', error);
    return next(error);
  }
};
