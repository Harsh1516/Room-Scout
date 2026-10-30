import crypto from 'crypto';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Host } from '../models/Host.js';
import { Stay } from '../models/Stay.js';
import { idsMatch, isAdminUser } from '../middleware/authMiddleware.js';
import { isBookingRequestExpired } from './bookingController.js';
import { sendWhatsAppNotification } from '../services/whatsappService.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';

// Normalizes UPI transaction references (UTR / RRN)
export function normalizeTransactionRef(raw) {
  if (!raw) return '';
  return String(raw).trim().toUpperCase().replace(/[\s\-_]/g, '');
}

// Validates standard UPI VPA ID (e.g. host@okhdfcbank or merchant@upi)
export function isValidUpiId(vpa) {
  if (!vpa || typeof vpa !== 'string') return false;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa.trim());
}

/**
 * Builds standard UPI Payment URI
 * upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE_OR_BOOKING_REF>
 */
export function buildUpiPaymentUri({ upiId, payeeName, amount, bookingRef }) {
  const cleanUpi = String(upiId || '').trim();
  const cleanName = String(payeeName || 'Room Scout Stay').trim();
  const cleanAmount = Number(amount || 0).toFixed(2);
  const cleanNote = String(bookingRef || 'Room Reservation').trim().slice(0, 40);

  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

// @desc    Get booking-specific host UPI payment details and scannable QR code
// @route   GET /api/payments/booking-upi-details/:bookingId
// @access  Private
export const getBookingUpiPaymentDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Valid booking ID is required.' });
    }

    const query = mongoose.Types.ObjectId.isValid(bookingId)
      ? { _id: bookingId }
      : { bookingReferenceId: bookingId };

    const booking = await Booking.findOne(query).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    // IDOR Protection: Caller must be the guest, host, or admin
    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email?.toLowerCase().trim();
    const isGuest =
      idsMatch(callerId, booking.userId) ||
      (callerEmail && booking.email && callerEmail === booking.email.toLowerCase().trim());
    const isPropertyHost =
      idsMatch(callerId, booking.hostId) ||
      idsMatch(req.hostAccount?._id, booking.hostId);
    const isAdmin = isAdminUser(req);

    if (!isGuest && !isPropertyHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view payment details for this booking.',
      });
    }

    // Resolve Host and Stay payment settings
    const stay = await Stay.findById(booking.stayId).select('title upiSettings hostId').lean();
    const host = await Host.findById(booking.hostId).select('name upiSettings isApproved').lean();

    const hostUpi = stay?.upiSettings?.upiId || host?.upiSettings?.upiId || '';
    const payeeName = stay?.upiSettings?.payeeName || host?.upiSettings?.payeeName || host?.name || stay?.title || 'Room Scout Host';

    // Verify host has configured UPI
    if (!hostUpi || !isValidUpiId(hostUpi)) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        message:
          'The host has not yet configured direct UPI payment details for this property. Direct online UPI payment is currently unavailable. Please select Pay on Arrival / Cash at Property, or contact the host.',
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        totalAmount: booking.totalAmount,
      });
    }

    // Exact trusted server amount
    const exactAmount = Number(booking.totalAmount || 0);
    const bookingRef = booking.bookingReferenceId || String(booking._id);

    // Build standard UPI URI
    const upiUri = buildUpiPaymentUri({
      upiId: hostUpi,
      payeeName,
      amount: exactAmount,
      bookingRef,
    });

    // Generate Scannable QR Code Data URL
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      console.error('Failed to generate QR code data URL:', qrErr);
    }

    return res.json({
      success: true,
      isConfigured: true,
      bookingId: booking._id,
      bookingReferenceId: booking.bookingReferenceId,
      stayTitle: booking.stayTitle,
      roomNumber: booking.roomNumber,
      roomType: booking.roomType,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      durationDisplay: booking.durationDisplay,
      totalAmount: exactAmount,
      currency: 'INR',
      recipientUpiId: hostUpi,
      recipientPayeeName: payeeName,
      upiUri,
      qrCodeDataUrl,
      paymentStatus: booking.paymentStatus,
      verificationStatus: booking.upiPayment?.verificationStatus || 'UNSUBMITTED',
      submittedReference: booking.upiPayment?.transactionRef || '',
      submittedAt: booking.upiPayment?.submittedAt || null,
      rejectionReason: booking.upiPayment?.rejectionReason || '',
      receiptUrl: booking.upiPayment?.receiptUrl || '',
      paymentDeadline: booking.paymentDeadline,
    });
  } catch (error) {
    console.error('Get Booking UPI Details Error:', error);
    return next(error);
  }
};

