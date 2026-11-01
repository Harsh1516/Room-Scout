import express from 'express';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { getHostSubscriptionOptions, submitHostSubscriptionPayment, getMySubscriptionPayments } from '../controllers/subscriptionController.js';

const router = express.Router();
router.use(protect, requireHost);
router.get('/options', getHostSubscriptionOptions);
router.get('/my-payments', getMySubscriptionPayments);
router.post('/payments', submitHostSubscriptionPayment);
export default router;
