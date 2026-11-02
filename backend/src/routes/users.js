const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.patch('/:id/active', userController.toggleUserStatus);

module.exports = router;
