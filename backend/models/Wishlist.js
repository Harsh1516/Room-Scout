import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      trim: true,
    },
    stayId: {
      type: String,
      required: true,
      trim: true,
    },
    stay: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index({ userEmail: 1, stayId: 1 }, { unique: true });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