// @desc    Guest submits UPI transaction reference number (UTR/RRN) & optional receipt
// @route   POST /api/payments/submit-upi-reference
// @access  Private
export const submitUpiPayment = async (req, res, next) => {
  try {
    const { bookingId, bookingReferenceId, transactionRef, receiptImage, receiptUrl } = req.body;

    const query = bookingId && mongoose.Types.ObjectId.isValid(bookingId)
      ? { _id: bookingId }
      : { bookingReferenceId: bookingReferenceId || bookingId };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    // IDOR Protection: Only the guest who booked or an admin may submit payment reference
    const callerId = req.user?._id?.toString();
    const callerEmail = req.user?.email?.toLowerCase().trim();
    const isGuest =
      idsMatch(callerId, booking.userId) ||
      (callerEmail && booking.email && callerEmail === booking.email.toLowerCase().trim());
    const isAdmin = isAdminUser(req);

    if (!isGuest && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only submit payment references for your own bookings.',
      });
    }

    // Normalize and validate reference
    const normalizedRef = normalizeTransactionRef(transactionRef);
    if (!normalizedRef || normalizedRef.length < 6 || normalizedRef.length > 40) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid UPI transaction reference number (UTR / RRN, 6-40 alphanumeric characters).',
      });
    }

    // Prevent changing reference if already verified
    if (booking.upiPayment?.verificationStatus === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been verified and confirmed by the host.',
      });
    }

    // Database-level Uniqueness Check: Prevent duplicate reference usage across different bookings
    const duplicatePayment = await Payment.findOne({
      transactionRef: normalizedRef,
      bookingId: { $ne: booking._id },
      paymentStatus: { $in: ['PENDING', 'AWAITING_VERIFICATION', 'COMPLETED'] },
    }).lean();

    if (duplicatePayment) {
      return res.status(409).json({
        success: false,
        message: 'This UPI transaction reference (UTR/RRN) has already been submitted for another booking. Duplicate references are rejected.',
      });
    }

    const duplicateBooking = await Booking.findOne({
      'upiPayment.transactionRef': normalizedRef,
      _id: { $ne: booking._id },
      status: { $in: ['CONFIRMED', 'AWAITING_PAYMENT', 'CHECKED_IN'] },
      'upiPayment.verificationStatus': { $in: ['PENDING_VERIFICATION', 'VERIFIED'] },
    }).lean();

    if (duplicateBooking) {
      return res.status(409).json({
        success: false,
        message: 'This UPI transaction reference (UTR/RRN) has already been used for another booking.',
      });
    }

    // Optional receipt upload via existing secure Cloudinary image utility
    let finalReceiptUrl = receiptUrl || '';
    if (receiptImage && typeof receiptImage === 'string') {
      try {
        finalReceiptUrl = await uploadSecureImage(receiptImage, 'roomscout/receipts');
      } catch (uploadErr) {
        console.warn('Receipt upload failed, continuing with reference submission:', uploadErr.message);
      }
    }

    // Resolve recipient UPI ID
    const stay = await Stay.findById(booking.stayId).select('upiSettings').lean();
    const host = await Host.findById(booking.hostId).select('name upiSettings').lean();
    const recipientUpi = stay?.upiSettings?.upiId || host?.upiSettings?.upiId || '';
    const payeeName = stay?.upiSettings?.payeeName || host?.upiSettings?.payeeName || host?.name || '';

    // Update Booking Record
    booking.paymentMethod = 'UPI';
    booking.paymentStatus = 'PENDING';
    if (!booking.upiPayment) {
      booking.upiPayment = {};
    }
    booking.upiPayment.upiId = recipientUpi;
    booking.upiPayment.payeeName = payeeName;
    booking.upiPayment.transactionRef = normalizedRef;
    booking.upiPayment.receiptUrl = finalReceiptUrl || booking.upiPayment.receiptUrl || '';
    booking.upiPayment.verificationStatus = 'PENDING_VERIFICATION';
    booking.upiPayment.submittedAt = new Date();
    booking.upiPayment.rejectionReason = '';

    // If booking was awaiting payment, keep it open for verification
    if (booking.status === 'AWAITING_PAYMENT' || booking.status === 'PENDING') {
      // Extend or maintain payment status
      booking.paymentStatus = 'PENDING';
    }

    booking.auditLog.push({
      action: 'REFERENCE_SUBMITTED',
      performedBy: req.user?._id || null,
      performerRole: 'guest',
      timestamp: new Date(),
      details: {
        transactionRef: normalizedRef,
        amount: booking.totalAmount,
        receiptUrl: finalReceiptUrl,
      },
      note: 'Guest submitted UPI transaction reference for host verification',
    });

    await booking.save();

    // Idempotent Payment Collection Record
    try {
      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        {
          $set: {
            bookingReferenceId: booking.bookingReferenceId,
            stayId: booking.stayId,
            hostId: booking.hostId,
            userId: booking.userId || null,
            amount: booking.totalAmount,
            currency: 'INR',
            paymentMethod: 'UPI',
            paymentStatus: 'AWAITING_VERIFICATION',
            transactionId: normalizedRef,
            transactionRef: normalizedRef,
            recipientUpiId: recipientUpi,
            verificationStatus: 'PENDING_VERIFICATION',
            receiptUrl: finalReceiptUrl || booking.upiPayment.receiptUrl,
            auditNotes: 'Guest submitted UPI reference, awaiting host bank verification',
          },
          $push: {
            auditLog: {
              action: 'REFERENCE_SUBMITTED',
              performedBy: req.user?._id || null,
              performerRole: 'guest',
              timestamp: new Date(),
              details: { transactionRef: normalizedRef },
              note: 'Guest submitted reference',
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This UPI transaction reference is already recorded for an active transaction.',
        });
      }
      throw dbErr;
    }

    // Send automated WhatsApp notice to host
    sendWhatsAppNotification(booking, 'PAYMENT_PENDING', {
      transactionRef: normalizedRef,
      totalAmount: booking.totalAmount,
      stayTitle: booking.stayTitle,
    }).catch((err) => {
      console.warn('[WhatsApp Warning] Could not notify host of submitted payment:', err.message);
    });

    return res.json({
      success: true,
      message: 'Payment reference submitted successfully! The host will verify your payment in their bank/UPI app.',
      booking,
      submittedReference: normalizedRef,
      verificationStatus: 'PENDING_VERIFICATION',
    });
  } catch (error) {
    console.error('Submit UPI Payment Error:', error);
    return next(error);
  }
};

