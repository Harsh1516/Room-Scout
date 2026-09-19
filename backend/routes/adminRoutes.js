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
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/impersonate').post(requireAdmin, impersonateAccount);
router.route('/users').get(requireAdmin, getUsers);
router.route('/users/:id').delete(requireAdmin, deleteUser);
router.route('/stats').get(requireAdmin, getStats);
router.route('/hosts/:id/approve').put(requireAdmin, approveHost);
router.route('/hosts/:id/reject').put(requireAdmin, rejectHost);
router.route('/hosts/:id').delete(requireAdmin, deleteHost);

router.route('/hosts').get(requireAdmin, getHosts).post(protect, createHost);
router.route('/hosts/by-email/:email').get(protect, getHostByEmail);
router.route('/hosts/my-guests/:email').get(protect, getHostGuests);

export default router;
