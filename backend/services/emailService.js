import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let cachedTransporter = null;

// Initialize or return Nodemailer Transporter
async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = Number(process.env.EMAIL_PORT) || 587;

  // 1. If real SMTP credentials are provided in .env
  if (emailUser && emailPass) {
    if (emailHost.includes('gmail') || emailUser.endsWith('@gmail.com')) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser.trim(),
          pass: emailPass.trim().replace(/\s+/g, ''), // Strip spaces from 16-char app password if present
        },
      });
      console.log(`📧 Configured Gmail Service Transporter for [${emailUser}]`);
    } else {
      cachedTransporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
          user: emailUser.trim(),
          pass: emailPass.trim(),
        },
      });
      console.log(`📧 Configured Real SMTP Email Transporter for [${emailUser}] on ${emailHost}:${emailPort}`);
    }
    return cachedTransporter;
  }

  // 2. Otherwise create an automatic Ethereal SMTP test account for instant testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Generated Ethereal Test Email Account: [${testAccount.user}]`);
    return cachedTransporter;
  } catch (err) {
    console.warn('Could not initialize ethereal email account:', err.message);
    // Fallback stub transporter
    return null;
  }
}

/**
 * Universal Production Email Dispatcher
 * Seamlessly routes between:
 * 1. Resend API (RESEND_API_KEY)
 * 2. Brevo API (BREVO_API_KEY)
 * 3. Nodemailer SMTP (Gmail / Custom SMTP)
 * 4. Ethereal sandbox / simulator fallback
 */
export async function sendRawMail({ from, to, subject, html, text }) {
  const fromAddress =
    from ||
    process.env.EMAIL_FROM ||
    (process.env.EMAIL_USER ? `"Stay In" <${process.env.EMAIL_USER}>` : '"Stay In" <noreply@stayin.com>');

  // 1. Resend API (Direct REST HTTPS)
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress.includes('<') ? fromAddress : `"Stay In" <${fromAddress}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend error status ${res.status}`);
      }
      console.log(`✅ [Resend API] Real Email dispatched to [${to}] (ID: ${data.id})`);
      return { success: true, messageId: data.id, provider: 'Resend' };
    } catch (resendErr) {
      console.warn('⚠️ Resend API attempt failed, trying fallback transporter:', resendErr.message);
    }
  }

  // 2. Brevo API (Direct REST HTTPS)
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoKey) {
    try {
      const senderEmail = process.env.EMAIL_USER || 'noreply@stayin.com';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Stay In', email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Brevo error status ${res.status}`);
      }
      console.log(`✅ [Brevo API] Real Email dispatched to [${to}] (ID: ${data.messageId})`);
      return { success: true, messageId: data.messageId, provider: 'Brevo' };
    } catch (brevoErr) {
      console.warn('⚠️ Brevo API attempt failed, trying fallback transporter:', brevoErr.message);
    }
  }

  // 3. Nodemailer SMTP (Gmail / Custom SMTP / Ethereal)
  const transporter = await getTransporter();
  if (!transporter) {
    console.log(`[LOCAL EMAIL SIMULATOR] Email to: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`✅ [SMTP] Email dispatched to [${to}] (Message ID: ${info.messageId})`);
  if (previewUrl) {
    console.log(`🔗 Ethereal Live Email Inbox Preview URL: ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    provider: 'SMTP',
  };
}

/**
 * Send Password Reset Email with Fresh 10-Character Password
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User/Host name
 * @param {string} options.tempPassword - Generated 10-character password
 * @param {string} options.role - 'user' | 'host'
 */
