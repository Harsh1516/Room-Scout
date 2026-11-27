import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  getExtendValidityState,
  getExtensionReminderToSend,
  computeNextExtensionPeriod,
  buildSeededPaymentHistory,
  getRoomOccupancyForTargetMonth,
  computeExtensionRoomAmount,
} from '../utils/bookingExtensionHelpers.js';

describe('Extend Validity Feature & Email Notification Rules', () => {
  const baseCheckOut = new Date('2026-11-30T23:59:59.000Z');
  const activeBooking = {
    _id: '507f1f77bcf86cd799439011',
    roomNumber: '101',
    roomType: 'Double Bed',
    rateUnit: '/month',
    bookedMonths: ['2026-11'],
    checkIn: new Date('2026-11-01T00:00:00.000Z'),
    checkOut: baseCheckOut,
    totalAmount: 4000,
    personCount: 1,
    email: 'guest@example.com',
    status: 'CHECKED_IN',
    paymentStatus: 'PAID',
    bookingSource: 'ONLINE',
    upiPayment: { verificationStatus: 'VERIFIED', transactionRef: '430219882711' },
  };

  describe('Window Timing: 5 days before checkout through 7 days post checkout', () => {
    it('should be BEFORE_WINDOW more than 5 days before checkout', () => {
      const sixDaysBefore = new Date(baseCheckOut.getTime() - 6 * DAY_MS);
      const state = getExtendValidityState(activeBooking, sixDaysBefore);
      assert.equal(state.showButton, false);
      assert.equal(state.phase, 'BEFORE_WINDOW');
    });

    it('should enable PRE_EXPIRY window inside 5 days before checkout', () => {
      const threeDaysBefore = new Date(baseCheckOut.getTime() - 3 * DAY_MS);
      const state = getExtendValidityState(activeBooking, threeDaysBefore);
      assert.equal(state.showButton, true);
      assert.equal(state.phase, 'PRE_EXPIRY');
      assert.equal(state.daysUntilEnd, 3);
    });

    it('should decrement daysLeft from 7 down to 1 across the 7 post-checkout grace days even when CHECKED_OUT', () => {
      const checkedOutBooking = { ...activeBooking, status: 'CHECKED_OUT' };

      const day1 = getExtendValidityState(checkedOutBooking, new Date(baseCheckOut.getTime() + 2 * 60 * 60 * 1000));
      assert.equal(day1.showButton, true);
      assert.equal(day1.phase, 'POST_GRACE');
      assert.equal(day1.daysLeft, 7);
      assert.equal(day1.isLastDay, false);

      const day4 = getExtendValidityState(checkedOutBooking, new Date(baseCheckOut.getTime() + 3 * DAY_MS + 2 * 60 * 60 * 1000));
      assert.equal(day4.daysLeft, 4);
      assert.equal(day4.isLastDay, false);

      const day7 = getExtendValidityState(checkedOutBooking, new Date(baseCheckOut.getTime() + 6 * DAY_MS + 12 * 60 * 60 * 1000));
      assert.equal(day7.showButton, true);
      assert.equal(day7.daysLeft, 1);
      assert.equal(day7.isLastDay, true);
    });

    it('should expire cleanly after the 7th post-checkout day', () => {
      const day8 = new Date(baseCheckOut.getTime() + 7 * DAY_MS + 60 * 1000);
      const state = getExtendValidityState(activeBooking, day8);
      assert.equal(state.showButton, false);
      assert.equal(state.phase, 'EXPIRED');
    });
  });

  describe('Email Notification Cadence & Checked-Out Exclusion', () => {
    it('should send strictly ONE pre-5-day email for active non-checked-out bookings', () => {
      const preDate = new Date(baseCheckOut.getTime() - 4 * DAY_MS);
      const first = getExtensionReminderToSend(activeBooking, preDate);
      assert.equal(first?.type, 'PRE_5_DAY');

      const alreadySent = {
        ...activeBooking,
        renewalNotifications: { cycleKey: first.cycleKey, pre5DaySent: true, postDaysSent: [] },
      };
      assert.equal(getExtensionReminderToSend(alreadySent, preDate), null);
    });

    it('should send post-month daily emails Days 1..6 and LAST_DAY on Day 7', () => {
      const day1Time = new Date(baseCheckOut.getTime() + 12 * 60 * 60 * 1000);
      const r1 = getExtensionReminderToSend(activeBooking, day1Time);
      assert.equal(r1?.type, 'POST_DAILY');
      assert.equal(r1?.daysLeft, 7);
      assert.equal(r1?.postDayIndex, 1);

      const afterDay1 = {
        ...activeBooking,
        renewalNotifications: { cycleKey: r1.cycleKey, pre5DaySent: true, postDaysSent: [1] },
      };
      assert.equal(getExtensionReminderToSend(afterDay1, day1Time), null);

      const day7Time = new Date(baseCheckOut.getTime() + 6 * DAY_MS + 12 * 60 * 60 * 1000);
      const r7 = getExtensionReminderToSend(afterDay1, day7Time);
      assert.equal(r7?.type, 'LAST_DAY');
      assert.equal(r7?.daysLeft, 1);
      assert.equal(r7?.postDayIndex, 7);
    });

    it('should NEVER send reminder emails if the user is already CHECKED_OUT or extension UTR is pending', () => {
      const day2Time = new Date(baseCheckOut.getTime() + 1.5 * DAY_MS);
      const checkedOutBooking = { ...activeBooking, status: 'CHECKED_OUT' };
      assert.equal(getExtensionReminderToSend(checkedOutBooking, day2Time), null);

      const pendingExtBooking = {
        ...activeBooking,
        activeExtension: { status: 'PENDING_VERIFICATION', transactionRef: '430219882799' },
      };
      assert.equal(getExtensionReminderToSend(pendingExtBooking, day2Time), null);
    });
  });

  describe('Extension Period, Payment History Ledger & Room Slot Hold', () => {
    it('should advance bookedMonths cleanly into the next month and seed payment history', () => {
      const period = computeNextExtensionPeriod(activeBooking, 1);
      assert.deepEqual(period.targetMonths, ['2026-12']);
      assert.equal(period.targetMonthLabel, 'Dec 2026');
      assert.deepEqual(period.combinedMonths, ['2026-11', '2026-12']);

      const seeded = buildSeededPaymentHistory(activeBooking);
      assert.equal(seeded.length, 1);
      assert.equal(seeded[0].roomNumber, '101');
      assert.equal(seeded[0].monthLabel, 'Nov 2026');
      assert.equal(seeded[0].amount, 4000);
    });

    it('should reserve next-month room capacity while an extension UTR is pending verification', () => {
      const stay = {
        rooms: [{ roomNumber: '101', type: 'Double Bed', price: 4000, capacity: 1 }],
        roomRates: [{ type: 'Double Bed', price: 4000, capacity: 1 }],
      };
      const pendingHoldBooking = {
        _id: '507f1f77bcf86cd799439099',
        roomNumber: '101',
        status: 'CHECKED_OUT',
        bookedMonths: ['2026-11'],
        personCount: 1,
        activeExtension: {
          status: 'PENDING_VERIFICATION',
          targetRoomNumber: '101',
          targetMonths: ['2026-12'],
        },
      };

      const occ = getRoomOccupancyForTargetMonth(stay, '101', '2026-12', [pendingHoldBooking]);
      assert.equal(occ.availableSeats, 0);
      assert.equal(occ.occupiedSeats, 1);
    });

    it('should charge per-unit for Hotel/Flat and per-person for PG in Extend Validity pricing', () => {
      const hotelStay = {
        type: 'Hotel',
        rooms: [{ roomNumber: '201', type: 'Deluxe', price: 8000, capacity: 3 }],
      };
      const pgStay = {
        type: 'PG',
        rooms: [{ roomNumber: '101', type: 'Twin Sharing', price: 5000, capacity: 2 }],
      };

      const hotelExt = computeExtensionRoomAmount(hotelStay, '201', 3);
      assert.equal(hotelExt.roomFound, true);
      assert.equal(hotelExt.isPerPerson, false);
      assert.equal(hotelExt.exactAmount, 8000);

      const pgExt = computeExtensionRoomAmount(pgStay, '101', 2);
      assert.equal(pgExt.roomFound, true);
      assert.equal(pgExt.isPerPerson, true);
      assert.equal(pgExt.exactAmount, 10000);

      const missingRoom = computeExtensionRoomAmount(hotelStay, '999', 1);
      assert.equal(missingRoom.roomFound, false);
    });
  });
});
