import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

export default function ConfigPanel({
  departments,
  categories,
  suggestions,
  onAddDepartment,
  onRemoveDepartment,
  onAddSuggestion,
  onRemoveSuggestion,
}) {
  const [newDept, setNewDept] = useState('');
  const [newSuggTitle, setNewSuggTitle] = useState('');
  const [newSuggCat, setNewSuggCat] = useState(departments[0] || 'Facilities');

  function submitDept(e) {
    e.preventDefault();
    if (!newDept.trim()) return;
    onAddDepartment(newDept.trim());
    setNewDept('');
  }

  function submitSuggestion(e) {
    e.preventDefault();
    if (!newSuggTitle.trim()) return;
    onAddSuggestion(newSuggTitle.trim(), newSuggCat);
    setNewSuggTitle('');
  }

  return (
    <section className="complaints-section config-section">
      <div className="section-heading">
        <div>
          <div className="section-title-row">
            <h2>Campus & System Settings</h2>
            <span className="count-pill">{departments.length} Depts</span>
          </div>
          <p>
            Dynamically configure college departments and common student complaint suggestions. Changes update routing, HOD creation, filters, and student forms in real time.
          </p>
        </div>
      </div>

      <div className="config-grid">
        {/* Department Config Card */}
        <div className="config-card">
          <div className="config-card-header">
            <h3>College Departments ({departments.length})</h3>
            <p>Active departments for complaint routing, HOD accounts, and dashboard filtering.</p>
          </div>

          <div className="config-chip-list">
            {departments.map((dept) => (
              <span className="config-dept-chip" key={dept}>
                <span>{dept}</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  title={`Remove ${dept} department`}
                  aria-label={`Remove ${dept}`}
                  onClick={() => onRemoveDepartment(dept)}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>

          <form className="config-add-form" onSubmit={submitDept}>
            <input
              type="text"
              placeholder="e.g., Library, Sports, Placement…"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              maxLength={40}
              required
            />
            <button type="submit" className="primary-button">
              <Plus size={14} /> Add Dept
            </button>
          </form>
        </div>

        {/* Suggestion Presets Config Card */}
        <div className="config-card">
          <div className="config-card-header">
            <h3>Student Complaint Suggestions ({suggestions.length})</h3>
            <p>One-click issue presets that appear on the student dashboard for fast complaint filing.</p>
          </div>

          <div className="config-suggestion-list">
            {suggestions.map((sugg) => (
              <div className="config-sugg-row" key={sugg._id || sugg.title}>
                <div className="sugg-copy">
                  <span className="category-tag">{sugg.category}</span>
                  <strong title={sugg.title}>{sugg.title}</strong>
                </div>
                <button
                  type="button"
                  className="chip-remove-btn"
                  title="Remove preset"
                  aria-label="Remove preset"
                  onClick={() => onRemoveSuggestion(sugg._id || sugg.title)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <form className="config-add-form" onSubmit={submitSuggestion}>
            <input
              type="text"
              placeholder="e.g., Library AC not cooling, Wi-Fi speed issue…"
              value={newSuggTitle}
              onChange={(e) => setNewSuggTitle(e.target.value)}
              maxLength={120}
              required
            />
            <select
              value={newSuggCat}
              onChange={(e) => setNewSuggCat(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button type="submit" className="primary-button">
              <Plus size={14} /> Add Preset
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
