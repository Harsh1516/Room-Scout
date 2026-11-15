import express from 'express';
import {
  getSubscriptionPlans,
  getHostSubscriptionStatus,
  lockHostSubscriptionPlan,
  submitHostSubscriptionPayment,
  subscribeSubscriptionStream,
} from '../controllers/subscriptionController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { bookingLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public / Host plan discovery
router.get('/plans', getSubscriptionPlans);

// Real-time SSE stream for host subscription events (Only triggers on verification)
router.get('/stream', protect, requireHost, subscribeSubscriptionStream);

// Host-scoped subscription management
router.get('/my-subscription', protect, requireHost, getHostSubscriptionStatus);
router.post('/lock-plan', protect, requireHost, lockHostSubscriptionPlan);
router.post('/submit-payment', bookingLimiter, protect, requireHost, submitHostSubscriptionPayment);

export default router;

