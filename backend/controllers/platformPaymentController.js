import { PlatformPaymentSettings } from '../models/PlatformPaymentSettings.js';

const DEFAULT_PLANS = [
  { code: 'monthly', label: 'Monthly', durationMonths: 1, price: null },
  { code: 'quarterly', label: '3 Months', durationMonths: 3, price: null },
  { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: null },
  { code: 'yearly', label: '1 Year', durationMonths: 12, price: null },
];

export async function getPlatformPaymentSettings(req, res, next) {
  try {
    let settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    if (!settings) {
      settings = await PlatformPaymentSettings.create({ key: 'platform', plans: DEFAULT_PLANS });
      settings = settings.toObject();
    }
    return res.json({ success: true, settings });
  } catch (error) {
    return next(error);
  }
}

export async function updatePlatformPaymentSettings(req, res, next) {
  try {
    const { payeeName, upiId, mobileNumber, qrCodeUrl, paymentInstructions, plans } = req.body || {};
    if (!Array.isArray(plans) || plans.length !== 4) {
      return res.status(400).json({ success: false, message: 'All four subscription durations are required.' });
    }

    const expected = new Map([
      ['monthly', 1], ['quarterly', 3], ['halfYearly', 6], ['yearly', 12],
    ]);
    for (const plan of plans) {
      if (!expected.has(plan.code) || expected.get(plan.code) !== Number(plan.durationMonths)) {
        return res.status(400).json({ success: false, message: 'Invalid subscription duration.' });
      }
      if (plan.price !== null && (!Number.isFinite(Number(plan.price)) || Number(plan.price) < 0)) {
        return res.status(400).json({ success: false, message: 'Plan prices must be zero or greater.' });
      }
    }

    const settings = await PlatformPaymentSettings.findOneAndUpdate(
      { key: 'platform' },
      {
        $set: {
          payeeName: String(payeeName || '').trim(),
          upiId: String(upiId || '').trim(),
          mobileNumber: String(mobileNumber || '').trim(),
          qrCodeUrl: String(qrCodeUrl || '').trim(),
          paymentInstructions: String(paymentInstructions || '').trim(),
          plans: plans.map((plan) => ({
            code: plan.code,
            label: expected.get(plan.code) === 1 ? 'Monthly' : plan.label,
            durationMonths: expected.get(plan.code),
            price: plan.price === '' || plan.price === null || plan.price === undefined ? null : Number(plan.price),
            isActive: plan.isActive !== false,
          })),
          updatedBy: req.user?._id || null,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, settings, message: 'Platform payment settings saved.' });
  } catch (error) {
    return next(error);
  }
}
