import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true, trim: true },
    userAvatar: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, trim: true },
    roomNumInt: { type: Number },
    type: { type: String, required: true, default: 'Standard' },
    price: { type: mongoose.Schema.Types.Mixed, required: true, default: 0 },
    rateUnit: { type: String, default: '/month' },
    floor: { type: String, default: 'Floor 1' },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Maintenance', 'Booked'],
      default: 'Available',
    },
  },
  { _id: true, strict: true }
);

const staySchema = new mongoose.Schema(
  {
    // Host Identity Reference
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },

    // Property Overview
    title: {
      type: String,
      required: [true, 'Please provide a property title'],
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
    description: {
      type: String,
      default: '',
      trim: true,
    },

    // Location & GeoJSON
    location: {
      type: String,
      required: [true, 'Please provide location description'],
      trim: true,
    },
    address: { type: String, trim: true, default: '' },
    roadArea: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    locationGeo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    latitude: { type: Number },
    longitude: { type: Number },

    // Pricing & Rating
    price: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: 0,
    },
    rateUnit: {
      type: String,
      default: '/month',
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    badge: {
      type: String,
      default: 'VERIFIED HOST',
    },

    // Features, Rules & Assets
    facilities: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    rules: [{ type: String, trim: true }],
    image: { type: String, default: '' },
    images: [{ type: String }],
    instagramVideoUrl: { type: String, default: '' },

    // Room Inventory
    availableRooms: { type: Number, default: 1, min: 0 },
    totalRooms: { type: Number, default: 1, min: 0 },
    roomRates: [
      {
        type: { type: String },
        price: { type: mongoose.Schema.Types.Mixed, default: 0 },
        rateUnit: { type: String, default: '' },
      },
    ],
    rooms: [roomSchema],

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Computes the lowest starting rate from roomRates or individual rooms.
 * Normalizes string/number inputs (e.g., "₹4,000" -> 4000) and pairs it with
 * the appropriate rateUnit (e.g., "/month" or "/night").
 */
export function computeLowestStartingPrice(roomRates = [], rooms = [], fallbackPrice = 0, fallbackUnit = '/month') {
  const candidateRates = [];

  if (Array.isArray(roomRates)) {
    for (const r of roomRates) {
      if (!r) continue;
      const parsed = parseInt(String(r.price || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        candidateRates.push({
          price: parsed,
          rateUnit: r.rateUnit || fallbackUnit || '/month',
        });
      }
    }
  }

  if (candidateRates.length === 0 && Array.isArray(rooms)) {
    for (const rm of rooms) {
      if (!rm) continue;
      const parsed = parseInt(String(rm.price || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        candidateRates.push({
          price: parsed,
          rateUnit: rm.rateUnit || fallbackUnit || '/month',
        });
      }
    }
  }

  if (candidateRates.length > 0) {
    candidateRates.sort((a, b) => a.price - b.price);
    return {
      price: candidateRates[0].price,
      rateUnit: candidateRates[0].rateUnit,
    };
  }

  const parsedFallback = parseInt(String(fallbackPrice || '').replace(/[^0-9]/g, ''), 10);
  return {
    price: !isNaN(parsedFallback) && parsedFallback > 0 ? parsedFallback : 4000,
    rateUnit: fallbackUnit || '/month',
  };
}

// Pre-save hook: Automatic sync of latitude/longitude into GeoJSON format & starting price
staySchema.pre('save', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [Number(this.longitude), Number(this.latitude)],
    };
  }

  // Automatically sync root starting price and rateUnit from lowest room category / room
  const starting = computeLowestStartingPrice(this.roomRates, this.rooms, this.price, this.rateUnit);
  this.price = starting.price;
  this.rateUnit = starting.rateUnit;

  next();
});

// Pre-findOneAndUpdate hook: Keep root price & rateUnit synced on atomic updates
staySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const target = update.$set || update;
  if (target.roomRates || target.rooms || target.price) {
    const starting = computeLowestStartingPrice(
      target.roomRates,
      target.rooms,
      target.price,
      target.rateUnit
    );
    if (update.$set) {
      update.$set.price = starting.price;
      if (starting.rateUnit) update.$set.rateUnit = starting.rateUnit;
    } else {
      update.price = starting.price;
      if (starting.rateUnit) update.rateUnit = starting.rateUnit;
    }
  }
  next();
});

// Query Indexes
staySchema.index({ locationGeo: '2dsphere' });
staySchema.index({ hostId: 1, isPublished: 1 });
staySchema.index({ city: 1, type: 1, price: 1, rating: -1 });
staySchema.index({ location: 'text', title: 'text', city: 'text' });

export const Stay = mongoose.model('Stay', staySchema);