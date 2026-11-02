const Notification = require('../models/Notification');

async function createSystemNotification(io, { user, complaint, message }) {
  const notification = await Notification.create({ user, complaint: complaint._id, message });
  await notification.populate('complaint', 'title createdAt');
  if (io) {
    io.to(`user:${user}`).emit('notification:new', notification);
  }
  return notification;
}

async function createNotification(req, { user, complaint, message }) {
  const io = req.app ? req.app.get('io') : null;
  return createSystemNotification(io, { user, complaint, message });
}

function emitComplaintUpdatedTo(io, complaint) {
  if (!io) return;
  const rooms = [
    `user:${complaint.student?._id || complaint.student}`,
    'role:admin',
    'role:hod',
  ];
  if (complaint.department && complaint.department !== 'Unassigned') {
    rooms.push(`department:${complaint.department}`);
  }
  rooms.push('role:committee');
  io.to(rooms).emit('complaint:updated', complaint);
}

function emitComplaintUpdated(req, complaint) {
  const io = req.app ? req.app.get('io') : null;
  emitComplaintUpdatedTo(io, complaint);
}

function emitComplaintDeletedTo(io, complaint) {
  if (!io) return;
  io.emit('complaint:deleted', {
    _id: complaint._id,
    status: complaint.status,
    department: complaint.department,
    escalated: Boolean(complaint.escalatedAt),
  });
}

function emitComplaintDeleted(req, complaint) {
  const io = req.app ? req.app.get('io') : null;
  emitComplaintDeletedTo(io, complaint);
}

module.exports = {
  createNotification,
  createSystemNotification,
  emitComplaintUpdated,
  emitComplaintUpdatedTo,
  emitComplaintDeleted,
  emitComplaintDeletedTo,
};
