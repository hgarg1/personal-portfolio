const prisma = require('./prisma');

function ensureGlobalAdmin(req) {
  if (req.session && req.session.user) {
    if (req.session.user.email === 'garg.archie@gmail.com') {
      req.session.user.role = 'ADMIN';
    }
  }
}

function isAuthenticated(req, res, next) {
  ensureGlobalAdmin(req);
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth');
}

function hasRole(allowedRoles) {
  return (req, res, next) => {
    ensureGlobalAdmin(req);
    if (!req.session || !req.session.user) {
      return res.redirect('/auth');
    }
    const user = req.session.user;
    if (allowedRoles.includes(user.role)) {
      return next();
    }
    res.status(403).render('error', {
      title: 'Access Denied',
      error: new Error('You do not have permission to access this resource.')
    });
  };
}

module.exports = {
  isAuthenticated,
  hasRole,
  ensureGlobalAdmin
};
