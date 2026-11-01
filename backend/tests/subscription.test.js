import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateExpirationDate, buildPlatformUpiUri } from '../controllers/subscriptionController.js';

describe('Host Subscription System Tests', () => {
  describe('UPI URI Generator for Platform Plans', () => {
    it('should generate a valid UPI URI with platform UPI ID, payee name, and amount', () => {
      const uri = buildPlatformUpiUri({
        upiId: 'platform@upi',
        payeeName: 'Room Scout Admin',
        amount: 600,
        hostNote: 'Host Subscription',
      });

      assert.ok(uri.startsWith('upi://pay?'));
      assert.ok(uri.includes('pa=platform%40upi') || uri.includes('pa=platform@upi'));
      assert.ok(uri.includes('pn=Room+Scout+Admin') || uri.includes('pn=Room%20Scout%20Admin'));
      assert.ok(uri.includes('am=600'));
      assert.ok(uri.includes('cu=INR'));
    });

    it('should return empty string if no UPI ID is provided', () => {
      const uri = buildPlatformUpiUri({ upiId: '', payeeName: 'Admin', amount: 200 });
      assert.strictEqual(uri, '');
    });
  });

  describe('Subscription Expiration & Extension Calculations', () => {
    it('should correctly calculate 1 month expiration date', () => {
      const start = new Date(2026, 0, 15); // Jan 15, 2026
      const expiry = calculateExpirationDate(start, 1);
      assert.strictEqual(expiry.getMonth(), 1); // Feb
      assert.strictEqual(expiry.getFullYear(), 2026);
    });

    it('should correctly calculate 12 months (1 year) expiration date', () => {
      const start = new Date(2026, 0, 15); // Jan 15, 2026
      const expiry = calculateExpirationDate(start, 12);
      assert.strictEqual(expiry.getFullYear(), 2027);
      assert.strictEqual(expiry.getMonth(), 0); // Jan
    });

    it('should extend an active subscription from current expiry date instead of current time', () => {
      // Host has active plan expiring in 15 days
      const currentExpiry = new Date();
      currentExpiry.setDate(currentExpiry.getDate() + 15);

      const extendedExpiry = calculateExpirationDate(currentExpiry, 1);
      // Extended expiry must be greater than currentExpiry + 25 days
      const diffDays = (extendedExpiry.getTime() - currentExpiry.getTime()) / (1000 * 60 * 60 * 24);
      assert.ok(diffDays >= 28 && diffDays <= 32);
    });
  });

  describe('12-Digit UTR Format Enforcement', () => {
    const isValidUtr = (ref) => {
      const cleanRef = String(ref || '').trim().toUpperCase().replace(/[\s\-_]/g, '');
      return cleanRef.length === 12 && /^\d{12}$/.test(cleanRef);
    };

    it('should accept valid 12-digit numeric Indian bank UTR numbers', () => {
      assert.strictEqual(isValidUtr('412345678901'), true);
      assert.strictEqual(isValidUtr('  412345678901  '), true);
      assert.strictEqual(isValidUtr('4123-4567-8901'), true);
    });

    it('should reject malformed, alphanumeric, too short, or too long UTRs', () => {
      assert.strictEqual(isValidUtr(''), false);
      assert.strictEqual(isValidUtr('12345'), false);
      assert.strictEqual(isValidUtr('4123456789012'), false); // 13 digits
      assert.strictEqual(isValidUtr('41234567890'), false); // 11 digits
      assert.strictEqual(isValidUtr('41234567890A'), false); // Contains letter
      assert.strictEqual(isValidUtr('PAYTM1234567'), false);
    });
  });
});
