import React from 'react';
import { Trash2, X } from 'lucide-react';
import { statuses } from '../constants/defaults';

export default function BulkActionsBar({
  selectedCount,
  departments,
  onAction,
  onClear,
}) {
  if (!selectedCount) return null;

  return (
    <div className="bulk-actions-bar">
      <div className="bulk-info">
        <span className="bulk-count">{selectedCount}</span>
        <span>complaints selected</span>
      </div>
      <div className="bulk-controls">
        <label className="bulk-select-wrap">
          <span>Status:</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAction('status', e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled>Change status…</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="bulk-select-wrap">
          <span>Reassign:</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAction('department', e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled>Reassign dept…</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="danger-button bulk-delete-btn"
          onClick={() => onAction('delete')}
        >
          <Trash2 size={13} /> Delete
        </button>
        <button
          type="button"
          className="icon-button bulk-clear-btn"
          title="Clear selection"
          onClick={onClear}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
