import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
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
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const roleLabel = role === 'host' ? 'Host Partner' : 'Guest Member';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .brand { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-top: 8px; text-transform: uppercase; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .password-card { background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 16px; padding: 18px; text-align: center; margin: 24px 0; }
        .pass-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; margin-bottom: 6px; }
        .password { font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: 3px; }
        .btn-container { text-align: center; margin: 28px 0 16px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 99px; font-size: 13px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
        .notice { font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 20px; }
        .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">🏠 Room-Scout</div>
          <div class="badge">${roleLabel} Security</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'there'},</div>
          <div class="text">
            We received a request to recover your account password for <strong>${to}</strong>.
            Your fresh, secure 10-character temporary password has been generated and saved to your account:
          </div>
          
          <div class="password-card">
            <div class="pass-label">Your New 10-Character Password</div>
            <div class="password">${tempPassword}</div>
          </div>
          
          <div class="text" style="font-size: 13px;">
            You can now use this fresh password to immediately sign in to your Room-Scout ${roleLabel} account.
          </div>

          <div class="btn-container">
            <a href="${clientUrl}" class="btn" target="_blank">Sign In to Room-Scout →</a>
          </div>

          <div class="notice">
            🔒 <strong>Security Tip:</strong> Once you log in, you can update this password at any time by visiting your <strong>Account Center &gt; Password</strong> tab. If you did not make this request, please contact support.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Room-Scout Student Living & PG Portals. All rights reserved.
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
      subject: `🔑 Your New Room-Scout Password (${tempPassword})`,
      text: `Hello ${name},\n\nYour new temporary password for Room-Scout is: ${tempPassword}\n\nLogin at: ${clientUrl}\n\nThank you,\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
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
export async function testEmailConnection(testEmail = 'test@roomscout.com') {
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

    // Verify SMTP connection handshake
    await transporter.verify();

    // Send a real diagnostic test message
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser || '"Room-Scout Diagnostic" <noreply@roomscout.com>',
      to: testEmail,
      subject: '🧪 Room-Scout SMTP Connection Diagnostic Test',
      text: `Your Room-Scout email delivery system is functioning properly!\n\nConfigured Host: ${emailHost}:${emailPort}\nMode: ${isCustomSmtpConfigured ? 'Custom SMTP / Gmail' : 'Ethereal Sandbox'}\nTimestamp: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #10b981; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #059669; margin: 0 0 10px 0;">✅ SMTP Diagnostic Success</h2>
          <p style="color: #374151; font-size: 14px;">Your Room-Scout email delivery system is connected and working perfectly!</p>
          <ul style="color: #4b5563; font-size: 13px; line-height: 1.6;">
            <li><strong>Host:</strong> ${emailHost}:${emailPort}</li>
            <li><strong>Auth User:</strong> ${emailUser || '(Ethereal Sandbox User)'}</li>
            <li><strong>Mode:</strong> ${isCustomSmtpConfigured ? 'Custom / Gmail SMTP' : 'Ethereal Test Sandbox'}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      configured: isCustomSmtpConfigured,
      transporterType: isCustomSmtpConfigured ? (emailHost.includes('gmail') ? 'Gmail SMTP' : 'Custom SMTP') : 'Ethereal Sandbox',
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      message: isCustomSmtpConfigured
        ? `SMTP Connected successfully! Test email dispatched to ${testEmail}.`
        : `Ethereal Sandbox active! View test email preview at: ${previewUrl || 'Ethereal log'}`,
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
 * Common HTML email wrapper for Room-Scout transactional messages
 */
