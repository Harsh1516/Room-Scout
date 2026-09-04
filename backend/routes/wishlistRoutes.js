import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';

const router = express.Router();

router.route('/')
  .get(protect, getWishlist);

router.route('/toggle')
  .post(protect, toggleWishlist);

router.route('/:stayId')
  .delete(protect, removeFromWishlist);

export default router;
