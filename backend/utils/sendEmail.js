import nodemailer from 'nodemailer';

/**
 * Creates and configures the Nodemailer transporter dynamically
 * to handle Gmail service or custom SMTP credentials safely.
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim().replace(/\s+/g, '') : null;
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (!user || !pass) {
    return null;
  }

  if (host.includes('gmail') || user.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Sends an email using configured SMTP environment variables.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    const errorMsg = 'SMTP credentials not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env.';
    console.warn(`[EMAIL WARNING] ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  const fromAddress = process.env.EMAIL_FROM || `"RoomScout Support" <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from: fromAddress,
    to: to.trim().toLowerCase(),
    subject: subject.trim(),
    ...(text && { text }),
    ...(html && { html }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export default sendEmail;