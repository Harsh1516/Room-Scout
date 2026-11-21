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
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    startOption: {
      type: String,
      enum: ['CURRENT', 'NEXT'],
      default: 'CURRENT',
    },
    recipientUpiId: {
      type: String,
      trim: true,
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
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: String,
      trim: true,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for deriving human-readable plan label if omitted
hostSubscriptionPaymentSchema.virtual('derivedPlanLabel').get(function () {
  return (
    this.planLabel ||
    (this.durationMonths ? `${this.durationMonths} Month${this.durationMonths > 1 ? 's' : ''}` : this.planCode || '')
  );
});

// Indexes for fast host and status queries
hostSubscriptionPaymentSchema.index({ hostId: 1, createdAt: -1 });
hostSubscriptionPaymentSchema.index({ status: 1, createdAt: -1 });

// Partial unique index: prevents concurrent duplicate submissions of the same UTR
hostSubscriptionPaymentSchema.index(
  { transactionRef: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING', 'VERIFIED'] } },
  }
);

export const HostSubscriptionPayment = mongoose.model(
  'HostSubscriptionPayment',
  hostSubscriptionPaymentSchema
);
