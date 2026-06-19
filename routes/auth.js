const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { sendVerificationEmail } = require('../lib/email');
const fs = require('fs');
const path = require('path');

// Helper function to dynamically update .env file
function updateEnv(updates) {
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}="${value.replace(/"/g, '\\"')}"`;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
}

// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth');
}

// GET /auth - Show Login page or redirect to Dashboard
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/auth/dashboard');
  }
  res.render('auth/login', { title: 'Admin Login', error: null });
});

// POST /auth/login - Process Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/login', { 
      title: 'Admin Login', 
      error: 'Please fill in all fields.' 
    });
  }

  try {
    // Look up user in PortfolioUser table
    const user = await prisma.portfolioUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.render('auth/login', { 
        title: 'Admin Login', 
        error: 'Invalid email or password.' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', { 
        title: 'Admin Login', 
        error: 'Invalid email or password.' 
      });
    }

    // Check verification status
    if (!user.emailVerified) {
      // Generate a new code and redirect to verify page
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await prisma.portfolioUser.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          verificationExpires: expires,
        },
      });

      await sendVerificationEmail(user.email, user.name, code);
      return res.redirect(`/auth/verify?email=${encodeURIComponent(user.email)}&success=${encodeURIComponent('Please verify your email address to continue.')}`);
    }

    // Store user session info
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', { 
      title: 'Admin Login', 
      error: 'An internal server error occurred.' 
    });
  }
});

// GET /auth/signup - Show Sign Up page
router.get('/signup', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/auth/dashboard');
  }
  res.render('auth/signup', { title: 'Create Admin Account', error: null });
});

// POST /auth/signup - Process Sign Up
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.render('auth/signup', {
      title: 'Create Admin Account',
      error: 'All fields are required.',
    });
  }

  try {
    const formattedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.portfolioUser.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.render('auth/signup', {
          title: 'Create Admin Account',
          error: 'An account with this email address already exists and is verified.',
        });
      } else {
        // User exists but not verified. Update verification code and redirect to verify page.
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await prisma.portfolioUser.update({
          where: { email: formattedEmail },
          data: {
            verificationCode: code,
            verificationExpires: expires,
          },
        });

        await sendVerificationEmail(formattedEmail, name, code);
        return res.redirect(`/auth/verify?email=${encodeURIComponent(formattedEmail)}`);
      }
    }

    // Create user pending verification
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.portfolioUser.create({
      data: {
        name,
        email: formattedEmail,
        password: passwordHash,
        emailVerified: false,
        verificationCode: code,
        verificationExpires: expires,
      },
    });

    await sendVerificationEmail(formattedEmail, name, code);
    res.redirect(`/auth/verify?email=${encodeURIComponent(formattedEmail)}`);
  } catch (err) {
    console.error('Signup error:', err);
    res.render('auth/signup', {
      title: 'Create Admin Account',
      error: 'An error occurred during account creation.',
    });
  }
});

// GET /auth/verify - OTP verification UI
router.get('/verify', async (req, res) => {
  const { email, error, success } = req.query;

  if (!email) {
    return res.redirect('/auth');
  }

  try {
    const formattedEmail = email.toLowerCase().trim();
    const user = await prisma.portfolioUser.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      return res.redirect('/auth');
    }

    if (user.emailVerified) {
      return res.redirect('/auth');
    }

    // Send variables to page: email, active verification code (if in dev mode)
    const isDev = process.env.NODE_ENV === 'development';
    const devCode = isDev ? user.verificationCode : null;

    res.render('auth/verify', {
      title: 'Verify Your Account',
      email: user.email,
      error: error || null,
      success: success || null,
      devCode,
    });
  } catch (err) {
    console.error('Verify GET error:', err);
    res.redirect('/auth');
  }
});