function buildBrandedEmailHtml({ badgeText, title, subtitle, detailsRows = [], ctaText, ctaUrl, footerNote }) {
  const renderedRows = detailsRows
    .map(
      (row) => `
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">${row.label}</td>
        <td style="padding: 10px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${row.value}</td>
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
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
      .brand { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      .content { padding: 32px 28px; }
      .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
      .subtitle { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
      .table-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px; margin: 20px 0; }
      .btn-container { text-align: center; margin: 28px 0 16px 0; }
      .btn { display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 99px; font-size: 14px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(5,150,105,0.3); }
      .footer-note { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
      .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="brand">🏠 Room-Scout</div>
        <div class="badge">${badgeText}</div>
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
            <a href="${ctaUrl}" class="btn" target="_blank">${ctaText} →</a>
          </div>
        `
            : ''
        }

        ${footerNote ? `<div class="footer-note">${footerNote}</div>` : ''}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Room-Scout Student Living & PG Portals. All rights reserved.
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
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
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
      footerNote: '⚡ As part of our asynchronous workflow, approving this request will instantly notify the guest to complete payment within their allotted window.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Host booking request alert dispatched to: ${hostEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: hostEmail,
      subject: `🏠 New Booking Request: Room ${roomNumber} at ${stayTitle} (${bookingReferenceId || bookingId})`,
      text: `Hello ${hostName},\n\nYou have received a new booking request for Room ${roomNumber} at ${stayTitle} from ${guestName}.\nTotal: ₹${totalAmount}\n\nReview & Approve at: ${hostDashboardUrl}\n\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
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
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
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
      footerNote: '💡 No need to continuously refresh! You will receive a direct notification link as soon as your slot is approved.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking submitted alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `⏳ Booking Request Received: ${stayTitle} (${bookingReferenceId || bookingId})`,
      text: `Hello ${guestName},\n\nYour booking request for Room ${roomNumber} at ${stayTitle} is pending host approval.\n\nTrack status: ${bookingUrl}\n\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
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
}) {
  if (!guestEmail) return { success: false, reason: 'No guest email address provided' };

  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const bookingUrl = `${clientUrl}/booking/${bookingId}`;

    const deadlineText = paymentDeadline
      ? new Date(paymentDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '15 minutes';

    const htmlContent = buildBrandedEmailHtml({
      badgeText: '🎉 Slot Approved: Payment Open',
      title: `Great news, ${guestName}! Your booking was approved!`,
      subtitle: `The host has approved your booking for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong>. Please complete your direct payment before <strong>${deadlineText}</strong> to confirm your slot reservation.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber}` },
        { label: 'Amount Due', value: `₹${Number(totalAmount || 0).toLocaleString('en-IN')}` },
        { label: 'Payment Deadline', value: deadlineText },
      ],
      ctaText: 'Complete Payment Now',
      ctaUrl: bookingUrl,
      footerNote: '⚠️ Please complete payment and upload your transaction reference before the timer elapses to lock your room.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking approved alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `🎉 Booking Approved: Complete Payment for ${stayTitle} (Room ${roomNumber})`,
      text: `Hello ${guestName},\n\nThe host has approved your booking for Room ${roomNumber} at ${stayTitle}!\nPlease complete payment (₹${totalAmount}) before ${deadlineText}.\n\nPay now: ${bookingUrl}\n\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
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
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const htmlContent = buildBrandedEmailHtml({
      badgeText: 'Booking Update: Declined',
      title: `Booking Request Declined`,
      subtitle: `Hello ${guestName}, unfortunately the host was unable to accept your booking request for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong> at this time.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || 'N/A' },
        { label: 'Property', value: stayTitle },
        { label: 'Room', value: `Room ${roomNumber}` },
        { label: 'Status', value: 'Declined by Host' },
      ],
      ctaText: 'Explore Other Available Stays',
      ctaUrl: clientUrl,
      footerNote: 'You have not been charged. Browse hundreds of other student PGs and apartments on Room-Scout.',
    });

    if (!transporter) {
      console.log(`[LOCAL EMAIL SIMULATOR] Guest booking declined alert to: ${guestEmail}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to: guestEmail,
      subject: `Booking Request Declined: ${stayTitle} (${bookingReferenceId})`,
      text: `Hello ${guestName},\n\nThe host was unable to accept your booking for Room ${roomNumber} at ${stayTitle}.\n\nExplore other stays: ${clientUrl}\n\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
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
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Room-Scout Support" <noreply@roomscout.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const bookingUrl = `${clientUrl}/booking/${bookingId}`;

    const htmlContent = buildBrandedEmailHtml({
      badgeText: '✅ Booking Confirmed & Verified',
      title: `Reservation Confirmed, ${guestName}!`,
      subtitle: `Your payment has been verified by the host! Your reservation for <strong>Room ${roomNumber}</strong> at <strong>${stayTitle}</strong> is 100% locked. Keep your check-in code handy upon arrival.`,
      detailsRows: [
        { label: 'Booking Reference', value: bookingReferenceId || bookingId },
        { label: 'Check-In Pass Code', value: checkInCode ? `🔑 ${checkInCode}` : 'Issued on Pass' },
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
      subject: `✅ Booking Confirmed! Your Stay at ${stayTitle} (Code: ${checkInCode || 'Verified'})`,
      text: `Hello ${guestName},\n\nYour booking for Room ${roomNumber} at ${stayTitle} is confirmed!\nCheck-In Code: ${checkInCode}\n\nView Pass: ${bookingUrl}\n\nRoom-Scout Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Real Guest Confirmation Alert dispatched to [${guestEmail}] (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send guest booking confirmed alert to [${guestEmail}]:`, err.message);
    return { success: false, error: err.message };
  }
}


