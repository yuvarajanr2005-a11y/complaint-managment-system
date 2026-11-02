# College Grievance & Complaint Management System — Backend API

Modern, secure, and production-grade REST API and WebSocket server built with Node.js, Express, Socket.IO, and MongoDB (Mongoose).

## Architecture & Directory Structure

```
src/
├── config/             # Database connection and environment variables
│   ├── db.js
│   └── env.js
├── controllers/        # Request handlers & HTTP business logic
│   ├── authController.js
│   ├── complaintController.js
│   ├── configController.js
│   ├── dashboardController.js
│   ├── notificationController.js
│   └── userController.js
├── middleware/         # Authentication, authorization, and error handling
│   ├── auth.js
│   └── error.js
├── models/             # Mongoose schemas & data models
│   ├── CampusConfig.js
│   ├── Complaint.js
│   ├── Notification.js
│   └── User.js
├── routes/             # API route declarations & endpoints
│   ├── auth.js
│   ├── complaints.js
│   ├── config.js
│   ├── dashboard.js
│   ├── index.js
│   ├── notifications.js
│   └── users.js
├── services/           # Background tasks & real-time socket events
│   ├── escalationService.js
│   └── realtimeService.js
├── utils/              # Helper utilities & database seeders
│   ├── helpers.js
│   ├── seedAdmin.js
│   └── seedDemo.js
├── app.js              # Express app setup and middleware configuration
└── index.js            # Server entry point (HTTP & Socket.IO listener)
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and provide your MongoDB connection string and JWT secret:
```bash
cp .env.example .env
```

### 3. Run the Development Server
```bash
npm run dev
```

### 4. Seed Initial Data
```bash
npm run seed:demo
```
