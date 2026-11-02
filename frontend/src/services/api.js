/**
 * API Service for Backend Communication
 * Automatically includes JWT Authorization header and parses JSON.
 */

export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed. Please try again.');
  }
  return data;
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem('campuscare-session') || 'null');
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (session) {
    localStorage.setItem('campuscare-session', JSON.stringify(session));
  } else {
    localStorage.removeItem('campuscare-session');
  }
}
