import React, { useState } from 'react';
import { Plus, CircleHelp } from 'lucide-react';

export default function UsersPanel({
  users,
  loading,
  error,
  onCreate,
  onToggle,
  onRetry,
}) {
  const [actionError, setActionError] = useState('');

  async function toggleAccount(user) {
    setActionError('');
    try {
      await onToggle(user._id, !user.isActive);
    } catch (requestError) {
      setActionError(requestError.message);
    }
  }

  return (
    <section className="complaints-section">
      <div className="section-heading">
        <div>
          <div className="section-title-row">
            <h2>Account management</h2>
            <span className="count-pill">{users.length}</span>
          </div>
          <p>Create campus accounts and control who can sign in.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={16} /> Create account
        </button>
      </div>

      {(error || actionError) && (
        <div className="inline-alert">
          <CircleHelp size={17} /> {error || actionError}{' '}
          {!actionError && <button onClick={onRetry}>Try again</button>}
        </div>
      )}

      <div className="users-table">
        <div className="users-header">
          <span>ACCOUNT</span>
          <span>ROLE / DEPARTMENT</span>
          <span>STATUS</span>
          <span>ACTION</span>
        </div>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" />
            <p>Loading accounts…</p>
          </div>
        ) : (
          users.map((user) => (
            <div className="users-row" key={user._id}>
              <div className="user-identity">
                <span className="mini-avatar">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
              </div>
              <span className="user-role">
                {user.role === 'hod'
                  ? `${user.department} HOD`
                  : user.role === 'admin'
                  ? 'Administrator'
                  : user.role === 'committee'
                  ? 'Grievance Committee'
                  : 'Student'}
              </span>
              <span>
                <span
                  className={`account-status ${
                    user.isActive ? 'account-active' : 'account-disabled'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Disabled'}
                </span>
              </span>
              <span>
                <button
                  className="secondary-button user-toggle"
                  onClick={() => toggleAccount(user)}
                >
                  {user.isActive ? 'Disable' : 'Enable'}
                </button>
              </span>
            </div>
          ))
        )}
        {!loading && !users.length && (
          <div className="empty-state">
            <strong>No accounts found</strong>
          </div>
        )}
      </div>
      <p className="account-footnote">
        Disabled accounts cannot sign in. Accounts are retained so complaint history stays intact.
      </p>
    </section>
  );
}
