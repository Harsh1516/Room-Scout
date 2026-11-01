import { Host } from '../models/Host.js';
import { PlatformPaymentSettings } from '../models/PlatformPaymentSettings.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';

const durations = new Map([['monthly', 1], ['quarterly', 3], ['halfYearly', 6], ['yearly', 12]]);
const hostId = (req) => req.user?.userId || req.user?.id || req.user?._id;

export async function getHostSubscriptionOptions(req, res, next) {
  try {
    const settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    if (!settings?.upiId) return res.status(404).json({ success: false, message: 'Subscription payment details are not configured yet.' });
    const plans = (settings.plans || []).filter((p) => p.isActive !== false && Number(p.price) > 0);
    return res.json({ success: true, paymentDetails: { payeeName: settings.payeeName, upiId: settings.upiId, mobileNumber: settings.mobileNumber, qrCodeUrl: settings.qrCodeUrl, paymentInstructions: settings.paymentInstructions }, plans });
  } catch (error) { return next(error); }
}

export async function submitHostSubscriptionPayment(req, res, next) {
  try {
    const id = hostId(req);
    const host = await Host.findById(id).select('name email');
    if (!host) return res.status(404).json({ success: false, message: 'Host account not found.' });
    const { planCode, utr, receiptUrl = '', note = '' } = req.body || {};
    const settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    const plan = settings?.plans?.find((p) => p.code === planCode && p.isActive !== false && Number(p.price) > 0);
    if (!plan || durations.get(planCode) !== Number(plan.durationMonths)) return res.status(400).json({ success: false, message: 'Please choose an available subscription duration.' });
    const cleanUtr = String(utr || '').trim();
    if (cleanUtr.length < 6 || cleanUtr.length > 80) return res.status(400).json({ success: false, message: 'Enter a valid UTR or transaction reference (6–80 characters).' });
    const payment = await SubscriptionPayment.create({ host: host._id, hostName: host.name, hostEmail: host.email, planCode, durationMonths: plan.durationMonths, amount: plan.price, utr: cleanUtr, receiptUrl: String(receiptUrl).trim(), note: String(note).trim() });
    return res.status(201).json({ success: true, payment, message: 'Payment submitted. Your subscription will activate after admin verification.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This UTR has already been submitted.' });
    return next(error);
  }
}

export async function getMySubscriptionPayments(req, res, next) {
  try {
    const payments = await SubscriptionPayment.find({ host: hostId(req) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, payments });
  } catch (error) { return next(error); }
}

export async function getPendingSubscriptionPayments(req, res, next) {
  try {
    const payments = await SubscriptionPayment.find().sort({ status: 1, createdAt: -1 }).lean();
    return res.json({ success: true, payments });
  } catch (error) { return next(error); }
}

export async function reviewSubscriptionPayment(req, res, next) {
  try {
    const { action, rejectionReason = '' } = req.body || {};
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be approve or reject.' });
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment request not found.' });
    if (payment.status !== 'pending') return res.status(409).json({ success: false, message: 'This payment has already been reviewed.' });
    payment.status = action === 'approve' ? 'approved' : 'rejected';
    payment.reviewedBy = hostId(req);
    payment.reviewedAt = new Date();
    payment.rejectionReason = action === 'reject' ? String(rejectionReason).trim() : '';
    if (action === 'approve') {
      const host = await Host.findById(payment.host);
      if (!host) return res.status(404).json({ success: false, message: 'Host account not found.' });
      const now = new Date();
      const currentEnd = host.subscriptionEndsAt && new Date(host.subscriptionEndsAt) > now ? new Date(host.subscriptionEndsAt) : now;
      const end = new Date(currentEnd);
      end.setMonth(end.getMonth() + payment.durationMonths);
      payment.subscriptionStartsAt = currentEnd;
      payment.subscriptionEndsAt = end;
      host.subscriptionStatus = 'active';
      host.subscriptionPlan = payment.planCode;
      host.subscriptionStartsAt = currentEnd;
      host.subscriptionEndsAt = end;
      await host.save();
    }
    await payment.save();
    return res.json({ success: true, payment, message: action === 'approve' ? 'Payment approved and subscription activated.' : 'Payment rejected.' });
  } catch (error) { return next(error); }
}
