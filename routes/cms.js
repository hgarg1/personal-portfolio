const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { isAuthenticated, hasRole } = require('../lib/middleware');
const { createCommit, createBranch, mergeBranch } = require('../lib/vcs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure upload directory exists
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('⚠️ [CMS Router] Failed to create upload directory:', err.message);
  }
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// All routes here require at least EDITOR role (or ADMIN)
router.use(isAuthenticated, hasRole(['ADMIN', 'EDITOR']));

// GET /admin/cms - Show dashboard listing pages, media assets, and merge requests
router.get('/', async (req, res) => {
  try {
    // Get all pages including default branch head commit
    const pagesList = await prisma.cMSPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        branches: {
          include: {
            headCommit: true
          }
        }
      }
    });

    // Format pages for EJS list rendering
    const pages = pagesList.map(p => {
      const mainBranch = p.branches.find(b => b.isDefault) || p.branches[0];
      const head = mainBranch ? mainBranch.headCommit : null;
      return {
        id: p.id,
        slug: p.slug,
        title: head ? head.title : 'Untitled Page',
        status: head ? head.status : 'DRAFT',
        layout: head ? head.layout : 'standard',
        updatedAt: p.updatedAt
      };
    });

    const assets = await prisma.cMSAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const mergeRequests = await prisma.cMSMergeRequest.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        page: true,
        sourceBranch: {
          include: { headCommit: true }
        },
        targetBranch: {
          include: { headCommit: true }
        },
        createdBy: true
      }
    });

    res.render('admin/cms_dashboard', {
      title: 'CMS Control Panel',
      pages,
      assets,
      mergeRequests
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
    page: null,
    branches: [],
    activeBranch: 'main',
    commits: []
  });
});

// GET /admin/cms/pages/edit/:id - Show editor for existing page (branch-aware)
router.get('/pages/edit/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const activeBranchName = req.query.branch || 'main';

    const pageRecord = await prisma.cMSPage.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            headCommit: true
          }
        }
      }
    });

    if (!pageRecord) {
      return res.status(404).render('404', { title: 'Page Not Found' });
    }

    const activeBranch = pageRecord.branches.find(b => b.name === activeBranchName) || pageRecord.branches.find(b => b.isDefault);
    const headCommit = activeBranch ? activeBranch.headCommit : null;

    // Get commit history for the active branch
    const commits = activeBranch ? await prisma.cMSCommit.findMany({
      where: { branchId: activeBranch.id },
      orderBy: { createdAt: 'desc' },
      include: { author: true }
    }) : [];

    // Synthesize page object for Monaco Editor backward compatibility
    const page = {
      id: pageRecord.id,
      slug: pageRecord.slug,
      title: headCommit ? headCommit.title : 'Untitled Page',
      description: headCommit ? headCommit.description : '',
      layout: headCommit ? headCommit.layout : 'standard',
      themeColor: headCommit ? headCommit.themeColor : '#6366f1',
      gradient: headCommit ? headCommit.gradient : 'linear-gradient(135deg, #9d5cff 0%, #00d4ff 100%)',
      htmlContent: headCommit ? headCommit.htmlContent : '',
      cssContent: headCommit ? headCommit.cssContent : '',
      jsContent: headCommit ? headCommit.jsContent : '',
      status: headCommit ? headCommit.status : 'DRAFT',
      metaRobots: headCommit ? headCommit.metaRobots : 'index, follow',
      canonicalUrl: headCommit ? headCommit.canonicalUrl : '',
      ogImage: headCommit ? headCommit.ogImage : ''
    };

    res.render('admin/cms_editor', {
      title: `Edit Page: ${page.title}`,
      page,
      branches: pageRecord.branches,
      activeBranch: activeBranch ? activeBranch.name : 'main',
      commits
    });
  } catch (err) {
    console.error('Error fetching page for edit:', err);
    res.status(500).render('error', { title: 'Server Error', error: err });
  }
});

