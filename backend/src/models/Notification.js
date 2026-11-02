const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    message: { type: String, required: true, maxlength: 1000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
