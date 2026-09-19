import express from 'express';
import {
  createBooking,
  createOfflineBooking,
  getHostBookings,
  getMyBookings,
  checkStayAvailability,
  getBookingsByStayId,
  updateBookingStatus,
  removeOccupantBooking,
  checkoutOccupant,
  cascadeDeleteRoomBookings,
  deleteBooking,
} from '../controllers/bookingController.js';
import {
  createPaymentOrder,
  verifyPayment,
} from '../controllers/paymentController.js';
import { protect, optionalProtect, requireHost } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', optionalProtect, createBooking);
router.post('/offline', protect, requireHost, createOfflineBooking);

router.get('/check-availability', checkStayAvailability);
router.get('/stay/:stayId', getBookingsByStayId);

router.post('/payment/create-order', protect, createPaymentOrder);
router.post('/payment/verify', protect, verifyPayment);

router.get('/host-bookings', protect, requireHost, getHostBookings);
router.get('/host/:email', protect, requireHost, getHostBookings);
router.get('/my-bookings', protect, getMyBookings);

router.patch('/:id/status', protect, updateBookingStatus);
router.delete('/:id', protect, deleteBooking);
router.post('/occupant/remove', protect, requireHost, removeOccupantBooking);
router.post('/occupant/checkout', protect, requireHost, checkoutOccupant);
router.post('/room/cascade-delete', protect, requireHost, cascadeDeleteRoomBookings);

export default router;
