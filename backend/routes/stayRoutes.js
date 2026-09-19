import express from 'express';
import {
  getAllStays,
  getStayById,
  getStayAvailability,
  createStay,
  addReviewToStay,
  updateReviewInStay,
  deleteReviewFromStay,
  updateStayRooms,
  resolveMapLink,
  getPropertiesByHost, // <-- 1. Import your new controller
} from '../controllers/stayController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Map & Location Resolution
router.post(['/resolve-map-link', '/resolve-map'], resolveMapLink);

// Dynamic Room Availability Check
router.get('/:id/availability', getStayAvailability);

// Stay Catalog & Inventory Routes
router.route('/')
  .get(getAllStays)
  .post(protect, createStay);

// 🔴 CRITICAL: Place this BEFORE router.route('/:id') so Express doesn't treat 'host' as an ID parameter
router.get('/host/my-properties', protect, getPropertiesByHost);

router.route('/:id')
  .get(getStayById);

router.route('/:id/rooms')
  .put(protect, updateStayRooms);

router.route('/:id/reviews')
  .post(protect, addReviewToStay);

router.route('/:id/reviews/:reviewId')
  .put(protect, updateReviewInStay)
  .delete(protect, deleteReviewFromStay);

export default router;