const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = require('./app');
const connectDB = require('./config/db');
const { port, clientUrl, jwtSecret } = require('./config/env');
const User = require('./models/User');
const { startEscalationMonitor } = require('./services/escalationService');

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: { origin: clientUrl || 'http://localhost:5173' },
});
app.set('io', io);

// Socket Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));

    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.userId).select('_id role department isActive');
    if (!user || !user.isActive) return next(new Error('Authentication required.'));

    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication required.'));
  }
});

// Socket Room Subscriptions
io.on('connection', (socket) => {
  const { user } = socket.data;
  socket.join(`user:${user.id}`);
  if (user.role === 'admin') socket.join('role:admin');
  if (user.role === 'committee') socket.join('role:committee');
  if (user.role === 'hod') {
    socket.join('role:hod');
    if (user.department) socket.join(`department:${user.department}`);
  }
});

// Connect to Database and Start Server
connectDB()
  .then(() => {
    startEscalationMonitor(io);
    server.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Unable to start the server:', error);
    process.exit(1);
  });

module.exports = { app, server, io };
