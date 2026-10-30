import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    bookingReferenceId: {
      type: String,
      required: true,
      index: true,
    },
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['OFFLINE', 'ONLINE', 'UPI', 'CASH', 'RAZORPAY'],
      default: 'UPI',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'AWAITING_VERIFICATION', 'COMPLETED', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    transactionRef: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    recipientUpiId: {
      type: String,
      default: '',
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNSUBMITTED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'],
      default: 'UNSUBMITTED',
      index: true,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    auditNotes: {
      type: String,
      default: '',
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
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ hostId: 1, paymentStatus: 1, createdAt: -1 });
paymentSchema.index({ hostId: 1, verificationStatus: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionRef: 1 }, { sparse: true });

export const Payment = mongoose.model('Payment', paymentSchema);
