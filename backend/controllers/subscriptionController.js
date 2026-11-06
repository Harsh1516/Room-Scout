/**
 * Intelligently extracts the credited deposit amount from a bank statement line
 */
export function extractCreditAmountFromLine(line, utr) {
  if (!line || typeof line !== 'string') return null;

  // 1. Try CSV / TSV / Delimited splitting
  const delimiter = line.includes('\t') ? '\t' : ',';
  const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));

  if (parts.length >= 3) {
    const descIdx = parts.findIndex((p) => p.includes(utr));
    const searchParts = descIdx >= 0 ? parts.slice(descIdx + 1) : parts;

    // Filter valid positive numeric amounts (ignore dates, UTR, long numbers)
    const candidates = [];
    for (let i = 0; i < searchParts.length; i++) {
      const col = searchParts[i];
      const clean = col.replace(/,/g, '');
      if (
        /^\d+(?:\.\d{1,2})?$/.test(clean) &&
        clean !== utr &&
        clean.length <= 10 &&
        !col.includes('/') &&
        !col.includes('-')
      ) {
        const val = parseFloat(clean);
        if (val > 0) candidates.push({ idx: i, val });
      }
    }

    if (candidates.length === 1) return candidates[0].val;
    if (candidates.length >= 2) {
      // In typical bank CSV [Debit, Credit, Balance], Balance is last. Credit is candidate before last.
      return candidates[candidates.length - 2].val;
    }
  }

  // 2. Regex search for CR / Credit / Deposit / Rs / INR patterns
  const match = line.match(/(?:CR|Credit|Deposit|INR|Rs\.?|\u20B9)[\s:,/-]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (match) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num;
  }

  // 3. Fallback: Any standalone decimal currency number in the line that isn't the UTR
  const generalNumbers = [...line.matchAll(/(?:^|[\s,])(\d{2,6}(?:\.\d{2}))(?=[\s,]|$)/g)]
    .map((m) => parseFloat(m[1]))
    .filter((v) => !isNaN(v) && v > 0);
  if (generalNumbers.length === 1) return generalNumbers[0];
  if (generalNumbers.length >= 2) return generalNumbers[generalNumbers.length - 2];

  return null;
}

export function extractDateFromLine(line) {
  if (!line || typeof line !== 'string') return '';
  const dateMatch = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  return dateMatch ? dateMatch[1] : '';
}

import mongoose from 'mongoose';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { Host } from '../models/Host.js';
import { Stay } from '../models/Stay.js';
import { PlatformPaymentSettings } from '../models/PlatformPaymentSettings.js';
import { HostSubscriptionPayment } from '../models/HostSubscriptionPayment.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';

// Helper: Calculate dynamic room-based subscription plans based on property type and room count
export function calculateSubscriptionPlans({
  propertyType = 'PG',
  roomCount = 1,
  propertyPricing = {},
  discounts = {},
} = {}) {
  const normalizedType = String(propertyType || 'PG').trim();
  const validRates = {
    PG: 10,
    Hotel: 50,
    Hostel: 15,
    Villa: 40,
    Resort: 50,
    Flat: 25,
    ...(propertyPricing || {}),
  };

  // Find matching rate (case-insensitive fallback)
  let rate = validRates[normalizedType];
  if (rate === undefined || rate === null) {
    const matchKey = Object.keys(validRates).find(
      (k) => k.toLowerCase() === normalizedType.toLowerCase()
    );
    rate = matchKey ? validRates[matchKey] : validRates.PG ?? 10;
  }
  const cleanRate = Math.max(0, Number(rate) || 0);
  const rooms = Math.max(1, Number(roomCount) || 1);

  const monthlyBase = rooms * cleanRate;

  const dQuarterly = Number(discounts?.quarterly !== undefined ? discounts.quarterly : 5);
  const dHalfYearly = Number(discounts?.halfYearly !== undefined ? discounts.halfYearly : 10);

  const price1Mo = monthlyBase;
  const price3Mo = Math.round(monthlyBase * 3 * (1 - dQuarterly / 100));
  const price6Mo = Math.round(monthlyBase * 6 * (1 - dHalfYearly / 100));

  return {
    propertyType: normalizedType,
    roomCount: rooms,
    ratePerRoom: cleanRate,
    monthlyBase,
    discounts: {
      quarterly: dQuarterly,
      halfYearly: dHalfYearly,
    },
    plans: [
      {
        code: 'monthly',
        label: '1 Month',
        durationMonths: 1,
        price: price1Mo,
        discountPercent: 0,
        originalPrice: price1Mo,
        perMonthPrice: price1Mo,
        isActive: true,
      },
      {
        code: 'quarterly',
        label: '3 Months',
        durationMonths: 3,
        price: price3Mo,
        discountPercent: dQuarterly,
        originalPrice: monthlyBase * 3,
        perMonthPrice: Math.round(price3Mo / 3),
        isActive: true,
      },
      {
        code: 'halfYearly',
        label: '6 Months',
        durationMonths: 6,
        price: price6Mo,
        discountPercent: dHalfYearly,
        originalPrice: monthlyBase * 6,
        perMonthPrice: Math.round(price6Mo / 6),
        isActive: true,
      },
    ],
  };
}

// Helper: Calculate expiration date adding months (30.44 days per month standard)
export function calculateExpirationDate(startDate, durationMonths) {
  const d = new Date(startDate);
  const targetMonth = d.getMonth() + Number(durationMonths);
  d.setMonth(targetMonth);
  return d;
}

// Helper: Format subscription validity date (e.g. "1 June 27")
export function formatValidityDate(dateVal) {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = d.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

// Helper: Build standard UPI intent URI
export function buildPlatformUpiUri({ upiId, payeeName, amount, hostNote = '' }) {
  if (!upiId) return '';
  const params = new URLSearchParams();
  params.append('pa', upiId.trim());
  if (payeeName) params.append('pn', payeeName.trim());
  if (amount && Number(amount) > 0) params.append('am', String(Number(amount)));
  params.append('cu', 'INR');
  if (hostNote) params.append('tn', hostNote.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

// Helper: Retain only the latest 3 subscription payment records for a host; delete all previous records from DB
export async function pruneHostSubscriptionHistory(hostId) {
  if (!hostId) return;
  try {
    const allRecords = await HostSubscriptionPayment.find({ hostId })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean();

    if (allRecords.length > 3) {
      const idsToDelete = allRecords.slice(3).map((r) => r._id);
      await HostSubscriptionPayment.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('Error pruning host subscription history:', err.message);
  }
}

// @desc    Get platform subscription plans and platform UPI details
// @route   GET /api/subscriptions/plans
// @access  Public / Host
export async function getSubscriptionPlans(req, res, next) {
  try {
    let settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    if (!settings) {
      settings = await PlatformPaymentSettings.create({ key: 'platform' });
      settings = settings.toObject();
    }

    // Determine host propertyType and room count if available
    let hostPropertyType = req.query?.propertyType ? String(req.query.propertyType).trim() : null;
    let hostRoomCount = req.query?.rooms ? Number(req.query.rooms) : null;

    if (!hostPropertyType || !hostRoomCount) {
      try {
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'roomscout_secret_fallback');
          if (decoded && decoded.id) {
            const stay = await Stay.findOne({ hostId: decoded.id }).select('type rooms').lean();
            if (stay) {
              if (!hostPropertyType) hostPropertyType = stay.type || 'PG';
              if (!hostRoomCount) {
                hostRoomCount = Array.isArray(stay.rooms) && stay.rooms.length > 0 ? stay.rooms.length : 1;
              }
            }
          }
        }
      } catch {
        // public or unauthenticated request - continue with defaults
      }
    }

    if (!hostPropertyType) hostPropertyType = 'PG';
    if (!hostRoomCount || hostRoomCount < 1) hostRoomCount = 1;

    const dynamicCalculation = calculateSubscriptionPlans({
      propertyType: hostPropertyType,
      roomCount: hostRoomCount,
      propertyPricing: settings.propertyPricing,
      discounts: settings.discounts,
    });

    let qrCodeDataUrl = '';
    if (settings.upiId) {
      const upiUri = buildPlatformUpiUri({
        upiId: settings.upiId,
        payeeName: settings.payeeName || 'Room Scout Platform',
        hostNote: 'Host Subscription',
      });
      try {
        qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: { dark: '#030712', light: '#ffffff' },
        });
      } catch (qrErr) {
        console.warn('QR code generation failed:', qrErr.message);
      }
    }

    // Generate dynamic QR code encoding the exact payable amount for each plan
    const plans = await Promise.all(
      dynamicCalculation.plans.map(async (p) => {
        const priceNum = Number(p.price) || 0;
        let planQr = '';
        let planUpiUri = '';
        if (settings.upiId && priceNum > 0) {
          planUpiUri = buildPlatformUpiUri({
            upiId: settings.upiId,
            payeeName: settings.payeeName || 'Room Scout Platform',
            amount: priceNum,
            hostNote: `RoomScout ${p.label || p.code} Subscription`,
          });
          try {
            planQr = await QRCode.toDataURL(planUpiUri, {
              errorCorrectionLevel: 'M',
              margin: 2,
              width: 320,
              color: { dark: '#030712', light: '#ffffff' },
            });
          } catch (qrErr) {
            console.warn(`Dynamic QR generation failed for plan ${p.code}:`, qrErr.message);
          }
        }
        return {
          ...p,
          price: priceNum,
          upiUri: planUpiUri,
          qrCodeDataUrl: planQr || qrCodeDataUrl,
        };
      })
    );

    return res.json({
      success: true,
      payeeName: settings.payeeName || '',
      upiId: settings.upiId || '',
      mobileNumber: settings.mobileNumber || '',
      qrCodeUrl: settings.qrCodeUrl || qrCodeDataUrl,
      qrCodeDataUrl: qrCodeDataUrl || settings.qrCodeUrl || '',
      paymentInstructions: settings.paymentInstructions || 'Scan QR, pay via UPI, and submit the 12-digit UTR reference number.',
      propertyType: dynamicCalculation.propertyType,
      roomCount: dynamicCalculation.roomCount,
      ratePerRoom: dynamicCalculation.ratePerRoom,
      monthlyBase: dynamicCalculation.monthlyBase,
      propertyPricing: settings.propertyPricing || { PG: 10, Hotel: 50, Flat: 25 },
      discounts: settings.discounts || { quarterly: 5, halfYearly: 10 },
      plans,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Get current host subscription status, linked property, and payment history
// @route   GET /api/subscriptions/my-subscription
// @access  Private (Host)
export async function getHostSubscriptionStatus(req, res, next) {
  try {
    const callerId = req.user?._id;
    const callerEmail = req.user?.email?.toLowerCase().trim();

    const host = await Host.findOne({
      $or: [
        ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
        ...(callerEmail ? [{ email: callerEmail }] : []),
      ],
    }).lean();

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    const stay = await Stay.findOne({ hostId: host._id })
      .select('title propertyName type location city images isPublished subscription roomRates rooms')
      .lean();

    // Check expiration and sync state
    const now = new Date();
    let currentStatus = host.subscription?.status || 'NONE';
    const expiresAt = host.subscription?.expiresAt ? new Date(host.subscription.expiresAt) : null;

    if (expiresAt && expiresAt <= now && currentStatus === 'ACTIVE') {
      currentStatus = 'EXPIRED';
      await Host.updateOne(
        { _id: host._id },
        { $set: { 'subscription.status': 'EXPIRED' } }
      );
      if (stay) {
        await Stay.updateOne(
          { _id: stay._id },
          { $set: { 'subscription.status': 'EXPIRED', isPublished: false } }
        );
      }
    }

    const isLive = currentStatus === 'ACTIVE' && Boolean(expiresAt && expiresAt > now) && Boolean(stay?.isApproved);
    const daysRemaining = expiresAt && expiresAt > now
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Ensure host payment history strictly retains only latest 3 records (deleting previous records from DB)
    await pruneHostSubscriptionHistory(host._id);

    // Fetch latest pending payment request
    const pendingPayment = await HostSubscriptionPayment.findOne({
      hostId: host._id,
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch recent payment history (strictly latest 3 records)
    const history = await HostSubscriptionPayment.find({ hostId: host._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return res.json({
      success: true,
      subscription: {
        status: isLive ? 'ACTIVE' : currentStatus,
        planCode: host.subscription?.planCode || 'none',
        planLabel: host.subscription?.planLabel || 'No Active Plan',
        durationMonths: host.subscription?.durationMonths || 0,
        amountPaid: host.subscription?.amountPaid || 0,
        startDate: host.subscription?.startDate || null,
        expiresAt: expiresAt,
        daysRemaining,
        isLive,
        lastPaymentRef: host.subscription?.lastPaymentRef || '',
        lockedPlanCode: host.subscription?.lockedPlanCode || '',
        lockedStartOption: host.subscription?.lockedStartOption || 'CURRENT',
      },
      lockedPlanCode: host.subscription?.lockedPlanCode || '',
      lockedStartOption: host.subscription?.lockedStartOption || 'CURRENT',
      stay: stay
        ? {
            id: stay._id,
            title: stay.title || stay.propertyName || 'Host Stay',
            location: stay.location || stay.city || '',
            image: stay.images?.[0] || '',
            isPublished: stay.isPublished,
            propertyType: stay.type || 'PG',
            totalRooms: Array.isArray(stay.rooms) && stay.rooms.length > 0 ? stay.rooms.length : 1,
          }
        : null,
      pendingPayment: pendingPayment || null,
      history: history || [],
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Host locks a subscription plan before paying & generating dynamic QR
// @route   POST /api/subscriptions/lock-plan
// @access  Private (Host)
export async function lockHostSubscriptionPlan(req, res, next) {
  try {
    const callerId = req.user?._id;
    const callerEmail = req.user?.email?.toLowerCase().trim();
    const { planCode, startOption = 'CURRENT' } = req.body || {};

    if (!planCode || !['monthly', 'quarterly', 'halfYearly'].includes(planCode)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    const host = await Host.findOne({
      $or: [
        ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
        ...(callerEmail ? [{ email: callerEmail }] : []),
      ],
    });

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    if (!host.subscription) {
      host.subscription = {};
    }
    const cleanStartOption = startOption === 'NEXT' ? 'NEXT' : 'CURRENT';
    host.subscription.lockedPlanCode = planCode;
    host.subscription.lockedStartOption = cleanStartOption;
    await host.save();

    return res.json({
      success: true,
      lockedPlanCode: planCode,
      lockedStartOption: cleanStartOption,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Host submits subscription payment with 12-digit UTR reference & optional receipt
// @route   POST /api/subscriptions/submit-payment
// @access  Private (Host)
export async function submitHostSubscriptionPayment(req, res, next) {
  try {
    const callerId = req.user?._id;
    const callerEmail = req.user?.email?.toLowerCase().trim();

    const host = await Host.findOne({
      $or: [
        ...(callerId && mongoose.Types.ObjectId.isValid(callerId) ? [{ _id: callerId }] : []),
        ...(callerEmail ? [{ email: callerEmail }] : []),
      ],
    });

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    const { planCode, startOption = 'CURRENT', transactionRef, receiptImage } = req.body || {};

    if (!planCode || !['monthly', 'quarterly', 'halfYearly'].includes(planCode)) {
      return res.status(400).json({ success: false, message: 'Please select a valid subscription plan.' });
    }

    const cleanRef = String(transactionRef || '').trim().toUpperCase().replace(/[\s\-_]/g, '');
    if (!cleanRef || cleanRef.length !== 12 || !/^\d{12}$/.test(cleanRef)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 12-digit numeric UPI reference number (UTR / RRN).',
      });
    }

    // Resolve plan price and settings
    const settings = await PlatformPaymentSettings.findOne({ key: 'platform' }).lean();
    if (!settings || !settings.upiId) {
      return res.status(503).json({
        success: false,
        message: 'Platform payment is temporarily unavailable: Admin UPI ID is not configured.',
      });
    }

    // Find stay to get propertyType and room count
    const stay = await Stay.findOne({ hostId: host._id }).select('_id type rooms').lean();
    const propertyType = stay?.type || 'PG';
    const totalRooms = Array.isArray(stay?.rooms) && stay.rooms.length > 0 ? stay.rooms.length : 1;

    const dynamicCalculation = calculateSubscriptionPlans({
      propertyType,
      roomCount: totalRooms,
      propertyPricing: settings.propertyPricing,
      discounts: settings.discounts,
    });

    const planObj =
      dynamicCalculation.plans.find((p) => p.code === planCode) ||
      settings?.plans?.find((p) => p.code === planCode);

    if (!planObj || !planObj.price || Number(planObj.price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected plan pricing is not configured by admin yet. Please try another plan or contact support.',
      });
    }

    // Prevent duplicate submission with same UTR
    const duplicate = await HostSubscriptionPayment.findOne({
      transactionRef: cleanRef,
      status: { $in: ['PENDING', 'VERIFIED'] },
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This 12-digit UPI reference number has already been submitted. Please check your transaction ID.',
      });
    }

    // Upload receipt image if provided
    let finalReceiptUrl = '';
    if (receiptImage && typeof receiptImage === 'string') {
      try {
        finalReceiptUrl = await uploadSecureImage(receiptImage, 'roomscout/subscriptions');
      } catch (uploadErr) {
        console.warn('Subscription receipt upload failed, fallback:', uploadErr.message);
        if (receiptImage.startsWith('data:image/') || receiptImage.startsWith('http')) {
          finalReceiptUrl = receiptImage;
        }
      }
    }

    const cleanStartOption = startOption === 'NEXT' ? 'NEXT' : 'CURRENT';
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let startMonthLabel = '';
    if (cleanStartOption === 'NEXT') {
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      startMonthLabel = `Next Month (1 ${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()})`;
    } else {
      startMonthLabel = `This Month (${monthNames[now.getMonth()]} ${now.getFullYear()})`;
    }

    const paymentRecord = await HostSubscriptionPayment.create({
      hostId: host._id,
      stayId: stay?._id || null,
      planCode: planObj.code,
      planLabel: planObj.label,
      durationMonths: planObj.durationMonths,
      amount: Number(planObj.price),
      startOption: cleanStartOption,
      startMonthLabel,
      transactionRef: cleanRef,
      receiptUrl: finalReceiptUrl,
      recipientUpiId: settings.upiId || '',
      status: 'PENDING',
    });

    // Auto-prune database so host keeps only latest 3 records (older records deleted)
    await pruneHostSubscriptionHistory(host._id);

    // Clear locked plan code and start option since payment UTR has now been completely sent to admin
    if (!host.subscription) host.subscription = {};
    host.subscription.lockedPlanCode = '';
    host.subscription.lockedStartOption = 'CURRENT';

    // If host doesn't have an active subscription, mark as PENDING_VERIFICATION
    if (host.subscription?.status !== 'ACTIVE') {
      host.subscription = {
        ...host.subscription,
        status: 'PENDING_VERIFICATION',
        planCode: planObj.code,
        planLabel: planObj.label,
        durationMonths: planObj.durationMonths,
        amountPaid: Number(planObj.price),
        lastPaymentRef: cleanRef,
        lockedPlanCode: '',
      };
    }
    await host.save();

    return res.status(201).json({
      success: true,
      payment: paymentRecord,
      message: 'Subscription payment submitted! The admin will verify your 12-digit UTR and activate your plan.',
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin fetches all host subscription payment requests
// @route   GET /api/enter/subscriptions
// @access  Private (Admin)
export async function getAdminSubscriptionRequests(req, res, next) {
  try {
    const { status } = req.query || {};

    const filter = {};
    if (status && status !== 'ALL' && ['PENDING', 'VERIFIED', 'REJECTED'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    const [requests, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      HostSubscriptionPayment.find(filter)
        .populate('hostId', 'name email phone avatar subscription')
        .populate('stayId', 'title location city images')
        .sort({ createdAt: -1 })
        .lean(),
      HostSubscriptionPayment.countDocuments({ status: 'PENDING' }),
      HostSubscriptionPayment.countDocuments({ status: 'VERIFIED' }),
      HostSubscriptionPayment.countDocuments({ status: 'REJECTED' }),
    ]);

    return res.json({
      success: true,
      count: requests.length,
      counts: {
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        total: pendingCount + verifiedCount + rejectedCount,
      },
      requests,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin verifies or rejects a host subscription request
// @route   POST /api/enter/subscriptions/:id/verify
// @access  Private (Admin)
export async function verifySubscriptionRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { action, durationMonths, rejectionReason, adminNotes } = req.body || {};

    const request = await HostSubscriptionPayment.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Subscription request not found.' });
    }

    const host = await Host.findById(request.hostId);
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    if (action === 'VERIFY') {
      const monthsToAdd = Number(durationMonths) || Number(request.durationMonths) || 1;
      const now = new Date();

      let newStartDate = now;
      let newExpiresAt = null;

      if (request.startOption === 'NEXT') {
        const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        if (
          host.subscription?.status === 'ACTIVE' &&
          host.subscription?.expiresAt &&
          new Date(host.subscription.expiresAt) > nextMonthFirst
        ) {
          newStartDate = host.subscription.startDate || nextMonthFirst;
          const currentExp = new Date(host.subscription.expiresAt);
          newExpiresAt = calculateExpirationDate(currentExp, monthsToAdd);
        } else {
          newStartDate = nextMonthFirst;
          newExpiresAt = calculateExpirationDate(nextMonthFirst, monthsToAdd);
        }
      } else {
        if (
          host.subscription?.status === 'ACTIVE' &&
          host.subscription?.expiresAt &&
          new Date(host.subscription.expiresAt) > now
        ) {
          newStartDate = host.subscription.startDate || now;
          const currentExp = new Date(host.subscription.expiresAt);
          newExpiresAt = calculateExpirationDate(currentExp, monthsToAdd);
        } else {
          newStartDate = now;
          newExpiresAt = calculateExpirationDate(now, monthsToAdd);
        }
      }

      // Update payment record
      request.status = 'VERIFIED';
      request.durationMonths = monthsToAdd;
      request.verifiedAt = now;
      request.verifiedBy = req.user?._id || null;
      request.activatedStartDate = newStartDate;
      request.activatedExpiresAt = newExpiresAt;
      if (adminNotes) request.adminNotes = String(adminNotes).trim();
      await request.save();

      // Update Host subscription
      host.subscription = {
        planCode: request.planCode,
        planLabel: request.planLabel,
        durationMonths: monthsToAdd,
        amountPaid: request.amount,
        startDate: newStartDate,
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
        lastPaymentRef: request.transactionRef,
        lastVerifiedAt: now,
      };
      await host.save();

      // Update Stay records for this host: if stay was approved by admin, make it live!
      const isApprovedHost = host.status === 'Approved' || Boolean(host.isApproved);
      await Stay.updateMany(
        { hostId: host._id },
        {
          $set: {
            isApproved: isApprovedHost,
            isPublished: isApprovedHost,
            'subscription.status': 'ACTIVE',
            'subscription.planCode': request.planCode,
            'subscription.planLabel': request.planLabel,
            'subscription.expiresAt': newExpiresAt,
          },
        }
      );

      return res.json({
        success: true,
        message: isApprovedHost
          ? `Plan verified! ${host.name}'s stay is now actively live Until ${formatValidityDate(newExpiresAt)}.`
          : `Plan verified! Host has active subscription Until ${formatValidityDate(newExpiresAt)}. Stay will go live once approved by admin.`,
        subscription: host.subscription,
      });
    } else if (action === 'REJECT') {
      request.status = 'REJECTED';
      request.rejectionReason = String(rejectionReason || 'UTR did not match bank statement records.').trim();
      request.verifiedAt = new Date();
      request.verifiedBy = req.user?._id || null;
      if (adminNotes) request.adminNotes = String(adminNotes).trim();
      await request.save();

      // If host was pending verification and doesn't have an active plan, mark as expired/none
      if (host.subscription?.status === 'PENDING_VERIFICATION') {
        const hasOtherActive = Boolean(host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > new Date());
        host.subscription.status = hasOtherActive ? 'ACTIVE' : 'EXPIRED';
        await host.save();
        if (!hasOtherActive) {
          await Stay.updateMany(
            { hostId: host._id },
            { $set: { isPublished: false, 'subscription.status': 'EXPIRED' } }
          );
        }
      }

      return res.json({
        success: true,
        message: 'Subscription request rejected.',
        rejectionReason: request.rejectionReason,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action: must be VERIFY or REJECT.' });
    }
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin manually activates or extends subscription for a host
// @route   POST /api/enter/hosts/:id/subscription/manual-activate
// @access  Private (Admin)
export async function manualActivateSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { durationMonths = 1, planLabel = 'Manual Admin Plan', adminNotes = 'Directly activated by admin' } = req.body || {};

    const host = await Host.findById(id);
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    const monthsToAdd = Number(durationMonths) || 1;
    const now = new Date();

    let newStartDate = now;
    let newExpiresAt = null;

    if (
      host.subscription?.status === 'ACTIVE' &&
      host.subscription?.expiresAt &&
      new Date(host.subscription.expiresAt) > now
    ) {
      newStartDate = host.subscription.startDate || now;
      const currentExp = new Date(host.subscription.expiresAt);
      newExpiresAt = calculateExpirationDate(currentExp, monthsToAdd);
    } else {
      newStartDate = now;
      newExpiresAt = calculateExpirationDate(now, monthsToAdd);
    }

    let code = 'monthly';
    if (monthsToAdd === 3) code = 'quarterly';
    else if (monthsToAdd === 6) code = 'halfYearly';
    else if (monthsToAdd === 12) code = 'yearly';

    host.subscription = {
      planCode: code,
      planLabel: String(planLabel || `${monthsToAdd} Month(s)`).trim(),
      durationMonths: monthsToAdd,
      amountPaid: 0,
      startDate: newStartDate,
      expiresAt: newExpiresAt,
      status: 'ACTIVE',
      lastPaymentRef: 'ADMIN_GRANTED',
      lastVerifiedAt: now,
    };
    await host.save();

    const isApprovedHost = host.status === 'Approved' || Boolean(host.isApproved);
    await Stay.updateMany(
      { hostId: host._id },
      {
        $set: {
          isApproved: isApprovedHost,
          isPublished: isApprovedHost,
          'subscription.status': 'ACTIVE',
          'subscription.planCode': code,
          'subscription.planLabel': host.subscription.planLabel,
          'subscription.expiresAt': newExpiresAt,
        },
      }
    );

    return res.json({
      success: true,
      message: `Subscription successfully activated for ${host.name} for ${monthsToAdd} month(s) Until ${formatValidityDate(newExpiresAt)}.`,
      subscription: host.subscription,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin deletes a subscription payment request entry
// @route   DELETE /api/enter/subscriptions/:id
// @access  Private (Admin)
export async function deleteSubscriptionRequest(req, res, next) {
  try {
    const { id } = req.params;

    const request = await HostSubscriptionPayment.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Subscription request not found.' });
    }

    const hostId = request.hostId;
    const wasPending = request.status === 'PENDING';

    await HostSubscriptionPayment.deleteOne({ _id: id });

    // If deleting a pending request and host was in PENDING_VERIFICATION, reset host status if no other pending requests exist
    if (wasPending && hostId) {
      const host = await Host.findById(hostId);
      if (host && host.subscription?.status === 'PENDING_VERIFICATION') {
        const remainingPending = await HostSubscriptionPayment.countDocuments({
          hostId,
          status: 'PENDING',
        });
        if (remainingPending === 0) {
          const hasActive = Boolean(
            host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > new Date()
          );
          host.subscription.status = hasActive ? 'ACTIVE' : 'NONE';
          await host.save();
          if (!hasActive) {
            await Stay.updateMany(
              { hostId: host._id },
              { $set: { isPublished: false, 'subscription.status': 'NONE' } }
            );
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Subscription payment entry deleted successfully.',
      deletedId: id,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin deletes all subscription payment requests
// @route   DELETE /api/enter/subscriptions
// @access  Private (Admin)
export async function deleteAllSubscriptionRequests(req, res, next) {
  try {
    const result = await HostSubscriptionPayment.deleteMany({});

    // Reset pending verification for hosts if no pending requests remain
    const pendingHosts = await Host.find({ 'subscription.status': 'PENDING_VERIFICATION' });
    for (const host of pendingHosts) {
      const remainingPending = await HostSubscriptionPayment.countDocuments({
        hostId: host._id,
        status: 'PENDING',
      });
      if (remainingPending === 0) {
        const hasActive = Boolean(
          host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > new Date()
        );
        host.subscription.status = hasActive ? 'ACTIVE' : 'NONE';
        await host.save();
        if (!hasActive) {
          await Stay.updateMany(
            { hostId: host._id },
            { $set: { isPublished: false, 'subscription.status': 'NONE' } }
          );
        }
      }
    }

    return res.json({
      success: true,
      message: `All subscription payment records (${result.deletedCount || 0}) deleted successfully.`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Admin bulk verifies multiple host subscription payment requests
// @route   POST /api/enter/subscriptions/bulk-verify
// @access  Private (Admin)
export async function bulkVerifySubscriptions(req, res, next) {
  try {
    const { paymentIds = [], transactionRefs = [], durationMonths } = req.body || {};

    const filter = { status: 'PENDING' };
    if (Array.isArray(paymentIds) && paymentIds.length > 0) {
      filter._id = { $in: paymentIds };
    } else if (Array.isArray(transactionRefs) && transactionRefs.length > 0) {
      filter.transactionRef = { $in: transactionRefs.map((r) => String(r).trim().toUpperCase()) };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide paymentIds or transactionRefs to bulk verify.',
      });
    }

    const requests = await HostSubscriptionPayment.find(filter);
    if (!requests || requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscription requests found matching the provided criteria.',
      });
    }

    const verifiedRecords = [];
    const now = new Date();

    for (const request of requests) {
      const host = await Host.findById(request.hostId);
      if (!host) continue;

      const monthsToAdd = Number(durationMonths) || Number(request.durationMonths) || 1;
      let newStartDate = now;
      let newExpiresAt = null;

      if (request.startOption === 'NEXT') {
        const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        if (
          host.subscription?.status === 'ACTIVE' &&
          host.subscription?.expiresAt &&
          new Date(host.subscription.expiresAt) > nextMonthFirst
        ) {
          newStartDate = host.subscription.startDate || nextMonthFirst;
          const currentExp = new Date(host.subscription.expiresAt);
          newExpiresAt = calculateExpirationDate(currentExp, monthsToAdd);
        } else {
          newStartDate = nextMonthFirst;
          newExpiresAt = calculateExpirationDate(nextMonthFirst, monthsToAdd);
        }
      } else {
        if (
          host.subscription?.status === 'ACTIVE' &&
          host.subscription?.expiresAt &&
          new Date(host.subscription.expiresAt) > now
        ) {
          newStartDate = host.subscription.startDate || now;
          const currentExp = new Date(host.subscription.expiresAt);
          newExpiresAt = calculateExpirationDate(currentExp, monthsToAdd);
        } else {
          newStartDate = now;
          newExpiresAt = calculateExpirationDate(now, monthsToAdd);
        }
      }

      request.status = 'VERIFIED';
      request.durationMonths = monthsToAdd;
      request.verifiedAt = now;
      request.verifiedBy = req.user?._id || null;
      request.activatedStartDate = newStartDate;
      request.activatedExpiresAt = newExpiresAt;
      request.adminNotes = 'Bulk verified via bank statement reconciliation';
      await request.save();

      host.subscription = {
        planCode: request.planCode,
        planLabel: request.planLabel,
        durationMonths: monthsToAdd,
        amountPaid: request.amount,
        startDate: newStartDate,
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
        lastPaymentRef: request.transactionRef,
        lastVerifiedAt: now,
      };
      await host.save();

      const isApprovedHost = host.status === 'Approved' || Boolean(host.isApproved);
      await Stay.updateMany(
        { hostId: host._id },
        {
          $set: {
            isApproved: isApprovedHost,
            isPublished: isApprovedHost,
            'subscription.status': 'ACTIVE',
            'subscription.planCode': request.planCode,
            'subscription.planLabel': request.planLabel,
            'subscription.expiresAt': newExpiresAt,
          },
        }
      );

      verifiedRecords.push({
        id: request._id,
        transactionRef: request.transactionRef,
        hostName: host.name,
        expiresAt: newExpiresAt,
      });
    }

    return res.json({
      success: true,
      message: `Successfully verified and activated ${verifiedRecords.length} host subscription(s)!`,
      count: verifiedRecords.length,
      verifiedRequests: verifiedRecords,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Bulk reject host subscriptions (e.g. statement reconciliation amount mismatch / underpaid)
// @route   POST /api/enter/subscriptions/bulk-reject
// @access  Private (Admin)
export async function bulkRejectSubscriptions(req, res, next) {
  try {
    const { paymentIds = [], rejectionReason = 'Paid amount did not match required plan price.' } = req.body || {};

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide paymentIds to bulk reject.',
      });
    }

    const requests = await HostSubscriptionPayment.find({
      _id: { $in: paymentIds },
      status: 'PENDING',
    });

    if (!requests || requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending requests found matching the provided IDs.',
      });
    }

    const now = new Date();
    const rejectedRecords = [];

    for (const request of requests) {
      request.status = 'REJECTED';
      request.rejectionReason = String(rejectionReason).trim();
      request.verifiedAt = now;
      request.verifiedBy = req.user?._id || null;
      request.adminNotes = 'Rejected via bank statement reconciliation (amount mismatch)';
      await request.save();

      const host = await Host.findById(request.hostId);
      if (host && host.subscription?.status === 'PENDING_VERIFICATION') {
        const hasOtherActive = Boolean(host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > now);
        host.subscription.status = hasOtherActive ? 'ACTIVE' : 'EXPIRED';
        await host.save();
        if (!hasOtherActive) {
          await Stay.updateMany(
            { hostId: host._id },
            { $set: { isPublished: false, 'subscription.status': 'EXPIRED' } }
          );
        }
      }

      rejectedRecords.push({
        id: request._id,
        transactionRef: request.transactionRef,
      });
    }

    return res.json({
      success: true,
      message: `Successfully rejected ${rejectedRecords.length} invalid/underpaid request(s).`,
      count: rejectedRecords.length,
      rejectedRequests: rejectedRecords,
    });
  } catch (error) {
    return next(error);
  }
}

// @desc    Extract 12-digit UTR transaction numbers from bank statement (.csv, .pdf, .txt)
// @route   POST /api/enter/subscriptions/extract-statement
// @access  Private (Admin)
export async function extractStatementUtrs(req, res, next) {
  try {
    const { fileBase64, fileName = '', fileText = '' } = req.body || {};

    let rawText = String(fileText || '');

    // If PDF base64 provided
    if (fileBase64 && (fileName.toLowerCase().endsWith('.pdf') || fileBase64.startsWith('JVBER'))) {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const { PDFParse } = require('pdf-parse');

        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        if (pdfData && pdfData.text) {
          rawText += '\n' + pdfData.text;
        }
      } catch (pdfErr) {
        console.warn('PDF parsing fallback, scanning buffer bytes:', pdfErr.message);
        try {
          const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          rawText += '\n' + buffer.toString('latin1');
        } catch {
          // ignore
        }
      }
    } else if (fileBase64 && !rawText) {
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      rawText = Buffer.from(cleanBase64, 'base64').toString('utf8');
    }

    if (!rawText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No readable text found in statement file.',
      });
    }

    // Extract all 12-digit numeric sequences
    const utrRegex = /(?:^|[^0-9])([0-9]{12})(?![0-9])/g;
    const matches = [...rawText.matchAll(utrRegex)].map((m) => m[1]);

    // Deduplicate while preserving order of first appearance
    const uniqueUtrs = Array.from(new Set(matches));

    // Also extract line snippets and amounts if possible
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const utrEntries = uniqueUtrs.map((utr) => {
      const matchingLine = lines.find((line) => line.includes(utr)) || '';
      const amount = extractCreditAmountFromLine(matchingLine, utr);
      const date = extractDateFromLine(matchingLine);
      return {
        utr,
        amount,
        date,
        snippet: matchingLine.slice(0, 160).trim(),
      };
    });

    return res.json({
      success: true,
      fileName,
      totalCount: uniqueUtrs.length,
      utrs: uniqueUtrs,
      entries: utrEntries,
    });
  } catch (error) {
    return next(error);
  }
}


