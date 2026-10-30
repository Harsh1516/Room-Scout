import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client = null;
let isClientReady = false;
let latestQr = null;

/**
 * Automatically locate system Google Chrome or Microsoft Edge executable on Windows/Linux/macOS
 */
function findSystemBrowserPath() {
  const customBin = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (customBin && fs.existsSync(customBin)) return customBin;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Format any phone number input into WhatsApp standard JID (<countryCode><number>@c.us)
 * Handles: +91 98765 43210, 9876543210, 09876543210, 919876543210
 */
export function formatWhatsAppJid(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // Indian standard 10-digit mobile number
  if (digits.length === 10) {
    return `91${digits}@c.us`;
  }
  // 12-digit number starting with 91 (India)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `${digits}@c.us`;
  }
  // 11-digit number with leading 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}@c.us`;
  }
  // International E.164 without leading plus
  if (digits.length >= 10 && digits.length <= 15) {
    return `${digits}@c.us`;
  }
  return null;
}

/**
 * Formats canonical human-readable dates for WhatsApp messages
 */
function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

/**
 * Resolves human-readable stay duration (e.g. "2 Months", "3 Nights")
 */
export function resolveDuration(booking = {}, extra = {}) {
  const direct =
    booking?.durationDisplay ||
    extra?.durationDisplay ||
    booking?.duration ||
    extra?.duration;

  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  if (Array.isArray(booking?.bookedMonths) && booking.bookedMonths.length > 0) {
    const count = booking.bookedMonths.length;
    return `${count} Month${count > 1 ? 's' : ''}`;
  }

  if (Array.isArray(booking?.bookedDates) && booking.bookedDates.length > 0) {
    const count = booking.bookedDates.length;
    return `${count} Night${count > 1 ? 's' : ''}`;
  }

  const inVal = booking?.checkIn || extra?.checkIn;
  const outVal = booking?.checkOut || extra?.checkOut;
  if (inVal && outVal) {
    const inD = new Date(inVal);
    const outD = new Date(outVal);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
      const isMonthly = booking?.rateUnit === '/month' || (!booking?.rateUnit && diffDays >= 27);
      if (isMonthly) {
        const months = Math.max(
          1,
          (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 + (outD.getUTCMonth() - inD.getUTCMonth())
        );
        return `${months} Month${months > 1 ? 's' : ''}`;
      }
      return `${diffDays} Night${diffDays > 1 ? 's' : ''}`;
    }
  }

  return '1 Month';
}

/**
 * Build beautifully styled WhatsApp message content with emojis & clear formatting
 */
export function buildWhatsAppMessage(booking, eventType, extra = {}) {
  const guestName = (booking?.fullName || booking?.guestName || extra?.guestName || 'Guest').trim();
  const stayTitle = booking?.stayTitle || extra?.stayTitle || 'RoomScout Stay';
  const location = booking?.location || extra?.location || 'Campus Area';
  const roomNumber = booking?.roomNumber || extra?.roomNumber || 'Room';
  const roomType = booking?.roomType || extra?.roomType || 'Standard';
  const rawRef = booking?.bookingReferenceId || booking?._id?.toString() || extra?.bookingReferenceId || 'RS-RES';
  const bookingReferenceId = String(rawRef).startsWith('#') ? rawRef : `#${rawRef}`;
  const totalAmount = booking?.totalAmount ?? extra?.totalAmount ?? 0;
  const duration = resolveDuration(booking, extra);

  const checkIn = formatDate(booking?.checkIn || extra?.checkIn);
  const checkOut = formatDate(booking?.checkOut || extra?.checkOut);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const checkoutUrl = `${clientUrl}/account`;

  switch (eventType) {
    case 'BOOKING_PENDING':
      return [
        `🏨 *RoomScout Reservation Request*`,
        `Hello *${guestName}*, your reservation request is received:`,
        `📋 *Booking Ref:* ${bookingReferenceId}`,
        `🏡 *Property:* ${stayTitle}`,
        `📍 *Location:* ${location}`,
        `🚪 *Room:* ${roomNumber} (${roomType})`,
        `🗓 *Check-in:* ${checkIn}`,
        `🗓 *Check-out:* ${checkOut}`,
        `⏳ *Duration:* ${duration}`,
        `💰 *Estimated Total:* ₹${Number(totalAmount).toLocaleString('en-IN')}`,
        `Host notified. We'll alert you once approved! ✨`,
      ].join('\n');

    case 'PAYMENT_PENDING':
      return [
        `🎉 *Booking Request Approved!*`,
        `Hello *${guestName}*, host accepted your request for *${stayTitle}*:`,
        `📋 *Booking Ref:* ${bookingReferenceId}`,
        `🚪 *Room:* ${roomNumber} (${roomType})`,
        `🗓 *Dates:* ${checkIn} → ${checkOut}`,
        `⏳ *Duration:* ${duration}`,
        `💰 *Payable Amount:* ₹${Number(totalAmount).toLocaleString('en-IN')}`,
        `⏰ *Payment Window:* 5 Minutes`,
        `🔗 *Pay Now:* ${checkoutUrl}`,
        `Complete payment within 5 mins to lock your room.`,
      ].join('\n');

    case 'BOOKING_CONFIRMED':
      return [
        `✅ *Booking Confirmed!*`,
        `Hello *${guestName}*, your reservation is confirmed:`,
        `📋 *Booking Ref:* ${bookingReferenceId}`,
        `🏡 *Property:* ${stayTitle}`,
        `📍 *Location:* ${location}`,
        `🚪 *Room:* ${roomNumber} (${roomType})`,
        `🗓 *Check-in:* ${checkIn}`,
        `🗓 *Check-out:* ${checkOut}`,
        `⏳ *Duration:* ${duration}`,
        `💰 *Amount Paid:* ₹${Number(totalAmount).toLocaleString('en-IN')}`,
        `💳 *Payment Status:* Paid & Verified`,
        `Show this pass at check-in. Have a wonderful stay! 🌟`,
      ].join('\n');

    case 'BOOKING_REJECTED':
      return [
        `❌ *Booking Request Update*`,
        `Hello *${guestName}*, your booking request for *${stayTitle}* (Room ${roomNumber}) could not be accepted for the selected dates.`,
        `Any hold has been released. Explore other stays: ${clientUrl}`,
      ].join('\n');

    case 'BOOKING_EXPIRED':
      return [
        `⏰ *Payment Window Expired*`,
        `Hello *${guestName}*, the payment window for *${stayTitle}* (Ref: ${bookingReferenceId}) has expired.`,
        `The room slot has been released. Book again: ${clientUrl}`,
      ].join('\n');

    default:
      return `Notification from RoomScout for reservation ${bookingReferenceId}.`;
  }
}

