const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { createNotification } = require('../services/realtimeService');

async function getUsers(req, res, next) {
  try {
    const users = await User.find().select('name email role department isActive createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role;
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';

    if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!['student', 'admin', 'hod', 'committee'].includes(role)) {
      return res.status(400).json({ message: 'Choose a valid account role.' });
    }
    if (role === 'hod' && !department) {
      return res.status(400).json({ message: 'Department is required for HOD accounts.' });
    }

    const user = await User.create({ name, email, password, role, ...(role === 'hod' ? { department } : {}) });
    if (role === 'committee') {
      const existingComplaints = await Complaint.find({ archivedAt: null });
      for (const complaint of existingComplaints) {
        await createNotification(req, {
          user: user._id,
          complaint,
          message: complaint.escalatedAt
            ? `An escalated ${complaint.department} complaint needs committee action: "${complaint.title}".`
            : `A new complaint is available for committee monitoring: "${complaint.title}".`,
        });
      }
    }
    res.status(201).json({
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ message: 'Choose whether this account should be active.' });
    }
    if (req.params.id === req.user.id && !req.body.isActive) {
      return res.status(400).json({ message: 'You cannot disable your own administrator account.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    ).select('name email role department isActive createdAt');
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Account ID is invalid.' });
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus,
};
