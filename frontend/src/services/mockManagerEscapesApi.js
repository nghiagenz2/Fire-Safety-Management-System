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

// Automatically generate sample escapes for floors 4 to 27
for (let f = 4; f <= 27; f++) {
  escapesStore.push({
    id: `STAIRS-F${f}-UP`,
    type: "Thang bộ thoát hiểm",
    location: `Tầng ${f}`,
    room: `Hành lang tầng ${f}`,
    status: f % 7 === 0 ? "inspection" : "available",
    statusLabel: f % 7 === 0 ? "Cần kiểm tra" : "Khả dụng",
    floor: `Tầng ${f}`,
    level: `Lối thoát hiểm Tầng ${f}`,
    connectedTo: `Cầu thang bộ trục B`,
    lastInspection: `2026-04-${10 + (f % 15)}`,
    owner: f % 2 === 0 ? "Nguyễn Văn A" : "Trần Văn B"
  });
  escapesStore.push({
    id: `EXIT-F${f}-A`,
    type: "Cửa thoát hiểm",
    location: `Tầng ${f}`,
    room: `Phòng kỹ thuật tầng ${f}`,
    status: "available",
    statusLabel: "Khả dụng",
    floor: `Tầng ${f}`,
    level: `Lối thoát hiểm Tầng ${f}`,
    connectedTo: `Lối ra thoát hiểm hành lang`,
    lastInspection: `2026-04-${12 + (f % 15)}`,
    owner: f % 2 === 0 ? "Trần Văn B" : "Nguyễn Văn A"
  });
}

// Ground floor (Tầng trệt) escape data
escapesStore.push({
  id: "EXIT-TRET-MAIN",
  type: "Cửa thoát hiểm chính",
  location: "Tầng trệt",
  room: "Sảnh chính",
  status: "available",
  statusLabel: "Khả dụng",
  floor: "Tầng trệt",
  level: "Tầng trệt",
  connectedTo: "Lối ra ngoài tòa nhà",
  width: "2.4 m",
  clearHeight: "2.4 m",
  lastInspection: "2026-04-01",
  owner: "Nguyễn Văn A"
});
escapesStore.push({
  id: "EXIT-TRET-SIDE",
  type: "Cửa thoát hiểm phụ",
  location: "Tầng trệt",
  room: "Lối vào phía sau",
  status: "available",
  statusLabel: "Khả dụng",
  floor: "Tầng trệt",
  level: "Tầng trệt",
  connectedTo: "Lối thoát ra sân sau",
  width: "1.8 m",
  clearHeight: "2.2 m",
  lastInspection: "2026-04-05",
  owner: "Trần Văn B"
});
escapesStore.push({
  id: "STAIRS-TRET-UP",
  type: "Thang bộ thoát hiểm",
  location: "Tầng trệt",
  room: "Hành lang tầng trệt",
  status: "available",
  statusLabel: "Khả dụng",
  floor: "Tầng trệt",
  level: "Tầng trệt",
  connectedTo: "Cầu thang bộ trục A",
  lastInspection: "2026-04-03",
  owner: "Nguyễn Văn A"
});


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
