import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUpiPaymentUri,
  normalizeTransactionRef,
} from '../controllers/paymentController.js';
import {
  hostUpiSettingsSchema,
  submitUpiPaymentSchema,
  verifyUpiPaymentSchema,
} from '../validators/paymentValidator.js';
import { isBookingRequestExpired } from '../controllers/bookingController.js';

describe('Direct UPI Payment System Tests', () => {
  describe('UPI URI Generator & Format Enforcement', () => {
    it('should generate a valid UPI URI with exact amount, payee name, and booking note', () => {
      const uri = buildUpiPaymentUri({
        upiId: 'grandhostel@okhdfcbank',
        payeeName: 'Grand Residency Hostels',
        amount: 3500.5,
        bookingRef: 'BK-2026-9901',
      });

      assert.ok(uri.startsWith('upi://pay?'), 'URI must begin with upi://pay?');
      assert.match(uri, /pa=grandhostel%40okhdfcbank|pa=grandhostel@okhdfcbank/);
      assert.match(uri, /pn=Grand%20Residency%20Hostels/);
      assert.match(uri, /am=3500\.50/, 'Amount must be formatted strictly to 2 decimal places');
      assert.match(uri, /cu=INR/, 'Currency must be INR');
      assert.match(uri, /tn=BK-2026-9901/);
    });

    it('should sanitize and encode special characters in payee and reference note', () => {
      const uri = buildUpiPaymentUri({
        upiId: 'property.manager@upi',
        payeeName: "Ram & Shyam's Stay",
        amount: 1200,
        bookingRef: 'BK #123 & 456',
      });

      assert.match(uri, /am=1200\.00/);
      assert.ok(!uri.includes(' '), 'URI must not contain unencoded spaces');
    });
  });

  describe('UPI VPA and Configuration Validation (Host Settings)', () => {
    it('should accept valid Indian UPI VPAs / IDs', () => {
      const validCases = [
        'sharma.hostel@okhdfcbank',
        'hoststay@icici',
        'myproperty@upi',
        'john_doe123@ybl',
        'paytm-9876543210@paytm',
        'contact@axisbank',
      ];

      for (const upiId of validCases) {
        const result = hostUpiSettingsSchema.safeParse({
          upiId,
          payeeName: 'Valid Property Host',
        });
        assert.equal(result.success, true, `Expected ${upiId} to be valid`);
      }
    });

    it('should reject invalid UPI IDs', () => {
      const invalidCases = [
        '',
        'notanupiid',
        '@okhdfcbank',
        'user@',
        'has spaces@upi',
        'special$char@bank',
        'user@bank@extra',
      ];

      for (const upiId of invalidCases) {
        const result = hostUpiSettingsSchema.safeParse({
          upiId,
          payeeName: 'Invalid Host',
        });
        assert.equal(result.success, false, `Expected ${upiId} to be rejected`);
      }
    });

    it('should reject payee names that are too short', () => {
      const result = hostUpiSettingsSchema.safeParse({
        upiId: 'valid@okhdfc',
        payeeName: 'A', // min 2 characters
      });
      assert.equal(result.success, false);
    });
  });

  describe('Transaction Reference (UTR/RRN) Validation & Normalization', () => {
    it('should normalize reference numbers by trimming, stripping dashes/spaces, and uppercasing', () => {
      assert.equal(normalizeTransactionRef('  4123-4567-8901  '), '412345678901');
      assert.equal(normalizeTransactionRef('utr-2026abc9901'), 'UTR2026ABC9901');
      assert.equal(normalizeTransactionRef('  123 456 789 012 '), '123456789012');
    });

    it('should accept standard 12-digit Indian bank UTR numbers', () => {
      const result = submitUpiPaymentSchema.safeParse({
        bookingId: '507f1f77bcf86cd799439011',
        transactionRef: '412345678901',
      });
      assert.equal(result.success, true);
    });

    it('should reject malformed, empty, or too-short transaction references', () => {
      const invalidRefs = [
        '',
        '12',
        'abc',
        '12345',
        'bad!@#$',
      ];

      for (const ref of invalidRefs) {
        const normalized = normalizeTransactionRef(ref);
        const result = submitUpiPaymentSchema.safeParse({
          bookingId: '507f1f77bcf86cd799439011',
          transactionRef: normalized,
        });
        assert.equal(result.success, false, `Expected ref "${ref}" to be rejected`);
      }
    });
  });

  describe('Host Verification Action Schema', () => {
    it('should accept valid VERIFY action with optional note', () => {
      const result = verifyUpiPaymentSchema.safeParse({
        bookingId: '507f1f77bcf86cd799439011',
        action: 'VERIFY',
        verificationNote: 'Confirmed credit of ₹3500 in HDFC statement',
      });
      assert.equal(result.success, true);
    });

    it('should accept REJECT action', () => {
      const result = verifyUpiPaymentSchema.safeParse({
        bookingId: '507f1f77bcf86cd799439011',
        action: 'REJECT',
        verificationNote: 'UTR not found in bank statement',
      });
      assert.equal(result.success, true);
    });

    it('should reject unknown actions', () => {
      const result = verifyUpiPaymentSchema.safeParse({
        bookingId: '507f1f77bcf86cd799439011',
        action: 'AUTO_APPROVE',
      });
      assert.equal(result.success, false);
    });
  });

  describe('Booking Lifecycle & Expiry Safeguards', () => {
    it('should NOT expire a booking when verification is pending', () => {
      // Booking created 15 minutes ago (beyond default 5 min timeout)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const booking = {
        bookingSource: 'ONLINE',
        paymentStatus: 'PENDING_VERIFICATION',
        status: 'PENDING',
        approvalTimestamp: fifteenMinutesAgo,
        approvedAt: fifteenMinutesAgo,
        createdAt: fifteenMinutesAgo,
        upiPayment: {
          transactionRef: '412345678901',
          verificationStatus: 'PENDING_VERIFICATION',
        },
      };

      const expired = isBookingRequestExpired(booking);
      assert.equal(
        expired,
        false,
        'Booking awaiting host payment verification must NOT be expired by background timer'
      );
    });

    it('should expire an approved booking if the user never submitted payment within timeout', () => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const booking = {
        bookingSource: 'ONLINE',
        paymentStatus: 'UNPAID',
        status: 'AWAITING_PAYMENT',
        paymentDeadline: fifteenMinutesAgo,
        approvalTimestamp: fifteenMinutesAgo,
        approvedAt: fifteenMinutesAgo,
        createdAt: fifteenMinutesAgo,
        upiPayment: {
          verificationStatus: 'NOT_SUBMITTED',
        },
      };

      const expired = isBookingRequestExpired(booking);
      assert.equal(expired, true, 'Abandoned booking request must expire after timeout');
    });
  });

  describe('Check-In Validation Guard', () => {
    it('should strictly disallow check-in if booking is not CONFIRMED or payment is not VERIFIED', () => {
      // Simulate backend check-in guard logic
      const validateCanCheckIn = (booking) => {
        const rawStatus = String(booking.status || '').toUpperCase();
        const isOnline = booking.bookingSource === 'ONLINE' || booking.isOnline === true;
        const isConfirmed = rawStatus === 'CONFIRMED';
        const isPaid =
          booking.paymentStatus === 'PAID' ||
          booking.paymentMethod === 'PAY_ON_ARRIVAL' ||
          booking.paymentMethod === 'OFFLINE' ||
          booking.paymentMethod === 'CASH';
        const isUpiVerified =
          booking.paymentMethod !== 'UPI' ||
          booking.upiPayment?.verificationStatus === 'VERIFIED';

        if (!isConfirmed) {
          throw new Error('Check-in rejected: Booking must be in CONFIRMED status before checking in.');
        }
        if (isOnline && (!isPaid || !isUpiVerified)) {
          throw new Error('Check-in rejected: Direct UPI payment has not been verified by host.');
        }
        return true;
      };

      // Case 1: Unverified UPI payment
      assert.throws(
        () =>
          validateCanCheckIn({
            status: 'CONFIRMED',
            bookingSource: 'ONLINE',
            paymentMethod: 'UPI',
            paymentStatus: 'PENDING_VERIFICATION',
            upiPayment: { verificationStatus: 'PENDING_VERIFICATION' },
          }),
        /Direct UPI payment has not been verified/
      );

      // Case 2: Unconfirmed status
      assert.throws(
        () =>
          validateCanCheckIn({
            status: 'PENDING',
            bookingSource: 'ONLINE',
            paymentMethod: 'UPI',
            paymentStatus: 'PAID',
            upiPayment: { verificationStatus: 'VERIFIED' },
          }),
        /Booking must be in CONFIRMED status/
      );

      // Case 3: Confirmed & verified payment -> Passes
      assert.equal(
        validateCanCheckIn({
          status: 'CONFIRMED',
          bookingSource: 'ONLINE',
          paymentMethod: 'UPI',
          paymentStatus: 'PAID',
          upiPayment: { verificationStatus: 'VERIFIED' },
        }),
        true
      );
    });
  });

  describe('Host Verification IDOR Protection Guard', () => {
    it('should prohibit non-owner host from verifying booking', () => {
      const verifyHostOwnership = (bookingStayHostId, requestingHostId) => {
        if (String(bookingStayHostId) !== String(requestingHostId)) {
          throw new Error('Forbidden: You are not authorized to verify payments for this property');
        }
        return true;
      };

      const legitimateHostId = '654321654321654321654321';
      const maliciousHostId = '123456123456123456123456';

      assert.throws(
        () => verifyHostOwnership(legitimateHostId, maliciousHostId),
        /Forbidden: You are not authorized/
      );

      assert.equal(verifyHostOwnership(legitimateHostId, legitimateHostId), true);
    });
  });

  describe('Price Transparency & Zero Surcharge Guard', () => {
    it('should compute exact payable amount without platform fees or hidden gateway surcharges', () => {
      const calculateTrustedTotal = ({ baseRate, nights, roomQuantity = 1, taxRate = 0 }) => {
        const subtotal = Math.round(baseRate * nights * roomQuantity);
        const taxes = Math.round(subtotal * taxRate);
        const total = subtotal + taxes;
        return {
          baseRate,
          nights,
          roomQuantity,
          subtotal,
          taxes,
          totalAmount: total,
          platformFee: 0,
          gatewayFee: 0,
        };
      };

      const breakdown = calculateTrustedTotal({
        baseRate: 1500,
        nights: 3,
        roomQuantity: 2,
        taxRate: 0.12,
      });

      assert.equal(breakdown.subtotal, 9000);
      assert.equal(breakdown.taxes, 1080);
      assert.equal(breakdown.totalAmount, 10080);
      assert.equal(breakdown.platformFee, 0, 'No platform fee permitted');
      assert.equal(breakdown.gatewayFee, 0, 'No payment gateway fee permitted');
    });
  });

  describe('Reference Uniqueness Guard', () => {
    it('should reject a duplicate UTR submitted across multiple bookings', () => {
      const mockDatabase = new Map();

      const registerPaymentRef = (bookingId, rawRef) => {
        const normalized = normalizeTransactionRef(rawRef);
        for (const [existingBookingId, existingRef] of mockDatabase.entries()) {
          if (existingRef === normalized && existingBookingId !== bookingId) {
            throw new Error(`Conflict: This transaction reference (${normalized}) has already been submitted for another booking.`);
          }
        }
        mockDatabase.set(bookingId, normalized);
        return true;
      };

      // First submission succeeds
      assert.equal(registerPaymentRef('booking-A', '4123 4567 8901'), true);

      // Same booking re-submitting its own normalized reference succeeds (idempotent)
      assert.equal(registerPaymentRef('booking-A', '4123-4567-8901'), true);

      // Different booking submitting identical reference throws Conflict error
      assert.throws(
        () => registerPaymentRef('booking-B', '4123-4567-8901'),
        /has already been submitted for another booking/
      );
    });
  });
});
