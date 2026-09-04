import express from 'express';
import {
  getAllStays,
  getStayById,
  createStay,
  addReviewToStay,
  updateReviewInStay,
  deleteReviewFromStay,
  updateStayRooms,
  resolveMapLink,
} from '../controllers/stayController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Google Maps URL Resolver (before /:id param route)
router.post('/resolve-map-link', resolveMapLink);

// Routes using router.route() style
router.route('/').get(getAllStays).post(protect, createStay);
router.route('/:id').get(getStayById);
router.route('/:id/rooms').put(updateStayRooms);
router.route('/:id/reviews').post(protect, addReviewToStay);
router.route('/:id/reviews/:reviewId').put(updateReviewInStay).delete(deleteReviewFromStay);

export default router;
