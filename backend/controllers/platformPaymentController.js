import { PlatformPaymentSettings } from '../models/PlatformPaymentSettings.js';

const DEFAULT_PLANS = [
  { code: 'monthly', label: 'Monthly', durationMonths: 1, price: null },
  { code: 'quarterly', label: '3 Months', durationMonths: 3, price: null },
  { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: null },
];

const DEFAULT_PROPERTY_PRICING = {
  PG: 10,
  Hotel: 50,
  Hostel: 15,
  Villa: 40,
  Resort: 50,
  Flat: 25,
};

const DEFAULT_DISCOUNTS = {
  quarterly: 5,
  halfYearly: 10,
};

export async function getPlatformPaymentSettings(req, res, next) {
  try {
    let settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    if (!settings) {
      settings = await PlatformPaymentSettings.create({
        key: 'platform',
        plans: DEFAULT_PLANS,
        propertyPricing: DEFAULT_PROPERTY_PRICING,
        discounts: DEFAULT_DISCOUNTS,
      });
      settings = settings.toObject();
    }
    if (!settings.propertyPricing) {
      settings.propertyPricing = DEFAULT_PROPERTY_PRICING;
    }
    if (!settings.discounts) {
      settings.discounts = DEFAULT_DISCOUNTS;
    }
    if (Array.isArray(settings.plans)) {
      if (settings.plans.some((p) => p.code === 'yearly')) {
        await PlatformPaymentSettings.updateOne(
          { key: 'platform' },
          { $pull: { plans: { code: 'yearly' } } }
        );
      }
      settings.plans = settings.plans.filter((p) => p.code !== 'yearly');
    }
    return res.json({ success: true, settings });
  } catch (error) {
    return next(error);
  }
}

export async function updatePlatformPaymentSettings(req, res, next) {
  try {
    const {
      payeeName,
      upiId,
      mobileNumber,
      qrCodeUrl,
      paymentInstructions,
      plans,
      propertyPricing,
      discounts,
    } = req.body || {};

    const cleanPropertyPricing = {
      PG: Math.max(0, Number(propertyPricing?.PG !== undefined ? propertyPricing.PG : 10)),
      Hotel: Math.max(0, Number(propertyPricing?.Hotel !== undefined ? propertyPricing.Hotel : 50)),
      Hostel: Math.max(0, Number(propertyPricing?.Hostel !== undefined ? propertyPricing.Hostel : 15)),
      Villa: Math.max(0, Number(propertyPricing?.Villa !== undefined ? propertyPricing.Villa : 40)),
      Resort: Math.max(0, Number(propertyPricing?.Resort !== undefined ? propertyPricing.Resort : 50)),
      Flat: Math.max(0, Number(propertyPricing?.Flat !== undefined ? propertyPricing.Flat : 25)),
    };

    const cleanDiscounts = {
      quarterly: Math.max(0, Math.min(100, Number(discounts?.quarterly !== undefined ? discounts.quarterly : 5))),
      halfYearly: Math.max(0, Math.min(100, Number(discounts?.halfYearly !== undefined ? discounts.halfYearly : 10))),
    };

    const expected = new Map([
      ['monthly', 1],
      ['quarterly', 3],
      ['halfYearly', 6],
    ]);

    let finalPlans = [];
    if (Array.isArray(plans) && plans.length === 3) {
      for (const plan of plans) {
        if (!expected.has(plan.code) || expected.get(plan.code) !== Number(plan.durationMonths)) {
          return res.status(400).json({ success: false, message: 'Invalid subscription duration.' });
        }
        if (plan.price !== null && (!Number.isFinite(Number(plan.price)) || Number(plan.price) < 0)) {
          return res.status(400).json({ success: false, message: 'Plan prices must be zero or greater.' });
        }
      }
      finalPlans = plans.map((plan) => ({
        code: plan.code,
        label: expected.get(plan.code) === 1 ? 'Monthly' : plan.label,
        durationMonths: expected.get(plan.code),
        price: plan.price === '' || plan.price === null || plan.price === undefined ? null : Number(plan.price),
        isActive: plan.isActive !== false,
      }));
    } else {
      // Auto-generate fallback plans from PG 1 room
      finalPlans = [
        { code: 'monthly', label: 'Monthly', durationMonths: 1, price: cleanPropertyPricing.PG, isActive: true },
        { code: 'quarterly', label: '3 Months', durationMonths: 3, price: Math.round(cleanPropertyPricing.PG * 3 * (1 - cleanDiscounts.quarterly / 100)), isActive: true },
        { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: Math.round(cleanPropertyPricing.PG * 6 * (1 - cleanDiscounts.halfYearly / 100)), isActive: true },
      ];
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
          propertyPricing: cleanPropertyPricing,
          discounts: cleanDiscounts,
          plans: finalPlans,
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
