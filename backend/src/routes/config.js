const express = require('express');
const configController = require('../controllers/configController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', configController.getConfig);

// Admin-protected routes
router.use(authenticate, requireAdmin);
router.post('/departments', configController.addDepartment);
router.delete('/departments/:name', configController.removeDepartment);
router.post('/suggestions', configController.addSuggestion);
router.delete('/suggestions/:id', configController.removeSuggestion);

module.exports = router;
