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

const router = express.Router();

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
