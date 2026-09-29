import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';
import {
  toggleWishlistSchema,
  wishlistParamSchema,
} from '../validators/wishlistValidator.js';

const router = express.Router();

router.route('/')
  .get(protect, getWishlist);

router.route('/toggle')
  .post(protect, validate(toggleWishlistSchema), toggleWishlist);

router.route('/:stayId')
  .delete(protect, validate({ params: wishlistParamSchema }), removeFromWishlist);

export default router;