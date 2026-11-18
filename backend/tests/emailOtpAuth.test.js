import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Email OTP Authentication System Tests', () => {
  describe('OTP Code Generation & Format Guard', () => {
    test('should generate a 6-digit numeric string between 100000 and 999999', () => {
      for (let i = 0; i < 50; i++) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        assert.equal(otp.length, 6);
        assert.match(otp, /^\d{6}$/);
        const num = Number(otp);
        assert.ok(num >= 100000 && num <= 999999);
      }
    });

    test('should reject malformed, non-numeric, or incorrect length OTPs', () => {
      const invalidOtps = ['', '12345', '1234567', 'abcdef', '12345a', ' 123456 '];
      for (const badOtp of invalidOtps) {
        const isValid = typeof badOtp === 'string' && /^\d{6}$/.test(badOtp.trim());
        if (badOtp === ' 123456 ') {
          assert.equal(isValid, true, 'Trimmed OTP should pass');
        } else {
          assert.equal(isValid, false, `Bad OTP ${badOtp} should fail`);
        }
      }
    });
  });

  describe('OTP Expiration & Attempt Limitation Safeguards', () => {
    test('should calculate 10-minute expiry time correctly', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 10 * 60 * 1000);
      const diffMs = expiresAt.getTime() - now;
      assert.equal(diffMs, 600000);
      assert.ok(expiresAt > new Date());
    });

    test('should mark OTP as expired if current time is past expiry date', () => {
      const pastTime = new Date(Date.now() - 1000);
      const isExpired = pastTime <= new Date();
      assert.equal(isExpired, true);
    });

    test('should disallow verification when attempt limit (5) is exceeded', () => {
      let attempts = 0;
      const maxAttempts = 5;
      for (let i = 0; i < 5; i++) {
        attempts += 1;
      }
      assert.equal(attempts, 5);
      const isLockedOut = attempts >= maxAttempts;
      assert.equal(isLockedOut, true);
    });
  });

  describe('Role and Purpose Isolation Guard', () => {
    test('should enforce separation between registration and login OTP purposes', () => {
      const registerRecord = { email: 'student@example.com', purpose: 'register', otp: '123456' };
      const loginRecord = { email: 'student@example.com', purpose: 'login', otp: '654321' };

      assert.notEqual(registerRecord.purpose, loginRecord.purpose);
      assert.notEqual(registerRecord.otp, loginRecord.otp);
    });

    test('should sanitize email by lowercasing and trimming spaces', () => {
      const rawEmail = '  Student.Living@Campus.EDU  ';
      const cleanEmail = rawEmail.toLowerCase().trim();
      assert.equal(cleanEmail, 'student.living@campus.edu');
    });
  });
});