// @desc    Host verifies or rejects a submitted UPI transaction reference
// @route   POST /api/payments/verify-reference
// @access  Private / Host
export const verifyHostPayment = async (req, res, next) => {
  try {
    const { bookingId, action, rejectionReason, verificationNote } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    // IDOR Protection: Host must own the property for this booking
    const callerId = req.user?._id?.toString();
    const isCallerAdmin = isAdminUser(req);
    const isAuthorized =
      isCallerAdmin ||
      idsMatch(callerId, booking.hostId) ||
      idsMatch(req.hostAccount?._id, booking.hostId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to verify payments for this property.',
      });
    }

    const hostUser = req.user?._id || booking.hostId;
    const now = new Date();

    if (action === 'VERIFY') {
      booking.paymentStatus = 'PAID';
      booking.status = 'CONFIRMED';
      if (!booking.upiPayment) booking.upiPayment = {};
      booking.upiPayment.verificationStatus = 'VERIFIED';
      booking.upiPayment.verifiedAt = now;
      booking.upiPayment.verifiedBy = hostUser;
      booking.upiPayment.verificationNote = verificationNote || 'Verified in host bank/UPI statement';
      booking.approvedAt = booking.approvedAt || now;

      booking.auditLog.push({
        action: 'PAYMENT_VERIFIED',
        performedBy: hostUser,
        performerRole: 'host',
        timestamp: now,
        details: {
          transactionRef: booking.upiPayment.transactionRef,
          amount: booking.totalAmount,
          verificationNote: booking.upiPayment.verificationNote,
        },
        note: 'Host verified incoming transaction in UPI/bank account and confirmed booking',
      });

      await booking.save();

      // Update Payment record
      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        {
          $set: {
            paymentStatus: 'COMPLETED',
            verificationStatus: 'VERIFIED',
            verifiedBy: hostUser,
            verifiedAt: now,
            auditNotes: 'Host verified and confirmed',
          },
          $push: {
            auditLog: {
              action: 'PAYMENT_VERIFIED',
              performedBy: hostUser,
              performerRole: 'host',
              timestamp: now,
              details: { transactionRef: booking.upiPayment.transactionRef },
              note: 'Host confirmed payment',
            },
          },
        },
        { upsert: true }
      );

      // Automated WhatsApp Booking Confirmation alert to guest
      sendWhatsAppNotification(booking, 'BOOKING_CONFIRMED', {
        paymentId: booking.upiPayment.transactionRef,
        totalAmount: booking.totalAmount,
        durationDisplay: booking.durationDisplay,
      }).catch((err) => {
        console.warn('[WhatsApp Warning] Could not send payment confirmed alert:', err.message);
      });

      return res.json({
        success: true,
        message: `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} verified successfully! Booking ${booking.bookingReferenceId} is confirmed.`,
        booking,
      });
    }

    if (action === 'REJECT') {
      const cleanReason = String(rejectionReason || 'Payment could not be verified in host bank account').trim();

      if (!booking.upiPayment) booking.upiPayment = {};
      booking.upiPayment.verificationStatus = 'REJECTED';
      booking.upiPayment.rejectionReason = cleanReason;
      booking.paymentStatus = 'FAILED';

      booking.auditLog.push({
        action: 'PAYMENT_REJECTED',
        performedBy: hostUser,
        performerRole: 'host',
        timestamp: now,
        details: {
          transactionRef: booking.upiPayment.transactionRef,
          rejectionReason: cleanReason,
        },
        note: `Host rejected payment reference: ${cleanReason}`,
      });

      await booking.save();

      // Update Payment record
      await Payment.findOneAndUpdate(
        { bookingId: booking._id },
        {
          $set: {
            paymentStatus: 'FAILED',
            verificationStatus: 'REJECTED',
            auditNotes: `Rejected by host: ${cleanReason}`,
          },
          $push: {
            auditLog: {
              action: 'PAYMENT_REJECTED',
              performedBy: hostUser,
              performerRole: 'host',
              timestamp: now,
              details: { rejectionReason: cleanReason },
              note: 'Host rejected payment reference',
            },
          },
        }
      );

      return res.json({
        success: true,
        message: 'Payment reference rejected. Guest will be notified to review their payment or resubmit.',
        booking,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid verification action. Must be VERIFY or REJECT.' });
  } catch (error) {
    console.error('Verify Host Payment Error:', error);
    return next(error);
  }
};

// @desc    Get host UPI configuration
// @route   GET /api/payments/host-payment-settings
// @access  Private / Host
export const getHostUpiSettings = async (req, res, next) => {
  try {
    const hostId = req.user?._id;
    if (!hostId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const host = await Host.findById(hostId).select('name upiSettings email phone').lean();
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    const upiSettings = host.upiSettings || {
      upiId: '',
      payeeName: host.name || '',
      qrCodeUrl: '',
      isConfigured: false,
      isVerified: false,
    };

    // Generate sample QR code if configured
    let sampleQr = '';
    if (upiSettings.upiId && isValidUpiId(upiSettings.upiId)) {
      try {
        const sampleUri = buildUpiPaymentUri({
          upiId: upiSettings.upiId,
          payeeName: upiSettings.payeeName || host.name,
          amount: 0,
          bookingRef: 'Property Booking',
        });
        sampleQr = await QRCode.toDataURL(sampleUri, { margin: 2, width: 260 });
      } catch (e) {}
    }

    return res.json({
      success: true,
      upiSettings,
      sampleQrCode: sampleQr,
    });
  } catch (error) {
    console.error('Get Host UPI Settings Error:', error);
    return next(error);
  }
};

// @desc    Update host UPI configuration (VPA & Payee Display Name)
// @route   PUT /api/payments/host-payment-settings
// @access  Private / Host
export const updateHostUpiSettings = async (req, res, next) => {
  try {
    const hostId = req.user?._id;
    const { upiId, payeeName, qrCodeUrl } = req.body;

    if (!hostId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const cleanUpi = String(upiId || '').trim();
    const cleanPayee = String(payeeName || '').trim();

    if (!isValidUpiId(cleanUpi)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. Expected format: username@bank (e.g. yourname@okhdfcbank).',
      });
    }

    if (!cleanPayee || cleanPayee.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Payee display name is required (minimum 2 characters).',
      });
    }

    // Generate verified QR code preview for host
    let generatedQr = '';
    try {
      const sampleUri = buildUpiPaymentUri({
        upiId: cleanUpi,
        payeeName: cleanPayee,
        amount: 0,
        bookingRef: 'Direct Stay Payment',
      });
      generatedQr = await QRCode.toDataURL(sampleUri, { margin: 2, width: 280 });
    } catch (qrErr) {
      console.warn('Failed to generate preview QR:', qrErr.message);
    }

    const host = await Host.findById(hostId);
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    host.upiSettings = {
      upiId: cleanUpi,
      payeeName: cleanPayee,
      qrCodeUrl: qrCodeUrl || generatedQr,
      isConfigured: true,
      isVerified: true,
      updatedAt: new Date(),
    };

    await host.save();

    // Propagate UPI settings to all published stays owned by this host
    await Stay.updateMany(
      { hostId: host._id },
      {
        $set: {
          'upiSettings.upiId': cleanUpi,
          'upiSettings.payeeName': cleanPayee,
          'upiSettings.qrCodeUrl': qrCodeUrl || generatedQr,
          'upiSettings.isConfigured': true,
        },
      }
    ).catch((err) => console.warn('Could not sync stay UPI settings:', err.message));

    return res.json({
      success: true,
      message: 'Direct UPI payment settings updated successfully! Guests can now pay directly to your account.',
      upiSettings: host.upiSettings,
      sampleQrCode: generatedQr,
    });
  } catch (error) {
    console.error('Update Host UPI Settings Error:', error);
    return next(error);
  }
};