/**
 * Initialize WhatsApp Web Client with LocalAuth session caching
 */
export function initWhatsAppClient() {
  const isEnabled = process.env.ENABLE_WHATSAPP !== 'false';
  if (!isEnabled) {
    console.log('ℹ️ WhatsApp Automation is disabled (ENABLE_WHATSAPP=false).');
    return null;
  }

  if (client) return client;

  try {
    const executablePath = findSystemBrowserPath();
    console.log(`📱 Initializing WhatsApp Web Automation Client... [Browser: ${executablePath || 'bundled'}]`);

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '../.wwebjs_auth'),
      }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr) => {
      latestQr = qr;
      console.log('\n======================================================');
      console.log('📱 SCAN THIS QR CODE IN WHATSAPP TO CONNECT ROOMSCOUT:');
      console.log('   (WhatsApp on phone > Settings/Menu > Linked Devices > Link a Device)');
      console.log('======================================================\n');
      try {
        qrcode.generate(qr, { small: true });
      } catch (err) {
        console.error('Error rendering QR code terminal:', err.message);
      }
    });

    client.on('ready', () => {
      isClientReady = true;
      latestQr = null;
      console.log('🟢 WhatsApp Web Client is CONNECTED and ready to send automated messages!');
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp session authenticated successfully.');
    });

    client.on('auth_failure', (err) => {
      console.error('❌ WhatsApp Web authentication failure:', err);
    });

    client.on('disconnected', (reason) => {
      isClientReady = false;
      console.warn('⚠️ WhatsApp client disconnected:', reason);
    });

    client.initialize().catch((err) => {
      console.error('WhatsApp Web client initialization error:', err.message);
    });

    return client;
  } catch (err) {
    console.error('Failed to start WhatsApp Web client:', err.message);
    return null;
  }
}

/**
 * Non-blocking, fail-safe dispatcher for sending WhatsApp alerts
 * Guaranteed to NEVER crash or block caller execution.
 */
export async function sendWhatsAppNotification(booking, eventType, extra = {}) {
  const isEnabled = process.env.ENABLE_WHATSAPP !== 'false';
  const phone = booking?.phone || booking?.guestPhone || extra?.phone;

  if (!isEnabled) {
    console.log(`[WhatsApp Mock: ${eventType}] to ${phone} -> Alert skipped (ENABLE_WHATSAPP=false).`);
    return { success: true, mock: true };
  }

  if (!isClientReady || !client) {
    console.warn(
      `[WhatsApp Notice: ${eventType}] Client is not connected yet (Scan QR to activate). Message skipped for phone: ${phone}.`
    );
    return { success: false, reason: 'Client not ready' };
  }

  const jid = formatWhatsAppJid(phone);
  if (!jid) {
    console.warn(`[WhatsApp Warning] Cannot send message - invalid phone number format: "${phone}"`);
    return { success: false, reason: 'Invalid phone format' };
  }

  try {
    const messageText = buildWhatsAppMessage(booking, eventType, extra);
    const sent = await client.sendMessage(jid, messageText);
    console.log(`📨 WhatsApp [${eventType}] successfully delivered to ${jid} (Message ID: ${sent.id?._serialized})`);
    return { success: true, messageId: sent.id?._serialized };
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp notification [${eventType}] to ${jid}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Returns current status of WhatsApp service
 */
export function getWhatsAppStatus() {
  return {
    enabled: process.env.ENABLE_WHATSAPP !== 'false',
    isClientReady,
    hasPendingQr: Boolean(latestQr),
  };
}
