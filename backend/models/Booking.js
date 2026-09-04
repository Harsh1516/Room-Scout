import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
    },
    userId: {
      type: String,
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    hostId: {
      type: String,
    },
    hostEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    stay: {
      type: mongoose.Schema.Types.Mixed,
    },
    stayTitle: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    location: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '',
    },
    guestGender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    moveInDate: {
      type: String,
      required: true,
    },
    durationMonths: {
      type: Number,
      default: 3,
    },
    durationDays: {
      type: Number,
    },
    durationDisplay: {
      type: String,
      default: '3 Months',
    },
    sharingType: {
      type: String,
      default: 'Double Sharing',
    },
    roomNumber: {
      type: String,
    },
    roomType: {
      type: String,
    },
    checkIn: {
      type: String,
    },
    checkOut: {
      type: String,
    },
    checkInISO: {
      type: String,
    },
    checkOutISO: {
      type: String,
    },
    bookedDates: [{
      type: String,
    }],
    bookedMonths: [{
      type: String,
    }],
    rateUnit: {
      type: String,
      default: '/month',
    },
    guestName: {
      type: String,
    },
    userName: {
      type: String,
    },
    guestPhone: {
      type: String,
    },
    userPhone: {
      type: String,
    },
    guestAadhar: {
      type: String,
      default: '',
    },
    aadharId: {
      type: String,
      default: '',
    },
    adults: {
      type: Number,
      default: 1,
    },
    children: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    taxBreakdown: {
      baseAmount: { type: Number, default: 0 },
      cleaningFee: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },
    bookingReferenceId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PAYMENT_PENDING',
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED',
        'REFUNDED',
        'Pending Host Approval',
        'Approved - Payment Pending',
        'APPROVED',
        'REJECTED',
        'CHECKED_IN',
        'CHECKED_OUT',
      ],
      default: 'Pending Host Approval',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PAID',
    },
    paymentDetails: {
      gateway: { type: String, default: 'Offline/Advance' },
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
  }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ hostEmail: 1, createdAt: -1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
