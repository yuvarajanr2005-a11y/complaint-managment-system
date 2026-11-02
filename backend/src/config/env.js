const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};
