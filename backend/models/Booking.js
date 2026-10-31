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
      default: 'Other',
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
    bookedDates: {
      type: [String],
      default: [],
    },
    bookedMonths: {
      type: [String],
      default: [],
    },

    // Occupancy & Billing
    personCount: {
      type: Number,
      default: 1,
      min: 1,
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
      enum: ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED', 'EXPIRED'],
      default: 'CONFIRMED',
      index: true,
    },
    paymentDeadline: {
      type: Date,
      default: null,
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    // Payment Tracking
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'COMPLETED'],
      default: 'UNPAID',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'UPI', 'PAY_ON_ARRIVAL', 'CASH', 'OFFLINE', 'RAZORPAY'],
      default: 'OFFLINE',
    },
    paymentDetails: {
      gateway: { type: String, default: 'Direct Host UPI' },
      paymentId: { type: String, default: '' },
      orderId: { type: String, default: '' },
      signature: { type: String, default: '' },
    },
    upiPayment: {
      upiId: { type: String, trim: true, default: '' },
      payeeName: { type: String, trim: true, default: '' },
      transactionRef: { type: String, trim: true, uppercase: true, default: '' },
      receiptUrl: { type: String, default: '' },
      verificationStatus: {
        type: String,
        enum: ['UNSUBMITTED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'],
        default: 'UNSUBMITTED',
        index: true,
      },
      submittedAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', default: null },
      verificationNote: { type: String, trim: true, default: '' },
      rejectionReason: { type: String, trim: true, default: '' },
      submissionCount: { type: Number, default: 0 },
      isRecheckRequested: { type: Boolean, default: false },
    },
    pricingSnapshot: {
      basePrice: { type: Number, default: 0 },
      rateUnit: { type: String, default: '/month' },
      unitCount: { type: Number, default: 1 },
      taxes: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      deposit: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      recipientUpiId: { type: String, default: '' },
      recipientPayeeName: { type: String, default: '' },
      snapshotAt: { type: Date, default: Date.now },
    },
    auditLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
        performerRole: { type: String, default: 'system' },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
        note: { type: String, default: '' },
      },
    ],
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
bookingSchema.index({ 'upiPayment.transactionRef': 1 }, { sparse: true });

export const Booking = mongoose.model('Booking', bookingSchema);