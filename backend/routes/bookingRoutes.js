import express from 'express';
import {
  createBooking,
  getMyBookings,
  updateBookingStatus,
  getBookingsByStay,
  removeOccupantBooking,
  deleteBooking,
} from '../controllers/bookingController.js';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Payment integration routes (Razorpay / UPI / Cards)
router.route('/payment/create-order').post(protect, createPaymentOrder);
router.route('/payment/verify').post(protect, verifyPayment);

// Occupant removal & Booking routes
router.route('/occupant/remove').post(removeOccupantBooking);
router.route('/').post(protect, createBooking);
router.route('/my-bookings').get(protect, getMyBookings);
router.route('/stay/:stayId').get(getBookingsByStay);
router.route('/:id/status').patch(protect, updateBookingStatus);
router.route('/:id').delete(deleteBooking);

export default router;

