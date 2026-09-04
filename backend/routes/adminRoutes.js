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

const router = express.Router();

// Routes using router.route() style
router.route('/impersonate').post(impersonateAccount);
router.route('/users').get(getUsers);
router.route('/users/:id').delete(deleteUser);

router.route('/hosts').get(getHosts).post(createHost);
router.route('/hosts/by-email/:email').get(getHostByEmail);
router.route('/hosts/:id/approve').put(approveHost);
router.route('/hosts/:id/reject').put(rejectHost);
router.route('/hosts/my-guests/:email').get(getHostGuests);
router.route('/hosts/:id').delete(deleteHost);

router.route('/stats').get(getStats);

export default router;
