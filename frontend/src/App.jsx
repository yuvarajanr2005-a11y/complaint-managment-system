import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Bell,
  Check,
  CircleHelp,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Users,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react';

// Utilities, Constants, and Services
import { API_ORIGIN, api, readSession, writeSession } from './services/api';
import { formatDate, getTrackingId } from './utils/helpers';
import {
  defaultCategories,
  statuses,
  defaultDepartments,
  emptyForm,
  defaultSuggestions,
} from './constants/defaults';

// Modular Child Components
import Login from './components/Login';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import BulkActionsBar from './components/BulkActionsBar';
import ComplaintModal from './components/ComplaintModal';
import ComplaintDetails from './components/ComplaintDetails';
import UsersPanel from './components/UsersPanel';
import UserModal from './components/UserModal';
import ConfigPanel from './components/ConfigPanel';

function App() {
  // ==========================================
  // 1. Authentication & Session State
  // ==========================================
  const [session, setSession] = useState(readSession);
  const [authChecking, setAuthChecking] = useState(Boolean(readSession()?.token));

  // ==========================================
  // 2. Application Data & Filtering State
  // ==========================================
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({ total: 0, submitted: 0, inReview: 0, resolved: 0, rejected: 0, escalated: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('All complaints');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [toast, setToast] = useState('');

  // ==========================================
  // 3. Dynamic Configuration State
  // ==========================================
  const [departments, setDepartments] = useState(defaultDepartments);
  const [categories, setCategories] = useState(defaultCategories);
  const [issueSuggestions, setIssueSuggestions] = useState(defaultSuggestions);
  const [selectedComplaintIds, setSelectedComplaintIds] = useState([]);

  // ==========================================
  // 4. Navigation & Modals State
  // ==========================================
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('complaints'); // 'complaints' | 'users' | 'config'
  const [showForm, setShowForm] = useState(false);
  const [complaintSeed, setComplaintSeed] = useState(emptyForm);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editingComplaint, setEditingComplaint] = useState(null);

  // User Management State (Admin only)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);

  // Role conveniences
  const isAdmin = session?.user?.role === 'admin';
  const isHod = session?.user?.role === 'hod';
  const isCommittee = session?.user?.role === 'committee';
  const isStaff = isAdmin || isHod || isCommittee;

  const hodDepartments = departments;
  const allDepartments = useMemo(() => ['Unassigned', ...departments], [departments]);

  // ==========================================
  // 5. Auth & Data Loading Logic
  // ==========================================
  const signOut = useCallback(() => {
    writeSession(null);
    setSession(null);
    setComplaints([]);
    setNotifications([]);
    setStats({ total: 0, submitted: 0, inReview: 0, resolved: 0, rejected: 0, escalated: 0 });
  }, []);

  const loadData = useCallback(async (activeSession) => {
    setLoading(true);
    setError('');
    try {
      const [complaintData, notificationData, dashboardData, configData] = await Promise.all([
        api('/complaints', { token: activeSession.token }),
        api('/notifications', { token: activeSession.token }),
        ['admin', 'hod', 'committee'].includes(activeSession.user.role)
          ? api('/dashboard', { token: activeSession.token })
          : Promise.resolve(null),
        api('/config', { token: activeSession.token }).catch(() => null),
      ]);
      setComplaints(complaintData.complaints);
      setNotifications(notificationData.notifications);
      if (dashboardData) setStats(dashboardData.stats);
      if (configData) {
        if (configData.departments) setDepartments(configData.departments);
        if (configData.categories) setCategories(configData.categories);
        if (configData.suggestions) setIssueSuggestions(configData.suggestions);
      }
    } catch (requestError) {
      if (requestError.message.includes('session') || requestError.message.includes('sign in')) {
        signOut();
      } else {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  // Check existing session token on mount
  useEffect(() => {
    if (!session?.token) {
      setAuthChecking(false);
      return;
    }
    let active = true;
    api('/auth/me', { token: session.token })
      .then(({ user }) => {
        if (!active) return;
        const refreshed = { ...session, user };
        writeSession(refreshed);
        setSession(refreshed);
      })
      .catch(() => {
        if (active) signOut();
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });
    return () => { active = false; };
  }, []);

  // Fetch data whenever session is ready
  useEffect(() => {
    if (session && !authChecking) loadData(session);
  }, [session, authChecking, loadData]);

  // ==========================================
  // 6. Real-Time Socket.io Sync
  // ==========================================
  useEffect(() => {
    if (!session?.token || authChecking) return undefined;

    const socket = io(API_ORIGIN || undefined, { auth: { token: session.token } });

    // Complaint created or updated
    socket.on('complaint:updated', (complaint) => {
      const role = session.user.role;
      const studentId = complaint.student?._id || complaint.student;
      const currentUserId = session.user._id || session.user.id;
      const canView = role === 'admin'
        || (role === 'hod' && !complaint.archivedAt)
        || (role === 'committee' && !complaint.archivedAt)
        || (role === 'student' && String(studentId) === String(currentUserId) && !complaint.archivedAt);

      setComplaints((current) => canView
        ? current.some((item) => item._id === complaint._id)
          ? current.map((item) => item._id === complaint._id ? complaint : item)
          : [complaint, ...current]
        : current.filter((item) => item._id !== complaint._id));

      setSelectedComplaint((current) => current?._id === complaint._id
        ? (canView ? complaint : null)
        : current);

      if (['admin', 'hod', 'committee'].includes(role)) {
        api('/dashboard', { token: session.token })
          .then((data) => { if (data?.stats) setStats(data.stats); })
          .catch(() => {});
      }
    });

    // Complaint deleted (cross-role deletion sync)
    socket.on('complaint:deleted', ({ _id }) => {
      setComplaints((current) => current.filter((item) => item._id !== _id));
      setSelectedComplaint((current) => current?._id === _id ? null : current);
      setEditingComplaint((current) => current?._id === _id ? null : current);
      setNotifications((current) => current.filter((item) => {
        const cId = item.complaint?._id || item.complaint;
        return cId !== _id;
      }));
      if (['admin', 'hod', 'committee'].includes(session.user.role)) {
        api('/dashboard', { token: session.token })
          .then((data) => { if (data?.stats) setStats(data.stats); })
          .catch(() => {});
      }
    });

    // Realtime notification
    socket.on('notification:new', (notification) => {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item._id !== notification._id),
      ].slice(0, 30));
    });

    // Dynamic configuration updated (departments, suggestions)
    socket.on('config:updated', (newConfig) => {
      if (newConfig?.departments) setDepartments(newConfig.departments);
      if (newConfig?.categories) setCategories(newConfig.categories);
      if (newConfig?.suggestions) setIssueSuggestions(newConfig.suggestions);
    });

    return () => socket.disconnect();
  }, [session, authChecking]);

  // Toast timer
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Filtered complaints based on active tabs, department filter, and search text
  const visibleComplaints = useMemo(() => complaints.filter((complaint) => {
    const matchesStatus = activeFilter === 'All complaints'
      ? !complaint.archivedAt
      : activeFilter === 'Archived'
        ? Boolean(complaint.archivedAt)
        : !complaint.archivedAt && complaint.status === activeFilter;

    const matchesDept = (isAdmin || isHod) && deptFilter !== 'All'
      ? (complaint.department === deptFilter || complaint.category === deptFilter)
      : true;

    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${complaint.title} ${complaint.category} ${complaint.department || ''} ${complaint.student?.name || ''}`
      .toLowerCase().includes(query);

    return matchesStatus && matchesDept && matchesSearch;
  }), [complaints, activeFilter, deptFilter, search, isAdmin, isHod]);

  // ==========================================
  // 7. Complaint CRUD Actions
  // ==========================================
  function openComplaintForm(suggestion) {
    setComplaintSeed(suggestion
      ? { ...emptyForm, title: suggestion.title, category: suggestion.category }
      : emptyForm);
    setShowForm(true);
  }

  async function createComplaint(payload) {
    const { complaint, routingNotice } = await api('/complaints', {
      token: session.token,
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setComplaints((current) => [complaint, ...current]);
    setShowForm(false);
    setToast(routingNotice || 'Your complaint has been submitted and sent to the department HOD.');
  }

  async function editComplaint(id, payload) {
    const { complaint } = await api(`/complaints/${id}`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint((current) => current?._id === id ? complaint : current);
    setEditingComplaint(null);
    setToast('Complaint updated successfully.');
  }

  async function deleteComplaint(id) {
    if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
      return;
    }
    try {
      await api(`/complaints/${id}`, { token: session.token, method: 'DELETE' });
      setComplaints((current) => current.filter((item) => item._id !== id));
      setSelectedComplaint((current) => current?._id === id ? null : current);
      setEditingComplaint((current) => current?._id === id ? null : current);
      setToast('Complaint deleted successfully.');
    } catch (requestError) {
      setToast(requestError.message);
    }
  }

  async function updateComplaint(id, status, adminNote, department, priority) {
    const { complaint } = await api(`/complaints/${id}/status`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ status, adminNote, department, priority }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast('Complaint status updated.');
  }

  async function updateVisit(id, action, scheduledAt, note) {
    const { complaint } = await api(`/complaints/${id}/visit`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ action, scheduledAt, note }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast(action === 'schedule' ? 'Visit scheduled and student notified.' : 'Visit report saved and student notified.');
  }

  async function resolveComplaint(id, note) {
    const { complaint } = await api(`/complaints/${id}/resolve`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast('Complaint resolved and student notified.');
  }

  async function reopenComplaint(id, note) {
    const { complaint } = await api(`/complaints/${id}/reopen`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast('Complaint reopened. The HOD and oversight team were notified.');
  }

  async function sendComplaintMessage(id, message) {
    const { complaint } = await api(`/complaints/${id}/messages`, {
      token: session.token,
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast(session.user.role === 'student' ? 'Reply sent to the department HOD.' : 'Message sent to the student.');
  }

  async function reviewCommitteeComplaint(id, note, actionDueAt) {
    const { complaint } = await api(`/complaints/${id}/committee-review`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ note, actionDueAt }),
    });
    setComplaints((current) => current.map((item) => item._id === id ? complaint : item));
    setSelectedComplaint(complaint);
    setToast('Committee review saved and notifications sent.');
  }

  async function moderateMessage(complaintId, messageId, method, message) {
    const { complaint } = await api(`/complaints/${complaintId}/messages/${messageId}`, {
      token: session.token,
      method,
      ...(method === 'PATCH' ? { body: JSON.stringify({ message }) } : {}),
    });
    setComplaints((current) => current.map((item) => item._id === complaintId ? complaint : item));
    setSelectedComplaint(complaint);
    setToast(method === 'PATCH' ? 'Message updated.' : 'Message removed from the conversation.');
  }

  async function archiveComplaint(complaintId, archived) {
    const { complaint } = await api(`/complaints/${complaintId}/archive`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    });
    setComplaints((current) => current.map((item) => item._id === complaintId ? complaint : item));
    setSelectedComplaint(complaint);
    setToast(archived ? 'Complaint archived.' : 'Complaint restored.');
  }

  // ==========================================
  // 8. Excel / CSV Report Download (Option B)
  // ==========================================
  function exportComplaintsToCSV() {
    if (!visibleComplaints.length) {
      setToast('No complaints to export in the current view.');
      return;
    }
    const headers = [
      'Tracking ID',
      'Title',
      'Category',
      'Department',
      'Priority',
      'Status',
      'Submitted By',
      'Student Email',
      'Submitted Date',
      'Escalated',
      'Resolved Date',
      'Response Note',
      'Committee Note',
      'Description',
    ];

    const rows = visibleComplaints.map((c) => [
      getTrackingId(c),
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.department || 'Unassigned').replace(/"/g, '""')}"`,
      c.priority || 'Medium',
      c.status || 'Submitted',
      `"${(c.student?.name || 'Student').replace(/"/g, '""')}"`,
      `"${(c.student?.email || '').replace(/"/g, '""')}"`,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      c.escalatedAt ? 'Yes' : 'No',
      c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : '',
      `"${(c.adminNote || '').replace(/"/g, '""')}"`,
      `"${(c.committeeNote || '').replace(/"/g, '""')}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `complaints_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast(`Exported ${visibleComplaints.length} complaints to CSV.`);
  }

  // ==========================================
  // 9. Bulk Operations Handler (Option D)
  // ==========================================
  async function handleBulkAction(action, value) {
    if (!selectedComplaintIds.length) return;
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedComplaintIds.length} complaints? This action cannot be undone.`)) {
        return;
      }
    }
    try {
      const res = await api('/complaints/bulk', {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({
          ids: selectedComplaintIds,
          action,
          status: action === 'status' ? value : undefined,
          department: action === 'department' ? value : undefined,
        }),
      });
      if (action === 'delete') {
        setComplaints((current) => current.filter((c) => !selectedComplaintIds.includes(c._id)));
        if (selectedComplaint && selectedComplaintIds.includes(selectedComplaint._id)) {
          setSelectedComplaint(null);
        }
      } else {
        await loadData(session);
      }
      setSelectedComplaintIds([]);
      setToast(res.message || 'Bulk operation completed.');
    } catch (err) {
      setToast(err.message);
    }
  }

  // ==========================================
  // 10. Dynamic Campus Configuration Handlers
  // ==========================================
  async function handleAddDepartment(name) {
    if (!name.trim()) return;
    try {
      const res = await api('/config/departments', {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setDepartments(res.departments);
      setCategories(res.categories);
      setToast(res.message);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function handleRemoveDepartment(name) {
    if (!window.confirm(`Are you sure you want to delete the "${name}" department?`)) return;
    try {
      const res = await api(`/config/departments/${encodeURIComponent(name)}`, {
        token: session.token,
        method: 'DELETE',
      });
      setDepartments(res.departments);
      setCategories(res.categories);
      setToast(res.message);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function handleAddSuggestion(title, category) {
    if (!title.trim()) return;
    try {
      const res = await api('/config/suggestions', {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), category }),
      });
      setIssueSuggestions(res.suggestions);
      setToast(res.message);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function handleRemoveSuggestion(id) {
    if (!window.confirm('Remove this suggestion preset?')) return;
    try {
      const res = await api(`/config/suggestions/${id}`, {
        token: session.token,
        method: 'DELETE',
      });
      setIssueSuggestions(res.suggestions);
      setToast(res.message);
    } catch (err) {
      setToast(err.message);
    }
  }

  // ==========================================
  // 11. User Management Handlers (Admin)
  // ==========================================
  async function loadUsers() {
    setUsersLoading(true);
    setUserError('');
    try {
      const { users: accountList } = await api('/users', { token: session.token });
      setUsers(accountList);
    } catch (requestError) {
      setUserError(requestError.message);
    } finally {
      setUsersLoading(false);
    }
  }

  async function createManagedUser(payload) {
    const { user } = await api('/users', {
      token: session.token,
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUsers((current) => [user, ...current]);
    setToast(`${user.role.toUpperCase()} account created.`);
  }

  async function setUserActive(userId, isActive) {
    const { user } = await api(`/users/${userId}/active`, {
      token: session.token,
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    setUsers((current) => current.map((item) => item._id === userId ? user : item));
    setToast(isActive ? 'Account enabled.' : 'Account disabled.');
  }

  async function toggleNotifications() {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (!opening || !notifications.some((item) => !item.readAt)) return;
    try {
      await api('/notifications/read-all', { token: session.token, method: 'PATCH' });
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function openNotification(notification) {
    const complaint = complaints.find((item) => item._id === notification.complaint?._id);
    setShowNotifications(false);
    if (complaint) setSelectedComplaint(complaint);
  }

  // Loading Screen
  if (authChecking) {
    return <div className="screen-loader"><span className="spinner" /> Loading your workspace…</div>;
  }

  // Unauthenticated Screen
  if (!session) {
    return (
      <Login
        onLogin={(newSession) => {
          setSession(newSession);
          setAuthChecking(false);
        }}
        hodDepartments={departments}
      />
    );
  }

  const filterOptions = isAdmin ? ['All complaints', ...statuses, 'Archived'] : ['All complaints', ...statuses];

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" aria-label="CampusCare home">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <span className="brand-name">CAMPUS<span>CARE</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <button
          className={`nav-link ${activeSection === 'complaints' ? 'nav-link-active' : ''}`}
          onClick={() => { setActiveSection('complaints'); setMobileMenu(false); }}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>

        <div className="workspace-label nav-section-label">MANAGE</div>
        <button
          className="nav-link"
          onClick={() => {
            setActiveSection('complaints');
            setActiveFilter('All complaints');
            setMobileMenu(false);
          }}
        >
          <ClipboardList size={18} /> {isAdmin ? 'All complaints' : isHod ? 'Department inbox' : isCommittee ? 'Escalated cases' : 'My complaints'}
          {complaints.length > 0 && <span className="nav-count">{complaints.length}</span>}
        </button>

        {isAdmin && (
          <>
            <button
              className={`nav-link ${activeSection === 'users' ? 'nav-link-active' : ''}`}
              onClick={() => { setActiveSection('users'); setMobileMenu(false); loadUsers(); }}
            >
              <Users size={18} /> Manage accounts
            </button>
            <button
              className={`nav-link ${activeSection === 'config' ? 'nav-link-active' : ''}`}
              onClick={() => { setActiveSection('config'); setMobileMenu(false); }}
            >
              <Sliders size={18} /> Campus Settings
            </button>
          </>
        )}

        {!isStaff && (
          <button className="nav-link" onClick={() => { openComplaintForm(); setMobileMenu(false); }}>
            <Plus size={18} /> Submit a complaint
          </button>
        )}

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={18} /></div>
            <strong>Need a hand?</strong>
            <p>We’re here to help you feel heard.</p>
            <span>Campus support <ArrowRight size={13} /></span>
          </div>

          <div className="profile-card">
            <div className="avatar">{session.user.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{session.user.name}</strong>
              <span>
                {isAdmin
                  ? 'Administrator'
                  : isHod
                  ? `${session.user.department} HOD`
                  : isCommittee
                  ? 'Grievance Committee'
                  : 'Student account'}
              </span>
            </div>
            <button className="icon-button profile-menu" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            <strong>
              {activeSection === 'users'
                ? 'Account Management'
                : activeSection === 'config'
                ? 'Campus Settings'
                : 'Dashboard'}
            </strong>
          </div>

          <div className="topbar-right">
            <span className="today-label">
              {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}
            </span>
            <span className="topbar-divider" />
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                title="Notifications"
                aria-label="Notifications"
                onClick={toggleNotifications}
              >
                <Bell size={18} />
                {notifications.some((item) => !item.readAt) && <i />}
              </button>
              {showNotifications && (
                <div className="notification-popover">
                  <div className="notification-heading">
                    <strong>Notifications</strong>
                    <span>{notifications.length}</span>
                  </div>
                  {notifications.length ? (
                    notifications.map((notification) => (
                      <button
                        className={`notification-item ${notification.readAt ? '' : 'notification-unread'}`}
                        key={notification._id}
                        onClick={() => openNotification(notification)}
                      >
                        <span className="notification-icon"><Bell size={14} /></span>
                        <span>
                          <strong>{notification.message}</strong>
                          <small>{notification.complaint?.title || 'Complaint'} · {formatDate(notification.createdAt)}</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="notification-empty">Complaint updates will appear here.</p>
                  )}
                </div>
              )}
            </div>
            <div className="top-avatar">{session.user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">
          {/* Welcome Banner */}
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR CAMPUS, YOUR VOICE</div>
              <h1>
                {isStaff ? 'Good to see you' : `Welcome to CampusCare, ${session.user.name.split(' ')[0]}`}{' '}
                <span className="wave">✦</span>
              </h1>
              <p>
                {isAdmin
                  ? 'Here’s what’s happening across your campus today.'
                  : isHod
                  ? `Review and resolve complaints for ${session.user.department}.`
                  : isCommittee
                  ? 'Review complaints escalated after three days without HOD action.'
                  : 'Keep track of your concerns and make campus life better.'}
              </p>
            </div>
            {!isStaff && (
              <button className="primary-button" onClick={() => openComplaintForm()}>
                <Plus size={17} /> New complaint
              </button>
            )}
          </section>

          {/* Metric Cards or Student Summary */}
          {isStaff ? (
            <section className="stats-grid" aria-label="Complaint summary">
              <StatCard
                title={isCommittee ? 'All complaints' : 'Total complaints'}
                value={stats.total}
                note={isHod ? 'Assigned to your department' : isCommittee ? 'Visible to the committee' : 'Across your campus'}
                icon={<FileText size={18} />}
                tone="blue"
              />
              <StatCard
                title={isCommittee ? 'Awaiting committee review' : 'Awaiting review'}
                value={isCommittee ? Math.max(0, stats.escalated - stats.reviewedByCommittee) : stats.submitted}
                note={isCommittee ? 'Escalated after the HOD deadline' : 'Needs your attention'}
                icon={<Clock3 size={18} />}
                tone="amber"
              />
              <StatCard
                title="In progress"
                value={stats.inReview}
                note="Currently being handled"
                icon={<ArrowUpRight size={18} />}
                tone="violet"
              />
              <StatCard
                title={isCommittee ? 'Committee reviews' : 'Resolved'}
                value={isCommittee ? stats.reviewedByCommittee : stats.resolved}
                note={isCommittee ? 'Review notes recorded' : 'Successfully addressed'}
                icon={<CheckCheck size={18} />}
                tone="green"
              />
            </section>
          ) : (
            <section className="student-summary">
              <div className="summary-copy">
                <span className="summary-tag"><ShieldCheck size={13} /> YOUR VOICE MATTERS</span>
                <h2>A better campus starts with being heard.</h2>
                <p>Submit concerns, follow progress, and help us make things better for everyone.</p>
              </div>
              <div className="summary-counts">
                <div><span>{complaints.length}</span><small>{isHod ? 'Department complaints' : 'Total submitted'}</small></div>
                <i />
                <div><span>{complaints.filter((item) => item.status === 'Resolved').length}</span><small>Resolved</small></div>
              </div>
              <div className="summary-decoration">✳</div>
            </section>
          )}

          {/* Student Issue Suggestions Presets */}
          {!isStaff && (
            <section className="issue-suggestions" aria-labelledby="issue-suggestions-title">
              <div className="suggestions-heading">
                <div>
                  <h2 id="issue-suggestions-title">Common campus issues</h2>
                  <p>Choose one to start a complaint; its title and category will be filled in for you.</p>
                </div>
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <div className="suggestion-list">
                {issueSuggestions.map((suggestion) => (
                  <button
                    className="issue-suggestion"
                    key={suggestion._id || suggestion.title}
                    type="button"
                    onClick={() => openComplaintForm(suggestion)}
                  >
                    <span>{suggestion.title}</span>
                    <small>{suggestion.category}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3-Day Committee Policy Card */}
          {(isHod || (!isStaff && session.user.role === 'student')) && (
            <section className={`committee-policy ${isHod ? 'committee-policy-hod' : 'committee-policy-student'}`}>
              <div className="policy-icon"><ShieldCheck size={18} /></div>
              <div className="policy-copy">
                <span className="policy-kicker">GRIEVANCE ESCALATION COMMITTEE</span>
                <h2>{isHod ? 'HOD action deadline and committee oversight' : 'How the committee protects your complaint'}</h2>
                {isHod ? (
                  <ul>
                    <li>Every complaint is visible to the committee from the time it is submitted.</li>
                    <li>Record a status or note update, or send a message within 3 days of submission.</li>
                    <li>If no HOD action is recorded within 3 days, the complaint is escalated for committee review.</li>
                  </ul>
                ) : (
                  <ul>
                    <li>Your complaint is shared with the assigned HOD and is visible to the committee.</li>
                    <li>If no HOD update or message is recorded within 3 days, it is automatically escalated.</li>
                    <li>You will receive notifications when it is escalated and when the committee intervenes.</li>
                  </ul>
                )}
              </div>
            </section>
          )}

          {error && (
            <div className="inline-alert">
              <CircleHelp size={17} /> {error} <button onClick={() => loadData(session)}>Try again</button>
            </div>
          )}

          {/* Main Content Switcher */}
          {activeSection === 'users' && isAdmin ? (
            <UsersPanel
              users={users}
              loading={usersLoading}
              error={userError}
              onCreate={() => setShowUserForm(true)}
              onToggle={setUserActive}
              onRetry={loadUsers}
            />
          ) : activeSection === 'config' && isAdmin ? (
            <ConfigPanel
              departments={departments}
              categories={categories}
              suggestions={issueSuggestions}
              onAddDepartment={handleAddDepartment}
              onRemoveDepartment={handleRemoveDepartment}
              onAddSuggestion={handleAddSuggestion}
              onRemoveSuggestion={handleRemoveSuggestion}
            />
          ) : (
            <section className="complaints-section">
              <div className="section-heading">
                <div>
                  <div className="section-title-row">
                    <h2>{isCommittee ? 'All student complaints' : isAdmin || isHod ? 'Complaint inbox' : 'Your complaints'}</h2>
                    <span className="count-pill">{complaints.length}</span>
                  </div>
                  <p>
                    {isAdmin
                      ? 'Review, track, and respond to student concerns.'
                      : isHod
                      ? `Complaints assigned to ${session.user.department}.`
                      : isCommittee
                      ? 'All complaints are visible here. Escalated cases are marked for committee action.'
                      : 'All your submitted concerns, in one place.'}
                  </p>
                </div>
                {!isStaff && (
                  <button className="secondary-button desktop-new-button" onClick={() => openComplaintForm()}>
                    <Plus size={16} /> Submit new
                  </button>
                )}
              </div>

              {/* Toolbar: Filter Tabs + Search + CSV Export */}
              <div className="toolbar">
                <div className="filter-tabs">
                  {filterOptions.map((filter) => (
                    <button
                      key={filter}
                      className={`filter-tab ${activeFilter === filter ? 'filter-tab-active' : ''}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter === 'All complaints' ? 'All' : filter}
                      {filter === 'Submitted' && <span className="tab-dot" />}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search complaints"
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-button export-btn"
                    onClick={exportComplaintsToCSV}
                    title="Download Excel / CSV Report"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Department Filter Tabs (for Admin and HOD) */}
              {(isAdmin || isHod) && (
                <div className="dept-filter-bar">
                  <span className="dept-filter-label">Filter Department:</span>
                  <div className="dept-tabs">
                    <button
                      type="button"
                      className={`dept-tab ${deptFilter === 'All' ? 'dept-tab-active' : ''}`}
                      onClick={() => setDeptFilter('All')}
                    >
                      All Departments ({complaints.length})
                    </button>
                    {isHod && (
                      <button
                        type="button"
                        className={`dept-tab ${deptFilter === session.user.department ? 'dept-tab-active' : ''}`}
                        onClick={() => setDeptFilter(session.user.department)}
                      >
                        My Department ({session.user.department})
                      </button>
                    )}
                    {hodDepartments.map((dept) => (
                      (!isHod || dept !== session.user.department) && (
                        <button
                          type="button"
                          key={dept}
                          className={`dept-tab ${deptFilter === dept ? 'dept-tab-active' : ''}`}
                          onClick={() => setDeptFilter(dept)}
                        >
                          {dept}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Option D: Bulk Actions Floating Bar */}
              {isAdmin && (
                <BulkActionsBar
                  selectedCount={selectedComplaintIds.length}
                  departments={departments}
                  onAction={handleBulkAction}
                  onClear={() => setSelectedComplaintIds([])}
                />
              )}

              {/* Complaints Table Card */}
              <div className={`table-card ${isAdmin ? 'admin-table' : isHod ? 'hod-table' : isCommittee ? 'committee-table' : 'student-table'}`}>
                <div className="table-header">
                  {isAdmin && (
                    <span className="table-checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={visibleComplaints.length > 0 && selectedComplaintIds.length === visibleComplaints.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedComplaintIds(visibleComplaints.map((c) => c._id));
                          else setSelectedComplaintIds([]);
                        }}
                        title="Select all complaints"
                      />
                    </span>
                  )}
                  <span>COMPLAINT</span>
                  {(isAdmin || isHod) && <span>SUBMITTED BY</span>}
                  <span>CATEGORY</span>
                  <span>DATE</span>
                  <span>STATUS</span>
                  {!isStaff && <span>ACTIONS</span>}
                  <span aria-label="Details" />
                </div>

                {loading ? (
                  <div className="empty-state">
                    <span className="spinner" />
                    <p>Loading complaints…</p>
                  </div>
                ) : visibleComplaints.length ? (
                  visibleComplaints.map((complaint) => (
                    <button
                      className={`complaint-row ${selectedComplaintIds.includes(complaint._id) ? 'row-selected' : ''}`}
                      key={complaint._id}
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      {isAdmin && (
                        <span className="table-checkbox-col" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedComplaintIds.includes(complaint._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedComplaintIds((cur) => [...cur, complaint._id]);
                              else setSelectedComplaintIds((cur) => cur.filter((id) => id !== complaint._id));
                            }}
                          />
                        </span>
                      )}
                      <span className="complaint-primary">
                        <span className={`category-icon category-${(complaint.category || 'other').toLowerCase()}`}>
                          <MessageSquareText size={17} />
                        </span>
                        <span className="complaint-copy">
                          <strong>
                            {complaint.title}
                            {complaint.archivedAt && <span className="archived-label">Archived</span>}
                          </strong>
                          <small>
                            {getTrackingId(complaint)} <i /> {complaint.priority} priority
                          </small>
                          {(isAdmin || isHod) && (
                            <small className="department-label">
                              {complaint.department || 'Unassigned'} department{' '}
                              {isHod && complaint.department === session.user.department ? '✦ Your Dept' : ''}
                            </small>
                          )}
                          {complaint.adminNote && (
                            <small className="admin-note-preview">
                              <strong>Response:</strong> {complaint.adminNote}
                            </small>
                          )}
                        </span>
                      </span>

                      {(isAdmin || isHod) && (
                        <span className="student-cell">
                          <span className="mini-avatar">
                            {complaint.student?.name?.slice(0, 1).toUpperCase()}
                          </span>
                          {complaint.student?.name || 'Student'}
                        </span>
                      )}

                      <span className="category-cell">{complaint.category}</span>
                      <span className="date-cell">{formatDate(complaint.createdAt)}</span>

                      <span className="status-cell">
                        <StatusBadge status={complaint.status} />
                        {complaint.committeeActionDueAt && !complaint.resolvedAt ? (
                          <span className="warning-badge-pill">⚠️ 3-Day Warning</span>
                        ) : complaint.escalatedAt ? (
                          <span className="escalated-pill">Escalated</span>
                        ) : isCommittee ? (
                          <span className="monitoring-pill">Monitoring</span>
                        ) : null}
                      </span>

                      {!isStaff && (
                        <span className="row-action-buttons" onClick={(e) => e.stopPropagation()}>
                          {complaint.status !== 'Resolved' && (
                            <button
                              type="button"
                              className="action-icon-btn edit-action-btn"
                              title="Edit complaint"
                              aria-label="Edit complaint"
                              onClick={() => setEditingComplaint(complaint)}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="action-icon-btn delete-action-btn"
                            title="Delete complaint"
                            aria-label="Delete complaint"
                            onClick={() => deleteComplaint(complaint._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}

                      <span className="row-arrow"><ArrowRight size={16} /></span>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><Filter size={21} /></span>
                    <strong>{search || activeFilter !== 'All complaints' ? 'No complaints match this view' : 'Nothing here just yet'}</strong>
                    <p>
                      {search || activeFilter !== 'All complaints'
                        ? 'Try another search or status filter.'
                        : isAdmin
                        ? 'New student complaints will show up here.'
                        : isHod
                        ? 'New department complaints will show up here.'
                        : isCommittee
                        ? 'No complaints currently need committee review.'
                        : 'When you submit a concern, you can follow its progress here.'}
                    </p>
                    {!isStaff && !search && activeFilter === 'All complaints' && (
                      <button className="text-action" onClick={() => openComplaintForm()}>
                        Submit your first complaint <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}

                {visibleComplaints.length > 0 && (
                  <div className="table-footer">
                    Showing <strong>{visibleComplaints.length}</strong> of <strong>{complaints.length}</strong> complaints{' '}
                    <span>Updated just now</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="page-footer">
            <span>© 2025 CampusCare</span>
            <span>Built for a better campus <span className="footer-heart">♥</span></span>
          </footer>
        </div>
      </main>

      {/* Mobile Drawer Backdrop */}
      {mobileMenu && (
        <button className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />
      )}

      {/* New Complaint Modal */}
      {showForm && (
        <ComplaintModal
          categories={categories}
          initialForm={complaintSeed}
          onClose={() => setShowForm(false)}
          onSubmit={createComplaint}
        />
      )}

      {/* Admin Create Account Modal */}
      {showUserForm && (
        <UserModal
          departments={departments}
          onClose={() => setShowUserForm(false)}
          onCreate={createManagedUser}
        />
      )}

      {/* Complaint Details Popup */}
      {selectedComplaint && (
        <ComplaintDetails
          key={selectedComplaint._id}
          complaint={selectedComplaint}
          isAdmin={isAdmin}
          isHod={isHod}
          isCommittee={isCommittee}
          departments={allDepartments}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={updateComplaint}
          onUpdateVisit={updateVisit}
          onResolve={resolveComplaint}
          onReopen={reopenComplaint}
          onSendMessage={sendComplaintMessage}
          onCommitteeReview={reviewCommitteeComplaint}
          onModerateMessage={moderateMessage}
          onArchive={archiveComplaint}
          onEditComplaint={(complaint) => setEditingComplaint(complaint)}
          onDeleteComplaint={(id) => deleteComplaint(id)}
        />
      )}

      {/* Student Edit Complaint Modal */}
      {editingComplaint && (
        <ComplaintModal
          isEdit
          categories={categories}
          initialForm={{
            title: editingComplaint.title,
            category: editingComplaint.category,
            priority: editingComplaint.priority,
            description: editingComplaint.description,
            attachment: editingComplaint.attachment || null,
          }}
          onClose={() => setEditingComplaint(null)}
          onSubmit={(form) => editComplaint(editingComplaint._id, form)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <span><Check size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
