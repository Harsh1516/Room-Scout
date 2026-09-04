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
