const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 8 characters in .env.');
  }

  await connectDB();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Administrator already exists: ${email}`);
    return;
  }
  await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`Administrator created: ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Unable to create administrator:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });
