import managerDevices from '../mocks/managerDevices.json';

const MOCK_LATENCY_MS = 400;

const STATUS_LABEL = {
  active: 'Hoạt động tốt',
  warning: 'Cảnh báo',
  danger: 'Hỏng',
  maintenance: 'Bảo trì'
};

let devicesStore = (managerDevices || []).map((item) => ({
  ...item,
  statusLabel: item.statusLabel || STATUS_LABEL[item.status] || 'Chưa xác định'
}));

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Lấy danh sách toàn bộ thiết bị PCCC
 */
export function getManagerDevices() {
  return resolveAfterDelay(clone(devicesStore));
}

/**
 * Lấy thông tin chi tiết một thiết bị
 */
export function getManagerDeviceById(deviceId) {
  const device = devicesStore.find((d) => d.id === deviceId);
  return resolveAfterDelay(device ? clone(device) : null);
}

/**
 * Lọc thiết bị theo các điều kiện
 * @param {Object} filters - Các điều kiện lọc
 * @param {string} filters.status - Lọc theo trạng thái (active, warning, danger, maintenance)
 * @param {string} filters.location - Lọc theo vị trí
 * @param {string} filters.search - Tìm kiếm theo ID hoặc loại thiết bị
 */
export function filterManagerDevices(filters = {}) {
  const { status, location, search } = filters;
  
  const filtered = devicesStore.filter((device) => {
    if (status && device.status !== status) return false;
    
    if (location) {
      if (!device.location.includes(location)) return false;
    }
    
    if (search) {
      const keyword = search.toLowerCase();
      const matchesId = device.id.toLowerCase().includes(keyword);
      const matchesType = device.type.toLowerCase().includes(keyword);
      const matchesLocation = device.location.toLowerCase().includes(keyword);
      
      if (!matchesId && !matchesType && !matchesLocation) return false;
    }
    
    return true;
  });
  
  return resolveAfterDelay(clone(filtered));
}

/**
 * Tạo thiết bị mới
 */
export function createManagerDevice(deviceData) {
  const newDevice = {
    id: `${deviceData.type.toUpperCase().substring(0, 4)}-${Date.now()}`,
    ...deviceData,
    statusLabel: STATUS_LABEL[deviceData.status] || 'Chưa xác định'
  };
  
  devicesStore.push(newDevice);
  return resolveAfterDelay(clone(newDevice));
}

/**
 * Cập nhật thông tin thiết bị
 */
export function updateManagerDevice(deviceId, updates) {
  const index = devicesStore.findIndex((d) => d.id === deviceId);
  
  if (index === -1) {
    return resolveAfterDelay(null);
  }
  
  const updated = {
    ...devicesStore[index],
    ...updates,
    statusLabel: STATUS_LABEL[updates.status] || devicesStore[index].statusLabel
  };
  
  devicesStore[index] = updated;
  return resolveAfterDelay(clone(updated));
}

/**
 * Xóa thiết bị
 */
export function deleteManagerDevice(deviceId) {
  const index = devicesStore.findIndex((d) => d.id === deviceId);
  
  if (index === -1) {
    return resolveAfterDelay(false);
  }
  
  devicesStore.splice(index, 1);
  return resolveAfterDelay(true);
}

/**
 * Lấy danh sách các tầng có thiết bị
 */
export function getFloors() {
  const floors = new Set();
  devicesStore.forEach((device) => {
    const match = device.location.match(/Tầng \d+/);
    if (match) {
      floors.add(match[0]);
    }
  });
  
  return resolveAfterDelay(Array.from(floors).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)[0]);
    const bNum = parseInt(b.match(/\d+/)[0]);
    return aNum - bNum;
  }));
}

/**
 * Lấy thống kê thiết bị theo trạng thái
 */
export function getDeviceStatistics() {
  const stats = {
    total: devicesStore.length,
    active: 0,
    warning: 0,
    danger: 0,
    maintenance: 0
  };
  
  devicesStore.forEach((device) => {
    stats[device.status]++;
  });
  
  return resolveAfterDelay(stats);
}

/**
 * Cập nhật trạng thái bảo trì của thiết bị
 */
export function updateMaintenanceStatus(deviceId, maintenanceDue) {
  return updateManagerDevice(deviceId, { maintenanceDue });
}
