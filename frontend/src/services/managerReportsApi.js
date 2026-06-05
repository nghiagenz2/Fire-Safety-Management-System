const API_BASE = `${import.meta.env.VITE_API_URL}/api/reports`;

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
    throw new Error(payload.message || 'Khong tai duoc du lieu bao cao.');
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

export function getManagerReports(filters = {}) {
  return request(toQueryString(filters));
}

export function getManagerReportById(reportId) {
  return request(`/${encodeURIComponent(reportId)}`);
}

export function getManagerReportFilters() {
  return request('/filters');
}

export function createManagerReport(payload) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateManagerReport(reportId, updates) {
  return request(`/${encodeURIComponent(reportId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteManagerReport(reportId) {
  await request(`/${encodeURIComponent(reportId)}`, {
    method: 'DELETE'
  });

  return true;
}
