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
  checkoutBooking,
  cascadeDeleteRoomBookings,
  deleteBooking,
} from '../controllers/bookingController.js';
import { protect, optionalProtect, requireHost, requireSelfHostOrAdmin } from '../middleware/authMiddleware.js';
import { bookingLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { idParamSchema, stayIdParamSchema } from '../validators/commonValidator.js';
import {
  createBookingSchema,
  createOfflineBookingSchema,
  updateBookingStatusSchema,
  bookingIdParamSchema,
} from '../validators/bookingValidator.js';

const router = express.Router();

router.post('/', bookingLimiter, optionalProtect, validate(createBookingSchema), createBooking);
router.post('/offline', bookingLimiter, protect, requireHost, validate(createOfflineBookingSchema), createOfflineBooking);

router.get('/check-availability', checkStayAvailability);
router.get('/stay/:stayId', validate({ params: stayIdParamSchema }), getBookingsByStayId);

router.get('/host-bookings', protect, requireHost, getHostBookings);
router.get('/host/:email', protect, requireHost, requireSelfHostOrAdmin, getHostBookings);
router.get('/my-bookings', protect, getMyBookings);

router.patch('/:id/status', protect, validate({ params: bookingIdParamSchema, body: updateBookingStatusSchema }), updateBookingStatus);
router.post('/:id/checkout', protect, validate({ params: bookingIdParamSchema }), checkoutBooking);
router.patch('/:id/checkout', protect, validate({ params: bookingIdParamSchema }), checkoutBooking);
router.delete('/:id', protect, validate({ params: bookingIdParamSchema }), deleteBooking);
router.post('/occupant/remove', protect, requireHost, removeOccupantBooking);
router.post('/occupant/checkout', protect, requireHost, checkoutOccupant);
router.post('/room/cascade-delete', protect, requireHost, cascadeDeleteRoomBookings);

export default router;
