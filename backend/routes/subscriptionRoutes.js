import express from 'express';
import {
  getSubscriptionPlans,
  getHostSubscriptionStatus,
  lockHostSubscriptionPlan,
  submitHostSubscriptionPayment,
} from '../controllers/subscriptionController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { bookingLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public / Host plan discovery
router.get('/plans', getSubscriptionPlans);

// Host-scoped subscription management
router.get('/my-subscription', protect, requireHost, getHostSubscriptionStatus);
router.post('/lock-plan', protect, requireHost, lockHostSubscriptionPlan);
router.post('/submit-payment', bookingLimiter, protect, requireHost, submitHostSubscriptionPayment);

export default router;

