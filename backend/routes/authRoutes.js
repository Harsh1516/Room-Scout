import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  updateUserProfile,
  changePassword,
  deleteAccount,
  getUserProfile,
  testEmailService,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { signupSchema, loginSchema } from '../validators/authValidator.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public Auth Routes (Hardened with rate limiting against brute force attacks)
router.route('/register').post(authLimiter, validate(signupSchema), registerUser);
router.route('/login').post(authLimiter, validate(loginSchema), loginUser);
router.route('/forgot-password').post(authLimiter, forgotPassword);
router.route('/test-email').post(testEmailService);

// Protected Profile & Account Management Routes
router.route('/me').get(protect, getUserProfile);
router.route('/profile').put(protect, updateUserProfile);
router.route('/change-password').put(protect, changePassword);
router.route('/delete-account').delete(protect, deleteAccount);

export default router;
