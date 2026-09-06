import mongoose from 'mongoose';
import { Wishlist } from '../models/Wishlist.js';
import { User } from '../models/User.js';

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

    const conditions = [];
    if (currentUserEmail) conditions.push({ email: currentUserEmail });
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      conditions.push({ _id: new mongoose.Types.ObjectId(currentUserId) });
    }

    // 1. Try fetching directly from native embedded user.wishlist
    if (conditions.length > 0) {
      const user = await User.findOne({ $or: conditions }).lean();
      if (user && Array.isArray(user.wishlist) && user.wishlist.length > 0) {
        const items = user.wishlist.map((w) => ({
          ...(w.stay || {}),
          _id: w.stayId || w.stay?._id || w.stay?.id,
          id: w.stayId || w.stay?.id || w.stay?._id,
          wishlistId: w._id?.toString() || w.stayId,
        }));
        return res.json(items);
      }
    }

    // 2. Fallback to Wishlist collection
    const wishlistConditions = [];
    if (currentUserEmail) wishlistConditions.push({ userEmail: currentUserEmail });
    if (currentUserId) wishlistConditions.push({ userId: currentUserId });

    const mongoWishlists = await Wishlist.find({ $or: wishlistConditions }).sort({ createdAt: -1 }).lean();
    const items = (mongoWishlists || []).map((w) => ({
      ...w.stay,
      _id: w.stayId || w.stay?._id || w.stay?.id,
      id: w.stayId || w.stay?.id || w.stay?._id,
      wishlistId: w._id?.toString(),
    }));

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

    // 🏛️ Also update native default user.wishlist subdocument
    const userQuery = [];
    if (currentUserEmail) userQuery.push({ email: currentUserEmail });
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      userQuery.push({ _id: new mongoose.Types.ObjectId(currentUserId) });
    }

    if (userQuery.length > 0) {
      if (isWishlisted) {
        await User.updateOne(
          { $or: userQuery },
          { $push: { wishlist: { stayId, stay, addedAt: new Date() } } }
        ).catch(() => {});
      } else {
        await User.updateOne(
          { $or: userQuery },
          { $pull: { wishlist: { stayId } } }
        ).catch(() => {});
      }
    }

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

    const query = {
      stayId: String(stayId),
      $or: [
        ...(currentUserEmail ? [{ userEmail: currentUserEmail }] : []),
        ...(currentUserId ? [{ userId: currentUserId }] : []),
      ],
    };
    await Wishlist.deleteMany(query);

    // 🏛️ Also remove from native default user.wishlist
    const userQuery = [];
    if (currentUserEmail) userQuery.push({ email: currentUserEmail });
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      userQuery.push({ _id: new mongoose.Types.ObjectId(currentUserId) });
    }
    if (userQuery.length > 0) {
      await User.updateOne(
        { $or: userQuery },
        { $pull: { wishlist: { stayId: String(stayId) } } }
      ).catch(() => {});
    }

    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('removeFromWishlist Error:', error);
    return next(error);
  }
};
