import express from 'express';
import {
  getBookingUpiPaymentDetails,
  submitUpiPayment,
  verifyHostPayment,
  getHostUpiSettings,
  updateHostUpiSettings,
  processManualRefund,
  getHostPayments,
  getMyPayments,
} from '../controllers/paymentController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { paymentLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { z } from 'zod';
import { mongoIdSchema } from '../validators/commonValidator.js';
import {
  hostUpiSettingsSchema,
  submitUpiPaymentSchema,
  verifyUpiPaymentSchema,
  recordRefundSchema,
} from '../validators/paymentValidator.js';

const router = express.Router();

// Host UPI Configuration Settings
router.get('/host-payment-settings', protect, requireHost, getHostUpiSettings);
router.put(
  '/host-payment-settings',
  protect,
  requireHost,
  validate(hostUpiSettingsSchema),
  updateHostUpiSettings
);

// Guest Direct UPI Payment Details & Scannable QR Code
router.get('/booking-upi-details/:bookingId', protect, getBookingUpiPaymentDetails);

// Guest Submits UPI Transaction Reference (UTR / RRN)
router.post(
  '/submit-upi-reference',
  protect,
  paymentLimiter,
  validate(submitUpiPaymentSchema),
  submitUpiPayment
);

// Host Verifies Incoming UPI Payment in Bank/App & Confirms Booking
router.post(
  '/verify-reference',
  protect,
  requireHost,
  paymentLimiter,
  validate(verifyUpiPaymentSchema),
  verifyHostPayment
);

// Host Records Manual UPI Refund
router.post(
  '/record-refund',
  protect,
  requireHost,
  validate(recordRefundSchema),
  processManualRefund
);

// Host Revenue and Payments History
router.get(
  '/host/:hostId',
  protect,
  requireHost,
  validate({ params: z.object({ hostId: mongoIdSchema }) }),
  getHostPayments
);

// Guest Payment History
router.get('/my-payments', protect, getMyPayments);

export default router;
