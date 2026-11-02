const express = require('express');
const complaintController = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Main Complaint CRUD
router.get('/', complaintController.getComplaints);
router.post('/', complaintController.createComplaint);
router.patch('/:id', complaintController.updateComplaint);
router.delete('/:id', complaintController.deleteComplaint);

// Bulk Actions
router.post('/bulk', complaintController.bulkActions);

// Messaging & Moderation
router.post('/:id/messages', complaintController.postMessage);
router.patch('/:id/messages/:messageId', complaintController.updateMessage);
router.delete('/:id/messages/:messageId', complaintController.deleteMessage);

// Workflow Status, Visits & Actions
router.patch('/:id/status', complaintController.updateStatus);
router.patch('/:id/visit', complaintController.updateVisit);
router.patch('/:id/resolve', complaintController.resolveComplaint);
router.patch('/:id/reopen', complaintController.reopenComplaint);
router.patch('/:id/committee-review', complaintController.committeeReview);
router.patch('/:id/archive', complaintController.archiveComplaint);

module.exports = router;
