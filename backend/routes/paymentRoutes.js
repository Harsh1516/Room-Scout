import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getHostPayments,
  getMyPayments,
} from '../controllers/paymentController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);

router.get('/host/:hostId', protect, requireHost, getHostPayments);

router.get('/my-payments', protect, getMyPayments);

export default router;
