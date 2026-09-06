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
      enum: ['Boys', 'Girls', 'Both', 'Unisex', 'Family'],
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
      index: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    // Standard GeoJSON point for geospatial queries ($near, $geoWithin)
    locationGeo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] - GeoJSON strict standard
        default: [0, 0],
      },
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
      min: 0,
    },
    rateUnit: {
      type: String,
      default: '/month',
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    badge: {
      type: String,
      default: 'VERIFIED HOST',
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    rules: [
      {
        type: String,
        trim: true,
      },
    ],
    // Clean numeric pricing for room tiers
    roomRates: [
      {
        id: { type: String },
        type: { type: String },
        price: { type: Number, default: 0 },
        rateUnit: { type: String, default: '/month' },
      },
    ],
    availableRooms: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalRooms: {
      type: Number,
      default: 1,
      min: 1,
    },
    rooms: [
      {
        id: { type: String },
        roomNumber: { type: String },
        roomNumInt: { type: Number },
        status: { type: String, default: 'Available' },
        type: { type: String },
        price: { type: Number, default: 0 },
        rateUnit: { type: String, default: '/month' },
        floor: { type: String },
        bookedDates: [{ type: String }],
        bookedMonths: [{ type: String }],
        slotBookings: [{ type: mongoose.Schema.Types.Mixed }],
        guestName: { type: String },
        guestPhone: { type: String },
        userPhone: { type: String },
        phone: { type: String },
        guestEmail: { type: String },
        userEmail: { type: String },
        guestAadhar: { type: String },
        aadharId: { type: String },
        adults: { type: Number },
        children: { type: Number },
      },
    ],
    // Image URLs (Cloudinary / S3 HTTPS links only)
    image: {
      type: String,
      required: true,
    },
    images: [
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
      type: mongoose.Schema.Types.Mixed,
      ref: 'Host',
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

// Pre-save hook: Syncs latitude/longitude into GeoJSON format automatically
staySchema.pre('save', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [Number(this.longitude), Number(this.latitude)],
    };
  }
  next();
});

// Indexes for ultra-fast query execution
staySchema.index({ locationGeo: '2dsphere' });
staySchema.index({ city: 1, type: 1, price: 1, rating: -1 });
staySchema.index({ type: 1, price: 1 });
staySchema.index({ createdAt: -1 });
staySchema.index({ hostEmail: 1 });
staySchema.index({ location: 'text', title: 'text', city: 'text' });

export const Stay = mongoose.model('Stay', staySchema);