// @desc    Record a manual UPI refund processed by host
// @route   POST /api/payments/record-refund
// @access  Private / Host
export const processManualRefund = async (req, res, next) => {
  try {
    const { bookingId, refundRef, refundAmount, note } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found.' });
    }

    // IDOR Protection
    const callerId = req.user?._id?.toString();
    const isAuthorized =
      isAdminUser(req) ||
      idsMatch(callerId, booking.hostId) ||
      idsMatch(req.hostAccount?._id, booking.hostId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to record refunds for this booking.',
      });
    }

    const cleanRef = normalizeTransactionRef(refundRef);
    const amount = Number(refundAmount || booking.totalAmount);
    const now = new Date();

    booking.paymentStatus = 'REFUNDED';
    booking.status = 'CANCELLED';
    booking.auditLog.push({
      action: 'REFUND_RECORDED',
      performedBy: req.user?._id,
      performerRole: 'host',
      timestamp: now,
      details: { refundRef: cleanRef, refundAmount: amount, note },
      note: `Host recorded manual UPI refund of ₹${amount} (Ref: ${cleanRef})`,
    });

    await booking.save();

    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      {
        $set: {
          paymentStatus: 'REFUNDED',
          auditNotes: `Refund recorded by host: Ref ${cleanRef}, Amount ₹${amount}`,
        },
        $push: {
          auditLog: {
            action: 'REFUND_RECORDED',
            performedBy: req.user?._id,
            performerRole: 'host',
            timestamp: now,
            details: { refundRef: cleanRef, refundAmount: amount, note },
            note: 'Manual refund processed by host',
          },
        },
      }
    );

    return res.json({
      success: true,
      message: `Refund of ₹${amount.toLocaleString('en-IN')} recorded successfully.`,
      booking,
    });
  } catch (error) {
    console.error('Record Manual Refund Error:', error);
    return next(error);
  }
};