export async function sendPasswordResetEmail({ to, name, tempPassword, role = 'user' }) {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const roleLabel = role === 'host' ? 'Host Partner' : 'Guest Member';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a; -webkit-font-smoothing: antialiased; }
        .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; }
        .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; text-decoration: none; }
        .brand-accent { color: #059669; }
        .badge { float: right; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; }
        .content { padding: 32px; }
        .greeting { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 10px; }
        .text { font-size: 14.5px; line-height: 1.65; color: #475569; margin-bottom: 22px; }
        .password-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
        .pass-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.06em; margin-bottom: 8px; }
        .password { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: 4px; }
        .btn-container { text-align: left; margin: 28px 0 20px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 13px 28px; border-radius: 8px; font-size: 13.5px; font-weight: 600; text-decoration: none; letter-spacing: -0.01em; }
        .notice { font-size: 12px; color: #64748b; line-height: 1.55; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px; margin-top: 24px; }
        .footer { background-color: #fcfcfd; padding: 22px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="brand">Stay <span class="brand-accent">In</span></span>
          <span class="badge">${roleLabel} • Password Recovery</span>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'there'},</div>
          <div class="text">
            We received a request to recover your account password for <strong>${to}</strong>. Your temporary password is provided below:
          </div>
          
          <div class="password-card">
            <div class="pass-label">Temporary Access Password</div>
            <div class="password">${tempPassword}</div>
          </div>
          
          <div class="text" style="font-size: 13.5px; color: #64748b;">
            Use this temporary password to sign in immediately. For optimal security, update your password under <strong>Account Settings &gt; Password</strong> after logging in.
          </div>

          <div class="btn-container">
            <a href="${clientUrl}" class="btn" target="_blank">Sign In to Stay In</a>
          </div>

          <div class="notice">
            If you did not request this password recovery, please ignore this email or reach out to our team if you have security concerns.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Stay In Student Living & PG Portals • Direct Account Notification
        </div>
      </div>
    </body>
    </html>
    `;

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Email to: ${to} | New Password: ${tempPassword}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `🔑 Your New Stay In Password (${tempPassword})`,
      text: `Hello ${name},\n\nYour new temporary password for Stay In is: ${tempPassword}\n\nLogin at: ${clientUrl}\n\nThank you,\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Email dispatched successfully to [${to}]! Message ID: ${info.messageId}`);

    // If ethereal test account was used, generate public preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Live Email Inbox Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    console.error(`❌ Failed to dispatch email to [${to}]:`, err.message);
    // Don't crash the server, return delivery status
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Diagnostic SMTP Tester: Verifies credentials & connection
 * @param {string} testEmail - Optional target email address to test delivery
 */
export async function testEmailConnection(testEmail = 'test@stayin.com') {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = Number(process.env.EMAIL_PORT) || 587;

    const isCustomSmtpConfigured = Boolean(emailUser && emailPass);
    const transporter = await getTransporter();

    if (!transporter) {
      return {
        success: false,
        configured: false,
        message: 'No SMTP transporter could be initialized. Please check backend/.env EMAIL_USER and EMAIL_PASS.',
      };
    }

    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();

    let activeProvider = 'Ethereal Sandbox';
    if (resendKey) activeProvider = 'Resend API';
    else if (brevoKey) activeProvider = 'Brevo API';
    else if (isCustomSmtpConfigured) activeProvider = emailHost.includes('gmail') ? 'Gmail SMTP' : 'Custom SMTP';

    const info = await sendRawMail({
      from: process.env.EMAIL_FROM || emailUser || '"Stay In Diagnostic" <noreply@stayin.com>',
      to: testEmail,
      subject: `Stay In Delivery Diagnostic (${activeProvider})`,
      text: `Your Stay In email delivery system is functioning properly!\n\nProvider: ${activeProvider}\nTimestamp: ${new Date().toISOString()}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a; -webkit-font-smoothing: antialiased; }
            .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; }
            .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; text-decoration: none; }
            .brand-accent { color: #059669; }
            .badge { float: right; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; }
            .content { padding: 32px; }
            .title { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin: 0 0 10px 0; }
            .subtitle { font-size: 14.5px; line-height: 1.65; color: #475569; margin: 0 0 24px 0; }
            .card { background-color: #fcfcfd; border: 1px solid #f1f5f9; border-radius: 10px; padding: 8px 18px; margin: 20px 0; }
            .footer { background-color: #fcfcfd; padding: 20px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="brand">Stay <span class="brand-accent">In</span></span>
              <span class="badge">Diagnostic Verified</span>
            </div>
            <div class="content">
              <div class="title">Email System Connected</div>
              <div class="subtitle">Your transactional email delivery pipeline is verified and delivering in real time.</div>
              <div class="card">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Active Provider</td>
                    <td style="padding: 10px 0; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${activeProvider}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Sender Account</td>
                    <td style="padding: 10px 0; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${emailUser || 'system-default'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-size: 12.5px; color: #64748b;">Dispatched At</td>
                    <td style="padding: 10px 0; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: right;">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                </table>
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Stay In System Diagnostics
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return {
      success: true,
      configured: activeProvider !== 'Ethereal Sandbox',
      transporterType: activeProvider,
      messageId: info.messageId,
      previewUrl: info.previewUrl || null,
      message: `${activeProvider} connected successfully! Test email dispatched to ${testEmail}.`,
    };
  } catch (error) {
    return {
      success: false,
      configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      error: error.message,
      message: `SMTP Connection failed: ${error.message}. Please verify your EMAIL_USER and EMAIL_PASS (use a 16-character Google App Password for Gmail).`,
    };
  }
}

/**
 * Executive HTML email wrapper for Stay In transactional messages
 */
function buildBrandedEmailHtml({ badgeText, title, subtitle, detailsRows = [], ctaText, ctaUrl, footerNote }) {
  const cleanBadge = (badgeText || '').replace(/^[^\w\s]+/, '').trim();
  const renderedRows = detailsRows
    .map(
      (row) => `
      <tr>
        <td style="padding: 10px 0; font-size: 12.5px; font-weight: 500; color: #64748b; border-bottom: 1px solid #f1f5f9; letter-spacing: 0.01em;">${row.label}</td>
        <td style="padding: 10px 0; font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${row.value}</td>
      </tr>
    `
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a; -webkit-font-smoothing: antialiased; }
      .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; }
      .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; text-decoration: none; }
      .brand-accent { color: #059669; }
      .badge { float: right; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; }
      .content { padding: 32px; }
      .title { font-size: 21px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.35; margin: 0 0 10px 0; }
      .subtitle { font-size: 14.5px; line-height: 1.65; color: #475569; margin: 0 0 24px 0; }
      .table-card { background-color: #fcfcfd; border: 1px solid #f1f5f9; border-radius: 10px; padding: 6px 18px; margin: 20px 0; }
      .btn-container { text-align: left; margin: 28px 0 20px 0; }
      .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 13px 28px; border-radius: 8px; font-size: 13.5px; font-weight: 600; text-decoration: none; letter-spacing: -0.01em; }
      .footer-note { font-size: 12px; color: #64748b; line-height: 1.55; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-top: 24px; }
      .footer { background-color: #fcfcfd; padding: 22px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="brand">Stay <span class="brand-accent">In</span></span>
        ${cleanBadge ? `<span class="badge">${cleanBadge}</span>` : ''}
      </div>
      <div class="content">
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle}</div>
        
        ${
          detailsRows.length > 0
            ? `
          <div class="table-card">
            <table style="width: 100%; border-collapse: collapse;">
              ${renderedRows}
            </table>
          </div>
        `
            : ''
        }

        ${
          ctaText && ctaUrl
            ? `
          <div class="btn-container">
            <a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a>
          </div>
        `
            : ''
        }

        ${footerNote ? `<div class="footer-note">${footerNote}</div>` : ''}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Stay In Student Living & PG Portals • Direct Verified Notification
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * 1. Send Booking Request Email to Host (Fired when user clicks 'Confirm & Book')
 */
export async function sendBookingRequestToHostEmail({
  hostEmail,
  hostName = 'Host Partner',
  guestName,
  guestPhone,
  guestEmail,
  stayTitle,
  roomNumber,
  roomType = 'Standard',
  totalAmount,
  durationDisplay,
  checkIn,
  checkOut,
  bookingId,
  bookingReferenceId,
}) {
  if (!hostEmail) return { success: false, reason: 'No host email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const hostDashboardUrl = `${clientUrl}/host-dashboard`;

    const formatD = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A');

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Action Required: New Booking Request',
      title: `Hello ${hostName}, you have a new booking request!`,
      subtitle: `Guest <strong>${guestName}</strong> has requested to book <strong>Room ${roomNumber} (${roomType})</strong> at <strong>${stayTitle}</strong>. Please review their details and approve or decline the reservation.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Guest Name', value: guestName },
        { label: 'Guest Phone', value: guestPhone || 'Not provided' },
        { label: 'Guest Email', value: guestEmail || 'Not provided' },
        { label: 'Stay / Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber} (${roomType})` },
        { label: 'Stay Duration', value: durationDisplay || `${formatD(checkIn)} - ${formatD(checkOut)}` },
        { label: 'Total Amount', value: `₹${Number(totalAmount || 0).toLocaleString('en-IN')}` },
      ],
      ctaText: 'Review & Approve Request',
      ctaUrl: hostDashboardUrl,
      footerNote: 'Approving this request will notify the guest to complete payment within their allotted window.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Host booking request alert dispatched to: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `New Booking Request: Room ${roomNumber} at ${stayTitle} (${bookingReferenceId || bookingId})`,
      text: `Hello ${hostName},\n\nYou have received a new booking request for Room ${roomNumber} at ${stayTitle} from ${guestName}.\nTotal: ₹${totalAmount}\n\nReview & Approve at: ${hostDashboardUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Host Booking Alert dispatched to [${hostEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send host booking alert to [${hostEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Send Booking Submitted Confirmation Email to Guest (Fired when user clicks 'Confirm & Book')
 */
export async function sendBookingSubmittedToGuestEmail({
  guestEmail,
  guestName,
  stayTitle,
  roomNumber,
  totalAmount,
  bookingId,
  bookingReferenceId,
}) {
  if (!guestEmail) return { success: false, reason: 'No guest email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const bookingUrl = `${clientUrl}/booking/${bookingId}`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Request Received: Pending Host Review',
      title: `Booking Request Submitted, ${guestName}!`,
      subtitle: `Your booking request for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong> has been sent to the property host. We will notify you by email the moment the host approves your slot so you can proceed to payment.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Property', value: stayTitle },
        { label: 'Room Number', value: `Room ${roomNumber}` },
        { label: 'Total Amount', value: `₹${Number(totalAmount || 0).toLocaleString('en-IN')}` },
        { label: 'Current Status', value: 'Pending Host Approval' },
      ],
      ctaText: 'View Booking Status',
      ctaUrl: bookingUrl,
      footerNote: 'You will receive a direct notification link as soon as your slot is approved by the host.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking submitted alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `Booking Request Received: ${stayTitle} (${bookingReferenceId || bookingId})`,
      text: `Hello ${guestName},\n\nYour booking request for Room ${roomNumber} at ${stayTitle} is pending host approval.\n\nTrack status: ${bookingUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Guest Submission Alert dispatched to [${guestEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send guest booking submitted alert to [${guestEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Send Booking Approved Email to Guest (Fired when host clicks 'Approve')
 */
export async function sendBookingApprovedToGuestEmail({
  guestEmail,
  guestName,
  stayTitle,
  roomNumber,
  totalAmount,
  paymentDeadline,
  bookingId,
  bookingReferenceId,
  bookingUrl: customBookingUrl,
}) {
  if (!guestEmail) return { success: false, reason: 'No guest email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const bookingUrl = customBookingUrl || `${clientUrl}/booking/${bookingId}`;

    const deadlineTime = paymentDeadline
      ? new Date(paymentDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : null;
    const deadlineText = deadlineTime ? `10 minutes (before ${deadlineTime})` : '10 minutes';

    const htmlContent = buildBrandedEmailHtml({
      badgeText: '🎉 Slot Accepted: Payment Required',
      title: `Slot Accepted: Complete Payment for Room ${roomNumber}`,
      subtitle: `Great news, ${guestName}! The host has accepted your slot request for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong>. Please complete your direct payment of <strong>₹${Number(totalAmount || 0).toLocaleString('en-IN')}</strong> within <strong>10 minutes</strong> (${deadlineText}) to secure your booking.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber}` },
        { label: 'Amount Due', value: `₹${Number(totalAmount || 0).toLocaleString('en-IN')}` },
        { label: 'Time Limit', value: '10 Minutes' },
        { label: 'Payment Deadline', value: deadlineText },
      ],
      ctaText: 'Complete Payment via UPI QR Code',
      ctaUrl: bookingUrl,
      footerNote: 'Please complete payment and submit your 12-digit UPI transaction reference (UTR) within the 10-minute window before the slot expires.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking approved alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `Slot Accepted: Pay within 10 Minutes for ${stayTitle} (Room ${roomNumber})`,
      text: `Hello ${guestName},\n\nYour room slot request for Room ${roomNumber} at ${stayTitle} has been accepted by the host!\nPlease complete payment (₹${totalAmount}) within 10 minutes (${deadlineText}).\n\nInstant Payment Link: ${bookingUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Guest Approval Alert dispatched to [${guestEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send guest booking approved alert to [${guestEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Send Booking Rejected Email to Guest (Fired when host clicks 'Reject')
 */
export async function sendBookingRejectedToGuestEmail({
  guestEmail,
  guestName,
  stayTitle,
  roomNumber,
  bookingReferenceId,
}) {
  if (!guestEmail) return { success: false, reason: 'No guest email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Booking Declined',
      title: 'Booking Request Declined',
      subtitle: `Hello ${guestName}, the host was unable to accept your booking request for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong> for your selected dates.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || 'N/A' },
        { label: 'Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber}` },
        { label: 'Status', value: 'Declined by Host' },
      ],
      ctaText: 'Explore Other Available Stays',
      ctaUrl: clientUrl,
      footerNote: 'You have not been charged. Browse hundreds of verified student PGs and apartments on Stay In.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking declined alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `Booking Request Declined: ${stayTitle} (${bookingReferenceId})`,
      text: `Hello ${guestName},\n\nThe host was unable to accept your booking for Room ${roomNumber} at ${stayTitle}.\n\nExplore other stays: ${clientUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Guest Rejection Alert dispatched to [${guestEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send guest booking rejected alert to [${guestEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Send Booking Confirmed Email to Guest (Fired when payment is verified and confirmed)
 */
export async function sendBookingConfirmedEmail({
  guestEmail,
  guestName,
  stayTitle,
  roomNumber,
  totalAmount,
  checkInCode,
  bookingId,
  bookingReferenceId,
}) {
  if (!guestEmail) return { success: false, reason: 'No guest email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const bookingUrl = `${clientUrl}/booking/${bookingId}`;

    const cleanPassDigits = String(checkInCode || '').replace(/\s+/g, '');
    const formattedPassCode = /^\d{8}$/.test(cleanPassDigits)
      ? `${cleanPassDigits.slice(0, 4)} ${cleanPassDigits.slice(4)}`
      : (checkInCode || '');

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Booking Confirmed',
      title: `Reservation Confirmed, ${guestName}!`,
      subtitle: `Your payment has been verified by the host. Your reservation for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong> is locked. Keep your check-in code handy upon arrival.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Check-In Pass Code', value: formattedPassCode || 'Issued on Pass' },
        { label: 'Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber}` },
        { label: 'Amount Paid', value: `₹${Number(totalAmount || 0).toLocaleString('en-IN')}` },
        { label: 'Status', value: 'Confirmed & Active' },
      ],
      ctaText: 'View Resident ID Pass',
      ctaUrl: bookingUrl,
      footerNote: 'Present your Check-In Pass or Booking Reference when arriving at the property.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking confirmed alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `Booking Confirmed: Your Stay at ${stayTitle} (Code: ${formattedPassCode || 'Verified'})`,
      text: `Hello ${guestName},\n\nYour booking for Room ${roomNumber} at ${stayTitle} is confirmed!\nCheck-In Code: ${formattedPassCode}\n\nView Pass: ${bookingUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Guest Confirmation Alert dispatched to [${guestEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send guest booking confirmed alert to [${guestEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send 6-Digit Email Verification OTP for Registration / Login
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User/Host name
 * @param {string} options.otp - 6-digit verification code
 * @param {string} options.purpose - 'Registration' | 'Login'
 * @param {string} options.role - 'user' | 'host'
 */
export async function sendEmailVerificationOtp({ to, name, otp, purpose = 'Verification', role = 'user' }) {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Security" <noreply@stayin.com>';
    const roleLabel = role === 'host' ? 'Host Partner' : 'Guest Member';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a; -webkit-font-smoothing: antialiased; }
        .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; }
        .brand { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; text-decoration: none; }
        .brand-accent { color: #059669; }
        .badge { float: right; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; }
        .content { padding: 32px; }
        .greeting { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 10px; }
        .text { font-size: 14.5px; line-height: 1.65; color: #475569; margin-bottom: 22px; }
        .otp-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.06em; margin-bottom: 8px; }
        .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 700; color: #0f172a; letter-spacing: 8px; }
        .expiry-note { font-size: 12px; font-weight: 500; color: #64748b; margin-top: 8px; }
        .security-box { background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #64748b; line-height: 1.55; margin-top: 24px; }
        .footer { background-color: #fcfcfd; padding: 22px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="brand">Stay <span class="brand-accent">In</span></span>
          <span class="badge">${roleLabel} • Verification</span>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'there'},</div>
          <div class="text">
            Use the 6-digit verification code below to complete your <strong>${purpose}</strong> on Stay In:
          </div>
          
          <div class="otp-card">
            <div class="otp-label">Security Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-note">Expires in 10 minutes</div>
          </div>
          
          <div class="text" style="font-size: 13.5px; color: #64748b;">
            Enter this code into your Stay In prompt to verify your account email address (<strong>${to}</strong>).
          </div>

          <div class="security-box">
            Never share this verification code with anyone. Stay In staff will never ask for your code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Stay In Student Living & PG Portals • Direct Security Notification
        </div>
      </div>
    </body>
    </html>
    `;

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Email OTP for [${to}] (${purpose}): ${otp}`);
      return { success: true, simulated: true, otp };
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `Verification Code: ${otp}`,
      text: `Hello ${name},\n\nYour 6-digit verification code for Stay In ${purpose} is: ${otp}\n\nThis code expires in 10 minutes.\n\nThank you,\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real OTP Email dispatched to [${to}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, otp };
  } catch (err) {
    console.error(`❌ Failed to send OTP email to [${to}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Send Subscription Request Email to Admin (Fired when host submits plan payment)
 */
export async function sendSubscriptionRequestToAdminEmail({
  hostName,
  hostEmail,
  hostPhone,
  stayTitle,
  planLabel,
  durationMonths,
  amount,
  transactionRef,
  startMonthLabel,
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return { success: false, reason: 'No admin email configured' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Admin" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const adminUrl = `${clientUrl}/admin`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'New Subscription Payment',
      title: 'Host Subscription Payment Submitted',
      subtitle: `Host <strong>${hostName}</strong> has submitted a UPI payment of <strong>₹${Number(amount || 0).toLocaleString('en-IN')}</strong> for property <strong>${stayTitle || 'Listing'}</strong>. Please verify the 12-digit UTR against your bank statement records.`,
      detailsRows: [
        { label: 'Host Name', value: hostName },
        { label: 'Host Email', value: hostEmail || 'N/A' },
        { label: 'Host Phone', value: hostPhone || 'N/A' },
        { label: 'Property / Stay', value: stayTitle || 'General Host Account' },
        { label: 'Subscription Plan', value: planLabel || `${durationMonths} Month(s)` },
        { label: 'Plan Duration', value: `${durationMonths} Month(s)` },
        { label: 'Amount Paid', value: `₹${Number(amount || 0).toLocaleString('en-IN')}` },
        { label: '12-Digit UTR', value: transactionRef },
        { label: 'Validity Schedule', value: startMonthLabel || 'Immediate' },
      ],
      ctaText: 'Open Admin Subscriptions Panel',
      ctaUrl: adminUrl,
      footerNote: 'You can verify this plan directly in Admin > Subscriptions or upload your bank statement CSV to auto-reconcile matching UTRs.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Subscription request alert to admin: ${adminEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `New Subscription Payment: ${hostName} (${planLabel}, UTR: ${transactionRef})`,
      text: `Hello Admin,\n\nHost ${hostName} has submitted a payment of ₹${amount} for plan ${planLabel}.\nUTR: ${transactionRef}\n\nVerify at: ${adminUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Admin Subscription Alert dispatched to [${adminEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send subscription alert to admin [${adminEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Send Subscription Activated Email to Host (Fired when admin approves plan)
 */
export async function sendSubscriptionActivatedToHostEmail({
  hostEmail,
  hostName,
  planLabel,
  durationMonths,
  amount,
  transactionRef,
  validUntil,
  isApprovedHost = true,
}) {
  if (!hostEmail) return { success: false, reason: 'No host email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Billing" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const hostDashboardUrl = `${clientUrl}/host-dashboard`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Subscription Activated',
      title: 'Host Subscription Activated',
      subtitle: `Your subscription payment has been verified by the Stay In administration. ${
        isApprovedHost
          ? 'Your property listing is now <strong>LIVE</strong> and actively visible to guests across the platform.'
          : 'Your host subscription is now active! Your property listing will go live as soon as final review is completed.'
      }`,
      detailsRows: [
        { label: 'Host Partner', value: hostName },
        { label: 'Activated Plan', value: planLabel || `${durationMonths} Month(s)` },
        { label: 'Plan Duration', value: `${durationMonths} Month(s)` },
        { label: 'Amount Paid', value: `₹${Number(amount || 0).toLocaleString('en-IN')}` },
        { label: 'Payment Reference', value: transactionRef || 'Verified' },
        { label: 'Plan Active Until', value: validUntil },
        { label: 'Listing Status', value: isApprovedHost ? 'Active & Accepting Bookings' : 'Active Subscription' },
      ],
      ctaText: 'Open Host Dashboard',
      ctaUrl: hostDashboardUrl,
      footerNote: 'Please retain this email as your official digital invoice. You can manage room inventory and review incoming guest bookings anytime from your Host Dashboard.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Subscription activated email to: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `Host Subscription Activated: ${planLabel} (Valid Until ${validUntil})`,
      text: `Hello ${hostName},\n\nYour host subscription for ${planLabel} has been verified and activated!\nValid Until: ${validUntil}\n\nGo to Dashboard: ${hostDashboardUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Host Subscription Activated email dispatched to [${hostEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send subscription activated email to [${hostEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 7b. Send New Property Submission Alert to Admin (Fired when host submits property for approval)
 */
export async function sendPropertySubmissionToAdminEmail({
  hostName,
  hostEmail,
  hostPhone,
  propertyName,
  propertyType,
  location,
  roomCount = 0,
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return { success: false, reason: 'No admin email configured' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Admin" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const adminUrl = `${clientUrl}/admin`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Property Approval Request',
      title: 'New Property Submitted for Approval',
      subtitle: `Host <strong>${hostName || 'Partner'}</strong> has submitted <strong>${propertyName || 'a new property'}</strong> for admin verification.`,
      detailsRows: [
        { label: 'Host Name', value: hostName || 'N/A' },
        { label: 'Host Email', value: hostEmail || 'N/A' },
        { label: 'Host Phone', value: hostPhone || 'N/A' },
        { label: 'Property Name', value: propertyName || 'Untitled Property' },
        { label: 'Property Type', value: propertyType || 'Stay' },
        { label: 'Location', value: location || 'N/A' },
        { label: 'Total Rooms', value: String(roomCount || 0) },
      ],
      ctaText: 'Review in Admin Panel',
      ctaUrl: adminUrl,
      footerNote: 'Please review the property details in the Admin Dashboard to approve or reject this listing.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Property submission alert to admin: ${adminEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `New Property Approval Request: ${propertyName || 'Listing'} by ${hostName || 'Host'}`,
      text: `Hello Admin,\n\nHost ${hostName || 'Partner'} (${hostEmail || 'N/A'}) submitted "${propertyName || 'Listing'}" (${propertyType || 'Stay'}) in ${location || 'N/A'} for approval.\n\nReview at: ${adminUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Admin Property Submission Alert dispatched to [${adminEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send property submission alert to admin [${adminEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 7c. Send Property Approved Email to Host (Fired when admin approves property)
 */
export async function sendPropertyApprovedToHostEmail({
  hostEmail,
  hostName,
  propertyName,
  propertyType,
  isLive = false,
}) {
  if (!hostEmail) return { success: false, reason: 'No host email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Host" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const hostDashboardUrl = `${clientUrl}/host-dashboard`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Property Approved',
      title: 'Your Property Has Been Approved',
      subtitle: `Great news <strong>${hostName || 'Host'}</strong>! Your property <strong>${propertyName || 'listing'}</strong> has been approved by the Stay In administration. ${
        isLive
          ? 'Your listing is now <strong>LIVE</strong> and visible to guests.'
          : 'Purchase and verify a subscription plan from your Host Dashboard to make your listing live to guests.'
      }`,
      detailsRows: [
        { label: 'Host Partner', value: hostName || 'N/A' },
        { label: 'Property Name', value: propertyName || 'Your Property' },
        { label: 'Property Type', value: propertyType || 'Stay' },
        { label: 'Approval Status', value: 'Approved' },
        { label: 'Listing Visibility', value: isLive ? 'Live & Accepting Bookings' : 'Awaiting Active Plan' },
      ],
      ctaText: 'Open Host Dashboard',
      ctaUrl: hostDashboardUrl,
      footerNote: 'You can manage your rooms, pricing, and bookings anytime from your Host Dashboard.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Property approved email to host: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `Property Approved: ${propertyName || 'Your Listing'} is Verified`,
      text: `Hello ${hostName || 'Host'},\n\nYour property "${propertyName || 'Listing'}" has been approved by the Stay In admin.${isLive ? ' Your listing is now LIVE.' : ' Activate a subscription plan to go live.'}\n\nOpen Dashboard: ${hostDashboardUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Host Property Approved email dispatched to [${hostEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send property approved email to host [${hostEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 8. Send Subscription Rejected Email to Host (Fired when admin rejects plan payment)
 */
export async function sendSubscriptionRejectedToHostEmail({
  hostEmail,
  hostName,
  planLabel,
  amount,
  transactionRef,
  rejectionReason,
}) {
  if (!hostEmail) return { success: false, reason: 'No host email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Support" <noreply@stayin.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const retryUrl = `${clientUrl}/host-dashboard?tab=subscription`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Payment Verification Update',
      title: 'Subscription Verification Unsuccessful',
      subtitle: `Hello ${hostName}, the administration was unable to verify your submitted payment for the <strong>${planLabel}</strong>.`,
      detailsRows: [
        { label: 'Host Partner', value: hostName },
        { label: 'Plan Attempted', value: planLabel },
        { label: 'Amount', value: `₹${Number(amount || 0).toLocaleString('en-IN')}` },
        { label: 'Submitted UTR', value: transactionRef || 'N/A' },
        { label: 'Reason', value: rejectionReason || 'UTR did not match bank statement records' },
      ],
      ctaText: 'Review & Re-submit Payment',
      ctaUrl: retryUrl,
      footerNote: 'Please verify that the 12-digit UTR on your banking receipt is entered accurately without spaces or missing digits.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Subscription rejected email to: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `Subscription Payment Update: ${planLabel}`,
      text: `Hello ${hostName},\n\nYour subscription payment for ${planLabel} could not be verified.\nReason: ${rejectionReason}\n\nRetry at: ${retryUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Host Subscription Rejected email dispatched to [${hostEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send subscription rejected email to [${hostEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Helper to resolve the accessible frontend website base URL
 * Prioritizes:
 * 1. Explicit PUBLIC_CLIENT_URL or WEBSITE_URL (e.g. production domain)
 * 2. Request origin if not localhost
 * 3. Configured CLIENT_URL if not localhost
 * 4. Local network IPv4 address (e.g. http://192.168.1.6:5173) so phones on local Wi-Fi can open links
 * 5. Fallback to CLIENT_URL
 */
export function getPublicClientBaseUrl(req) {
  if (process.env.PUBLIC_CLIENT_URL && !process.env.PUBLIC_CLIENT_URL.includes('localhost') && !process.env.PUBLIC_CLIENT_URL.includes('127.0.0.1')) {
    return process.env.PUBLIC_CLIENT_URL.replace(/\/+$/, '');
  }
  if (process.env.WEBSITE_URL && !process.env.WEBSITE_URL.includes('localhost') && !process.env.WEBSITE_URL.includes('127.0.0.1')) {
    return process.env.WEBSITE_URL.replace(/\/+$/, '');
  }

  const reqOrigin = req?.get ? (req.get('origin') || (req.headers?.referer ? new URL(req.headers.referer).origin : '')) : '';
  if (reqOrigin && !reqOrigin.includes('localhost') && !reqOrigin.includes('127.0.0.1')) {
    return reqOrigin.replace(/\/+$/, '');
  }

  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost') && !process.env.CLIENT_URL.includes('127.0.0.1')) {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  }

  if (reqOrigin && (reqOrigin.includes('192.168.') || reqOrigin.includes('10.') || reqOrigin.includes('172.'))) {
    return reqOrigin.replace(/\/+$/, '');
  }

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
          return `http://${net.address}:5173`;
        }
      }
    }
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return `http://${net.address}:5173`;
        }
      }
    }
  } catch (_) {}

  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * 9. Send Guest Payment Submitted Email to Host (Fired when guest submits UTR)
 */
export async function sendPaymentSubmittedToHostEmail({
  hostEmail,
  hostName = 'Host Partner',
  guestName,
  roomCategory,
  roomType,
  roomNumber,
  durationDisplay,
  rateUnit,
  bookedMonths,
  checkIn,
  checkOut,
  amount,
  transactionRef,
  bookingId,
  dashboardUrl: customDashboardUrl,
}) {
  if (!hostEmail) return { success: false, reason: 'No host email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Stay In Payments" <noreply@stayin.com>';
    const hostDashboardUrl = customDashboardUrl || `${getPublicClientBaseUrl()}/host-dashboard?tab=visited`;

    const isMonthly = rateUnit === '/month' || (Array.isArray(bookedMonths) && bookedMonths.length > 0);
    const accommodationTimingLabel = isMonthly ? 'Booked Months' : 'Booked Dates';
    let accommodationTimingValue = '';

    if (isMonthly) {
      if (Array.isArray(bookedMonths) && bookedMonths.length > 0) {
        accommodationTimingValue = bookedMonths
          .map((m) => {
            if (/^\d{4}-\d{2}$/.test(m)) {
              const [y, mon] = m.split('-');
              return new Date(Number(y), Number(mon) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            }
            return m;
          })
          .join(', ');
      } else if (checkIn && checkOut) {
        const start = new Date(checkIn).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        const end = new Date(checkOut).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        accommodationTimingValue = start === end ? start : `${start} – ${end}`;
      } else {
        accommodationTimingValue = durationDisplay || 'Monthly Stay';
      }
    } else {
      if (checkIn && checkOut) {
        const start = new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const end = new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        accommodationTimingValue = `${start} to ${end}`;
      } else {
        accommodationTimingValue = durationDisplay || 'Short Stay';
      }
    }

    const resolvedCategory = roomCategory || roomType || 'Standard';
    const cleanUtr = String(transactionRef || '').replace(/\s+/g, '').trim();
    const formattedUtr = /^[a-zA-Z0-9]{12}$/.test(cleanUtr)
      ? `${cleanUtr.slice(0, 4)} ${cleanUtr.slice(4, 8)} ${cleanUtr.slice(8, 12)}`
      : (transactionRef || '');

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Payment Verification Required',
      title: `Guest Payment Submitted for Room ${roomNumber}`,
      subtitle: `Guest <strong>${guestName}</strong> has submitted direct UPI transfer of <strong>₹${Number(amount || 0).toLocaleString('en-IN')}</strong> for <strong>Room ${roomNumber}</strong> (${resolvedCategory}). Please check your bank account or UPI app (PhonePe, GPay, Paytm) and verify to unlock the guest pass.`,
      detailsRows: [
        { label: 'User Name', value: guestName || 'Guest' },
        { label: 'Room Category', value: resolvedCategory },
        { label: 'Room No.', value: `Room ${roomNumber}` },
        { label: 'Duration', value: durationDisplay || (isMonthly ? '1 Month' : '1 Night') },
        { label: accommodationTimingLabel, value: accommodationTimingValue },
        { label: 'Paid Amount', value: `₹${Number(amount || 0).toLocaleString('en-IN')}` },
        { label: 'UPI Reference (UTR)', value: formattedUtr || 'N/A' },
        { label: 'Status', value: 'Pending Your Confirmation' },
      ],
      ctaText: 'Verify Payment & Unlock Pass',
      ctaUrl: hostDashboardUrl,
      footerNote: 'Once you verify this payment in your Host Dashboard, the guest\'s official Check-In Pass Code is automatically generated and active.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest payment submitted alert to host: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `Payment Submitted: ₹${amount} for Room ${roomNumber} by ${guestName} (UTR: ${formattedUtr})`,
      text: `Hello ${hostName},\n\nGuest ${guestName} has submitted UPI payment of ₹${amount} for Room ${roomNumber} (${resolvedCategory}).\nDuration: ${durationDisplay || ''}\n${accommodationTimingLabel}: ${accommodationTimingValue}\nUTR: ${formattedUtr}\n\nVerify and Confirm at: ${hostDashboardUrl}\n\nStay In Team`,
      html: htmlContent,
    };

    const info = await sendRawMail(mailOptions);
    console.log(`✅ Real Host Payment Submission Alert dispatched to [${hostEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send host payment submission alert to [${hostEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}



