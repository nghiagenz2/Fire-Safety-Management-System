const API_BASE = `${import.meta.env.VITE_API_URL}/api/auth`;
const SESSION_KEY = 'fireSafetyUser';

async function request(path = '', options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Không đăng nhập được.');
  }

  return payload.data;
}

export async function loginAccount(credentials) {
  const session = await request('/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });

  localStorage.setItem(SESSION_KEY, JSON.stringify(session.user));
  return session.user;
}

export function getCurrentUser() {
  const rawUser = localStorage.getItem(SESSION_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function logoutAccount() {
  localStorage.removeItem(SESSION_KEY);
}

export function getHomePathForRole(role) {
  const homePath = {
    manager: '/manager/home',
    firestaff: '/firestaff/home',
    resident: '/resident/home'
  };

  return homePath[role] || '/login';
}

export function canAccessRole(userRole, requiredRole) {
  const rank = {
    resident: 1,
    firestaff: 2,
    manager: 3
  };

  return (rank[userRole] || 0) >= (rank[requiredRole] || 0);
}
