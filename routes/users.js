const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { isAuthenticated, hasRole } = require('../lib/middleware');

// GET /admin/users - Show all users (Restricted to ADMIN)
router.get('/', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.portfolioUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        passkeys: true
      }
    });

    res.render('admin/users', {
      title: 'User Management',
      users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).render('error', { title: 'Server Error', error: err });
  }
});

// POST /admin/users/role - Update user role (Restricted to ADMIN)
router.post('/role', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing userId or role' });
  }

  try {
    const id = parseInt(userId, 10);
    
    // Find user to verify email
    const targetUser = await prisma.portfolioUser.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety check: Cannot demote garg.archie@gmail.com
    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot change role of global admin user' });
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await prisma.portfolioUser.update({
      where: { id },
      data: { role }
    });

    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
