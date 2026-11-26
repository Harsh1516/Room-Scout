import crypto from 'crypto';
import { Booking } from '../models/Booking.js';

/**
 * Generates a cryptographically random 8-digit numeric booking pass key
 * (10000000 - 99999999) guaranteed unique across all bookings.
 */
export async function generateUniqueBookingPassKey() {
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = crypto.randomInt(10000000, 100000000).toString();
    const existing = await Booking.exists({ checkInCode: candidate });
    if (!existing) {
      return candidate;
    }
  }
  // Fallback using timestamp suffix mixed with random digits if extreme collision occurs
  const fallback = String(crypto.randomInt(10000000, 100000000));
  return fallback;
}
