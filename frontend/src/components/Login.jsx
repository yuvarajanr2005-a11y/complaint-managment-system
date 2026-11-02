import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Scale,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Check,
} from 'lucide-react';
import { defaultDepartments, demoAccounts } from '../constants/defaults';
import { api, writeSession } from '../services/api';

export default function Login({ onLogin, hodDepartments = defaultDepartments }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const registering = mode === 'register';

  // Form input state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedHodDepartment, setSelectedHodDepartment] = useState(
    hodDepartments[0] || 'Facilities'
  );
  const [autoFilledRole, setAutoFilledRole] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const result = await api(`/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, role: registering ? 'student' : role }),
      });
      writeSession(result);
      onLogin(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  function changeRole(nextRole) {
    setRole(nextRole);
    setError('');
  }

  // Quick One-Click Demo Credential Auto-Fill
  function fillDemo(accountRole, department = selectedHodDepartment) {
    changeRole(accountRole);
    setAutoFilledRole(accountRole === 'hod' ? `${department} HOD` : accountRole);

    if (accountRole === 'hod') {
      setSelectedHodDepartment(department);
      const deptSlug =
        department === 'Student Affairs'
          ? 'student-affairs'
          : department.toLowerCase();
      setEmail(`${deptSlug}.hod@mycollege.demo`);
      setPassword(demoAccounts.hodPassword);
      return;
    }

    const account = demoAccounts[accountRole];
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
    }
  }

  // Handle HOD department change
  function handleHodDepartmentSelect(dept) {
    setSelectedHodDepartment(dept);
    if (role === 'hod') {
      const deptSlug =
        dept === 'Student Affairs' ? 'student-affairs' : dept.toLowerCase();
      setEmail(`${deptSlug}.hod@mycollege.demo`);
      setPassword(demoAccounts.hodPassword);
      setAutoFilledRole(`${dept} HOD`);
    }
  }

  // Roles configuration for interactive cards
  const roleCards = [
    {
      id: 'student',
      label: 'Student',
      desc: 'Submit & Track Issues',
      icon: <GraduationCap size={20} />,
      accent: 'blue',
    },
    {
      id: 'hod',
      label: 'HOD',
      desc: 'Department Head',
      icon: <Building2 size={20} />,
      accent: 'purple',
    },
    {
      id: 'committee',
      label: 'Committee',
      desc: '3-Day Oversight',
      icon: <Scale size={20} />,
      accent: 'amber',
    },
    {
      id: 'admin',
      label: 'Admin',
      desc: 'System Director',
      icon: <ShieldCheck size={20} />,
      accent: 'emerald',
    },
  ];

  return (
    <main className="auth-container">
      {/* ========================================================
          LEFT SIDE: Inspiring Brand Showcase & System Highlights
         ======================================================== */}
      <section className="auth-showcase">
        <div className="showcase-content">
          {/* Brand Logo & College Header */}
          <div className="showcase-brand">
            <div className="showcase-logo-icon">
              <GraduationCap size={28} />
            </div>
            <div className="showcase-brand-text">
              <span className="brand-title">
                CAMPUS<span>CARE</span>
              </span>
              <span className="brand-subtitle">
                Student Grievance & Redressal Portal
              </span>
            </div>
          </div>

          {/* Inspiring Mission Copy */}
          <div className="showcase-hero">
            <div className="hero-pill">
              <Sparkles size={14} /> Official Campus Redressal Network
            </div>
            <h1>
              Empowering Students.<br />
              Ensuring <span>Accountability.</span>
            </h1>
            <p>
              A transparent, automated grievance management platform connecting
              students, department heads, and the oversight committee in real time.
            </p>
          </div>

          {/* 3 Core Highlight Feature Cards */}
          <div className="showcase-features">
            <div className="feature-card">
              <div className="feature-icon feat-blue">
                <Zap size={18} />
              </div>
              <div className="feature-text">
                <strong>Smart Department Routing</strong>
                <p>
                  Complaints are automatically routed to the responsible HOD with
                  instant notifications.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon feat-amber">
                <Clock3 size={18} />
              </div>
              <div className="feature-text">
                <strong>Autonomous 3-Day Escalation</strong>
                <p>
                  If an issue has no HOD response within 72 hours, it escalates to the
                  Grievance Committee.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon feat-green">
                <MessageSquareText size={18} />
              </div>
              <div className="feature-text">
                <strong>Transparent Communication & Visits</strong>
                <p>
                  Direct messaging, planned on-site visit scheduling, and verified
                  resolution reports.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="showcase-footer">
            <div className="security-tag">
              <ShieldCheck size={16} /> 256-Bit SSL Encrypted
            </div>
            <div className="security-tag">
              <CheckCircle2 size={16} /> 100% Confidential
            </div>
            <div className="security-tag">
              <span>© 2025 My College</span>
            </div>
          </div>
        </div>

        {/* Ambient Glow Orbs */}
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
      </section>

      {/* ========================================================
          RIGHT SIDE: High-Visibility, Clean Form Card
         ======================================================== */}
      <section className="auth-form-wrapper">
        <div className="auth-box">
          {/* Mobile Top Brand (visible only on mobile) */}
          <div className="auth-mobile-header">
            <div className="mobile-logo-mark">
              <GraduationCap size={22} />
            </div>
            <div>
              <strong>CampusCare</strong>
              <span>Grievance Portal</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="auth-header">
            <h2>{registering ? 'Create Student Account' : 'Welcome Back'}</h2>
            <p>
              {registering
                ? 'Register with your college email to submit and follow up on issues.'
                : 'Select your role and enter your credentials to access your dashboard.'}
            </p>
          </div>

          {/* Mode Switcher: Sign In vs Student Register */}
          <div className="auth-mode-tabs" role="tablist">
            <button
              type="button"
              className={`mode-tab ${!registering ? 'mode-tab-active' : ''}`}
              onClick={() => changeMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-tab ${registering ? 'mode-tab-active' : ''}`}
              onClick={() => changeMode('register')}
            >
              Student Register
            </button>
          </div>

          {/* Role Selection Cards (Sign In Mode Only) */}
          {!registering && (
            <div className="role-selection-section">
              <label className="section-small-label">
                Select your workspace role:
              </label>
              <div className="role-grid">
                {roleCards.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`role-select-card role-${r.accent} ${
                        isSelected ? 'role-selected' : ''
                      }`}
                      onClick={() => changeRole(r.id)}
                    >
                      <div className="role-card-top">
                        <span className="role-icon">{r.icon}</span>
                        {isSelected && (
                          <span className="role-checked">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <strong className="role-label">{r.label}</strong>
                      <span className="role-desc">{r.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Department Dropdown for HOD */}
              {role === 'hod' && (
                <div className="hod-dept-picker-box">
                  <label htmlFor="hod-dept-select">
                    Assigned HOD Department:
                  </label>
                  <select
                    id="hod-dept-select"
                    value={selectedHodDepartment}
                    onChange={(e) => handleHodDepartmentSelect(e.target.value)}
                  >
                    {hodDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept} Department
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Access Bar (Sign In Mode Only) */}
          {!registering && (
            <div className="demo-credentials-banner">
              <div className="demo-banner-title">
                <span>
                  <Zap size={14} className="demo-zap-icon" /> One-Click Demo Sign In:
                </span>
                {autoFilledRole && (
                  <span className="demo-badge">Loaded: {autoFilledRole}</span>
                )}
              </div>
              <div className="demo-button-group">
                <button
                  type="button"
                  className={`demo-pill ${role === 'student' ? 'demo-pill-active' : ''}`}
                  onClick={() => fillDemo('student')}
                >
                  <GraduationCap size={13} /> Student
                </button>
                <button
                  type="button"
                  className={`demo-pill ${role === 'admin' ? 'demo-pill-active' : ''}`}
                  onClick={() => fillDemo('admin')}
                >
                  <ShieldCheck size={13} /> Admin
                </button>
                <button
                  type="button"
                  className={`demo-pill ${role === 'committee' ? 'demo-pill-active' : ''}`}
                  onClick={() => fillDemo('committee')}
                >
                  <Scale size={13} /> Committee
                </button>
                <button
                  type="button"
                  className={`demo-pill ${role === 'hod' ? 'demo-pill-active' : ''}`}
                  onClick={() => fillDemo('hod', selectedHodDepartment)}
                >
                  <Building2 size={13} /> {selectedHodDepartment} HOD
                </button>
              </div>
            </div>
          )}

          {/* Login / Register Form */}
          <form className="auth-form-card" onSubmit={handleSubmit}>
            {registering && (
              <div className="input-field-group">
                <label htmlFor="auth-name">Full Name</label>
                <div className="input-with-icon">
                  <span className="input-icon">
                    <GraduationCap size={18} />
                  </span>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    placeholder="e.g. John Doe"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-field-group">
              <label htmlFor="auth-email">College Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="name@mycollege.demo"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="auth-password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={
                    registering
                      ? 'Minimum 8 characters'
                      : 'Enter your account password'
                  }
                  autoComplete={
                    registering ? 'new-password' : 'current-password'
                  }
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error-banner" role="alert">
                <span>⚠️ {error}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-inline" /> Signing you in…
                </>
              ) : (
                <>
                  {registering ? 'Create Student Account' : 'Sign In to Workspace'}{' '}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Subtle Security & Support Notice */}
          <div className="auth-card-footer">
            <span>
              <ShieldCheck size={14} /> Official Campus Care Redressal System
            </span>
            <a href="#support" onClick={(e) => e.preventDefault()}>
              Need help signing in?
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
