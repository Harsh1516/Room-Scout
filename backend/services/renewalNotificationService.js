import { Booking } from '../models/Booking.js';
import { Stay } from '../models/Stay.js';
import { sendExtendValidityReminderEmail } from './emailService.js';
import {
  DAY_MS,
  PRE_EXPIRY_WINDOW_DAYS,
  POST_CHECKOUT_GRACE_DAYS,
  computeExtensionRoomAmount,
  computeNextExtensionPeriod,
  getExtensionReminderToSend,
  getRoomOccupancyForTargetMonth,
} from '../utils/bookingExtensionHelpers.js';

/**
 * Returns the hour in Asia/Kolkata timezone (0-23) so daily post-checkout emails
 * dispatch cleanly during morning hours IST instead of 00:00 UTC (05:30 AM IST).
 */
export function getIstHour(date = new Date()) {
  const istMs = new Date(date).getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).getUTCHours();
}

/**
 * Sweeps active non-checked-out monthly bookings and dispatches:
 * - 1 Pre-Expiry reminder at 5 days before checkout
 * - Daily Post-Month reminders on Days 1..6 and "Last Day" on Day 7
 * Strictly skips any CHECKED_OUT / COMPLETED / CANCELLED / REJECTED / EXPIRED bookings
 * and any booking with a pending extension UTR verification.
 */
export async function processExtendValidityNotifications(now = new Date(), { ignoreHourGate = false } = {}) {
  const summary = { checked: 0, sent: 0, skippedCheckedOut: 0, skippedFullRoom: 0 };

  // Unless explicitly bypassed (e.g. tests), dispatch reminders cleanly from 08:00 AM IST onward
  if (!ignoreHourGate && getIstHour(now) < 8) {
    return summary;
  }

  try {
    const minCheckout = new Date(now.getTime() - (POST_CHECKOUT_GRACE_DAYS + 1) * DAY_MS);
    const maxCheckout = new Date(now.getTime() + (PRE_EXPIRY_WINDOW_DAYS + 1) * DAY_MS);

    const candidates = await Booking.find({
      $or: [{ rateUnit: '/month' }, { 'bookedMonths.0': { $exists: true } }],
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
      'activeExtension.status': { $ne: 'PENDING_VERIFICATION' },
      checkOut: { $gte: minCheckout, $lte: maxCheckout },
      email: { $nin: ['', null] },
    }).lean();

    summary.checked = candidates.length;
    if (candidates.length === 0) return summary;

    const stayIds = [...new Set(candidates.map((b) => String(b.stayId)).filter(Boolean))];
    const stays = await Stay.find({ _id: { $in: stayIds } })
      .select('_id title type propertyType category rooms roomRates price')
      .lean();
    const stayMap = new Map(stays.map((s) => [String(s._id), s]));

    const stayBookings = await Booking.find({
      stayId: { $in: stayIds },
      $or: [
        { status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] } },
        { 'activeExtension.status': 'PENDING_VERIFICATION' },
      ],
    })
      .select('_id stayId roomNumber status bookedMonths checkIn checkOut personCount activeExtension')
      .lean();

    const bookingsByStay = new Map();
    for (const sb of stayBookings) {
      const k = String(sb.stayId);
      if (!bookingsByStay.has(k)) bookingsByStay.set(k, []);
      bookingsByStay.get(k).push(sb);
    }

    for (const booking of candidates) {
      const reminder = getExtensionReminderToSend(booking, now);
      if (!reminder) continue;

      const stay = stayMap.get(String(booking.stayId));
      if (!stay) continue;

      const extPeriod = computeNextExtensionPeriod(booking, 1);
      const occupancy = getRoomOccupancyForTargetMonth(
        stay,
        booking.roomNumber,
        extPeriod.targetMonthKey,
        bookingsByStay.get(String(booking.stayId)) || [],
        booking._id
      );

      if (occupancy.availableSeats < Math.max(1, Number(booking.personCount) || 1)) {
        summary.skippedFullRoom += 1;
        continue;
      }

      // Atomically claim the email dispatch slot in MongoDB to prevent duplicate emails
      let claimed = null;
      const isNewCycle = booking.renewalNotifications?.cycleKey !== reminder.cycleKey;

      if (reminder.type === 'PRE_5_DAY') {
        const query = isNewCycle
          ? { _id: booking._id, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } }
          : {
              _id: booking._id,
              status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
              'renewalNotifications.pre5DaySent': { $ne: true },
            };
        const update = isNewCycle
          ? {
              $set: {
                renewalNotifications: {
                  cycleKey: reminder.cycleKey,
                  pre5DaySent: true,
                  pre5DaySentAt: now,
                  postDaysSent: [],
                  lastSentAt: now,
                },
              },
            }
          : {
              $set: {
                'renewalNotifications.pre5DaySent': true,
                'renewalNotifications.pre5DaySentAt': now,
                'renewalNotifications.lastSentAt': now,
              },
            };
        claimed = await Booking.findOneAndUpdate(query, update, { new: true }).lean();
      } else {
        const query = isNewCycle
          ? { _id: booking._id, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } }
          : {
              _id: booking._id,
              status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
              'renewalNotifications.postDaysSent': { $ne: reminder.postDayIndex },
            };
        const update = isNewCycle
          ? {
              $set: {
                renewalNotifications: {
                  cycleKey: reminder.cycleKey,
                  pre5DaySent: true,
                  pre5DaySentAt: booking.renewalNotifications?.pre5DaySentAt || now,
                  postDaysSent: [reminder.postDayIndex],
                  lastSentAt: now,
                },
              },
            }
          : {
              $addToSet: { 'renewalNotifications.postDaysSent': reminder.postDayIndex },
              $set: { 'renewalNotifications.lastSentAt': now },
            };
        claimed = await Booking.findOneAndUpdate(query, update, { new: true }).lean();
      }

      if (!claimed) continue;

      const { roomType, exactAmount: amount } = computeExtensionRoomAmount(
        stay,
        booking.roomNumber,
        booking.personCount,
        booking.totalAmount
      );

      try {
        await sendExtendValidityReminderEmail({
          guestEmail: booking.email,
          guestName: booking.fullName || 'Guest',
          stayTitle: booking.stayTitle || stay.title || 'Stay In Property',
          roomNumber: booking.roomNumber,
          roomType: booking.roomType || roomType,
          nextMonthLabel: extPeriod.targetMonthLabel,
          amount,
          bookingId: booking._id.toString(),
          type: reminder.type,
          daysLeft: reminder.daysLeft,
          daysUntilEnd: reminder.daysUntilEnd,
        });

        summary.sent += 1;
      } catch (mailErr) {
        console.error('[Extend Validity Email Send Failed, rolling back claim]:', mailErr.message);
        if (reminder.type === 'PRE_5_DAY') {
          await Booking.updateOne(
            { _id: booking._id },
            { $set: { 'renewalNotifications.pre5DaySent': false } }
          ).catch(() => {});
        } else {
          await Booking.updateOne(
            { _id: booking._id },
            { $pull: { 'renewalNotifications.postDaysSent': reminder.postDayIndex } }
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[Extend Validity Notification Sweep Error]:', err.message);
  }

  return summary;
}
