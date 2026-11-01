import express from 'express';
import {
  getUsers,
  deleteUser,
  getHosts,
  getHostByEmail,
  createHost,
  approveHost,
  rejectHost,
  getHostGuests,
  deleteHost,
  getStats,
  impersonateAccount,
} from '../controllers/adminController.js';
import { protect, requireAdmin, requireSelfHostOrAdmin } from '../middleware/authMiddleware.js';
import { adminLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { idParamSchema } from '../validators/commonValidator.js';
import { impersonateSchema } from '../validators/adminValidator.js';
import { getPlatformPaymentSettings, updatePlatformPaymentSettings } from '../controllers/platformPaymentController.js';
import {
  getAdminSubscriptionRequests,
  verifySubscriptionRequest,
  manualActivateSubscription,
  deleteSubscriptionRequest,
  deleteAllSubscriptionRequests,
  bulkVerifySubscriptions,
  extractStatementUtrs,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.route('/payment-settings').get(adminLimiter, requireAdmin, getPlatformPaymentSettings).put(adminLimiter, requireAdmin, updatePlatformPaymentSettings);

// Platform Host Subscription Administration
router.route('/subscriptions')
  .get(adminLimiter, requireAdmin, getAdminSubscriptionRequests)
  .delete(adminLimiter, requireAdmin, deleteAllSubscriptionRequests);
router.route('/subscriptions/bulk-verify').post(adminLimiter, requireAdmin, bulkVerifySubscriptions);
router.route('/subscriptions/extract-statement').post(adminLimiter, requireAdmin, extractStatementUtrs);
router.route('/subscriptions/:id/verify').post(adminLimiter, requireAdmin, verifySubscriptionRequest);
router.route('/subscriptions/:id').delete(adminLimiter, requireAdmin, deleteSubscriptionRequest);
router.route('/hosts/:id/subscription/manual-activate').post(adminLimiter, requireAdmin, manualActivateSubscription);

// Master Admin Security-Gated Endpoints (Guarded against unauthorized brute-forcing)
router.route('/impersonate').post(adminLimiter, requireAdmin, validate(impersonateSchema), impersonateAccount);
router.route('/users').get(adminLimiter, requireAdmin, getUsers);
router.route('/users/:id').delete(adminLimiter, requireAdmin, validate({ params: idParamSchema }), deleteUser);
router.route('/stats').get(adminLimiter, requireAdmin, getStats);
router.route('/hosts/:id/approve').put(adminLimiter, requireAdmin, validate({ params: idParamSchema }), approveHost);
router.route('/hosts/:id/reject').put(adminLimiter, requireAdmin, validate({ params: idParamSchema }), rejectHost);
router.route('/hosts/:id').delete(adminLimiter, requireAdmin, validate({ params: idParamSchema }), deleteHost);
router.route('/hosts').get(adminLimiter, requireAdmin, getHosts).post(protect, createHost);

// Regular Host-Scoped Utility Endpoints (Exempt from adminLimiter to prevent accidental lockouts from host dashboard polling)
router.route('/hosts/by-email/:email').get(protect, requireSelfHostOrAdmin, getHostByEmail);
router.route('/hosts/my-guests/:email').get(protect, requireSelfHostOrAdmin, getHostGuests);

export default router;
