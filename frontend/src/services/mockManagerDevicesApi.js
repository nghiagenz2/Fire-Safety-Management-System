import managerDevices from '../mocks/managerDevices.json';

const STATUS_LABEL = {
  active: 'Hoạt động tốt',
  warning: 'Cảnh báo',
  danger: 'Hỏng',
  maintenance: 'Bảo trì'
};

let fallbackDevicesStore = (managerDevices || []).map((device) => hydrateDevice(device));

function extractFloorLabel(value = '') {
  const match = String(value).match(/Tầng\s*\d+|Tầng trệt/i);
  if (match) {
    return match[0].replace(/\s+/g, ' ').trim();
  }

  return 'Tầng 1';
}

function hydrateDevice(device = {}) {
  const floor = device.floor || extractFloorLabel(device.location || 'Tầng 1');

  return {
    ...device,
    floor,
    statusLabel: device.statusLabel || STATUS_LABEL[device.status] || 'Chưa xác định'
  };
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function resolveLocalDevices(filters = {}) {
  const keyword = String(filters.search || '').trim().toLowerCase();

  return fallbackDevicesStore.filter((device) => {
    if (filters.status && filters.status !== 'all' && device.status !== filters.status) {
      return false;
    }

    if (filters.floor && filters.floor !== 'all' && device.floor !== filters.floor) {
      return false;
    }

    if (keyword) {
      const searchable = [device.id, device.type, device.location, device.floor, device.model, device.room]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

function resolveLocalFloors() {
  const floors = new Set();

  fallbackDevicesStore.forEach((device) => {
    if (device.floor) {
      floors.add(device.floor);
    }
  });

  return Array.from(floors).sort((left, right) => {
    const leftMatch = left.match(/\d+/);
    const rightMatch = right.match(/\d+/);
    const leftNumber = leftMatch ? Number(leftMatch[0]) : 0;
    const rightNumber = rightMatch ? Number(rightMatch[0]) : 0;

    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right, 'vi');
  });
}

function parseQuery(path = '') {
  const query = String(path).startsWith('?') ? String(path).slice(1) : '';
  const params = new URLSearchParams(query);

  return Object.fromEntries(params.entries());
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
  return Promise.resolve(clone(resolveLocalDevices(filters)));
}

export function getManagerDeviceById(deviceId) {
  const device = fallbackDevicesStore.find((item) => item.id === deviceId);
  return Promise.resolve(device ? clone(device) : null);
}

export function filterManagerDevices(filters = {}) {
  return getManagerDevices(filters);
}

export function createManagerDevice(deviceData) {
  const status = deviceData.status || 'active';

  const payload = hydrateDevice({
    ...deviceData,
    status,
    statusLabel: deviceData.statusLabel || STATUS_LABEL[status] || 'Chưa xác định'
  });

  fallbackDevicesStore.push(payload);

  return Promise.resolve(clone(payload));
}

export function updateManagerDevice(deviceId, updates) {
  const index = fallbackDevicesStore.findIndex((item) => item.id === deviceId);
  if (index !== -1) {
    fallbackDevicesStore[index] = hydrateDevice({
      ...fallbackDevicesStore[index],
      ...updates
    });
  }

  return Promise.resolve(clone(fallbackDevicesStore[index] || null));
}

export async function deleteManagerDevice(deviceId) {
  fallbackDevicesStore = fallbackDevicesStore.filter((item) => item.id !== deviceId);

  return true;
}

export function getFloors() {
  return Promise.resolve(clone(resolveLocalFloors()));
}

export async function getDeviceStatistics() {
  const devices = await getManagerDevices();

  return devices.reduce(
    (stats, device) => {
      stats.total += 1;
      if (stats[device.status] !== undefined) {
        stats[device.status] += 1;
      }
      return stats;
    },
    {
      total: 0,
      active: 0,
      warning: 0,
      danger: 0,
      maintenance: 0
    }
  );
}

export function updateMaintenanceStatus(deviceId, maintenanceDue) {
  return updateManagerDevice(deviceId, { maintenanceDue });
}