// POST /admin/cms/pages - Save new page with initial main branch and commit
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
    status,
    metaRobots,
    canonicalUrl,
    ogImage,
    commitMessage
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and Slug are required' });
  }

  const baseSlug = slug.toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  let formattedSlug = baseSlug;
  let counter = 1;

  try {
    // Collision Safeguard: Auto-resolve to unique slug
    while (true) {
      const existing = await prisma.cMSPage.findUnique({
        where: { slug: formattedSlug }
      });
      if (!existing) break;
      counter++;
      formattedSlug = `${baseSlug}-${counter}`;
    }

    const page = await prisma.$transaction(async (tx) => {
      // 1. Create Page
      const newPage = await tx.cMSPage.create({
        data: {
          slug: formattedSlug,
          authorId: req.session.user.id
        }
      });

      // 2. Create Default Branch (main)
      const branch = await tx.cMSBranch.create({
        data: {
          name: 'main',
          isDefault: true,
          pageId: newPage.id
        }
      });

      // 3. Create Initial Commit on main
      await createCommit(tx, {
        pageId: newPage.id,
        branchId: branch.id,
        authorId: req.session.user.id,
        message: commitMessage || 'Initial Commit',
        title,
        description,
        layout,
        themeColor,
        gradient,
        htmlContent,
        cssContent,
        jsContent,
        status,
        metaRobots,
        canonicalUrl,
        ogImage
      });

      return newPage;
    });

    res.json({ success: true, redirectUrl: '/admin/cms', pageId: page.id });
  } catch (err) {
    console.error('Error saving new page:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/pages/edit/:id - Commit changes to existing branch
router.post('/pages/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const activeBranchName = req.query.branch || 'main';
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
    status,
    metaRobots,
    canonicalUrl,
    ogImage,
    commitMessage
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and Slug are required' });
  }

  const baseSlug = slug.toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
  let formattedSlug = baseSlug;
  let counter = 1;

  try {
    const oldPage = await prisma.cMSPage.findUnique({
      where: { id }
    });

    if (!oldPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Collision Safeguard: Auto-resolve to unique slug
    while (true) {
      const existing = await prisma.cMSPage.findFirst({
        where: {
          slug: formattedSlug,
          NOT: { id }
        }
      });
      if (!existing) break;
      counter++;
      formattedSlug = `${baseSlug}-${counter}`;
    }

    await prisma.$transaction(async (tx) => {
      // If slug changed, handle redirects
      if (oldPage.slug !== formattedSlug) {
        await tx.cMSPage.update({
          where: { id },
          data: { slug: formattedSlug }
        });

        await tx.cMSRedirect.updateMany({
          where: { toPath: oldPage.slug },
          data: { toPath: formattedSlug }
        });

        await tx.cMSRedirect.upsert({
          where: { fromPath: oldPage.slug },
          update: { toPath: formattedSlug },
          create: { fromPath: oldPage.slug, toPath: formattedSlug, pageId: id }
        });
      }

      // Fetch target branch
      const branch = await tx.cMSBranch.findFirst({
        where: { pageId: id, name: activeBranchName }
      });

      if (!branch) {
        throw new Error(`Branch '${activeBranchName}' not found`);
      }

      // Create new commit on branch
      await createCommit(tx, {
        pageId: id,
        branchId: branch.id,
        authorId: req.session.user.id,
        message: commitMessage || 'Update page content',
        title,
        description,
        layout,
        themeColor,
        gradient,
        htmlContent,
        cssContent,
        jsContent,
        status,
        metaRobots,
        canonicalUrl,
        ogImage
      });
    });

    res.json({ success: true, redirectUrl: `/admin/cms/pages/edit/${id}?branch=${activeBranchName}` });
  } catch (err) {
    console.error('Error updating page:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /admin/cms/pages/edit/:id/restore - Create a revert commit matching selected commit Hash
router.post('/pages/edit/:id/restore', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const activeBranchName = req.query.branch || 'main';
    const { revisionId } = req.body; // In VCS, this represents the target commit hash

    if (!revisionId) {
      return res.status(400).json({ error: 'Commit Hash is required' });
    }

    const targetCommit = await prisma.cMSCommit.findUnique({
      where: { hash: revisionId }
    });

    if (!targetCommit || targetCommit.pageId !== id) {
      return res.status(404).json({ error: 'Commit not found' });
    }

    await prisma.$transaction(async (tx) => {
      const branch = await tx.cMSBranch.findFirst({
        where: { pageId: id, name: activeBranchName }
      });

      if (!branch) {
        throw new Error(`Branch '${activeBranchName}' not found`);
      }

      // Create a revert commit
      await createCommit(tx, {
        pageId: id,
        branchId: branch.id,
        authorId: req.session.user.id,
        message: `Revert to commit ${revisionId.substring(0, 7)}: ${targetCommit.message}`,
        title: targetCommit.title,
        description: targetCommit.description,
        layout: targetCommit.layout,
        themeColor: targetCommit.themeColor,
        gradient: targetCommit.gradient,
        htmlContent: targetCommit.htmlContent,
        cssContent: targetCommit.cssContent,
        jsContent: targetCommit.jsContent,
        status: targetCommit.status,
        metaRobots: targetCommit.metaRobots,
        canonicalUrl: targetCommit.canonicalUrl,
        ogImage: targetCommit.ogImage
      });
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring revision:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /admin/cms/pages/:id/branches - Create a new branch
router.post('/pages/:id/branches', async (req, res) => {
  try {
    const pageId = parseInt(req.params.id, 10);
    const { branchName, sourceBranchId } = req.body;

    if (!branchName) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    const formattedName = branchName.toLowerCase().trim().replace(/[^a-z0-9-_/]/g, '-');

    const branch = await prisma.$transaction(async (tx) => {
      // Check duplicate branch name for page
      const existing = await tx.cMSBranch.findFirst({
        where: { pageId, name: formattedName }
      });

      if (existing) {
        throw new Error('A branch with this name already exists');
      }

      return await createBranch(tx, {
        pageId,
        name: formattedName,
        sourceBranchId: sourceBranchId ? parseInt(sourceBranchId, 10) : null
      });
    });

    res.json({ success: true, branch });
  } catch (err) {
    console.error('Error creating branch:', err);
    res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// POST /admin/cms/pages/:id/merge-requests - Create a Merge Request
router.post('/pages/:id/merge-requests', async (req, res) => {
  try {
    const pageId = parseInt(req.params.id, 10);
    const { title, description, sourceBranchId, targetBranchId } = req.body;

    if (!title || !sourceBranchId || !targetBranchId) {
      return res.status(400).json({ error: 'Title, Source, and Target branches are required' });
    }

    const mr = await prisma.cMSMergeRequest.create({
      data: {
        title,
        description: description || '',
        pageId,
        sourceBranchId: parseInt(sourceBranchId, 10),
        targetBranchId: parseInt(targetBranchId, 10),
        createdById: req.session.user.id
      }
    });

    res.json({ success: true, mr });
  } catch (err) {
    console.error('Error creating MR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/cms/merge-requests/:mrId/merge - Merge approval and fast-forward commit creation
router.post('/merge-requests/:mrId/merge', async (req, res) => {
  try {
    const mrId = parseInt(req.params.mrId, 10);
    const mr = await prisma.cMSMergeRequest.findUnique({
      where: { id: mrId }
    });

    if (!mr || mr.status !== 'OPEN') {
      return res.status(404).json({ error: 'Open Merge Request not found' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Execute merge
      await mergeBranch(tx, {
        pageId: mr.pageId,
        sourceBranchId: mr.sourceBranchId,
        targetBranchId: mr.targetBranchId,
        authorId: req.session.user.id,
        mergeRequestTitle: mr.title
      });

      // 2. Mark MR as Merged
      await tx.cMSMergeRequest.update({
        where: { id: mrId },
        data: { status: 'MERGED' }
      });
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Merge execution error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /admin/cms/merge-requests/:mrId/close - Close a Merge Request without merging
router.post('/merge-requests/:mrId/close', async (req, res) => {
  try {
    const mrId = parseInt(req.params.mrId, 10);
    await prisma.cMSMergeRequest.update({
      where: { id: mrId },
      data: { status: 'CLOSED' }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error closing MR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/cms/pages/:id/diff - Get code snapshots of two commits for diff comparisons
router.get('/pages/:id/diff', async (req, res) => {
  try {
    const pageId = parseInt(req.params.id, 10);
    const { originalHash, modifiedHash } = req.query;

    if (!modifiedHash) {
      return res.status(400).json({ error: 'Modified commit hash is required' });
    }

    const modifiedCommit = await prisma.cMSCommit.findUnique({
      where: { hash: modifiedHash }
    });

    if (!modifiedCommit || modifiedCommit.pageId !== pageId) {
      return res.status(404).json({ error: 'Modified commit not found' });
    }

    let originalCommit = null;

    if (originalHash) {
      originalCommit = await prisma.cMSCommit.findUnique({
        where: { hash: originalHash }
      });
    } else if (modifiedCommit.parentId) {
      originalCommit = await prisma.cMSCommit.findUnique({
        where: { id: modifiedCommit.parentId }
      });
    }

    // If no original commit is found, compare against empty states
    res.json({
      original: {
        htmlContent: originalCommit ? originalCommit.htmlContent : '',
        cssContent: originalCommit ? originalCommit.cssContent : '',
        jsContent: originalCommit ? originalCommit.jsContent : ''
      },
      modified: {
        htmlContent: modifiedCommit.htmlContent,
        cssContent: modifiedCommit.cssContent,
        jsContent: modifiedCommit.jsContent
      }
    });
  } catch (err) {
    console.error('Diff error:', err);
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
    // If the uploaded file is a raster image, optimize it and convert to WebP
    if (req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'image/svg+xml') {
      const optimizedFilename = req.file.filename.split('.')[0] + '.webp';
      const outputPath = path.join(uploadDir, optimizedFilename);

      await sharp(req.file.path)
        .resize({ width: 1920, withoutEnlargement: true })
        .toFormat('webp')
        .webp({ quality: 80 })
        .toFile(outputPath);

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const stats = fs.statSync(outputPath);
      req.file.filename = optimizedFilename;
      req.file.mimetype = 'image/webp';
      req.file.size = stats.size;
    }

    const assetUrl = '/uploads/' + req.file.filename;

    const asset = await prisma.cMSAsset.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname.split('.')[0] + (req.file.mimetype === 'image/webp' ? '.webp' : path.extname(req.file.originalname)),
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: assetUrl,
        uploadedById: req.session.user.id
      }
    });

    res.json({ success: true, asset });
  } catch (err) {
    console.error('Error saving asset record:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

// GET /admin/cms/assets/content/:filename - Fetch plain text content
router.get('/assets/content/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

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
