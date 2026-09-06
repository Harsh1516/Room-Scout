import express from 'express';
import {
  createBooking,
  getMyBookings,
  getHostBookings,
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

// Occupant removal route
router.route('/occupant/remove').post(removeOccupantBooking);

// User & Host booking routes
router.route('/').post(protect, createBooking);
router.route('/my-bookings').get(protect, getMyBookings);
router.route('/host-bookings').get(protect, getHostBookings);
router.route('/stay/:stayId').get(getBookingsByStay);

// Dynamic ID routes (placed after specific paths to prevent route collisions)
router.route('/:id/status').patch(protect, updateBookingStatus);
router.route('/:id').delete(protect, deleteBooking);

export default router;