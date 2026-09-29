import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getHostPayments,
  getMyPayments,
  handleRazorpayWebhook,
} from '../controllers/paymentController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { paymentLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { z } from 'zod';
import { mongoIdSchema } from '../validators/commonValidator.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from '../validators/paymentValidator.js';

const router = express.Router();

// Webhook endpoint (EXEMPT from client rate limiters, cryptographically verified by HMAC SHA256)
router.post('/webhook', handleRazorpayWebhook);

router.post('/create-order', protect, paymentLimiter, validate(createPaymentOrderSchema), createPaymentOrder);
router.post('/verify', protect, paymentLimiter, validate(verifyPaymentSchema), verifyPayment);

router.get('/host/:hostId', protect, requireHost, validate({ params: z.object({ hostId: mongoIdSchema }) }), getHostPayments);

router.get('/my-payments', protect, getMyPayments);

export default router;
