import { z } from 'zod';
import { mongoIdSchema } from './commonValidator.js';

// Payment Order Creation Schema
export const createPaymentOrderSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Payment amount is required' })
    .positive({ message: 'Amount must be greater than 0' }),
  currency: z.string().trim().default('INR').optional(),
  bookingReferenceId: z.string().trim().optional(),
});

// Razorpay Payment Verification Schema
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z
    .string({ required_error: 'razorpay_order_id is required' })
    .trim()
    .min(1, { message: 'razorpay_order_id cannot be empty' }),
  razorpay_payment_id: z
    .string({ required_error: 'razorpay_payment_id is required' })
    .trim()
    .min(1, { message: 'razorpay_payment_id cannot be empty' }),
  razorpay_signature: z
    .string({ required_error: 'razorpay_signature is required' })
    .trim()
    .min(1, { message: 'razorpay_signature cannot be empty' }),
  bookingReferenceId: z.string().trim().optional(),
  bookingId: mongoIdSchema.optional(),
});
