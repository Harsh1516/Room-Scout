import mongoose from 'mongoose';

const hostSubscriptionPaymentSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      required: true,
      index: true,
    },
    stayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stay',
      default: null,
      index: true,
    },
    planCode: {
      type: String,
      enum: ['monthly', 'quarterly', 'halfYearly', 'yearly'],
      required: true,
    },
    planLabel: {
      type: String,
      required: true,
      trim: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    transactionRef: {
      type: String,
      required: [true, '12-digit UPI reference number is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    recipientUpiId: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activatedStartDate: {
      type: Date,
      default: null,
    },
    activatedExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries on pending payments per host
hostSubscriptionPaymentSchema.index({ hostId: 1, createdAt: -1 });
hostSubscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

export const HostSubscriptionPayment = mongoose.model(
  'HostSubscriptionPayment',
  hostSubscriptionPaymentSchema
);

