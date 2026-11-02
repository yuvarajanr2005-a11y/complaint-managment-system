const Complaint = require('../models/Complaint');

async function getStats(req, res, next) {
  try {
    if (!['admin', 'hod', 'committee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Administrator, department head, or committee access is required.' });
    }
    let departmentFilter = {};
    if (req.user.role === 'hod') {
      const requestedDept = req.query.department;
      if (requestedDept && requestedDept !== 'All') {
        departmentFilter = { department: requestedDept, archivedAt: null };
      } else {
        departmentFilter = { archivedAt: null };
      }
    } else if (req.user.role === 'committee') {
      departmentFilter = { archivedAt: null };
    }
    const [total, submitted, inReview, resolved, rejected, escalated, reviewedByCommittee] = await Promise.all([
      Complaint.countDocuments(departmentFilter),
      Complaint.countDocuments({ ...departmentFilter, status: 'Submitted' }),
      Complaint.countDocuments({ ...departmentFilter, status: 'In Review' }),
      Complaint.countDocuments({ ...departmentFilter, status: 'Resolved' }),
      Complaint.countDocuments({ ...departmentFilter, status: 'Rejected' }),
      Complaint.countDocuments({ escalatedAt: { $ne: null }, archivedAt: null }),
      Complaint.countDocuments({ escalatedAt: { $ne: null }, archivedAt: null, committeeReviewedAt: { $ne: null } }),
    ]);
    res.json({ stats: { total, submitted, inReview, resolved, rejected, escalated, reviewedByCommittee } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
};
