import React from 'react';
import { Clock3, ArrowUpRight, Check, X } from 'lucide-react';
import { statusClass } from '../utils/helpers';

export default function StatusBadge({ status }) {
  const icons = {
    Submitted: <Clock3 size={12} />,
    'In Review': <ArrowUpRight size={12} />,
    Resolved: <Check size={12} />,
    Rejected: <X size={12} />,
  };

  return (
    <span className={`status-badge status-${statusClass(status)}`}>
      {icons[status]}
      {status}
    </span>
  );
}
