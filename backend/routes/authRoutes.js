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
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/authValidator.js';
import {
  authLimiter,
  authCampusCeilingLimiter,
  passwordResetLimiter,
  passwordResetCampusCeilingLimiter,
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public Authentication Endpoints (Two-tier defense: campus NAT ceiling + per-account targeted limiter)
router.route('/register').post(authCampusCeilingLimiter, authLimiter, validate(signupSchema), registerUser);
router.route('/login').post(authCampusCeilingLimiter, authLimiter, validate(loginSchema), loginUser);
router.route('/forgot-password').post(passwordResetCampusCeilingLimiter, passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.route('/test-email').post(passwordResetLimiter, protect, requireAdmin, testEmailService);

// Protected Profile & Account Management Endpoints
router.route('/me').get(protect, getUserProfile);
router.route('/profile').put(protect, validate(updateProfileSchema), updateUserProfile);
router.route('/change-password').put(protect, validate(changePasswordSchema), changePassword);
router.route('/delete-account').delete(protect, deleteAccount);

export default router;