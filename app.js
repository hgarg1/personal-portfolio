require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cookieSession = require('cookie-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel/proxied environments to allow secure cookies
app.set('trust proxy', 1);

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'portfolio-secret-key-2026'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

const { ensureGlobalAdmin } = require('./lib/middleware');

// Expose session user to views
app.use((req, res, next) => {
  ensureGlobalAdmin(req);
  res.locals.user = req.session.user || null;
  next();
});

// ─── Locals ───────────────────────────────────────────────────────────────────
app.locals.appName = process.env.APP_NAME || 'My App';

// ─── Routes ───────────────────────────────────────────────────────────────────
const indexRouter = require('./routes/index');
const aboutRouter = require('./routes/about');
const contactRouter = require('./routes/contact');
const authRouter = require('./routes/auth');
const cmsRouter = require('./routes/cms');
const usersRouter = require('./routes/users');

app.use('/', indexRouter);
app.use('/about', aboutRouter);
app.use('/contact', contactRouter);
app.use('/auth', authRouter);
app.use('/admin/cms', cmsRouter);
app.use('/admin/users', usersRouter);

// ─── Dynamic CMS Pages Routing ────────────────────────────────
app.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase();
    
    // Skip if matches static routes or favicon
    const reservedSlugs = ['about', 'contact', 'auth', 'admin', 'favicon.ico'];
    if (reservedSlugs.includes(slug)) {
      return next();
    }

    const prisma = require('./lib/prisma');
    const page = await prisma.cMSPage.findUnique({
      where: { slug }
    });

    if (!page) {
      return next(); // Pass to 404
    }

    // Access control:
    // - PUBLISHED: available to everyone
    // - STAGED / DRAFT: require authentication and EDITOR or ADMIN role
    if (page.status === 'PUBLISHED') {
      return res.render('cms_page', { page, title: page.title });
    }

    // Check if user is logged in and authorized
    if (req.session && req.session.user && ['ADMIN', 'EDITOR'].includes(req.session.user.role)) {
      return res.render('cms_page', { page, title: `[Preview] ${page.title}` });
    }

    next();
  } catch (err) {
    console.error('Error rendering dynamic CMS page:', err);
    next(err);
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 – Page Not Found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', error: err });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀  Server running → http://localhost:${PORT}\n`);
  });
}

module.exports = app;
