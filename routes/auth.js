const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

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
