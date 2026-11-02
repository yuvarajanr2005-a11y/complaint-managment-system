# CampusCare — College Complaint Management System

A MERN application for students to submit and track campus complaints, and for administrators to review and update them.

## Features

- Student registration and sign-in with hashed passwords and JWT authentication
- Separate student, administrator, and department-head sign-in portals
- Grievance Escalation Committee monitoring of all complaints and escalation when no HOD action is recorded within three days
- Complaint submission with category and priority
- Private student complaint lists and an all-campus admin inbox
- Admin dashboard counts and complaint status updates with a note for the student
- Complaint history timeline with status, department, and administrator updates
- Department assignment for complaint handling
- New complaints are routed to the HOD for the matching category/department; "Other" routes to Student Affairs
- Optional JPG, PNG, WEBP, or GIF complaint photo attachment (up to 2 MB)
- In-app student notifications when administrators update a complaint
- Automatic escalation notifications to the committee and student, with committee review notes and requested action deadlines
- Live two-way message thread between students and their assigned HOD or an administrator
- Instant in-app complaint updates and notifications while users are signed in
- Admin account management for student, admin, and department-HOD accounts, including sign-in enable/disable
- Admin message moderation with edit history and reversible soft removal
- Admin complaint priority management and archive/restore controls
- HOD/Admin visit scheduling and visit reports; a required resolution report before marking a complaint resolved
- Student reopening requests for issues that remain unresolved, with history and notifications to the HOD, Admin, and Committee
- Visit plans, completed visit reports, resolution details, and reopen history visible in Student, HOD, Admin, and Committee complaint details
- Shareable complaint tracking IDs in the format `CC-YYYY-XXXXXX`
- Search and status filters
- Responsive React interface

## Requirements

- Node.js 18 or newer
- MongoDB running locally or an accessible MongoDB connection string

## Run locally

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGODB_URI` to your MongoDB connection string and replace `JWT_SECRET` with a long, random secret.
3. Install dependencies from the project root:

   ```bash
   npm install
   ```

4. Create the administrator account using the credentials in `.env`:

   ```bash
   npm run seed:admin
   ```

5. Add ready-to-use demo student, administrator, and HOD accounts:

   ```bash
   npm run seed:demo
   ```

   Demo student: `student@campuscare.demo` / `Student123!`  
   Demo administrator: `admin@campuscare.demo` / `Admin123!`  
   Demo Grievance Escalation Committee: `committee@campuscare.demo` / `Committee123!`  
   Demo HODs use the password `Hod12345!`; for example, Facilities: `facilities.hod@campuscare.demo`.

   These are for local coursework demonstrations only. Do not use these credentials in a public deployment.

   Other HOD emails follow `<department>.hod@campuscare.demo` (`student-affairs.hod@campuscare.demo` for Student Affairs).

   Complaints are routed by their selected category: Hostel complaints go to the Hostel HOD, Facilities complaints to the Facilities HOD, and `Other` goes to Student Affairs. The complaint form displays the destination before submission.

6. Start the API and React development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:5173](http://localhost:5173). Choose Student, Admin, HOD, or Committee on the sign-in page. Students can register or use the demo student account; admins manage all campus complaints; each HOD sees only their department's complaints; the committee dashboard monitors every active complaint and highlights escalated cases.

The API runs on port 5000 by default. The Vite development server proxies `/api` and the Socket.IO websocket connection to it. To create a production frontend bundle, run `npm run build`; set `NODE_ENV=production` before running `npm start` to serve the bundle from Express.

## Main API routes

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register a student |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | Signed in | Get current account |
| GET | `/api/complaints` | Signed in | List the student's complaints, the HOD's department inbox, or all complaints for an admin |
| POST | `/api/complaints` | Signed in | Submit a complaint |
| POST | `/api/complaints/:id/messages` | Complaint owner, admin, assigned HOD, or committee on escalated cases | Send a complaint message and notify the other participant |
| PATCH | `/api/complaints/:id/committee-review` | Grievance committee | Record review notes and an optional action deadline |
| PATCH | `/api/complaints/:id/status` | Admin or assigned HOD | Update status and note; admins can assign a department |
| PATCH | `/api/complaints/:id/visit` | Admin or assigned HOD | Schedule a future visit or record a completed visit with report |
| PATCH | `/api/complaints/:id/resolve` | Admin or assigned HOD | Resolve an active complaint with a required resolution report |
| PATCH | `/api/complaints/:id/reopen` | Complaint-owning student | Reopen a resolved complaint with a required explanation |
| GET | `/api/dashboard` | Admin or HOD | Get campus-wide or department complaint summary counts |
| GET | `/api/users` | Admin | List campus accounts |
| POST | `/api/users` | Admin | Create a student, admin, or department-HOD account |
| PATCH | `/api/users/:id/active` | Admin | Enable or disable an account without removing its records |
| PATCH | `/api/complaints/:id/messages/:messageId` | Admin | Edit a complaint message |
| DELETE | `/api/complaints/:id/messages/:messageId` | Admin | Soft-remove a message while preserving its moderation record |
| PATCH | `/api/complaints/:id/archive` | Admin | Archive or restore a complaint |
| GET | `/api/notifications` | Signed in | List the current user's notifications |
| PATCH | `/api/notifications/read-all` | Signed in | Mark the current user's notifications as read |
| GET | `/api/health` | Public | API health check |

Complaint submission accepts an optional base64 image attachment in JSON. The API validates supported image types and enforces a 2 MB decoded-file limit. Administrators update status and department together at `PATCH /api/complaints/:id/status`; changes are recorded in the complaint history and notify the student in the app.

For on-site follow-up, an HOD or administrator can schedule a future visit and later record a required visit report. A complaint can only be marked resolved through the dedicated resolve action, which requires a resolution report; the generic status endpoint cannot bypass that requirement. If the student confirms that the issue is still not fixed, they can submit a reopen request with an explanation. The complaint returns to Submitted, the previous visit/resolution snapshots remain in the history, and the three-day HOD response timer restarts from the reopen request. Committee and administrators can see the full workflow record in the complaint details.

Students can reply to their own complaints, and department HODs or administrators can respond from the same conversation. Messages are stored in the complaint thread; the other participant receives a notification. Every active complaint appears in the committee dashboard from submission, and committee members are notified about new complaints. A background monitor checks overdue complaints every minute. If an active complaint has no HOD status/note update or HOD message within three days of submission, it is escalated for committee action and the student and committee are notified. Run `npm run seed:demo` to create the demonstration committee account and notify it about existing complaints, or an administrator can create committee accounts from account management. Committee review notes and optional future action deadlines are available after escalation; the student and assigned HOD are notified of the review. Student and HOD dashboards display the committee oversight rules. Complaint messages, status changes, and notifications are delivered live to signed-in users through authenticated Socket.IO connections, without refreshing the page. HODs can only access and message complaints belonging to their own department.
