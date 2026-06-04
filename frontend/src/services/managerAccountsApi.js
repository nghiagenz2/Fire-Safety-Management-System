const API_BASE = '/api/accounts';

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
    throw new Error(payload.message || 'Khong tai duoc du lieu tai khoan.');
  }

  return payload.data;
}

function toQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getManagerAccounts(filters = {}) {
  return request(toQueryString(filters));
}

export function getManagerAccountById(accountId) {
  return request(`/${encodeURIComponent(accountId)}`);
}

export function filterManagerAccounts(filters = {}) {
  return getManagerAccounts(filters);
}

export function createManagerAccount(payload) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateManagerAccount(accountId, updates) {
  return request(`/${encodeURIComponent(accountId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export function assignManagerAccountRole(accountId, role) {
  return request(`/${encodeURIComponent(accountId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
}

export function setManagerAccountLock(accountId, shouldLock) {
  return request(`/${encodeURIComponent(accountId)}/lock`, {
    method: 'PATCH',
    body: JSON.stringify({ shouldLock })
  });
}

export async function deleteManagerAccount(accountId) {
  await request(`/${encodeURIComponent(accountId)}`, {
    method: 'DELETE'
  });

  return true;
}

export function getManagerRoles() {
  return request('/roles');
}
