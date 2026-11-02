import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, note, icon, tone }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <div className={`stat-icon stat-${tone}`}>{icon}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      <div className={`stat-trend trend-${tone}`}>
        {tone === 'green' ? (
          <ArrowUpRight size={14} />
        ) : tone === 'amber' ? (
          <ArrowDownRight size={14} />
        ) : (
          <span className="trend-dot" />
        )}
        <span>{tone === 'green' ? 'Keep it up' : tone === 'amber' ? 'Review soon' : 'Live overview'}</span>
      </div>
    </article>
  );
}
