import mongoose from 'mongoose';

const subscriptionPaymentSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true, index: true },
  hostName: { type: String, trim: true, default: '' },
  hostEmail: { type: String, lowercase: true, trim: true, default: '' },
  planCode: { type: String, enum: ['monthly', 'quarterly', 'halfYearly', 'yearly'], required: true },
  durationMonths: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 1 },
  utr: { type: String, required: true, trim: true, maxlength: 80 },
  receiptUrl: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  subscriptionStartsAt: { type: Date, default: null },
  subscriptionEndsAt: { type: Date, default: null },
}, { timestamps: true });

subscriptionPaymentSchema.index({ utr: 1 }, { unique: true });

export const SubscriptionPayment = mongoose.models.SubscriptionPayment
  || mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
