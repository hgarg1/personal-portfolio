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
    from: `"Sharp Franklin Portal" <${process.env.GMAIL_USER}>`,
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
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">&copy; 2026 Sharp Franklin Command Center. All rights reserved.</p>
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

module.exports = {
  sendVerificationEmail,
};
