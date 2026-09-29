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

// Apply administrative rate limiter across all admin routes
router.use(adminLimiter);

router.route('/impersonate').post(requireAdmin, validate(impersonateSchema), impersonateAccount);
router.route('/users').get(requireAdmin, getUsers);
router.route('/users/:id').delete(requireAdmin, validate({ params: idParamSchema }), deleteUser);
router.route('/stats').get(requireAdmin, getStats);
router.route('/hosts/:id/approve').put(requireAdmin, validate({ params: idParamSchema }), approveHost);
router.route('/hosts/:id/reject').put(requireAdmin, validate({ params: idParamSchema }), rejectHost);
router.route('/hosts/:id').delete(requireAdmin, validate({ params: idParamSchema }), deleteHost);

router.route('/hosts').get(requireAdmin, getHosts).post(protect, createHost);
router.route('/hosts/by-email/:email').get(protect, requireSelfHostOrAdmin, getHostByEmail);
router.route('/hosts/my-guests/:email').get(protect, requireSelfHostOrAdmin, getHostGuests);

export default router;
