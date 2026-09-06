import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Razorpay client helper
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    return new Razorpay({
      key_id: key_id.trim(),
      key_secret: key_secret.trim(),
    });
  }
  return null;
}

// @desc    Create Razorpay Order for booking checkout
// @route   POST /api/bookings/payment/create-order
// @access  Protected (User)
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', bookingReferenceId, bookingId, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid total payment amount is required.',
      });
    }

    const numericAmount = Math.round(Number(amount));
    const amountInPaise = numericAmount * 100;
    const rzp = getRazorpayInstance();

    // 1. Live/Test Razorpay Gateway if API keys are provided
    if (rzp && process.env.RAZORPAY_KEY_ID) {
      const options = {
        amount: amountInPaise,
        currency,
        receipt: (bookingReferenceId || `bk_${Date.now()}`).slice(0, 40),
        notes: notes || {
          bookingReferenceId: bookingReferenceId || '',
          userEmail: req.user?.email || '',
        },
      };

      const order = await rzp.orders.create(options);
      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID.trim(),
        isSandbox: false,
      });
    }

    // 2. Safe Sandbox / Mock Mode when keys are pending setup in .env
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return res.json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: 'rzp_test_sandbox_mode',
      isSandbox: true,
      message: 'Razorpay Sandbox Active: configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in backend/.env for live gateway.',
    });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment gateway order.',
    });
  }
};

// @desc    Verify Razorpay payment signature & confirm booking
// @route   POST /api/bookings/payment/verify
// @access  Protected (User)
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingReferenceId,
      bookingId,
    } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = razorpay_order_id?.startsWith('order_mock_') || !key_secret;

    // Verify cryptographic HMAC SHA-256 signature when in real/test gateway mode
    if (!isMock && key_secret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required Razorpay payment confirmation parameters.',
        });
      }

      const generatedSignature = crypto
        .createHmac('sha256', key_secret.trim())
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: cryptographic signature mismatch.',
        });
      }
    }

    // Update MongoDB Booking status to PAID and CONFIRMED
    let booking = null;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      booking = await Booking.findById(bookingId);
    }
    if (!booking && bookingReferenceId) {
      booking = await Booking.findOne({ bookingReferenceId });
    }

    const resolvedPaymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;

    if (booking) {
      booking.paymentStatus = 'PAID';
      booking.paymentMethod = 'RAZORPAY';
      booking.status = 'CONFIRMED';
      booking.paymentDetails = {
        gateway: isMock ? 'Razorpay Sandbox (UPI/Card)' : 'Razorpay Live',
        paymentId: resolvedPaymentId,
        orderId: razorpay_order_id,
        signature: razorpay_signature || 'verified_mock_hash',
      };
      await booking.save();
    }

    return res.json({
      success: true,
      message: 'Payment verified and reservation confirmed successfully!',
      paymentId: resolvedPaymentId,
      bookingReferenceId: booking?.bookingReferenceId || bookingReferenceId,
      booking,
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed.',
    });
  }
};
