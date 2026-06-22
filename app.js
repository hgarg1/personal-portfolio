require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

// ─── FontConfig Setup for Sharp (Vercel Serverless) ──────────────────────────
const os = require('os');
const fs = require('fs');
const path = require('path');

const fontDir = path.join(os.tmpdir(), 'portfolio-fonts');
process.env.FONTCONFIG_PATH = fontDir; // Set synchronously before sharp is required anywhere

if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}

const confPath = path.join(fontDir, 'fonts.conf');
if (!fs.existsSync(confPath)) {
  const fontDirFormatted = fontDir.replace(/\\/g, '/');
  const cacheDir = path.join(os.tmpdir(), 'portfolio-fonts-cache').replace(/\\/g, '/');
  const fontsConfContent = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDirFormatted}</dir>
  <cachedir>${cacheDir}</cachedir>
  <config></config>
</fontconfig>`;
  fs.writeFileSync(confPath, fontsConfContent);
}

// Download fonts asynchronously but set a global promise to block rendering if needed
async function downloadFonts() {
  const boldFontPath = path.join(fontDir, 'LiberationSans-Bold.ttf');
  const regularFontPath = path.join(fontDir, 'LiberationSans-Regular.ttf');

  if (!fs.existsSync(boldFontPath)) {
    try {
      const res = await fetch('https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/LiberationSans-Bold.ttf');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(boldFontPath, Buffer.from(buffer));
      console.log('✅ Bold font downloaded successfully.');
    } catch (err) {
      console.error('❌ Failed to download bold font:', err);
    }
  }

  if (!fs.existsSync(regularFontPath)) {
    try {
      const res = await fetch('https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/LiberationSans-Regular.ttf');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(regularFontPath, Buffer.from(buffer));
      console.log('✅ Regular font downloaded successfully.');
    } catch (err) {
      console.error('❌ Failed to download regular font:', err);
    }
  }
}

global.fontsLoadedPromise = downloadFonts().catch(console.error);

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

// Serve uploads from dynamic dir (/tmp/uploads on Vercel, public/uploads locally)
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const dynamicUploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'public/uploads');
app.use('/uploads', express.static(dynamicUploadsDir));

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
const aiRouter = require('./routes/ai');

app.use('/', indexRouter);
app.use('/about', aboutRouter);
app.use('/contact', contactRouter);
app.use('/auth', authRouter);
app.use('/admin/cms', cmsRouter);
app.use('/admin/users', usersRouter);
app.use('/api/ai', aiRouter);

// ─── Dynamic CMS Pages Routing ────────────────────────────────
app.get('/*splat', async (req, res, next) => {
  try {
    // Extract path without the leading slash
    let slug = req.path.substring(1).toLowerCase();

    // If path is empty, pass to indexRouter
    if (!slug) {
      return next();
    }

    // Skip if path starts with static resource folders or static pages
    const skipPrefixes = ['about', 'contact', 'auth', 'admin', 'css', 'js', 'uploads', 'favicon.ico'];
    const topLevelDir = slug.split('/')[0];
    if (skipPrefixes.includes(topLevelDir)) {
      return next();
    }

    const prisma = require('./lib/prisma');

    // 1. Resolve redirects first (301 Permanent / 302 Temporary)
    const redirect = await prisma.cMSRedirect.findUnique({
      where: { fromPath: slug }
    });

    if (redirect) {
      return res.redirect(redirect.statusCode, '/' + redirect.toPath);
    }

    // 2. Resolve Page from database with branches and head commits
    const page = await prisma.cMSPage.findUnique({
      where: { slug },
      include: {
        branches: {
          include: {
            headCommit: true
          }
        }
      }
    });

    if (!page) {
      return next(); // Pass to 404
    }

    // Check if user is logged in and authorized as ADMIN or EDITOR
    const { ensureGlobalAdmin } = require('./lib/middleware');
    ensureGlobalAdmin(req);
    const isAdminOrEditor = req.session && req.session.user && ['ADMIN', 'EDITOR'].includes(req.session.user.role);

    // Resolve branch
    let activeBranchName = req.query.branch;
    let activeBranch = null;

    if (activeBranchName && isAdminOrEditor) {
      activeBranch = page.branches.find(b => b.name === activeBranchName);
    }

    if (!activeBranch) {
      activeBranch = page.branches.find(b => b.isDefault) || page.branches[0];
    }

    if (!activeBranch || !activeBranch.headCommit) {
      return next(); // If no branch or commit exists, 404
    }

    const commit = activeBranch.headCommit;

    // Access control:
    // - PUBLISHED: available to everyone
    // - STAGED / DRAFT: require authentication and EDITOR or ADMIN role
    if (commit.status === 'PUBLISHED') {
      const title = activeBranchName ? `[Preview] ${commit.title} (${activeBranch.name})` : commit.title;
      return res.render('cms_page', { commit, title });
    }

    if (isAdminOrEditor) {
      const title = `[Preview] ${commit.title} (${activeBranch.name})`;
      return res.render('cms_page', { commit, title });
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
