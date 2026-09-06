import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    // Relational References
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    hostId: {
      type: String,
      index: true,
    },
    hostEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    stay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stay',
      index: true,
    },
    stayTitle: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },

    // Guest Profile (Canonical Single Source of Truth)
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
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

    // Reservation & Room Schedule
    roomNumber: {
      type: String,
      trim: true,
    },
    roomType: {
      type: String,
      trim: true,
    },
    rateUnit: {
      type: String,
      default: '/month',
    },
    moveInDate: {
      type: String,
      default: '',
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    durationMonths: {
      type: Number,
      default: 1,
      min: 0,
    },
    durationDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationDisplay: {
      type: String,
      default: '1 Month',
    },
    bookedDates: [{
      type: String,
    }],
    bookedMonths: [{
      type: String,
    }],

    // Occupancy & Billing Breakdown
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

    // Booking Status & Source Tracking
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
      enum: ['ONLINE', 'OFFLINE_HOST', 'WALK_IN', 'ADMIN'],
      default: 'ONLINE',
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'CONFIRMED',
    },

    // Payment Processing
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COMPLETED'],
      default: 'PAID',
    },
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'RAZORPAY', 'PAY_ON_ARRIVAL', 'CASH', 'OFFLINE', 'Offline Pay at Property'],
      default: 'OFFLINE',
    },
    paymentDetails: {
      gateway: { type: String, default: 'Offline / Pay at Property' },
      paymentId: { type: String, default: '' },
      orderId: { type: String, default: '' },
      signature: { type: String, default: '' },
    },
    holdExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save normalization: Flattens any incoming legacy duplicate fields into single attributes
bookingSchema.pre('validate', function (next) {
  // Collapse duplicate names
  if (!this.fullName) {
    this.fullName = this.get('userName') || this.get('guestName') || '';
  }
  // Collapse duplicate emails
  if (!this.email) {
    this.email = this.get('userEmail') || this.get('guestEmail') || '';
  }
  // Collapse duplicate phones
  if (!this.phone) {
    this.phone = this.get('userPhone') || this.get('guestPhone') || '';
  }
  // Collapse duplicate Aadhaar fields
  if (!this.aadharNumber) {
    this.aadharNumber =
      this.get('guestAadhar') ||
      this.get('aadhar') ||
      this.get('aadharId') ||
      '';
  }
  // Collapse duplicate room / sharing labels
  if (!this.roomType && this.get('sharingType')) {
    this.roomType = this.get('sharingType');
  }
  // Sync ISO date objects if incoming data has string checkIn/checkOut
  if (this.checkIn && typeof this.checkIn === 'string') {
    this.checkIn = new Date(this.checkIn);
  }
  if (this.checkOut && typeof this.checkOut === 'string') {
    this.checkOut = new Date(this.checkOut);
  }
  next();
});

// Backward-compatible Virtual Getters for legacy React components
bookingSchema.virtual('userName').get(function () { return this.fullName; });
bookingSchema.virtual('guestName').get(function () { return this.fullName; });
bookingSchema.virtual('userEmail').get(function () { return this.email; });
bookingSchema.virtual('guestEmail').get(function () { return this.email; });
bookingSchema.virtual('userPhone').get(function () { return this.phone; });
bookingSchema.virtual('guestPhone').get(function () { return this.phone; });
bookingSchema.virtual('guestGender').get(function () { return this.gender; });
bookingSchema.virtual('sharingType').get(function () { return this.roomType; });
bookingSchema.virtual('guestAadhar').get(function () { return this.aadharNumber; });
bookingSchema.virtual('aadharId').get(function () { return this.aadharNumber; });
bookingSchema.virtual('aadhar').get(function () { return this.aadharNumber; });

// Compound & Query Indexes
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ hostId: 1, createdAt: -1 });
bookingSchema.index({ stay: 1, status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);