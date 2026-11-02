const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required.');
  }
  const connection = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
}

module.exports = connectDB;
