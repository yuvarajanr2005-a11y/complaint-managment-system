const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

const demoAccounts = [
  {
    name: 'Demo Student',
    email: 'student@mycollege.demo',
    password: 'Student123!',
    role: 'student',
  },
  {
    name: 'Demo Administrator',
    email: 'admin@mycollege.demo',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    name: 'Demo Grievance Committee',
    email: 'committee@mycollege.demo',
    password: 'Committee123!',
    role: 'committee',
  },
  {
    name: 'Demo Academics HOD',
    email: 'academics.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Academics',
  },
  {
    name: 'Demo Facilities HOD',
    email: 'facilities.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Facilities',
  },
  {
    name: 'Demo Hostel HOD',
    email: 'hostel.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Hostel',
  },
  {
    name: 'Demo Transport HOD',
    email: 'transport.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Transport',
  },
  {
    name: 'Demo Cafeteria HOD',
    email: 'cafeteria.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Cafeteria',
  },
  {
    name: 'Demo Student Affairs HOD',
    email: 'student-affairs.hod@mycollege.demo',
    password: 'Hod12345!',
    role: 'hod',
    department: 'Student Affairs',
  },
];

async function seedDemo() {
  await connectDB();

  for (const account of demoAccounts) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      console.log(`Demo ${account.role} account already exists: ${account.email}`);
      continue;
    }
    await User.create(account);
    console.log(`Created demo ${account.role} account: ${account.email}`);
  }

  const unassignedComplaints = await Complaint.find({
    $or: [{ department: 'Unassigned' }, { department: { $exists: false } }],
  });
  for (const complaint of unassignedComplaints) {
    complaint.department = complaint.category === 'Other' ? 'Student Affairs' : complaint.category;
    if (!complaint.history.length) {
      complaint.history.push({
        type: 'status',
        status: complaint.status,
        department: complaint.department,
        note: 'Complaint submitted',
        actorRole: 'student',
        createdAt: complaint.createdAt,
      });
    }
    await complaint.save();
  }
  if (unassignedComplaints.length) {
    console.log(`Routed ${unassignedComplaints.length} existing complaint(s) to their departments.`);
  }

  const activeComplaints = await Complaint.find({ archivedAt: null }).select('_id title department escalatedAt');
  const committeeMembers = await User.find({ role: 'committee', isActive: { $ne: false } }).select('_id');
  let committeeNotificationCount = 0;
  for (const complaint of activeComplaints) {
    for (const member of committeeMembers) {
      const exists = await Notification.exists({
        user: member._id,
        complaint: complaint._id,
        message: /committee/i,
      });
      if (exists) continue;
      await Notification.create({
        user: member._id,
        complaint: complaint._id,
        message: complaint.escalatedAt
          ? `An escalated ${complaint.department} complaint needs committee action: "${complaint.title}".`
          : `A complaint is available for committee monitoring: "${complaint.title}".`,
      });
      committeeNotificationCount += 1;
    }
  }
  if (committeeNotificationCount) {
    console.log(`Notified the committee about ${committeeNotificationCount} existing complaint(s).`);
  }

  let notificationCount = 0;
  for (const complaint of activeComplaints) {
    const departmentHead = await User.findOne({ role: 'hod', department: complaint.department, isActive: { $ne: false } }).select('_id');
    if (!departmentHead) continue;
    const exists = await Notification.exists({ user: departmentHead._id, complaint: complaint._id });
    if (exists) continue;
    await Notification.create({
      user: departmentHead._id,
      complaint: complaint._id,
      message: `An existing ${complaint.department} complaint needs your review: "${complaint.title}".`,
    });
    notificationCount += 1;
  }
  if (notificationCount) console.log(`Notified department heads about ${notificationCount} existing complaint(s).`);
}

seedDemo()
  .catch((error) => {
    console.error('Unable to create demo accounts:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });
