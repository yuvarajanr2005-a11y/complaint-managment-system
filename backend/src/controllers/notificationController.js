const Notification = require('../models/Notification');

async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('complaint', 'title createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .limit(30);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { user: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAllAsRead,
};
