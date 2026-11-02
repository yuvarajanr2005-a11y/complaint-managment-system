/**
 * Common Utility & Helper Functions
 */

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function statusClass(status) {
  if (!status) return 'submitted';
  return status.toLowerCase().replace(' ', '-');
}

export function getTrackingId(complaint) {
  if (!complaint || !complaint._id) return 'CC-0000-000000';
  const year = new Date(complaint.createdAt || Date.now()).getFullYear();
  return `CC-${year}-${complaint._id.slice(-6).toUpperCase()}`;
}
