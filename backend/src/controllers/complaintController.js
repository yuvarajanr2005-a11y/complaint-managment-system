const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { parseAndValidateAttachment } = require('../utils/helpers');
const {
  createNotification,
  emitComplaintUpdated,
  emitComplaintDeleted,
} = require('../services/realtimeService');

const statuses = ['Submitted', 'In Review', 'Resolved', 'Rejected'];

async function getComplaints(req, res, next) {
  try {
    let filter;
    if (req.user.role === 'admin') {
      filter = {};
    } else if (req.user.role === 'hod') {
      const requestedDept = req.query.department;
      if (requestedDept && requestedDept !== 'All') {
        filter = { department: requestedDept, archivedAt: null };
      } else {
        filter = { archivedAt: null };
      }
    } else if (req.user.role === 'committee') {
      filter = { archivedAt: null };
    } else {
      filter = { student: req.user.id, archivedAt: null };
    }
    const complaints = await Complaint.find(filter)
      .populate('student', 'name email')
      .populate('messages.sender', 'name role')
      .populate('committeeReviewedBy', 'name')
      .sort({ createdAt: -1 });
    if (req.user.role !== 'admin') {
      for (const complaint of complaints) {
        for (const message of complaint.messages) {
          if (message.deletedAt) message.message = 'Message removed by an administrator.';
        }
      }
    }
    res.json({ complaints });
  } catch (error) {
    next(error);
  }
}

async function createComplaint(req, res, next) {
  try {
    const { title, description, category, priority, attachment } = req.body;
    if (
      typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 3000 ||
      typeof category !== 'string' || !category.trim() ||
      (priority !== undefined && !['Low', 'Medium', 'High'].includes(priority))
    ) {
      return res.status(400).json({ message: 'Check the complaint details and try again.' });
    }

    let savedAttachment;
    try {
      savedAttachment = parseAndValidateAttachment(attachment);
    } catch (attErr) {
      return res.status(400).json({ message: attErr.message });
    }

    const department = category === 'Other' ? 'Student Affairs' : category;
    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || 'Medium',
      student: req.user.id,
      ...(savedAttachment ? { attachment: savedAttachment } : {}),
      department,
      history: [{ type: 'status', status: 'Submitted', department, note: 'Complaint submitted', actorRole: 'student' }],
    });

    const departmentHeads = await User.find({
      role: 'hod',
      department,
      isActive: { $ne: false },
    }).select('_id');
    let routingNotice;
    if (departmentHeads.length) {
      for (const departmentHead of departmentHeads) {
        await createNotification(req, {
          user: departmentHead._id,
          complaint,
          message: `A new ${department} complaint needs your review.`,
        });
      }
    } else {
      const administrators = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id');
      for (const administrator of administrators) {
        await createNotification(req, {
          user: administrator._id,
          complaint,
          message: `No active HOD is assigned to ${department}. Please assign or activate a department HOD for "${complaint.title}".`,
        });
      }
      routingNotice = `Your complaint was submitted, but there is no active HOD for ${department}. The administrator has been notified.`;
      await createNotification(req, {
        user: req.user.id,
        complaint,
        message: routingNotice,
      });
    }

    const committeeMembers = await User.find({
      role: 'committee',
      isActive: { $ne: false },
    }).select('_id');
    for (const member of committeeMembers) {
      await createNotification(req, {
        user: member._id,
        complaint,
        message: `A new complaint is available for committee monitoring: "${complaint.title}".`,
      });
    }

    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.status(201).json({ complaint, ...(routingNotice ? { routingNotice } : {}) });
  } catch (error) {
    next(error);
  }
}

async function updateComplaint(req, res, next) {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    const isOwner = String(complaint.student) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to edit this complaint.' });
    }

    if (complaint.status === 'Resolved' && !isAdmin) {
      return res.status(400).json({ message: 'Resolved complaints cannot be edited. Please reopen the complaint if the issue persists.' });
    }

    const { title, description, category, priority, attachment } = req.body;
    if (
      typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 3000 ||
      typeof category !== 'string' || !category.trim() ||
      (priority !== undefined && !['Low', 'Medium', 'High'].includes(priority))
    ) {
      return res.status(400).json({ message: 'Check the complaint details and try again.' });
    }

    let savedAttachment;
    try {
      savedAttachment = parseAndValidateAttachment(attachment);
    } catch (attErr) {
      return res.status(400).json({ message: attErr.message });
    }

    complaint.title = title.trim();
    complaint.description = description.trim();
    const oldCategory = complaint.category;
    complaint.category = category;
    if (priority) complaint.priority = priority;

    if (category !== oldCategory && complaint.status === 'Submitted') {
      complaint.department = category === 'Other' ? 'Student Affairs' : category;
    }

    if (savedAttachment === null) {
      complaint.attachment = undefined;
    } else if (savedAttachment !== undefined) {
      complaint.attachment = savedAttachment;
    }

    complaint.history.push({
      type: 'update',
      status: complaint.status,
      department: complaint.department,
      note: isOwner ? 'Complaint details updated by student' : 'Complaint details updated by administrator',
      actorRole: isAdmin ? 'admin' : 'student',
    });

    await complaint.save();

    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
      { path: 'committeeReviewedBy', select: 'name' },
    ]);

    await emitComplaintUpdated(req, complaint);
    res.json({ complaint, message: 'Complaint updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function deleteComplaint(req, res, next) {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    const isOwner = String(complaint.student) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this complaint.' });
    }

    await Notification.deleteMany({ complaint: complaint._id });
    await Complaint.findByIdAndDelete(complaint._id);

    emitComplaintDeleted(req, complaint);

    res.json({ success: true, message: 'Complaint deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function bulkActions(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Administrator access is required.' });
    }
    const { ids, action, status, department } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'Select at least one complaint.' });
    }

    if (action === 'delete') {
      const complaints = await Complaint.find({ _id: { $in: ids } });
      await Notification.deleteMany({ complaint: { $in: ids } });
      await Complaint.deleteMany({ _id: { $in: ids } });
      for (const complaint of complaints) {
        emitComplaintDeleted(req, complaint);
      }
      return res.json({ success: true, count: complaints.length, message: `Successfully deleted ${complaints.length} complaints.` });
    }

    if (action === 'status') {
      if (!statuses.includes(status)) {
        return res.status(400).json({ message: 'Enter a valid status.' });
      }
      const complaints = await Complaint.find({ _id: { $in: ids } });
      for (const complaint of complaints) {
        if (complaint.status !== status) {
          complaint.status = status;
          if (status === 'Resolved' && !complaint.resolvedAt) {
            complaint.resolvedAt = new Date();
            complaint.resolutionNote = complaint.resolutionNote || 'Resolved via bulk action by administrator.';
          }
          complaint.history.push({
            type: 'status',
            status,
            department: complaint.department,
            note: `Status updated to ${status} via bulk admin action`,
            actorRole: 'admin',
          });
          await complaint.save();
          await Complaint.populate(complaint, [
            { path: 'student', select: 'name email' },
            { path: 'messages.sender', select: 'name role' },
            { path: 'committeeReviewedBy', select: 'name' },
          ]);
          emitComplaintUpdated(req, complaint);
        }
      }
      return res.json({ success: true, count: complaints.length, message: `Successfully updated status for ${complaints.length} complaints.` });
    }

    if (action === 'department') {
      if (!department || typeof department !== 'string') {
        return res.status(400).json({ message: 'Enter a valid department.' });
      }
      const complaints = await Complaint.find({ _id: { $in: ids } });
      for (const complaint of complaints) {
        if (complaint.department !== department) {
          complaint.department = department;
          complaint.history.push({
            type: 'department',
            status: complaint.status,
            department,
            note: `Reassigned to ${department} via bulk admin action`,
            actorRole: 'admin',
          });
          await complaint.save();
          await Complaint.populate(complaint, [
            { path: 'student', select: 'name email' },
            { path: 'messages.sender', select: 'name role' },
            { path: 'committeeReviewedBy', select: 'name' },
          ]);
          emitComplaintUpdated(req, complaint);
        }
      }
      return res.json({ success: true, count: complaints.length, message: `Successfully reassigned ${complaints.length} complaints to ${department}.` });
    }

    return res.status(400).json({ message: 'Invalid bulk action.' });
  } catch (error) {
    next(error);
  }
}

async function postMessage(req, res, next) {
  try {
    if (!['student', 'admin', 'hod', 'committee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Your account cannot send complaint messages.' });
    }
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 2000) {
      return res.status(400).json({ message: 'Enter a message of 1 to 2000 characters.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (req.user.role === 'student' && String(complaint.student) !== req.user.id) {
      return res.status(403).json({ message: 'You can only message on your own complaints.' });
    }
    if (req.user.role === 'hod' && complaint.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only message students about complaints assigned to your department.' });
    }
    if (req.user.role === 'committee' && !complaint.escalatedAt) {
      return res.status(403).json({ message: 'The committee can only message on escalated complaints.' });
    }

    if (req.user.role === 'hod') complaint.lastHodActionAt = new Date();
    complaint.messages.push({
      sender: req.user.id,
      senderRole: req.user.role,
      message,
    });
    await complaint.save();
    const sentMessage = complaint.messages[complaint.messages.length - 1];
    if (req.user.role === 'student') {
      const departmentHead = await User.findOne({ role: 'hod', department: complaint.department }).select('_id');
      if (departmentHead) {
        await createNotification(req, {
          user: departmentHead._id,
          complaint,
          message: `A student replied to "${complaint.title}".`,
        });
      }
    } else {
      await createNotification(req, {
        user: complaint.student,
        complaint,
        message: `${req.user.role === 'hod' ? `${req.user.department} HOD` : req.user.role === 'committee' ? 'Grievance committee' : 'Administrator'} sent you a message about "${complaint.title}".`,
      });
    }
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.status(201).json({ complaint, message: sentMessage });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Complaint ID is invalid.' });
    }
    next(error);
  }
}

async function updateMessage(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an administrator can edit complaint messages.' });
    }
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 2000) {
      return res.status(400).json({ message: 'Enter a message of 1 to 2000 characters.' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    const messageEntry = complaint.messages.id(req.params.messageId);
    if (!messageEntry || messageEntry.deletedAt) return res.status(404).json({ message: 'Message not found.' });
    messageEntry.message = message;
    messageEntry.editedAt = new Date();
    await complaint.save();
    await createNotification(req, {
      user: complaint.student,
      complaint,
      message: `An administrator edited a message about "${complaint.title}".`,
    });
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint or message ID is invalid.' });
    next(error);
  }
}

async function deleteMessage(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an administrator can moderate complaint messages.' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    const messageEntry = complaint.messages.id(req.params.messageId);
    if (!messageEntry || messageEntry.deletedAt) return res.status(404).json({ message: 'Message not found.' });
    messageEntry.deletedAt = new Date();
    messageEntry.deletedBy = req.user.id;
    await complaint.save();
    await createNotification(req, {
      user: complaint.student,
      complaint,
      message: `An administrator moderated a message about "${complaint.title}".`,
    });
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint or message ID is invalid.' });
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    if (!['admin', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Administrator or department head access is required.' });
    }
    const { status, adminNote = '' } = req.body;
    const priority = req.body.priority;
    const department = req.user.role === 'admin'
      ? req.body.department || 'Unassigned'
      : req.user.department;
    if (
      !statuses.includes(status) ||
      typeof adminNote !== 'string' || adminNote.length > 1000 ||
      typeof department !== 'string' || !department.trim() ||
      (priority !== undefined && !['Low', 'Medium', 'High'].includes(priority))
    ) {
      return res.status(400).json({ message: 'Enter a valid status, department, and note.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (status === 'Resolved' && complaint.status !== 'Resolved') {
      if (!adminNote || adminNote.trim().length < 5) {
        return res.status(400).json({ message: 'A resolution report or note (at least 5 characters) is required to resolve this complaint.' });
      }
      complaint.resolutionNote = adminNote.trim();
      complaint.resolvedAt = new Date();
    }
    const previousStatus = complaint.status;
    const previousDepartment = complaint.department;
    const previousPriority = complaint.priority;
    const note = adminNote.trim();
    const statusChanged = previousStatus !== status;
    const departmentChanged = previousDepartment !== department;
    const nextPriority = priority || previousPriority;
    const priorityChanged = previousPriority !== nextPriority;
    const noteChanged = complaint.adminNote !== note;

    complaint.status = status;
    complaint.department = department;
    complaint.priority = nextPriority;
    complaint.adminNote = note;
    if (statusChanged || departmentChanged || priorityChanged || noteChanged) {
      if (!complaint.history.length) {
        complaint.history.push({
          type: 'status',
          status: previousStatus,
          department: previousDepartment,
          note: 'Complaint submitted',
          actorRole: 'student',
          createdAt: complaint.createdAt,
        });
      }
      complaint.history.push({
        type: statusChanged ? 'status' : departmentChanged ? 'department' : 'update',
        status,
        department,
        note,
        actorRole: req.user.role,
      });
      if (req.user.role === 'hod' && (statusChanged || noteChanged)) {
        complaint.lastHodActionAt = new Date();
      }
      await complaint.save();
      await createNotification(req, {
        user: complaint.student,
        complaint,
        message: statusChanged
          ? `Your complaint status changed to ${status}.`
          : departmentChanged
            ? `Your complaint was assigned to ${department}.`
            : `${req.user.role === 'hod' ? 'Department head' : 'Campus team'} added an update to your complaint.`,
      });
      if (departmentChanged) {
        const departmentHead = await User.findOne({ role: 'hod', department }).select('_id');
        if (departmentHead) {
          await createNotification(req, {
            user: departmentHead._id,
            complaint,
            message: `A complaint has been assigned to your ${department} department.`,
          });
        }
      }
    }
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Complaint ID is invalid.' });
    }
    next(error);
  }
}

async function updateVisit(req, res, next) {
  try {
    if (!['admin', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Administrator or department HOD access is required.' });
    }
    const { action } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (req.user.role === 'hod' && complaint.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only manage visits for your department complaints.' });
    }
    if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
      return res.status(400).json({ message: 'Visits can only be updated for active complaints.' });
    }

    let notificationMessage;
    if (action === 'schedule') {
      const scheduledAt = new Date(req.body.scheduledAt);
      const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date() || note.length > 500) {
        return res.status(400).json({ message: 'Choose a future visit date and time and enter a note up to 500 characters.' });
      }
      complaint.visitScheduledAt = scheduledAt;
      complaint.visitScheduledNote = note;
      complaint.history.push({
        type: 'update',
        status: complaint.status,
        department: complaint.department,
        note: `On-site visit planned for ${scheduledAt.toISOString()}.${note ? ` ${note}` : ''}`,
        actorRole: req.user.role,
      });
      notificationMessage = `A visit for your complaint is planned for ${scheduledAt.toLocaleString()}.`;
    } else if (action === 'complete') {
      const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
      if (!note || note.length > 1000) {
        return res.status(400).json({ message: 'Enter a visit report of 1 to 1000 characters.' });
      }
      complaint.visitedAt = new Date();
      complaint.visitNote = note;
      complaint.history.push({
        type: 'update',
        status: complaint.status,
        department: complaint.department,
        note: `On-site visit completed. ${note}`,
        actorRole: req.user.role,
      });
      notificationMessage = 'The HOD/Admin visited the issue and added a visit report.';
    } else {
      return res.status(400).json({ message: 'Choose whether to schedule or complete the visit.' });
    }

    if (req.user.role === 'hod') complaint.lastHodActionAt = new Date();
    await complaint.save();
    await createNotification(req, { user: complaint.student, complaint, message: notificationMessage });
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
      { path: 'committeeReviewedBy', select: 'name' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint ID is invalid.' });
    next(error);
  }
}

async function resolveComplaint(req, res, next) {
  try {
    if (!['admin', 'hod'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Administrator or department HOD access is required.' });
    }
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!note || note.length > 1000) {
      return res.status(400).json({ message: 'Enter a resolution report of 1 to 1000 characters.' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (req.user.role === 'hod' && complaint.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only resolve complaints assigned to your department.' });
    }
    if (complaint.status === 'Rejected') {
      return res.status(400).json({ message: 'A rejected complaint cannot be resolved. Reopen it first.' });
    }
    if (complaint.status === 'Resolved') {
      return res.status(400).json({ message: 'This complaint is already resolved.' });
    }

    complaint.status = 'Resolved';
    complaint.resolutionNote = note;
    complaint.resolvedAt = new Date();
    complaint.history.push({
      type: 'status',
      status: 'Resolved',
      department: complaint.department,
      note: `Resolved: ${note}`,
      actorRole: req.user.role,
    });
    if (req.user.role === 'hod') complaint.lastHodActionAt = new Date();
    await complaint.save();
    await createNotification(req, {
      user: complaint.student,
      complaint,
      message: `Your complaint was marked resolved. ${note}`,
    });
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
      { path: 'committeeReviewedBy', select: 'name' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint ID is invalid.' });
    next(error);
  }
}

async function reopenComplaint(req, res, next) {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only the student who raised this complaint can request it to be reopened.' });
    }
    if (!note || note.length > 1000) {
      return res.status(400).json({ message: 'Explain why the issue is still not fixed (up to 1000 characters).' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (String(complaint.student) !== req.user.id) {
      return res.status(403).json({ message: 'You can only reopen your own complaints.' });
    }
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ message: 'Only a resolved complaint can be reopened.' });
    }

    complaint.status = 'Submitted';
    complaint.lastReopenedAt = new Date();
    complaint.lastHodActionAt = null;
    complaint.resolutionNote = '';
    complaint.resolvedAt = null;
    complaint.visitScheduledAt = null;
    complaint.visitScheduledNote = '';
    complaint.visitedAt = null;
    complaint.visitNote = '';
    complaint.history.push({
      type: 'status',
      status: 'Submitted',
      department: complaint.department,
      note: `Student requested reopening: ${note}`,
      actorRole: 'student',
    });
    await complaint.save();
    const departmentHead = await User.findOne({
      role: 'hod',
      department: complaint.department,
      isActive: { $ne: false },
    }).select('_id');
    if (departmentHead) {
      await createNotification(req, {
        user: departmentHead._id,
        complaint,
        message: `A student says "${complaint.title}" is still not fixed and requested that it be reopened.`,
      });
    }
    const staffRecipients = await User.find({
      role: { $in: ['admin', 'committee'] },
      isActive: { $ne: false },
    }).select('_id');
    for (const recipient of staffRecipients) {
      await createNotification(req, {
        user: recipient._id,
        complaint,
        message: `A student reopened "${complaint.title}" because the issue is still not fixed.`,
      });
    }
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
      { path: 'committeeReviewedBy', select: 'name' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint ID is invalid.' });
    next(error);
  }
}

async function committeeReview(req, res, next) {
  try {
    if (req.user.role !== 'committee') {
      return res.status(403).json({ message: 'Grievance committee access is required.' });
    }
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    const dueAtValue = req.body.actionDueAt;
    const defaultThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const actionDueAt = dueAtValue ? new Date(dueAtValue) : defaultThreeDays;
    if (!note || note.length > 2000) {
      return res.status(400).json({ message: 'Please provide warning instructions (up to 2000 characters).' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    if (!complaint.escalatedAt) {
      complaint.escalatedAt = new Date();
      complaint.escalationReason = 'Intervened and escalated by the Grievance Escalation Committee with an official 3-day action warning.';
    }

    complaint.committeeNote = note;
    complaint.committeeActionDueAt = actionDueAt;
    complaint.committeeReviewedAt = new Date();
    complaint.committeeReviewedBy = req.user.id;
    complaint.history.push({
      type: 'update',
      status: complaint.status,
      department: complaint.department,
      note: `⚠️ Official 3-Day Warning Issued by Committee. Directive Instructions: "${note}". Action Deadline: ${actionDueAt.toLocaleDateString()} ${actionDueAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      actorRole: 'committee',
    });
    await complaint.save();

    const formattedDeadline = actionDueAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // 1. Notify Department HOD
    const departmentHeads = await User.find({
      role: 'hod',
      department: complaint.department,
      isActive: { $ne: false },
    }).select('_id');
    for (const hod of departmentHeads) {
      await createNotification(req, {
        user: hod._id,
        complaint,
        message: `⚠️ 3-DAY WARNING NOTICE: Grievance Committee issued an action directive on "${complaint.title}". Instructions: ${note}. Action due by ${formattedDeadline}.`,
      });
    }

    // 2. Notify Campus Administrators
    const administrators = await User.find({
      role: 'admin',
      isActive: { $ne: false },
    }).select('_id');
    for (const admin of administrators) {
      await createNotification(req, {
        user: admin._id,
        complaint,
        message: `⚠️ 3-DAY WARNING NOTICE issued to ${complaint.department} HOD on "${complaint.title}". Instructions: ${note}. Action due by ${formattedDeadline}.`,
      });
    }

    // 3. Notify Student Submitter
    await createNotification(req, {
      user: complaint.student,
      complaint,
      message: `The Grievance Committee has issued an official 3-day action directive to the ${complaint.department} HOD regarding your complaint: "${complaint.title}".`,
    });

    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
      { path: 'committeeReviewedBy', select: 'name' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint ID is invalid.' });
    next(error);
  }
}

async function archiveComplaint(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an administrator can archive or restore complaints.' });
    }
    if (typeof req.body.archived !== 'boolean') {
      return res.status(400).json({ message: 'Choose whether to archive or restore this complaint.' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    complaint.archivedAt = req.body.archived ? new Date() : null;
    complaint.archivedBy = req.body.archived ? req.user.id : null;
    await complaint.save();
    await Complaint.populate(complaint, [
      { path: 'student', select: 'name email' },
      { path: 'messages.sender', select: 'name role' },
    ]);
    await emitComplaintUpdated(req, complaint);
    res.json({ complaint });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Complaint ID is invalid.' });
    next(error);
  }
}

module.exports = {
  getComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  bulkActions,
  postMessage,
  updateMessage,
  deleteMessage,
  updateStatus,
  updateVisit,
  resolveComplaint,
  reopenComplaint,
  committeeReview,
  archiveComplaint,
};
