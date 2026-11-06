import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpirationDate,
  buildPlatformUpiUri,
  formatValidityDate,
  calculateSubscriptionPlans,
} from '../controllers/subscriptionController.js';

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

    it('should format validity date in the exact "1 June 27" format', () => {
      const date1 = new Date(2027, 5, 1); // June is month index 5
      assert.strictEqual(formatValidityDate(date1), '1 June 27');

      const date2 = new Date(2026, 11, 1); // Dec is month index 11
      assert.strictEqual(formatValidityDate(date2), '1 December 26');
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

  describe('Statement 12-Digit UTR Extraction & Reconciliation Matching', () => {
    it('should extract all unique 12-digit numeric UTRs from a bank statement CSV/text', () => {
      const statementSample = `
        Date,Description,Amount,Reference / UTR
        01-Nov-2026,UPI/CR/987654321098/Payment from Guest,200.00,987654321098
        01-Nov-2026,UPI/CR/888888888888/Subscription Host,600.00,888888888888
        01-Nov-2026,Duplicate line with same UTR,600.00,888888888888
        01-Nov-2026,Random reference 123456 or phone 98765432109876 (14 digits) or short 9999
        01-Nov-2026,Another valid UTR: 112233445566 in remarks,1200.00,
      `;

      const utrRegex = /(?:^|[^0-9])([0-9]{12})(?![0-9])/g;
      const matches = [...statementSample.matchAll(utrRegex)].map((m) => m[1]);
      const uniqueUtrs = Array.from(new Set(matches));

      // Should extract 987654321098, 888888888888, 112233445566
      assert.deepStrictEqual(uniqueUtrs, ['987654321098', '888888888888', '112233445566']);
      // Should NOT include 14-digit number or short 4/6-digit numbers
      assert.ok(!uniqueUtrs.includes('98765432109876'));
      assert.ok(!uniqueUtrs.includes('123456'));
      assert.ok(!uniqueUtrs.includes('9999'));
    });

    it('should correctly match and sort bank statement UTRs putting matched requests at the top', () => {
      const extracted = ['111111111111', '888888888888', '222222222222'];
      const hostRequests = [
        { id: 'req_1', transactionRef: '888888888888', status: 'PENDING' }
      ];

      const reconciliationList = extracted.map(utr => {
        const matched = hostRequests.find(r => r.transactionRef === utr);
        return { utr, matchedRequest: matched || null };
      });

      // Sort matched to top
      const sorted = [...reconciliationList].sort((a, b) => {
        const aHas = Boolean(a.matchedRequest);
        const bHas = Boolean(b.matchedRequest);
        if (aHas === bHas) return 0;
        return aHas ? -1 : 1;
      });

      assert.strictEqual(sorted[0].utr, '888888888888');
      assert.ok(sorted[0].matchedRequest !== null);
      assert.ok(sorted[1].matchedRequest === null);
      assert.ok(sorted[2].matchedRequest === null);
    });
  });

  describe('Dynamic Room-Based Pricing & Discounts Matrix', () => {
    it('should calculate correct plans for PG with 10 rooms (10rs/room/mo, 100/mo, 285 3-mo, 540 6-mo)', () => {
      const result = calculateSubscriptionPlans({
        propertyType: 'PG',
        roomCount: 10,
      });

      assert.strictEqual(result.propertyType, 'PG');
      assert.strictEqual(result.roomCount, 10);
      assert.strictEqual(result.ratePerRoom, 10);
      assert.strictEqual(result.monthlyBase, 100);

      const [monthly, quarterly, halfYearly] = result.plans;

      // 1 Month: 10 * 10 = 100 (0% discount)
      assert.strictEqual(monthly.code, 'monthly');
      assert.strictEqual(monthly.price, 100);
      assert.strictEqual(monthly.durationMonths, 1);
      assert.strictEqual(monthly.discountPercent, 0);

      // 3 Months: 100 * 3 = 300 - 5% = 285
      assert.strictEqual(quarterly.code, 'quarterly');
      assert.strictEqual(quarterly.price, 285);
      assert.strictEqual(quarterly.durationMonths, 3);
      assert.strictEqual(quarterly.discountPercent, 5);

      // 6 Months: 100 * 6 = 600 - 10% = 540
      assert.strictEqual(halfYearly.code, 'halfYearly');
      assert.strictEqual(halfYearly.price, 540);
      assert.strictEqual(halfYearly.durationMonths, 6);
      assert.strictEqual(halfYearly.discountPercent, 10);
    });

    it('should calculate correct plans for Hotel with 10 rooms (50rs/room/mo, 500/mo, 1425 3-mo, 2700 6-mo)', () => {
      const result = calculateSubscriptionPlans({
        propertyType: 'Hotel',
        roomCount: 10,
      });

      assert.strictEqual(result.propertyType, 'Hotel');
      assert.strictEqual(result.roomCount, 10);
      assert.strictEqual(result.ratePerRoom, 50);
      assert.strictEqual(result.monthlyBase, 500);

      const [monthly, quarterly, halfYearly] = result.plans;

      // 1 Month: 10 * 50 = 500
      assert.strictEqual(monthly.price, 500);

      // 3 Months: 500 * 3 = 1500 - 5% = 1425
      assert.strictEqual(quarterly.price, 1425);

      // 6 Months: 500 * 6 = 3000 - 10% = 2700
      assert.strictEqual(halfYearly.price, 2700);
    });

    it('should calculate correct plans with custom admin rates and custom discounts', () => {
      const customRates = {
        PG: 12,
        Hotel: 60,
        Hostel: 20,
        Villa: 45,
        Resort: 55,
        Flat: 30,
      };
      const customDiscounts = {
        quarterly: 8,
        halfYearly: 15,
      };

      const result = calculateSubscriptionPlans({
        propertyType: 'Hostel',
        roomCount: 5,
        propertyPricing: customRates,
        discounts: customDiscounts,
      });

      // 5 rooms * 20 = 100/mo
      assert.strictEqual(result.ratePerRoom, 20);
      assert.strictEqual(result.monthlyBase, 100);

      const [monthly, quarterly, halfYearly] = result.plans;
      // 1 mo = 100
      assert.strictEqual(monthly.price, 100);
      // 3 mo = 300 - 8% = 276
      assert.strictEqual(quarterly.price, 276);
      // 6 mo = 600 - 15% = 510
      assert.strictEqual(halfYearly.price, 510);
    });
  });
});


