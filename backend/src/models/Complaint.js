const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['status', 'department', 'update'], required: true },
    status: { type: String, enum: ['Submitted', 'In Review', 'Resolved', 'Rejected'] },
    department: { type: String, default: 'Unassigned' },
    note: { type: String, trim: true, maxlength: 1500, default: '' },
    actorRole: { type: String, enum: ['student', 'admin', 'hod', 'committee', 'system'], default: 'system' },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'admin', 'hod', 'committee'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Submitted', 'In Review', 'Resolved', 'Rejected'],
      default: 'Submitted',
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
    department: {
      type: String,
      trim: true,
      default: 'Unassigned',
      maxlength: 80,
    },
    attachment: {
      data: { type: String, maxlength: 2800000 },
      contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
      originalName: { type: String, maxlength: 160 },
    },
    history: { type: [historySchema], default: [] },
    messages: { type: [messageSchema], default: [] },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastHodActionAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null, index: true },
    escalationReason: { type: String, trim: true, maxlength: 240, default: '' },
    committeeNote: { type: String, trim: true, maxlength: 1000, default: '' },
    committeeActionDueAt: { type: Date, default: null },
    committeeReviewedAt: { type: Date, default: null },
    committeeReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visitScheduledAt: { type: Date, default: null },
    visitScheduledNote: { type: String, trim: true, maxlength: 500, default: '' },
    visitedAt: { type: Date, default: null },
    visitNote: { type: String, trim: true, maxlength: 1000, default: '' },
    resolutionNote: { type: String, trim: true, maxlength: 1000, default: '' },
    resolvedAt: { type: Date, default: null },
    lastReopenedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.virtual('trackingId').get(function trackingId() {
  const year = this.createdAt
    ? (this.createdAt instanceof Date ? this.createdAt.getFullYear() : new Date(this.createdAt).getFullYear())
    : new Date().getFullYear();
  const rawId = this._id ? this._id.toString() : (this.id || '');
  return `CC-${year}-${rawId.slice(-6).toUpperCase()}`;
});

complaintSchema.set('toJSON', { virtuals: true });
complaintSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);
