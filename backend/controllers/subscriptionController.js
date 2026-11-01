import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Host } from '../models/Host.js';
import { Stay } from '../models/Stay.js';
import { PlatformPaymentSettings } from '../models/PlatformPaymentSettings.js';
import { HostSubscriptionPayment } from '../models/HostSubscriptionPayment.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';

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

    return res.json({
      success: true,
      payeeName: settings.payeeName || '',
      upiId: settings.upiId || '',
      mobileNumber: settings.mobileNumber || '',
      qrCodeUrl: settings.qrCodeUrl || qrCodeDataUrl,
      qrCodeDataUrl: qrCodeDataUrl || settings.qrCodeUrl || '',
      paymentInstructions: settings.paymentInstructions || 'Scan QR, pay via UPI, and submit the 12-digit UTR reference number.',
      plans: Array.isArray(settings.plans)
        ? settings.plans.filter((p) => p.isActive !== false)
        : [],
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
      .select('title propertyName location city images isPublished subscription roomRates rooms')
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
          { $set: { 'subscription.status': 'EXPIRED' } }
        );
      }
    }

    const isLive = currentStatus === 'ACTIVE' && Boolean(expiresAt && expiresAt > now);
    const daysRemaining = expiresAt && expiresAt > now
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Fetch latest pending payment request
    const pendingPayment = await HostSubscriptionPayment.findOne({
      hostId: host._id,
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch recent payment history
    const history = await HostSubscriptionPayment.find({ hostId: host._id })
      .sort({ createdAt: -1 })
      .limit(15)
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
      },
      stay: stay
        ? {
            id: stay._id,
            title: stay.title || stay.propertyName || 'Host Stay',
            location: stay.location || stay.city || '',
            image: stay.images?.[0] || '',
            isPublished: stay.isPublished,
          }
        : null,
      pendingPayment: pendingPayment || null,
      history: history || [],
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

    const { planCode, transactionRef, receiptImage } = req.body || {};

    if (!planCode || !['monthly', 'quarterly', 'halfYearly', 'yearly'].includes(planCode)) {
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
    const planObj = settings?.plans?.find((p) => p.code === planCode);
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

    // Find stay if any
    const stay = await Stay.findOne({ hostId: host._id }).select('_id').lean();

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

    const paymentRecord = await HostSubscriptionPayment.create({
      hostId: host._id,
      stayId: stay?._id || null,
      planCode: planObj.code,
      planLabel: planObj.label,
      durationMonths: planObj.durationMonths,
      amount: Number(planObj.price),
      transactionRef: cleanRef,
      receiptUrl: finalReceiptUrl,
      recipientUpiId: settings.upiId || '',
      status: 'PENDING',
    });

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
      };
      await host.save();
    }

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

      // If host currently has an active subscription that hasn't expired yet, extend from current expiry date!
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

      // Update Stay records for this host to make them LIVE!
      await Stay.updateMany(
        { hostId: host._id },
        {
          $set: {
            'subscription.status': 'ACTIVE',
            'subscription.planCode': request.planCode,
            'subscription.planLabel': request.planLabel,
            'subscription.expiresAt': newExpiresAt,
          },
        }
      );

      return res.json({
        success: true,
        message: `Plan verified! ${host.name}'s stay is now actively live Until ${formatValidityDate(newExpiresAt)}.`,
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
        host.subscription.status = host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > new Date()
          ? 'ACTIVE'
          : 'EXPIRED';
        await host.save();
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

    await Stay.updateMany(
      { hostId: host._id },
      {
        $set: {
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
          host.subscription.status =
            host.subscription?.expiresAt && new Date(host.subscription.expiresAt) > new Date()
              ? 'ACTIVE'
              : 'NONE';
          await host.save();
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

      await Stay.updateMany(
        { hostId: host._id },
        {
          $set: {
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

    // Also extract line snippets if possible
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const utrEntries = uniqueUtrs.map((utr) => {
      const matchingLine = lines.find((line) => line.includes(utr)) || '';
      return {
        utr,
        snippet: matchingLine.slice(0, 120).trim(),
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


