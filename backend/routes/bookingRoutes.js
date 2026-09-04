import express from 'express';
import { createBooking, getMyBookings, updateBookingStatus, getBookingsByStay } from '../controllers/bookingController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes using router.route() style
router.route('/').post(optionalProtect, createBooking);
router.route('/my-bookings').get(protect, getMyBookings);
router.route('/stay/:stayId').get(getBookingsByStay);
router.route('/:id/status').patch(updateBookingStatus);

export default router;
