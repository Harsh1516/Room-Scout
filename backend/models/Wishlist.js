import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stay',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate entries of the same stay per user
wishlistSchema.index({ userId: 1, stayId: 1 }, { unique: true });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);