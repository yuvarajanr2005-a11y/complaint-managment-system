const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

function createToken(user) {
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(user.department ? { department: user.department } : {}),
  };
}

async function register(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter your name and a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password, role: 'student' });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const requestedRole = req.body.role;
    const user = await User.findOne({ email }).select('+password');

    if (
      !user ||
      !user.isActive ||
      !(await user.comparePassword(password)) ||
      (requestedRole && user.role !== requestedRole)
    ) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

module.exports = {
  register,
  login,
  me,
};
