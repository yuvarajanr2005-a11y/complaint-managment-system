const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { createSystemNotification, emitComplaintUpdatedTo } = require('./realtimeService');

const escalationDelayMs = 3 * 24 * 60 * 60 * 1000;
const escalationReason = 'Automatically escalated because the department HOD took no action within 3 days.';

function latestHistoricalHodAction(complaint, after = new Date(0)) {
  const activities = [
    ...complaint.history
      .filter((item) => item.actorRole === 'hod' && item.createdAt > after)
      .map((item) => item.createdAt),
    ...complaint.messages
      .filter((item) => item.senderRole === 'hod' && item.createdAt > after)
      .map((item) => item.createdAt),
  ].filter(Boolean);
  return activities.length ? new Date(Math.max(...activities.map((date) => new Date(date).getTime()))) : null;
}

async function escalateOverdueComplaints(io, now = new Date()) {
  const cutoff = new Date(now.getTime() - escalationDelayMs);
  const eligibleComplaints = await Complaint.find({
    archivedAt: null,
    escalatedAt: null,
    status: { $nin: ['Resolved', 'Rejected'] },
    $expr: {
      $and: [
        { $lte: [{ $ifNull: ['$lastReopenedAt', '$createdAt'] }, cutoff] },
        {
          $or: [
            { $eq: [{ $ifNull: ['$lastHodActionAt', null] }, null] },
            { $gt: ['$lastHodActionAt', { $add: [{ $ifNull: ['$lastReopenedAt', '$createdAt'] }, escalationDelayMs] }] },
          ],
        },
      ],
    },
  });
  if (!eligibleComplaints.length) return 0;

  const committeeMembers = await User.find({ role: 'committee', isActive: { $ne: false } }).select('_id');
  if (!committeeMembers.length) {
    console.warn('Overdue complaints were found, but no active grievance committee account exists.');
  }

  let escalatedCount = 0;
  for (const candidate of eligibleComplaints) {
    const actionWindowStart = candidate.lastReopenedAt || candidate.createdAt;
    const historicalAction = latestHistoricalHodAction(candidate, actionWindowStart);
    const lastHodActionAt = candidate.lastHodActionAt || historicalAction;
    const deadline = new Date(actionWindowStart.getTime() + escalationDelayMs);
    if (lastHodActionAt && lastHodActionAt <= deadline) {
      if (!candidate.lastHodActionAt) {
        await Complaint.updateOne(
          {
            _id: candidate._id,
            escalatedAt: null,
            lastReopenedAt: candidate.lastReopenedAt || null,
            $or: [{ lastHodActionAt: null }, { lastHodActionAt: { $exists: false } }],
          },
          { $set: { lastHodActionAt } }
        );
      }
      continue;
    }

    const escalation = await Complaint.updateOne(
      {
        _id: candidate._id,
        escalatedAt: null,
        archivedAt: null,
        status: { $nin: ['Resolved', 'Rejected'] },
        lastReopenedAt: candidate.lastReopenedAt || null,
        $or: [
          { lastHodActionAt: null },
          { lastHodActionAt: { $exists: false } },
          { lastHodActionAt: { $gt: deadline } },
        ],
        $expr: { $lte: [{ $ifNull: ['$lastReopenedAt', '$createdAt'] }, cutoff] },
      },
      {
        $set: { escalatedAt: now, escalationReason },
        $push: {
          history: {
            type: 'update',
            status: candidate.status,
            department: candidate.department,
            note: escalationReason,
            actorRole: 'system',
            createdAt: now,
          },
        },
      }
    );
    if (!escalation.modifiedCount) continue;

    const complaint = await Complaint.findById(candidate._id)
      .populate('student', 'name email')
      .populate('messages.sender', 'name role');
    for (const member of committeeMembers) {
      await createSystemNotification(io, {
        user: member._id,
        complaint,
        message: `A ${complaint.department} complaint needs committee review: "${complaint.title}".`,
      });
    }
    await createSystemNotification(io, {
      user: complaint.student._id,
      complaint,
      message: 'Your complaint was escalated to the Grievance Escalation Committee because there was no HOD action within 3 days.',
    });
    emitComplaintUpdatedTo(io, complaint);
    escalatedCount += 1;
  }
  return escalatedCount;
}

function startEscalationMonitor(io) {
  const check = () => escalateOverdueComplaints(io)
    .catch((error) => console.error('Unable to process complaint escalations:', error));
  check();
  return setInterval(check, 60 * 1000);
}

module.exports = { escalateOverdueComplaints, startEscalationMonitor };
