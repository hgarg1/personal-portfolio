const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { isAuthenticated, hasRole } = require('../lib/middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name keeping original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// All routes here require at least EDITOR role (or ADMIN)
router.use(isAuthenticated, hasRole(['ADMIN', 'EDITOR']));

// GET /admin/cms - Show dashboard listing pages and media assets
router.get('/', async (req, res) => {
  try {
    const pages = await prisma.cMSPage.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    const assets = await prisma.cMSAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.render('admin/cms_dashboard', {
      title: 'CMS Control Panel',
      pages,
      assets
    });
  } catch (err) {
    console.error('CMS Dashboard Error:', err);
    res.status(500).render('error', { title: 'Server Error', error: err });
  }
});

// GET /admin/cms/pages/new - Show editor for new page
router.get('/pages/new', (req, res) => {
  res.render('admin/cms_editor', {
    title: 'Create Page',
    page: null
  });
});

// GET /admin/cms/pages/edit/:id - Show editor for existing page
router.get('/pages/edit/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = await prisma.cMSPage.findUnique({
      where: { id }
    });

    if (!page) {
      return res.status(404).render('404', { title: 'Page Not Found' });
    }

    res.render('admin/cms_editor', {
      title: `Edit Page: ${page.title}`,
      page
    });
  } catch (err) {
    console.error('Error fetching page for edit:', err);
    res.status(500).render('error', { title: 'Server Error', error: err });
  }
});

// POST /admin/cms/pages - Save new page
router.post('/pages', async (req, res) => {
  const {
    title,
    slug,
    description,
    layout,
    themeColor,
    gradient,
    htmlContent,
    cssContent,
    jsContent,
    status
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and Slug are required' });
  }

  // Format slug to be URL-safe (lowercase, dashes)
  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');

  try {
    // Check if slug is unique
    const existing = await prisma.cMSPage.findUnique({
      where: { slug: formattedSlug }
    });

    if (existing) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }

    const page = await prisma.cMSPage.create({
      data: {
        title,
        slug: formattedSlug,
        description: description || '',
        layout: layout || 'standard',
        themeColor: themeColor || '#6366f1',
        gradient: gradient || 'linear-gradient(135deg, #9d5cff 0%, #00d4ff 100%)',
        htmlContent: htmlContent || '',
        cssContent: cssContent || '',
        jsContent: jsContent || '',
        status: status || 'DRAFT',
        authorId: req.session.user.id
      }
    });

    res.json({ success: true, redirectUrl: '/admin/cms', pageId: page.id });
  } catch (err) {
    console.error('Error saving new page:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/pages/edit/:id - Update existing page
router.post('/pages/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    title,
    slug,
    description,
    layout,
    themeColor,
    gradient,
    htmlContent,
    cssContent,
    jsContent,
    status
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and Slug are required' });
  }

  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');

  try {
    // Check if slug is unique for other pages
    const existing = await prisma.cMSPage.findFirst({
      where: {
        slug: formattedSlug,
        NOT: { id }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }

    const page = await prisma.cMSPage.update({
      where: { id },
      data: {
        title,
        slug: formattedSlug,
        description: description || '',
        layout: layout || 'standard',
        themeColor: themeColor || '#6366f1',
        gradient: gradient || 'linear-gradient(135deg, #9d5cff 0%, #00d4ff 100%)',
        htmlContent: htmlContent || '',
        cssContent: cssContent || '',
        jsContent: jsContent || '',
        status: status || 'DRAFT'
      }
    });

    res.json({ success: true, redirectUrl: '/admin/cms', pageId: page.id });
  } catch (err) {
    console.error('Error updating page:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/pages/delete/:id - Delete page
router.post('/pages/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.cMSPage.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting page:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/assets/upload - Upload file to Media Library
router.post('/assets/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const assetUrl = '/uploads/' + req.file.filename;

    const asset = await prisma.cMSAsset.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: assetUrl,
        uploadedById: req.session.user.id
      }
    });

    res.json({ success: true, asset });
  } catch (err) {
    console.error('Error saving asset record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/assets/delete/:id - Delete asset and remove from filesystem
router.post('/assets/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const asset = await prisma.cMSAsset.findUnique({
      where: { id }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Attempt to delete physical file
    const filePath = path.join(uploadDir, asset.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.cMSAsset.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting asset:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/cms/assets/content/:filename - Fetch plain text content (read-only document preview support)
router.get('/assets/content/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Read only first 50KB to prevent memory issues with large files
    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath, { encoding: 'utf8', start: 0, end: 50 * 1024 });
    let content = '';

    stream.on('data', chunk => {
      content += chunk;
    });

    stream.on('end', () => {
      if (stats.size > 50 * 1024) {
        content += '\n\n... [Content truncated due to size limits] ...';
      }
      res.type('text/plain').send(content);
    });

    stream.on('error', err => {
      console.error('Stream read error:', err);
      res.status(500).send('Error reading file content');
    });
  } catch (err) {
    console.error('Error fetching file content:', err);
    res.status(500).send('Error fetching file content');
  }
});

module.exports = router;
