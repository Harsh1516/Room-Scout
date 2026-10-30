import express from 'express';
import {
  getAllStays,
  getStayById,
  getStayAvailability,
  getPublicStats,
  createStay,
  addReviewToStay,
  updateReviewInStay,
  deleteReviewFromStay,
  updateStayRooms,
  resolveMapLink,
  getPropertiesByHost,
  resetStayRevenue,
} from '../controllers/stayController.js';
import { protect, requireHost } from '../middleware/authMiddleware.js';
import { propertyUploadLimiter, reviewLimiter } from '../middleware/rateLimitMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { idParamSchema } from '../validators/commonValidator.js';
import {
  createStaySchema,
  resolveMapSchema,
  reviewSchema,
  updateReviewSchema,
  updateStayRoomsSchema,
  reviewParamsSchema,
} from '../validators/stayValidator.js';

const router = express.Router();

// Map & Location Resolution (Protected by propertyUploadLimiter against scraping)
router.post(
  ['/resolve-map-link', '/resolve-map'],
  propertyUploadLimiter,
  validate(resolveMapSchema),
  resolveMapLink
);

// Dynamic Room Availability Check
router.get('/:id/availability', validate({ params: idParamSchema }), getStayAvailability);

// Public platform summary stats (stays count, online users booked count)
router.get('/public-stats', getPublicStats);

// Stay Catalog & Inventory Routes
router.route('/')
  .get(getAllStays)
  .post(propertyUploadLimiter, protect, requireHost, validate(createStaySchema), createStay);


// 🔴 CRITICAL: Place this BEFORE router.route('/:id') so Express doesn't treat 'host' as an ID parameter
router.get('/host/my-properties', protect, requireHost, getPropertiesByHost);

router.route('/:id')
  .get(validate({ params: idParamSchema }), getStayById);

router.route('/:id/rooms')
  .put(protect, requireHost, validate({ params: idParamSchema, body: updateStayRoomsSchema }), updateStayRooms);

router.route('/:id/reset-revenue')
  .post(protect, requireHost, validate({ params: idParamSchema }), resetStayRevenue);

router.route('/:id/reviews')
  .post(reviewLimiter, validate({ params: idParamSchema, body: reviewSchema }), protect, addReviewToStay);

router.route('/:id/reviews/:reviewId')
  .put(protect, validate({ params: reviewParamsSchema, body: updateReviewSchema }), updateReviewInStay)
  .delete(protect, validate({ params: reviewParamsSchema }), deleteReviewFromStay);

export default router;