// POST /auth/verify - Verify OTP code
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.redirect('/auth');
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.portfolioUser.findUnique({
      where: { email: formattedEmail },
    });

    if (!user || user.emailVerified) {
      return res.redirect('/auth');
    }

    // Verify OTP code
    if (user.verificationCode !== code.trim()) {
      return res.redirect(`/auth/verify?email=${encodeURIComponent(formattedEmail)}&error=${encodeURIComponent('Invalid verification code.')}`);
    }

    // Check expiration
    if (new Date() > new Date(user.verificationExpires)) {
      return res.redirect(`/auth/verify?email=${encodeURIComponent(formattedEmail)}&error=${encodeURIComponent('Verification code has expired. Please request a new one.')}`);
    }

    // Successful verification
    await prisma.portfolioUser.update({
      where: { email: formattedEmail },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    // Start session
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error('Verification POST error:', err);
    res.redirect(`/auth/verify?email=${encodeURIComponent(formattedEmail)}&error=${encodeURIComponent('An internal server error occurred.')}`);
  }
});

// POST /auth/resend - Resend verification code
router.post('/resend', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  const formattedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.portfolioUser.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Account is already verified.' });
    }

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.portfolioUser.update({
      where: { email: formattedEmail },
      data: {
        verificationCode: code,
        verificationExpires: expires,
      },
    });

    await sendVerificationEmail(formattedEmail, user.name, code);
    res.json({ success: true, message: 'A new verification code has been sent.' });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// GET /auth/email-setup - Enter Google OAuth2 details
router.get('/email-setup', (req, res) => {
  res.render('auth/email-setup', { title: 'Gmail OAuth2 Setup', error: null });
});

// POST /auth/email-setup - Trigger Google OAuth2 flow
router.post('/email-setup', (req, res) => {
  const { email, clientId, clientSecret } = req.body;

  if (!email || !clientId || !clientSecret) {
    return res.render('auth/email-setup', {
      title: 'Gmail OAuth2 Setup',
      error: 'All fields are required.',
    });
  }

  // Store Gmail setup in session
  req.session.gmailSetup = { email, clientId, clientSecret };

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/oauth2callback`;
  const scope = 'https://mail.google.com/';

  // Redirect to Google OAuth2 consent screen
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(googleAuthUrl);
});

// GET /auth/oauth2callback - Exchange code for refresh token
router.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { clientId, clientSecret, email } = req.session.gmailSetup || {};

  if (!code || !clientId || !clientSecret || !email) {
    return res.render('auth/login', {
      title: 'Admin Login',
      error: 'Google OAuth2 flow was interrupted or session expired. Please try again.',
    });
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/oauth2callback`;

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();

    if (!response.ok || !data.refresh_token) {
      console.error('OAuth2 token exchange error:', data);
      return res.render('auth/login', {
        title: 'Admin Login',
        error: `OAuth2 token exchange failed: ${data.error_description || data.error || 'No refresh token returned'}`,
      });
    }

    const refreshToken = data.refresh_token;

    // Update .env with new credentials
    updateEnv({
      GMAIL_USER: email,
      GMAIL_CLIENT_ID: clientId,
      GMAIL_CLIENT_SECRET: clientSecret,
      GMAIL_REFRESH_TOKEN: refreshToken,
    });

    // Update process.env so the running app picks it up immediately
    process.env.GMAIL_USER = email;
    process.env.GMAIL_CLIENT_ID = clientId;
    process.env.GMAIL_CLIENT_SECRET = clientSecret;
    process.env.GMAIL_REFRESH_TOKEN = refreshToken;

    // Clear session setup info
    delete req.session.gmailSetup;

    res.render('auth/oauth2callback', {
      title: 'Email Setup Successful',
      email,
      clientId,
      refreshToken,
    });
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    res.render('auth/login', {
      title: 'Admin Login',
      error: 'An error occurred during Google OAuth2 token exchange.',
    });
  }
});

// GET /auth/dashboard - Show Contact Submissions (Protected)
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Fetch all submissions from the database, newest first
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.render('auth/dashboard', { 
      title: 'Admin Dashboard', 
      submissions 
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', { 
      title: 'Server Error', 
      error: err 
    });
  }
});

// POST /auth/logout - Log Out
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/auth');
  });
});

module.exports = router;
