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
      enum: ['OFFLINE', 'ONLINE', 'RAZORPAY', 'STRIPE', 'UPI', 'CASH'],
      default: 'OFFLINE',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'COMPLETED',
      index: true,
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
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
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);