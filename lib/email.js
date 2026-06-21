const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.warn('⚠️ Nodemailer: Missing OAuth2 credentials in environment. Real emails will NOT be sent.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: user,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
    },
  });
}

async function sendVerificationEmail(email, name, code) {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`✉️  [MOCK EMAIL SENT TO: ${email}]`);
    console.log(`Dear ${name || 'User'},`);
    console.log(`Your email verification code is: ${code}`);
    console.log(`This code will expire in 15 minutes.`);
    console.log(`==================================================\n`);
    return false;
  }

  const mailOptions = {
    from: `"Harshit Garg Portal" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `🔐 Verify Your Account - OTP Code: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #6d28d9; text-align: center; margin-bottom: 20px;">Account Verification</h2>
        <p style="color: #374151; font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="color: #374151; font-size: 16px;">Thank you for registering. Please verify your email address to activate your account using the code below:</p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">This verification code is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">&copy; 2026 Harshit Garg. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Real email verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error);
    // Fallback log
    console.log(`\n==================================================`);
    console.log(`✉️  [FALLBACK MOCK EMAIL TO: ${email}]`);
    console.log(`Your verification code is: ${code}`);
    console.log(`==================================================\n`);
    return false;
  }
}

async function sendAccountStatusEmail(email, name, subject, message) {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`✉️  [MOCK EMAIL SENT TO: ${email}]`);
    console.log(`Subject: ${subject}`);
    console.log(`Dear ${name || 'User'},`);
    console.log(message);
    console.log(`==================================================\n`);
    return false;
  }

  const mailOptions = {
    from: `"Harshit Garg Portal" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
        <h2 style="color: #6d28d9; text-align: center; margin-bottom: 20px;">Account Status Notification</h2>
        <p style="font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
        <div style="font-size: 16px; line-height: 1.6; margin-top: 15px; margin-bottom: 25px; padding: 15px; border-left: 4px solid #6d28d9; background: #f9fafb;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">Please do not reply directly to this automated notification.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">&copy; 2026 Harshit Garg. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Real account status email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send account status email to ${email}:`, error);
    // Fallback log
    console.log(`\n==================================================`);
    console.log(`✉️  [FALLBACK MOCK EMAIL TO: ${email}]`);
    console.log(`Subject: ${subject}`);
    console.log(message);
    console.log(`==================================================\n`);
    return false;
  }
}

async function sendContactSubmissionEmail(name, email, message) {
  const transporter = getTransporter();
  const recipient = 'general@harshit-garg.com';
  const subject = `📥 New Contact Form Submission from ${name}`;

  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`✉️  [MOCK EMAIL SENT TO: ${recipient}]`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Message:\n${message}`);
    console.log(`==================================================\n`);
    return false;
  }

  const mailOptions = {
    from: `"Harshit Garg Portal" <${process.env.GMAIL_USER}>`,
    to: recipient,
    replyTo: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
        <h2 style="color: #6d28d9; text-align: center; margin-bottom: 20px;">New Contact Message</h2>
        <p style="font-size: 16px;">You have received a new submission from your website's contact form.</p>
        
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 80px; color: #6b7280; font-size: 14px;">Name:</td>
              <td style="padding: 6px 0; color: #111827; font-size: 15px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #6b7280; font-size: 14px;">Email:</td>
              <td style="padding: 6px 0; color: #111827; font-size: 15px;"><a href="mailto:${email}" style="color: #6d28d9; text-decoration: none;">${email}</a></td>
            </tr>
          </table>
        </div>

        <div style="font-size: 16px; line-height: 1.6; margin-top: 15px; margin-bottom: 25px; padding: 20px; border-left: 4px solid #6d28d9; background: #f9fafb; white-space: pre-wrap; font-family: inherit;">
          ${message}
        </div>

        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">This message was generated dynamically by the Harshit Garg Portal.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Real contact form submission email sent to ${recipient}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send contact form submission email to ${recipient}:`, error);
    // Fallback log
    console.log(`\n==================================================`);
    console.log(`✉️  [FALLBACK MOCK EMAIL TO: ${recipient}]`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Message:\n${message}`);
    console.log(`==================================================\n`);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  sendAccountStatusEmail,
  sendContactSubmissionEmail,
};
