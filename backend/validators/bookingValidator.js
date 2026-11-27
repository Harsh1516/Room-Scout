import { z } from 'zod';
import { mongoIdSchema } from './commonValidator.js';

// Online Booking Creation Schema
export const createBookingSchema = z
  .object({
    stayId: mongoIdSchema,
    roomNumber: z
      .string({ required_error: 'Room number is required' })
      .trim()
      .min(1, { message: 'Room number cannot be empty' }),
    checkIn: z
      .string({ required_error: 'Check-in date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid check-in date format' }),
    checkOut: z
      .string({ required_error: 'Check-out date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid check-out date format' }),
    rateUnit: z.string().optional(),
    bookedDates: z.array(z.string()).optional(),
    bookedMonths: z.array(z.string()).optional(),
    fullName: z.string().trim().max(100).optional(),
    guestName: z.string().trim().max(100).optional(),
    email: z.string().trim().email({ message: 'Invalid guest email address' }).optional().or(z.literal('')),
    guestEmail: z.string().trim().email({ message: 'Invalid guest email address' }).optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    guestPhone: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    guestGender: z.string().trim().optional(),
    aadharNumber: z.string().trim().optional(),
    guestAadhar: z.string().trim().optional(),
    aadharPhoto: z.string().trim().optional(),
    guestAadharPhoto: z.string().trim().optional(),
    roomType: z.string().trim().optional(),
    personCount: z.coerce.number().int().min(1).default(1),
    totalAmount: z.coerce.number().min(0, { message: 'Total amount cannot be negative' }).optional(),
    paymentMethod: z.string().trim().optional(),
    stayTitle: z.string().trim().optional(),
    location: z.string().trim().optional(),
    bookingReferenceId: z.string().trim().optional(),
    slotBookingId: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const inDate = new Date(data.checkIn);
      const outDate = new Date(data.checkOut);
      return outDate.getTime() > inDate.getTime();
    },
    {
      message: 'Check-out date must be strictly after check-in date',
      path: ['checkOut'],
    }
  )
  .refine(
    (data) => {
      const inDate = new Date(data.checkIn);
      const outDate = new Date(data.checkOut);
      const isMonthly = Boolean(
        (data.rateUnit && String(data.rateUnit).toLowerCase().includes('month')) ||
        (Array.isArray(data.bookedMonths) && data.bookedMonths.length > 0)
      );

      // For monthly bookings: allow if the reservation period has not already passed
      if (isMonthly) {
        return outDate.getTime() >= Date.now();
      }

      // For nightly bookings: allow 24 hours buffer for international timezones and local clock differences
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return inDate.getTime() >= oneDayAgo.getTime();
    },
    {
      message: 'Check-in date cannot be in the past',
      path: ['checkIn'],
    }
  )
  .refine(
    (data) => {
      const rawPhone = String(data.phone || data.guestPhone || '').replace(/\D/g, '');
      if (!rawPhone) return true;
      const p = rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;
      if (!/^[6-9]\d{9}$/.test(p)) return false;
      if (/^(\d)\1{9}$/.test(p) || p === '1234567890' || p === '0123456789') return false;
      return true;
    },
    {
      message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9',
      path: ['phone'],
    }
  )
  .refine(
    (data) => {
      const rawAadhar = String(data.aadharNumber || data.guestAadhar || '').replace(/\D/g, '');
      if (!rawAadhar) return true;
      if (!/^[2-9]\d{11}$/.test(rawAadhar)) return false;
      if (/^(\d)\1{11}$/.test(rawAadhar)) return false;
      return true;
    },
    {
      message: 'Please enter a valid 12-digit Aadhar number (cannot start with 0 or 1)',
      path: ['aadharNumber'],
    }
  );

// Offline Booking Creation Schema (Host Walk-In)
export const createOfflineBookingSchema = z
  .object({
    stayId: mongoIdSchema,
    roomNumber: z
      .string({ required_error: 'Room number is required' })
      .trim()
      .min(1, { message: 'Room number cannot be empty' }),
    fullName: z.string().trim().optional(),
    guestName: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    guestPhone: z.string().trim().optional(),
    email: z.string().trim().email({ message: 'Invalid guest email' }).optional().or(z.literal('')),
    guestEmail: z.string().trim().email({ message: 'Invalid guest email' }).optional().or(z.literal('')),
    aadhar: z.string().trim().optional(),
    guestAadhar: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    roomType: z.string().trim().optional(),
    rateUnit: z.string().optional(),
    bookedDates: z.array(z.string()).optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    personCount: z.coerce.number().int().min(1).default(1),
    totalAmount: z.coerce.number().min(0).optional(),
    advancePaid: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.checkIn && data.checkOut) {
        const inDate = new Date(data.checkIn);
        const outDate = new Date(data.checkOut);
        return outDate.getTime() >= inDate.getTime();
      }
      return true;
    },
    {
      message: 'Check-out date must be on or after check-in date',
      path: ['checkOut'],
    }
  );

// Booking Status Update Schema
export const updateBookingStatusSchema = z.object({
  status: z
    .enum(
      [
        'PENDING',
        'AWAITING_PAYMENT',
        'CONFIRMED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'CANCELLED',
        'REJECTED',
        'EXPIRED',
      ],
      { message: 'Invalid booking status' }
    )
    .optional(),
  paymentDeadline: z.string().or(z.date()).optional().nullable(),
  approvedAt: z.string().or(z.date()).optional().nullable(),
  paymentReRequested: z.boolean().optional(),
  isTimedOut: z.boolean().optional(),
  totalAmount: z.coerce.number().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  aadharNumber: z.string().optional(),
  personCount: z.coerce.number().optional(),
  gender: z.string().optional(),
});

// Flexible Booking ID param schema supporting both MongoDB ObjectIds and bookingReferenceIds (e.g. BK-xxx, RS-xxx)
export const bookingIdParamSchema = z
  .object({
    id: z.string({ required_error: 'Booking ID parameter is required' }).trim().min(1, 'Booking ID cannot be empty'),
  })
  .strict();

// Extend Validity UTR Submission Schema (No screenshot upload required)
export const submitExtendValiditySchema = z.object({
  transactionRef: z
    .string({ required_error: '12-digit UPI UTR number is required' })
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 12, {
      message: 'Please enter a valid 12-digit numeric UPI UTR reference',
    }),
  targetRoomNumber: z.string().trim().optional(),
});