// @desc    Get all payments for a host
// @route   GET /api/payments/host/:hostId
// @access  Private / Host
export const getHostPayments = async (req, res, next) => {
  try {
    const callerId = req.user?._id?.toString();
    const isCallerAdmin = isAdminUser(req);
    const requestedHostId = req.params.hostId;

    if (!requestedHostId || !mongoose.Types.ObjectId.isValid(requestedHostId)) {
      return res.status(400).json({ success: false, message: 'Valid hostId is required.' });
    }

    // IDOR Protection: Enforce that hosts can only inspect their own payment revenue
    let isAuthorized =
      isCallerAdmin ||
      idsMatch(callerId, requestedHostId) ||
      idsMatch(req.hostAccount?._id, requestedHostId);

    if (!isAuthorized && req.user?.email) {
      const host = await Host.findById(requestedHostId).select('email').lean();
      if (host && host.email?.toLowerCase().trim() === req.user.email.toLowerCase().trim()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view another host’s payments.',
      });
    }

    const payments = await Payment.find({ hostId: requestedHostId })
      .populate('bookingId', 'fullName roomNumber stayTitle checkIn checkOut bookingReferenceId upiPayment')
      .sort({ createdAt: -1 })
      .lean();

    const totalRevenue = payments
      .filter((p) => p.paymentStatus === 'COMPLETED' || p.verificationStatus === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      success: true,
      count: payments.length,
      totalRevenue,
      payments,
    });
  } catch (error) {
    console.error('Get host payments error:', error);
    return next(error);
  }
};

// @desc    Get user's personal transaction history
// @route   GET /api/payments/my-payments
// @access  Private / User
export const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const payments = await Payment.find({ userId })
      .populate('stayId', 'title location images')
      .populate('bookingId', 'fullName roomNumber stayTitle checkIn checkOut upiPayment status')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    return next(error);
  }
};
