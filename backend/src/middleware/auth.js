const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

async function authenticate(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: 'Your account could not be found.' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account has been disabled. Contact an administrator.' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!['admin', 'hod', 'committee'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Staff access is required.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireStaff };
