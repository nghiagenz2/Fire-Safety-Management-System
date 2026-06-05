const API_BASE = '${import.meta.env.VITE_API_URL}/api/devices';

const STATUS_LABEL = {
  active: 'Hoạt động tốt',
  warning: 'Cảnh báo',
  danger: 'Hỏng',
  maintenance: 'Bảo trì'
};

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
    throw new Error(payload.message || 'Không tải được dữ liệu thiết bị.');
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

export function getManagerDevices(filters = {}) {
  return request(toQueryString(filters));
}

export function getManagerDeviceById(deviceId) {
  return request(`/${encodeURIComponent(deviceId)}`);
}

export function filterManagerDevices(filters = {}) {
  return getManagerDevices(filters);
}

export function createManagerDevice(deviceData) {
  const status = deviceData.status || 'active';

  return request('', {
    method: 'POST',
    body: JSON.stringify({
      ...deviceData,
      status,
      statusLabel: deviceData.statusLabel || STATUS_LABEL[status] || 'Chưa xác định'
    })
  });
}

export function updateManagerDevice(deviceId, updates) {
  return request(`/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteManagerDevice(deviceId) {
  await request(`/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE'
  });

  return true;
}

export function getFloors() {
  return request('/floors');
}

export async function getDeviceStatistics() {
  const devices = await getManagerDevices({ allTypes: true });

  let escapesCount = 0;
  try {
    const escapesRes = await fetch('/api/escapes');
    const escapesJson = await escapesRes.json();
    escapesCount = escapesJson.data ? escapesJson.data.length : 0;
  } catch (error) {
    console.error('Failed to fetch escapes:', error);
  }

  return devices.reduce(
    (stats, device) => {
      if (device.type === 'Bình chữa cháy' || device.type === 'Tủ chữa cháy') {
        stats.total += 1;
        if (stats[device.status] !== undefined) {
          stats[device.status] += 1;
        }
      } else if (device.type === 'Cửa thoát hiểm') {
        stats.totalExits += 1;
        if (device.status === 'active') {
          stats.availableExits += 1;
        }
      }
      return stats;
    },
    {
      total: 0,
      active: 0,
      warning: 0,
      danger: 0,
      maintenance: 0,
      totalExits: escapesCount,
      availableExits: escapesCount
    }
  );
}

export function updateMaintenanceStatus(deviceId, maintenanceDue) {
  return updateManagerDevice(deviceId, { maintenanceDue });
}
