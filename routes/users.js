const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { isAuthenticated, hasRole } = require('../lib/middleware');
const { logAction } = require('../lib/audit');
const { sendAccountStatusEmail } = require('../lib/email');

// GET /admin/users - Show all users and audit logs (Restricted to ADMIN)
router.get('/', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.portfolioUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        passkeys: true
      }
    });

    const { action, actorEmail, targetEmail, search, startDate, endDate, pageType, category, tab } = req.query;

    const where = {};

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (actorEmail) {
      where.actorEmail = { contains: actorEmail, mode: 'insensitive' };
    }
    if (targetEmail) {
      where.targetEmail = { contains: targetEmail, mode: 'insensitive' };
    }
    if (pageType) {
      where.details = { contains: `"pageType":"${pageType}"` };
    }
    if (category) {
      if (category === 'user') {
        where.action = { startsWith: 'user.' };
      } else if (category === 'ai_chat') {
        where.action = { startsWith: 'ai_chat.' };
      } else if (category === 'other') {
        where.AND = [
          { NOT: { action: { startsWith: 'user.' } } },
          { NOT: { action: { startsWith: 'ai_chat.' } } }
        ];
      }
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (search) {
      const searchFilter = { contains: search, mode: 'insensitive' };
      where.OR = [
        { action: searchFilter },
        { actorEmail: searchFilter },
        { targetEmail: searchFilter },
        { details: searchFilter }
      ];
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 150
    });

    res.render('admin/users', {
      title: 'User Management',
      users,
      auditLogs,
      filters: { action, actorEmail, targetEmail, search, startDate, endDate, pageType, category },
      activeTab: tab || 'users'
    });
  } catch (err) {
    console.error('Error fetching users and logs:', err);
    res.status(500).render('error', { title: 'Server Error', error: err });
  }
});

// POST /admin/users - Create User (Restricted to ADMIN)
router.post('/', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const { name, email, role, password, sendEmail, emailSubject, emailBody } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  try {
    const existingUser = await prisma.portfolioUser.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.portfolioUser.create({
      data: {
        name: name || null,
        email: email.toLowerCase(),
        role: role || 'VIEWER',
        password: hashedPassword,
        emailVerified: true
      }
    });

    // Log to local and production audit logs
    await logAction({
      action: 'user.create',
      details: {
        createdUser: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        passwordOption: password ? 'custom' : 'generated'
      },
      actorId: req.session.user.id,
      actorEmail: req.session.user.email,
      targetId: newUser.id,
      targetEmail: newUser.email
    });

    // Send email if selected by admin
    if (sendEmail === 'true' || sendEmail === true) {
      const subject = emailSubject || 'Welcome to Harshit Garg Portal';
      const body = emailBody || `Hello ${name || 'User'},\n\nAn account has been created for you with the role: ${role}.\nYour temporary password is: ${password}\n\nPlease login and update your password immediately.`;
      
      sendAccountStatusEmail(newUser.email, newUser.name, subject, body);
    }

    res.json({ success: true, message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /admin/users/edit/:id - Edit User (Restricted to ADMIN)
router.post('/edit/:id', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, email, role, emailVerified } = req.body;

  try {
    const targetUser = await prisma.portfolioUser.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety check: Cannot edit global admin
    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot modify global admin user' });
    }

    const oldData = { name: targetUser.name, email: targetUser.email, role: targetUser.role, emailVerified: targetUser.emailVerified };

    const updatedUser = await prisma.portfolioUser.update({
      where: { id },
      data: {
        name: name || null,
        email: email ? email.toLowerCase() : targetUser.email,
        role: role || targetUser.role,
        emailVerified: emailVerified === 'true' || emailVerified === true
      }
    });

    // Audit log
    await logAction({
      action: 'user.update',
      details: {
        oldData,
        newData: { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, emailVerified: updatedUser.emailVerified }
      },
      actorId: req.session.user.id,
      actorEmail: req.session.user.email,
      targetId: updatedUser.id,
      targetEmail: updatedUser.email
    });

    res.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /admin/users/delete/:id - Delete User (Restricted to ADMIN)
router.post('/delete/:id', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const targetUser = await prisma.portfolioUser.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety check: Cannot delete global admin
    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot delete global admin user' });
    }

    // Safety check: Cannot delete self
    if (targetUser.id === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    await prisma.portfolioUser.delete({
      where: { id }
    });

    // Audit log
    await logAction({
      action: 'user.delete',
      details: {
        deletedUser: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role }
      },
      actorId: req.session.user.id,
      actorEmail: req.session.user.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /admin/users/reset-password/:id - Reset Password (Restricted to ADMIN)
router.post('/reset-password/:id', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { password, sendEmail, emailSubject, emailBody } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const targetUser = await prisma.portfolioUser.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety check: Cannot reset global admin password here
    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot reset global admin password here' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.portfolioUser.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Audit log
    await logAction({
      action: 'user.password_reset',
      details: {
        passwordOption: 'reset'
      },
      actorId: req.session.user.id,
      actorEmail: req.session.user.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email
    });

    // Send email if selected by admin
    if (sendEmail === 'true' || sendEmail === true) {
      const subject = emailSubject || 'Password Reset - Harshit Garg Portal';
      const body = emailBody || `Hello ${targetUser.name || 'User'},\n\nYour account password has been reset by the administrator.\nYour new temporary password is: ${password}\n\nPlease login and update your password immediately.`;
      
      sendAccountStatusEmail(targetUser.email, targetUser.name, subject, body);
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /admin/users/role - Legacy handler fallback (Restricted to ADMIN)
router.post('/role', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing userId or role' });
  }

  try {
    const id = parseInt(userId, 10);
    const targetUser = await prisma.portfolioUser.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot change role of global admin user' });
    }

    const oldRole = targetUser.role;

    await prisma.portfolioUser.update({
      where: { id },
      data: { role }
    });

    await logAction({
      action: 'user.update',
      details: {
        oldRole,
        newRole: role
      },
      actorId: req.session.user.id,
      actorEmail: req.session.user.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email
    });

    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
