import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Host Revenue and Checkout Profit Protection', () => {
  it('should not reduce or reset revenue when bookings transition to CHECKED_OUT or COMPLETED', () => {
    const bookings = [
      { id: 'b1', totalAmount: 4500, status: 'CHECKED_IN', paymentStatus: 'PAID', bookingSource: 'ONLINE' },
      { id: 'b2', totalAmount: 3000, status: 'CHECKED_OUT', paymentStatus: 'PAID', bookingSource: 'ONLINE' },
      { id: 'b3', totalAmount: 2500, status: 'COMPLETED', paymentStatus: 'PAID', bookingSource: 'OFFLINE_HOST' },
      { id: 'b4', totalAmount: 1000, status: 'CANCELLED', paymentStatus: 'FAILED', bookingSource: 'ONLINE' },
    ];

    // Filter valid paid revenue records
    const validPaidBookings = bookings.filter((b) => {
      const st = b.status.toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED') return false;
      return b.paymentStatus === 'PAID';
    });

    assert.equal(validPaidBookings.length, 3);
    const totalRevenue = validPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    assert.equal(totalRevenue, 10000, 'Checked-out and completed stays must maintain host revenue');
  });

  it('should calculate reset revenue by subtracting baseline amounts and preventing negative numbers', () => {
    const rawOnline = 7500;
    const rawOffline = 2500;
    const rawTotal = 10000;

    const resetSettings = {
      resetAt: new Date().toISOString(),
      baselineTotal: 10000,
      baselineOnline: 7500,
      baselineOffline: 2500,
    };

    // Right after reset:
    const onlineAfterReset = Math.max(0, rawOnline - resetSettings.baselineOnline);
    const offlineAfterReset = Math.max(0, rawOffline - resetSettings.baselineOffline);
    const totalAfterReset = Math.max(0, rawTotal - resetSettings.baselineTotal);

    assert.equal(onlineAfterReset, 0);
    assert.equal(offlineAfterReset, 0);
    assert.equal(totalAfterReset, 0);

    // After a new booking comes in for 3,000 online:
    const newRawOnline = rawOnline + 3000;
    const newRawTotal = rawTotal + 3000;

    const updatedOnline = Math.max(0, newRawOnline - resetSettings.baselineOnline);
    const updatedTotal = Math.max(0, newRawTotal - resetSettings.baselineTotal);

    assert.equal(updatedOnline, 3000);
    assert.equal(updatedTotal, 3000);
  });

  it('should restore all-time revenue when reset settings are cleared', () => {
    const rawTotal = 13000;
    let resetSettings = {
      resetAt: new Date().toISOString(),
      baselineTotal: 10000,
    };

    let visibleTotal = resetSettings ? Math.max(0, rawTotal - resetSettings.baselineTotal) : rawTotal;
    assert.equal(visibleTotal, 3000);

    // Host clicks 'Restore All-Time'
    resetSettings = null;
    visibleTotal = resetSettings ? Math.max(0, rawTotal - resetSettings.baselineTotal) : rawTotal;
    assert.equal(visibleTotal, 13000);
  });
});
