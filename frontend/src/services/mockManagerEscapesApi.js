import managerEscapes from '../mocks/managerEscapes.json';

const MOCK_LATENCY_MS = 400;

const STATUS_LABEL = {
  available: 'Khả dụng',
  inspection: 'Cần kiểm tra',
  unavailable: 'Không khả dụng'
};

let escapesStore = (managerEscapes || []).map((item) => ({
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
 * Lấy danh sách toàn bộ lối thoát
 */
export function getManagerEscapes() {
  return resolveAfterDelay(clone(escapesStore));
}

/**
 * Lấy thông tin chi tiết một lối thoát
 */
export function getManagerEscapeById(escapeId) {
  const escape = escapesStore.find((e) => e.id === escapeId);
  return resolveAfterDelay(escape ? clone(escape) : null);
}

/**
 * Lọc lối thoát theo các điều kiện
 * @param {Object} filters - Các điều kiện lọc
 * @param {string} filters.status - Lọc theo trạng thái (available, inspection, unavailable)
 * @param {string} filters.floor - Lọc theo tầng
 * @param {string} filters.search - Tìm kiếm theo ID hoặc loại lối thoát
 */
export function filterManagerEscapes(filters = {}) {
  const { status, floor, search } = filters;
  
  const filtered = escapesStore.filter((escape) => {
    if (status && escape.status !== status) return false;
    
    if (floor) {
      if (!escape.floor.includes(floor)) return false;
    }
    
    if (search) {
      const keyword = search.toLowerCase();
      const matchesId = escape.id.toLowerCase().includes(keyword);
      const matchesType = escape.type.toLowerCase().includes(keyword);
      const matchesLocation = escape.location.toLowerCase().includes(keyword);
      const matchesRoom = escape.room.toLowerCase().includes(keyword);
      
      if (!matchesId && !matchesType && !matchesLocation && !matchesRoom) return false;
    }
    
    return true;
  });
  
  return resolveAfterDelay(clone(filtered));
}

/**
 * Tạo lối thoát mới
 */
export function createManagerEscape(escapeData) {
  const newEscape = {
    id: `${escapeData.type.toUpperCase().substring(0, 4)}-${Date.now()}`,
    ...escapeData,
    statusLabel: STATUS_LABEL[escapeData.status] || 'Chưa xác định'
  };
  
  escapesStore.push(newEscape);
  return resolveAfterDelay(clone(newEscape));
}

/**
 * Cập nhật thông tin lối thoát
 */
export function updateManagerEscape(escapeId, updates) {
  const index = escapesStore.findIndex((e) => e.id === escapeId);
  
  if (index === -1) {
    return resolveAfterDelay(null);
  }
  
  const updated = {
    ...escapesStore[index],
    ...updates,
    statusLabel: STATUS_LABEL[updates.status] || escapesStore[index].statusLabel
  };
  
  escapesStore[index] = updated;
  return resolveAfterDelay(clone(updated));
}

/**
 * Xóa lối thoát
 */
export function deleteManagerEscape(escapeId) {
  const index = escapesStore.findIndex((e) => e.id === escapeId);
  
  if (index === -1) {
    return resolveAfterDelay(false);
  }
  
  escapesStore.splice(index, 1);
  return resolveAfterDelay(true);
}

/**
 * Lấy danh sách các tầng có lối thoát
 */
export function getEscapeFloors() {
  const floors = new Set();
  escapesStore.forEach((escape) => {
    if (escape.floor) {
      floors.add(escape.floor);
    }
  });
  
  return resolveAfterDelay(Array.from(floors).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || 0);
    const bNum = parseInt(b.match(/\d+/)?.[0] || 0);
    return aNum - bNum;
  }));
}

/**
 * Lấy thống kê lối thoát theo trạng thái
 */
export function getEscapeStatistics() {
  const stats = {
    total: escapesStore.length,
    available: 0,
    inspection: 0,
    unavailable: 0
  };
  
  escapesStore.forEach((escape) => {
    stats[escape.status]++;
  });
  
  return resolveAfterDelay(stats);
}

/**
 * Cập nhật kiểm tra lối thoát
 */
export function updateEscapeInspection(escapeId, lastInspection) {
  return updateManagerEscape(escapeId, { lastInspection });
}
