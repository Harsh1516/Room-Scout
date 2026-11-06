import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ['monthly', 'quarterly', 'halfYearly', 'yearly'],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    price: { type: Number, default: null, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const propertyPricingSchema = new mongoose.Schema(
  {
    PG: { type: Number, default: 10, min: 0 },
    Hotel: { type: Number, default: 50, min: 0 },
    Resort: { type: Number, default: 50, min: 0 },
    Flat: { type: Number, default: 25, min: 0 },
  },
  { _id: false }
);

const discountsSchema = new mongoose.Schema(
  {
    quarterly: { type: Number, default: 5, min: 0, max: 100 },
    halfYearly: { type: Number, default: 10, min: 0, max: 100 },
  },
  { _id: false }
);

const platformPaymentSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'platform', unique: true, immutable: true },
    payeeName: { type: String, trim: true, default: '' },
    upiId: { type: String, trim: true, default: '' },
    mobileNumber: { type: String, trim: true, default: '' },
    qrCodeUrl: { type: String, trim: true, default: '' },
    paymentInstructions: { type: String, trim: true, default: '' },
    propertyPricing: {
      type: propertyPricingSchema,
      default: () => ({
        PG: 10,
        Hotel: 50,
        Resort: 50,
        Flat: 25,
      }),
    },
    discounts: {
      type: discountsSchema,
      default: () => ({
        quarterly: 5,
        halfYearly: 10,
      }),
    },
    plans: {
      type: [subscriptionPlanSchema],
      default: [
        { code: 'monthly', label: 'Monthly', durationMonths: 1, price: null },
        { code: 'quarterly', label: '3 Months', durationMonths: 3, price: null },
        { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: null },
      ],
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

export const PlatformPaymentSettings = mongoose.models.PlatformPaymentSettings
  || mongoose.model('PlatformPaymentSettings', platformPaymentSettingsSchema);
