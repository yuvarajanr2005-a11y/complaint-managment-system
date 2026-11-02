const path = require('path');
const express = require('express');
const cors = require('cors');
const { clientUrl, nodeEnv } = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/error');

const app = express();

// Core Middleware
app.use(cors({ origin: clientUrl || 'http://localhost:5173' }));
app.use(express.json({ limit: '3mb' }));

// Mount API Routes
app.use('/api', apiRoutes);

// Production Static Client Serving
if (nodeEnv === 'production') {
  const clientBuild = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// Global Error Handler
app.use(errorHandler);

module.exports = app;
