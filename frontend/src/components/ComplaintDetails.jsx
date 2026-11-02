import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Pencil,
  Trash2,
  Clock3,
  ShieldCheck,
  Send,
  Check,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate, localDateTimeValue, getTrackingId } from '../utils/helpers';
import { statuses, defaultDepartments } from '../constants/defaults';

export default function ComplaintDetails({
  complaint,
  isAdmin,
  isHod,
  isCommittee,
  departments = defaultDepartments,
  onClose,
  onUpdate,
  onUpdateVisit,
  onResolve,
  onReopen,
  onSendMessage,
  onCommitteeReview,
  onModerateMessage,
  onArchive,
  onEditComplaint,
  onDeleteComplaint,
}) {
  const isStudent = !isAdmin && !isHod && !isCommittee;
  const [status, setStatus] = useState(complaint.status);
  const [priority, setPriority] = useState(complaint.priority);
  const [adminNote, setAdminNote] = useState(complaint.adminNote || '');
  const [department, setDepartment] = useState(complaint.department || 'Unassigned');
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState('');
  const [editingMessage, setEditingMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');

  const defaultWarningDeadline = useMemo(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return localDateTimeValue(d);
  }, []);

  const [committeeNote, setCommitteeNote] = useState(complaint.committeeNote || '');
  const [committeeActionDueAt, setCommitteeActionDueAt] = useState(
    complaint.committeeActionDueAt ? localDateTimeValue(complaint.committeeActionDueAt) : defaultWarningDeadline
  );
  const [visitScheduledAt, setVisitScheduledAt] = useState('');
  const [visitScheduledNote, setVisitScheduledNote] = useState('');
  const [visitReport, setVisitReport] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    setStatus(complaint.status);
    setPriority(complaint.priority);
    setAdminNote(complaint.adminNote || '');
    setDepartment(complaint.department || 'Unassigned');
    setCommitteeNote(complaint.committeeNote || '');
    if (complaint.committeeActionDueAt) {
      setCommitteeActionDueAt(localDateTimeValue(complaint.committeeActionDueAt));
    }
  }, [complaint]);

  async function saveUpdate() {
    setError('');
    setSaving(true);
    try {
      await onUpdate(complaint._id, status, adminNote, department, priority);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveVisit(action) {
    setError('');
    setSaving(true);
    try {
      await onUpdateVisit(
        complaint._id,
        action,
        action === 'schedule' ? new Date(visitScheduledAt).toISOString() : undefined,
        action === 'schedule' ? visitScheduledNote : visitReport
      );
      if (action === 'schedule') {
        setVisitScheduledAt('');
        setVisitScheduledNote('');
      } else {
        setVisitReport('');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveResolution(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onResolve(complaint._id, resolutionNote);
      setResolutionNote('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestReopen(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onReopen(complaint._id, reopenReason);
      setReopenReason('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    setMessageError('');
    setSending(true);
    try {
      await onSendMessage(complaint._id, message);
      setMessage('');
    } catch (requestError) {
      setMessageError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function saveMessageEdit(messageId) {
    try {
      await onModerateMessage(complaint._id, messageId, 'PATCH', editingMessage);
      setEditingMessageId('');
      setEditingMessage('');
    } catch (requestError) {
      setMessageError(requestError.message);
    }
  }

  async function deleteMessage(messageId) {
    if (!window.confirm('Remove this message from the conversation? It will remain in the moderation record.')) return;
    try {
      await onModerateMessage(complaint._id, messageId, 'DELETE');
    } catch (requestError) {
      setMessageError(requestError.message);
    }
  }

  async function saveCommitteeReview(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onCommitteeReview(
        complaint._id,
        committeeNote,
        committeeActionDueAt ? new Date(committeeActionDueAt).toISOString() : null
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-card details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complaint-details-title"
      >
        <div className="details-top">
          <span className="details-id">TRACKING ID · {getTrackingId(complaint)}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        {/* Administrator Quick Controls */}
        {isAdmin && (
          <div
            className="archive-control"
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <span>
              {complaint.archivedAt
                ? 'This complaint is archived.'
                : 'Admin controls are enabled for this complaint.'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary-button"
                onClick={() => onArchive(complaint._id, !complaint.archivedAt)}
              >
                {complaint.archivedAt ? 'Restore complaint' : 'Archive complaint'}
              </button>
              <button
                type="button"
                className="danger-button"
                style={{ height: '32px', fontSize: '11px', padding: '0 10px' }}
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure you want to delete this complaint permanently as administrator?'
                    )
                  ) {
                    onDeleteComplaint(complaint._id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={13} /> Delete (Admin)
              </button>
            </div>
          </div>
        )}

        <div className="details-title-row">
          <div>
            <h2 id="complaint-details-title">{complaint.title}</h2>
            <span className="details-meta">
              Submitted {formatDate(complaint.createdAt)} <i /> {complaint.category} <i />{' '}
              {complaint.priority} priority
            </span>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        {/* Student actions: edit / delete */}
        {isStudent && (
          <div className="student-detail-actions">
            <div className="student-actions-info">
              <span>Student actions:</span>
            </div>
            <div className="student-actions-btns">
              {complaint.status !== 'Resolved' ? (
                <button
                  type="button"
                  className="secondary-button student-edit-btn"
                  onClick={() => onEditComplaint(complaint)}
                >
                  <Pencil size={14} /> Edit complaint
                </button>
              ) : (
                <span className="resolved-no-edit-badge">Resolved (Editing locked)</span>
              )}
              <button
                type="button"
                className="danger-button student-delete-btn"
                onClick={() => onDeleteComplaint(complaint._id)}
              >
                <Trash2 size={14} /> Delete complaint
              </button>
            </div>
          </div>
        )}

        {/* Committee Escalation Notice */}
        {complaint.escalatedAt && (
          <div className="escalation-notice">
            <strong>
              <Clock3 size={15} /> Escalated to the Grievance Escalation Committee
            </strong>
            <p>
              {complaint.escalationReason ||
                'No HOD action was recorded within three days of submission.'}
            </p>
            {complaint.committeeActionDueAt && (
              <small>
                Committee requested action by{' '}
                {new Intl.DateTimeFormat('en', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(complaint.committeeActionDueAt))}
                .
              </small>
            )}
          </div>
        )}

        {(isAdmin || isHod) && (
          <div className="submitter-card">
            <span className="mini-avatar">
              {complaint.student?.name?.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{complaint.student?.name || 'Student'}</strong>
              <small>{complaint.student?.email}</small>
            </span>
          </div>
        )}

        <div className="assignment-line">
          <span>Assigned department</span>
          <strong>{complaint.department || 'Unassigned'}</strong>
        </div>

        <div className="details-description">
          <span className="details-label">DESCRIPTION</span>
          <p>{complaint.description}</p>
        </div>

        {(complaint.visitScheduledAt || complaint.visitedAt || complaint.resolvedAt) && (
          <section className="workflow-record">
            <span className="details-label">VISIT & RESOLUTION RECORD</span>
            {complaint.visitScheduledAt && (
              <div className="workflow-record-item">
                <strong>Visit planned</strong>
                <p>
                  {new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(complaint.visitScheduledAt))}
                </p>
                {complaint.visitScheduledNote && <p>{complaint.visitScheduledNote}</p>}
              </div>
            )}
            {complaint.visitedAt && (
              <div className="workflow-record-item">
                <strong>Visit completed · {formatDate(complaint.visitedAt)}</strong>
                <p>{complaint.visitNote}</p>
              </div>
            )}
            {complaint.resolvedAt && (
              <div className="workflow-record-item workflow-resolved">
                <strong>Resolved · {formatDate(complaint.resolvedAt)}</strong>
                <p>{complaint.resolutionNote}</p>
              </div>
            )}
          </section>
        )}

        {complaint.attachment?.data && (
          <div className="complaint-attachment">
            <span className="details-label">ATTACHED PHOTO</span>
            <a href={complaint.attachment.data} target="_blank" rel="noreferrer">
              <img
                src={complaint.attachment.data}
                alt={`Attachment for ${complaint.title}`}
              />
            </a>
            <small>{complaint.attachment.originalName}</small>
          </div>
        )}

        {complaint.adminNote && (
          <div className="admin-response">
            <span className="details-label">
              <ShieldCheck size={14} />{' '}
              {isStudent ? 'ADMIN / HOD RESPONSE' : 'OFFICIAL RESPONSE / NOTE'}
            </span>
            <p>{complaint.adminNote}</p>
          </div>
        )}

        {complaint.committeeNote && (
          <div className="admin-response committee-warning-notice">
            <div className="warning-notice-top">
              <span className="details-label">
                <Clock3 size={15} /> ⚠️ ACTIVE 3-DAY COMMITTEE WARNING & DIRECTIVE
              </span>
              {complaint.committeeActionDueAt && (
                <span className="warning-due-pill">
                  Action Deadline:{' '}
                  {new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(complaint.committeeActionDueAt))}
                </span>
              )}
            </div>
            <div className="warning-directive-body">
              <strong>Directive Instructions to HOD & Admin:</strong>
              <p>{complaint.committeeNote}</p>
            </div>
            <div className="warning-notice-footer">
              <small>
                Issued by {complaint.committeeReviewedBy?.name || 'Grievance Committee'} on{' '}
                {formatDate(complaint.committeeReviewedAt || complaint.updatedAt)}
              </small>
              <span className="target-pill">
                Target: {complaint.department} HOD & Campus Administration
              </span>
            </div>
          </div>
        )}

        {/* Conversation / Messages Section */}
        <div className="conversation-section">
          <div className="conversation-heading">
            <span className="details-label">MESSAGES</span>
            <span>{complaint.messages?.length || 0}</span>
          </div>
          {complaint.messages?.length ? (
            <div className="conversation-list">
              {complaint.messages.map((item) => {
                const fromStaff =
                  item.senderRole === 'hod' ||
                  item.senderRole === 'admin' ||
                  item.senderRole === 'committee';
                return (
                  <article
                    className={`conversation-message ${
                      fromStaff ? 'message-from-staff' : 'message-from-student'
                    }`}
                    key={item._id}
                  >
                    <div className="message-meta">
                      <strong>
                        {item.sender?.name ||
                          (item.senderRole === 'hod'
                            ? 'Department HOD'
                            : item.senderRole === 'admin'
                            ? 'Administrator'
                            : item.senderRole === 'committee'
                            ? 'Grievance Committee'
                            : 'Student')}
                      </strong>
                      <small>
                        {formatDate(item.createdAt)}
                        {item.editedAt ? ' · edited' : ''}
                      </small>
                    </div>
                    {item.deletedAt ? (
                      <p className="deleted-message">Message removed by an administrator.</p>
                    ) : editingMessageId === item._id ? (
                      <div className="message-edit-form">
                        <textarea
                          value={editingMessage}
                          onChange={(event) => setEditingMessage(event.target.value)}
                          maxLength="2000"
                          rows="3"
                        />
                        <div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditingMessageId('')}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => saveMessageEdit(item._id)}
                            disabled={!editingMessage.trim()}
                          >
                            Save edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{item.message}</p>
                    )}
                    {isAdmin && !item.deletedAt && editingMessageId !== item._id && (
                      <div className="message-moderation">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(item._id);
                            setEditingMessage(item.message);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteMessage(item._id)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="conversation-empty">
              No messages yet. Send a message to start the conversation.
            </p>
          )}

          {(isHod || isAdmin || isCommittee || isStudent) && (
            <form className="message-composer" onSubmit={sendMessage}>
              <label htmlFor="complaint-message">
                {isStudent
                  ? 'Reply to the department HOD'
                  : isCommittee
                  ? 'Send a message to the student'
                  : 'Send a message to the student'}
              </label>
              <textarea
                id="complaint-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength="2000"
                rows="3"
                placeholder="Write a message or ask for more details…"
                required
              />
              {messageError && <div className="form-error">{messageError}</div>}
              <button
                className="primary-button full-button"
                type="submit"
                disabled={sending || !message.trim()}
              >
                {sending ? 'Sending…' : isStudent ? 'Send reply' : 'Send message'}{' '}
                <Send size={14} />
              </button>
            </form>
          )}
        </div>

        {/* Complaint Timeline Section */}
        <div className="timeline-section">
          <span className="details-label">COMPLAINT TIMELINE</span>
          <div className="timeline">
            {(complaint.history?.length
              ? complaint.history
              : [
                  {
                    type: 'status',
                    status: complaint.status,
                    department: complaint.department,
                    note: 'Complaint submitted',
                    actorRole: 'student',
                    createdAt: complaint.createdAt,
                  },
                ]
            ).map((event, index) => (
              <div className="timeline-item" key={`${event._id || event.createdAt}-${index}`}>
                <span
                  className={`timeline-dot ${
                    event.status === 'Resolved' ? 'timeline-dot-resolved' : ''
                  }`}
                />
                <div>
                  <strong>
                    {event.type === 'department'
                      ? `Assigned to ${event.department}`
                      : event.actorRole === 'committee'
                      ? 'Committee review'
                      : event.type === 'update'
                      ? `${
                          event.actorRole === 'hod'
                            ? 'HOD'
                            : event.actorRole === 'admin'
                            ? 'Admin'
                            : 'System'
                        } update`
                      : `Status: ${event.status}`}
                  </strong>
                  {event.note && <p>{event.note}</p>}
                  <small>
                    {formatDate(event.createdAt)} ·{' '}
                    {event.actorRole === 'admin'
                      ? 'Campus admin'
                      : event.actorRole === 'hod'
                      ? 'Department HOD'
                      : event.actorRole === 'committee'
                      ? 'Grievance committee'
                      : event.actorRole === 'student'
                      ? 'Student'
                      : 'System'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff / HOD Controls */}
        {(isAdmin || isHod) && (
          <div className="admin-controls">
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={complaint.status === 'Resolved'}
              >
                {statuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            {isAdmin && (
              <>
                <label>
                  Priority
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
                <label>
                  Assign department
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  >
                    {departments.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Note for student{' '}
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                maxLength="1000"
                rows="3"
                placeholder="Add an update or response…"
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button
              className="primary-button full-button"
              onClick={saveUpdate}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save update'} <Check size={15} />
            </button>

            {complaint.status !== 'Resolved' && complaint.status !== 'Rejected' && (
              <div className="workflow-controls">
                <span className="details-label">ON-SITE VISIT</span>
                <label>
                  Schedule visit
                  <input
                    type="datetime-local"
                    value={visitScheduledAt}
                    onChange={(event) => setVisitScheduledAt(event.target.value)}
                    min={localDateTimeValue(new Date())}
                  />
                </label>
                <label>
                  Visit plan note{' '}
                  <textarea
                    value={visitScheduledNote}
                    onChange={(event) => setVisitScheduledNote(event.target.value)}
                    maxLength="500"
                    rows="2"
                    placeholder="Optional details for the student"
                  />
                </label>
                <button
                  className="secondary-button full-button"
                  type="button"
                  onClick={() => saveVisit('schedule')}
                  disabled={saving || !visitScheduledAt}
                >
                  Schedule visit
                </button>
                <label>
                  Visit completion report{' '}
                  <textarea
                    value={visitReport}
                    onChange={(event) => setVisitReport(event.target.value)}
                    maxLength="1000"
                    rows="3"
                    placeholder="Describe what you inspected or did during the visit"
                  />
                </label>
                <button
                  className="secondary-button full-button"
                  type="button"
                  onClick={() => saveVisit('complete')}
                  disabled={saving || !visitReport.trim()}
                >
                  Mark visit completed
                </button>
                <form onSubmit={saveResolution} className="workflow-resolution">
                  <label>
                    Resolution report{' '}
                    <textarea
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      maxLength="1000"
                      rows="3"
                      placeholder="Explain how the issue was fixed"
                      required
                    />
                  </label>
                  <button
                    className="primary-button full-button"
                    type="submit"
                    disabled={saving || !resolutionNote.trim()}
                  >
                    {saving ? 'Saving…' : 'Resolve complaint'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Student Reopen Request */}
        {isStudent && complaint.status === 'Resolved' && (
          <form className="workflow-reopen" onSubmit={requestReopen}>
            <strong>Is the issue still not fixed?</strong>
            <label>
              Tell the HOD what remains unresolved
              <textarea
                value={reopenReason}
                onChange={(event) => setReopenReason(event.target.value)}
                maxLength="1000"
                rows="3"
                placeholder="Describe what is still wrong"
                required
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button
              className="secondary-button full-button"
              type="submit"
              disabled={saving || !reopenReason.trim()}
            >
              {saving ? 'Reopening…' : 'Request to reopen complaint'}
            </button>
          </form>
        )}

        {/* Committee 3-Day Action Warning Directive */}
        {isCommittee && (
          <form className="committee-warning-form" onSubmit={saveCommitteeReview}>
            <div className="warning-form-header">
              <span className="warning-badge-tag">
                <Clock3 size={14} /> OFFICIAL 3-DAY WARNING NOTICE
              </span>
              <h3>Issue 3-Day Action Warning & Directive to HOD & Admin</h3>
              <p>
                Send a binding 3-day warning directive with instructions. Both the{' '}
                <strong>{complaint.department} HOD</strong> and{' '}
                <strong>Campus Administrators</strong> will be notified with a 72-hour deadline.
              </p>
            </div>

            <div className="warning-presets">
              <span className="presets-label">Click to auto-fill instructions:</span>
              <div className="preset-buttons">
                <button
                  type="button"
                  onClick={() =>
                    setCommitteeNote(
                      `[URGENT 3-DAY DIRECTIVE] The ${complaint.department} HOD must conduct an on-site inspection immediately and coordinate with Administration to resolve "${complaint.title}" within 3 days.`
                    )
                  }
                >
                  Inspection & Resolution within 3 Days
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCommitteeNote(
                      `[ACTION PLAN REQUIRED] Department HOD and Administration must submit a formal explanation and concrete action plan for "${complaint.title}" to the Committee within 72 hours.`
                    )
                  }
                >
                  Action Plan within 72 Hours
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCommitteeNote(
                      `[SAFETY / EMERGENCY DIRECTIVE] High priority issue. Immediate corrective action must be implemented and verified within the 3-day warning deadline.`
                    )
                  }
                >
                  Safety & Emergency Fix
                </button>
              </div>
            </div>

            <label className="warning-field">
              <span>Warning Directive Instructions for HOD & Admin:</span>
              <textarea
                value={committeeNote}
                onChange={(event) => setCommitteeNote(event.target.value)}
                maxLength="1500"
                rows="4"
                placeholder="Enter formal warning instructions that the HOD and Administration must carry out within 3 days..."
                required
              />
              <span className="field-hint">{committeeNote.length}/1500 characters</span>
            </label>

            <div className="warning-meta-grid">
              <label className="warning-field">
                <span>Warning Period Deadline (3 Days / 72 Hours):</span>
                <input
                  type="datetime-local"
                  value={committeeActionDueAt}
                  onChange={(event) => setCommitteeActionDueAt(event.target.value)}
                  min={localDateTimeValue(new Date())}
                  required
                />
              </label>
              <div className="warning-recipients-box">
                <span className="recipients-title">Notice Delivery Target:</span>
                <ul>
                  <li>
                    ✓ <strong>{complaint.department} HOD</strong> (Action directive)
                  </li>
                  <li>
                    ✓ <strong>Campus Administration</strong> (Oversight notice)
                  </li>
                  <li>
                    ✓ <strong>Student Submitter</strong> (Intervention update)
                  </li>
                </ul>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              className="danger-button full-button send-warning-btn"
              type="submit"
              disabled={saving || !committeeNote.trim()}
            >
              {saving ? 'Sending Warning Notice…' : 'Send 3-Day Warning to HOD & Admin ⚡'}
            </button>
          </form>
        )}

        {!isAdmin && !isHod && !isCommittee && (
          <div className="progress-note">
            <Clock3 size={16} />
            <span>
              <strong>We’re on it.</strong> You’ll see status updates here as your complaint is reviewed.
            </span>
          </div>
        )}
        <button className="details-close secondary-button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}
