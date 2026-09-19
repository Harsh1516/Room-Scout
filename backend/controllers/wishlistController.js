import mongoose from 'mongoose';
import { Wishlist } from '../models/Wishlist.js';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';

// @desc    Get authenticated user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.json([]);
    }

    const items = await Wishlist.find({ userId })
      .populate({
        path: 'stayId',
        populate: { path: 'hostId', select: 'name email phone avatar status' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Clean up orphaned wishlist documents (where stay was deleted)
    const orphanedIds = items
      .filter((item) => !item.stayId)
      .map((item) => item._id);
    if (orphanedIds.length > 0) {
      Wishlist.deleteMany({ _id: { $in: orphanedIds } }).catch((err) =>
        console.warn('Clean up orphaned wishlist error:', err)
      );
    }

    // Only return stays that exist, are published/live, and have an approved host
    const liveItems = items.filter((item) => {
      if (!item.stayId) return false;
      const stay = item.stayId;
      if (stay.isPublished !== true) return false;
      if (
        stay.hostId &&
        typeof stay.hostId === 'object' &&
        stay.hostId.status &&
        stay.hostId.status !== 'Approved'
      ) {
        return false;
      }
      return true;
    });

    const formatted = liveItems.map((item) => ({
      ...item.stayId,
      _id: item.stayId._id.toString(),
      id: item.stayId._id.toString(),
      wishlistId: item._id.toString(),
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('getWishlist Error:', error);
    return next(error);
  }
};

// @desc    Toggle stay in user wishlist
// @route   POST /api/wishlist/toggle
// @access  Private
export const toggleWishlist = async (req, res, next) => {
  try {
    const { stay, stayId: rawStayId } = req.body;
    const targetStayId = rawStayId || stay?._id || stay?.id;

    if (!targetStayId || !mongoose.Types.ObjectId.isValid(targetStayId)) {
      return res.status(400).json({ message: 'Valid stayId is required.' });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const existing = await Wishlist.findOne({ userId, stayId: targetStayId });

    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        inWishlist: false,
        stayId: targetStayId,
        message: 'Removed from wishlist',
      });
    }

    // Validate stay is live and approved before adding
    const targetStay = await Stay.findById(targetStayId).populate('hostId', 'status').lean();
    if (
      !targetStay ||
      targetStay.isPublished !== true ||
      (targetStay.hostId && targetStay.hostId.status && targetStay.hostId.status !== 'Approved')
    ) {
      return res.status(400).json({
        success: false,
        message: 'This property is not currently live or approved by admin.',
      });
    }

    await Wishlist.create({
      userId,
      stayId: targetStayId,
    });

    return res.json({
      success: true,
      inWishlist: true,
      stayId: targetStayId,
      message: 'Added to wishlist',
    });
  } catch (error) {
    console.error('toggleWishlist Error:', error);
    return next(error);
  }
};

// @desc    Remove stay from wishlist
// @route   DELETE /api/wishlist/:stayId
// @access  Private
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { stayId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!stayId || !mongoose.Types.ObjectId.isValid(stayId)) {
      return res.status(400).json({ message: 'Valid stayId is required.' });
    }

    await Wishlist.deleteMany({ userId, stayId });

    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('removeFromWishlist Error:', error);
    return next(error);
  }
};