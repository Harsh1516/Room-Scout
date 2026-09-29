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
    roomType: z.string().trim().optional(),
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
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
      // Allow 24 hours buffer for international timezones and local clock differences
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return inDate.getTime() >= oneDayAgo.getTime();
    },
    {
      message: 'Check-in date cannot be in the past',
      path: ['checkIn'],
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
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
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
  status: z.enum(
    [
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
      'REJECTED',
      'EXPIRED',
    ],
    { message: 'Invalid booking status' }
  ),
});
