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
import { protect, optionalProtect, requireHost, requireSelfHostOrAdmin } from '../middleware/authMiddleware.js';
import { bookingLimiter, paymentLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { idParamSchema, stayIdParamSchema } from '../validators/commonValidator.js';
import {
  createBookingSchema,
  createOfflineBookingSchema,
  updateBookingStatusSchema,
} from '../validators/bookingValidator.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from '../validators/paymentValidator.js';

const router = express.Router();

router.post('/', bookingLimiter, optionalProtect, validate(createBookingSchema), createBooking);
router.post('/offline', bookingLimiter, protect, requireHost, validate(createOfflineBookingSchema), createOfflineBooking);

router.get('/check-availability', checkStayAvailability);
router.get('/stay/:stayId', validate({ params: stayIdParamSchema }), getBookingsByStayId);

router.post('/payment/create-order', paymentLimiter, protect, validate(createPaymentOrderSchema), createPaymentOrder);
router.post('/payment/verify', paymentLimiter, protect, validate(verifyPaymentSchema), verifyPayment);

router.get('/host-bookings', protect, requireHost, getHostBookings);
router.get('/host/:email', protect, requireHost, requireSelfHostOrAdmin, getHostBookings);
router.get('/my-bookings', protect, getMyBookings);

router.patch('/:id/status', protect, validate({ params: idParamSchema, body: updateBookingStatusSchema }), updateBookingStatus);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteBooking);
router.post('/occupant/remove', protect, requireHost, removeOccupantBooking);
router.post('/occupant/checkout', protect, requireHost, checkoutOccupant);
router.post('/room/cascade-delete', protect, requireHost, cascadeDeleteRoomBookings);

export default router;
