import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { defaultDepartments } from '../constants/defaults';

export default function UserModal({ onClose, onCreate, departments = defaultDepartments }) {
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());
    try {
      await onCreate(payload);
      onClose();
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
        className="modal-card complaint-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
      >
        <div className="modal-heading">
          <div>
            <span className="modal-kicker">ADMIN CONTROL</span>
            <h2 id="create-account-title">Create account</h2>
            <p>Add a student, administrator, department HOD, or committee member.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <form className="complaint-form" onSubmit={submit}>
          <label>
            Full name
            <input name="name" maxLength="80" required />
          </label>
          <label>
            Email address
            <input name="email" type="email" maxLength="254" required />
          </label>
          <label>
            Temporary password
            <input name="password" type="password" minLength="8" required />
            <span className="field-hint">At least 8 characters</span>
          </label>
          <label>
            Account type
            <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="student">Student</option>
              <option value="hod">Department HOD</option>
              <option value="committee">Grievance Committee</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          {role === 'hod' && (
            <label>
              Department
              <select name="department" required>
                {departments
                  .filter((dept) => dept !== 'Unassigned')
                  .map((dept) => (
                    <option key={dept}>{dept}</option>
                  ))}
              </select>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create account'} <Check size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
