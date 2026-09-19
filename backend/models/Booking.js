import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    // Relational Entity References
    stayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stay',
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    stayTitle: {
      type: String,
      trim: true,
      default: 'Room Reservation',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },

    // Guest Profile
    fullName: {
      type: String,
      required: [true, 'Guest full name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Guest phone number is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    aadharNumber: {
      type: String,
      trim: true,
      default: '',
    },

    // Reservation & Room Schedule (Strict Range Model)
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    roomType: {
      type: String,
      trim: true,
      default: 'Standard',
    },
    rateUnit: {
      type: String,
      enum: ['/night', '/month'],
      default: '/month',
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date timestamp is required'],
      index: true,
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date timestamp is required'],
      index: true,
    },
    durationDisplay: {
      type: String,
      default: '',
    },

    // Occupancy & Billing
    adults: {
      type: Number,
      default: 1,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxBreakdown: {
      baseAmount: { type: Number, default: 0 },
      cleaningFee: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },

    // Identifiers & Status
    bookingReferenceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slotBookingId: {
      type: String,
      default: '',
    },
    bookingSource: {
      type: String,
      enum: ['ONLINE', 'ONLINE_USER', 'OFFLINE_HOST', 'WALK_IN', 'ADMIN'],
      default: 'ONLINE',
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED', 'EXPIRED'],
      default: 'CONFIRMED',
      index: true,
    },

    // Payment Tracking
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COMPLETED'],
      default: 'PAID',
    },
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'RAZORPAY', 'PAY_ON_ARRIVAL', 'CASH', 'OFFLINE'],
      default: 'OFFLINE',
    },
    paymentDetails: {
      gateway: { type: String, default: 'Offline / Pay at Property' },
      paymentId: { type: String, default: '' },
      orderId: { type: String, default: '' },
      signature: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Normalize check-in/check-out formats
bookingSchema.pre('validate', function (next) {
  if (this.checkIn && typeof this.checkIn === 'string') {
    this.checkIn = new Date(this.checkIn);
  }
  if (this.checkOut && typeof this.checkOut === 'string') {
    this.checkOut = new Date(this.checkOut);
  }
  next();
});

// Backward-compatible Virtual Getters[cite: 4]
bookingSchema.virtual('userName').get(function () { return this.fullName; });
bookingSchema.virtual('guestName').get(function () { return this.fullName; });
bookingSchema.virtual('userEmail').get(function () { return this.email; });
bookingSchema.virtual('guestEmail').get(function () { return this.email; });
bookingSchema.virtual('userPhone').get(function () { return this.phone; });
bookingSchema.virtual('guestPhone').get(function () { return this.phone; });
bookingSchema.virtual('guestAadhar').get(function () { return this.aadharNumber; });

// Compound Indexes for fast conflict resolution & schedule checking
bookingSchema.index({ stayId: 1, roomNumber: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ hostId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);