import { z } from 'zod';
import { mongoIdSchema } from './commonValidator.js';

// Host Direct UPI Settings Configuration Schema
export const hostUpiSettingsSchema = z.object({
  upiId: z
    .string({ required_error: 'UPI ID is required' })
    .trim()
    .min(3, { message: 'UPI ID must be at least 3 characters' })
    .max(256, { message: 'UPI ID cannot exceed 256 characters' })
    .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, {
      message: 'Invalid UPI ID format. Expected format: username@bank (e.g. property@okhdfcbank)',
    }),
  payeeName: z
    .string({ required_error: 'Payee display name is required' })
    .trim()
    .min(2, { message: 'Payee display name must be at least 2 characters' })
    .max(100, { message: 'Payee display name cannot exceed 100 characters' }),
  qrCodeUrl: z.string().trim().optional(),
});

// Guest UPI Payment Reference Submission Schema
export const submitUpiPaymentSchema = z.object({
  bookingId: mongoIdSchema.optional(),
  bookingReferenceId: z.string().trim().optional(),
  transactionRef: z
    .string({ required_error: 'UPI Transaction Reference (UTR / RRN) is required' })
    .trim()
    .min(6, { message: 'Transaction reference must be at least 6 characters' })
    .max(40, { message: 'Transaction reference cannot exceed 40 characters' })
    .regex(/^[a-zA-Z0-9\-_/]+$/, {
      message: 'Transaction reference can only contain letters, numbers, hyphens, and slashes',
    }),
  receiptImage: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional(),
}).refine((data) => data.bookingId || data.bookingReferenceId, {
  message: 'Either bookingId or bookingReferenceId is required',
  path: ['bookingId'],
});

// Host UPI Reference Verification / Rejection Schema
export const verifyUpiPaymentSchema = z.object({
  bookingId: mongoIdSchema,
  action: z.enum(['VERIFY', 'REJECT'], {
    required_error: 'Action must be either VERIFY or REJECT',
  }),
  rejectionReason: z
    .string()
    .trim()
    .max(500, { message: 'Rejection reason cannot exceed 500 characters' })
    .optional(),
  verificationNote: z
    .string()
    .trim()
    .max(500, { message: 'Verification note cannot exceed 500 characters' })
    .optional(),
});

// Manual Refund Audit Schema
export const recordRefundSchema = z.object({
  bookingId: mongoIdSchema,
  refundRef: z
    .string({ required_error: 'Refund reference number is required' })
    .trim()
    .min(6, { message: 'Refund reference must be at least 6 characters' })
    .max(40, { message: 'Refund reference cannot exceed 40 characters' }),
  refundAmount: z.coerce
    .number({ required_error: 'Refund amount is required' })
    .positive({ message: 'Refund amount must be greater than 0' }),
  note: z.string().trim().max(500).optional(),
});
