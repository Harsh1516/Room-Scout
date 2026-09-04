import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  updateUserProfile,
  changePassword,
  deleteAccount,
  getUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { signupSchema, loginSchema } from '../validators/authValidator.js';

const router = express.Router();

// Public Auth Routes
router.route('/register').post(validate(signupSchema), registerUser);
router.route('/login').post(validate(loginSchema), loginUser);
router.route('/forgot-password').post(forgotPassword);

// Protected Profile & Account Management Routes
router.route('/me').get(protect, getUserProfile);
router.route('/profile').put(protect, updateUserProfile);
router.route('/change-password').put(protect, changePassword);
router.route('/delete-account').delete(protect, deleteAccount);

export default router;
