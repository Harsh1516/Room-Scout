import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import dotenv from 'dotenv';
dotenv.config();

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

// @desc    Create Razorpay Order for checkout
// @route   POST /api/payments/create-order
// @access  Private
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', bookingReferenceId } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid total payment amount is required.',
      });
    }

    const amountInPaise = Math.round(Number(amount)) * 100;
    const rzp = getRazorpayInstance();

    if (rzp && process.env.RAZORPAY_KEY_ID) {
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency,
        receipt: (bookingReferenceId || `bk_${Date.now()}`).slice(0, 40),
      });

      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID.trim(),
        isSandbox: false,
      });
    }

    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return res.json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: 'rzp_test_sandbox_mode',
      isSandbox: true,
      message: 'Razorpay Sandbox Active: configure keys in .env for production.',
    });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment gateway order.',
    });
  }
};

// @desc    Verify Razorpay payment signature & confirm booking + record payment
// @route   POST /api/payments/verify
// @access  Private
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

    if (!isMock && key_secret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required Razorpay verification parameters.',
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
        gateway: isMock ? 'Razorpay Sandbox' : 'Razorpay Live',
        paymentId: resolvedPaymentId,
        orderId: razorpay_order_id,
        signature: razorpay_signature || 'verified_mock_hash',
      };
      await booking.save();

      // Record transaction in Payment collection
      await Payment.create({
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        stayId: booking.stayId,
        hostId: booking.hostId,
        userId: booking.userId || null,
        amount: booking.totalAmount,
        currency: 'INR',
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'COMPLETED',
        transactionId: resolvedPaymentId,
        gatewayResponse: { razorpay_order_id, razorpay_payment_id },
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified and transaction recorded successfully!',
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

// @desc    Get all payments for a host
// @route   GET /api/payments/host/:hostId
// @access  Private / Host
export const getHostPayments = async (req, res, next) => {
  try {
    const hostId = req.params.hostId || req.user?._id || req.user?.id;
    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ success: false, message: 'Valid hostId is required.' });
    }

    const payments = await Payment.find({ hostId })
      .populate('bookingId', 'fullName roomNumber stayTitle checkIn checkOut')
      .sort({ createdAt: -1 })
      .lean();

    const totalRevenue = payments
      .filter((p) => p.paymentStatus === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      success: true,
      count: payments.length,
      totalRevenue,
      payments,
    });
  } catch (error) {
    console.error('Get host payments error:', error);
    return next(error);
  }
};

// @desc    Get user's personal transaction history
// @route   GET /api/payments/my-payments
// @access  Private / User
export const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const payments = await Payment.find({ userId })
      .populate('stayId', 'title location images')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    return next(error);
  }
};