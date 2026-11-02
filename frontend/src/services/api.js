/**
 * API Service for Backend Communication
 * Automatically includes JWT Authorization header and parses JSON.
 */

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
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
