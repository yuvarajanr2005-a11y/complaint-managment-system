const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, dashboardController.getStats);

module.exports = router;
