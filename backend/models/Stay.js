import mongoose from 'mongoose';

const staySchema = new mongoose.Schema(
  {
    stayId: {
      type: mongoose.Schema.Types.Mixed,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      default: 'PG',
    },
    genderType: {
      type: String,
      enum: ['Boys', 'Girls', 'Unisex', 'Family'],
      default: 'Both',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    roadArea: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    price: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    badge: {
      type: String,
      default: 'VERIFIED HOST',
    },
    tags: [
      {
        type: String,
      },
    ],
    roomRates: [
      {
        id: { type: String },
        type: { type: String },
        price: { type: String },
        rateUnit: { type: String, default: '/month' },
      },
    ],
    availableRooms: {
      type: Number,
      default: 1,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
    rooms: [
      {
        id: { type: String },
        roomNumber: { type: String },
        roomNumInt: { type: Number },
        status: { type: String, default: 'Available' },
        type: { type: String },
        price: { type: String },
        rateUnit: { type: String, default: '/month' },
        floor: { type: String },
      },
    ],
    image: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    videos: [
      {
        type: String,
      },
    ],
    instagramVideoUrl: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    hostId: {
      type: String,
    },
    hostName: {
      type: String,
    },
    hostEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    hostPhone: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound and search indexes for Pan-India scaling
staySchema.index({ city: 1, type: 1, price: 1, rating: -1 });
staySchema.index({ type: 1, price: 1 });
staySchema.index({ createdAt: -1 });
staySchema.index({ hostEmail: 1 });
staySchema.index({ location: 'text', title: 'text', city: 'text' });

export const Stay = mongoose.model('Stay', staySchema);
