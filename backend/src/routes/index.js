const express = require('express');
const authRoutes = require('./auth');
const complaintRoutes = require('./complaints');
const userRoutes = require('./users');
const configRoutes = require('./config');
const dashboardRoutes = require('./dashboard');
const notificationRoutes = require('./notifications');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/users', userRoutes);
router.use('/config', configRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
