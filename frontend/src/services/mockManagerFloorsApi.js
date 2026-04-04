import floorsData from '../mocks/managerFloors.json';

const MOCK_LATENCY_MS = 400;

// ─── Hằng số nhãn trạng thái ────────────────────────────────────────────────

const SAFETY_LEVEL_LABEL = {
  safe: 'An toàn',
  warning: 'Cảnh báo',
  danger: 'Nguy hiểm',
};

const DEVICE_STATUS_LABEL = {
  active: 'Hoạt động tốt',
  warning: 'Cảnh báo',
  danger: 'Hỏng',
  maintenance: 'Bảo trì',
  inspection: 'Cần kiểm tra',
};

const EXIT_STATUS_LABEL = {
  available: 'Khả dụng',
  blocked: 'Bị chặn',
  inspection: 'Cần kiểm tra',
};

// ─── Store in-memory (mô phỏng database) ────────────────────────────────────

let floorsStore = (floorsData.floors || []).map((floor) => ({
  ...floor,
  safetyLevelLabel:
    floor.safetyLevelLabel || SAFETY_LEVEL_LABEL[floor.safetyLevel] || 'Chưa xác định',
  devices: (floor.devices || []).map((d) => ({
    ...d,
    statusLabel: d.statusLabel || DEVICE_STATUS_LABEL[d.status] || 'Chưa xác định',
  })),
  exits: (floor.exits || []).map((e) => ({
    ...e,
    statusLabel: e.statusLabel || EXIT_STATUS_LABEL[e.status] || 'Chưa xác định',
  })),
}));

const buildingInfoStore = floorsData.buildingInfo || {};
const deviceTypesStore = floorsData.deviceTypes || [];
const safetyLevelsStore = floorsData.safetyLevels || [];
const deviceStatusesStore = floorsData.deviceStatuses || [];

// ─── Utilities ───────────────────────────────────────────────────────────────

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

// ─── 1. THÔNG TIN TỔNG QUAN TOÀ NHÀ ─────────────────────────────────────────

/**
 * Lấy thông tin tổng hợp toàn toà nhà (dùng cho dashboard overview)
 */
export function getBuildingInfo() {
  return resolveAfterDelay(clone(buildingInfoStore));
}

/**
 * Lấy thống kê an toàn tổng hợp toàn bộ các tầng
 * @returns {{ totalFloors, safeFloors, warningFloors, dangerFloors, overallScore }}
 */
export function getBuildingSafetyStats() {
  const stats = {
    totalFloors: floorsStore.length,
    safeFloors: 0,
    warningFloors: 0,
    dangerFloors: 0,
    overallScore: buildingInfoStore.overallSafetyScore || 0,
    overallSafetyLevel: buildingInfoStore.overallSafetyLevel || 'unknown',
    overallSafetyLevelLabel: buildingInfoStore.overallSafetyLevelLabel || '',
  };

  floorsStore.forEach((floor) => {
    if (floor.safetyLevel === 'safe') stats.safeFloors++;
    else if (floor.safetyLevel === 'warning') stats.warningFloors++;
    else if (floor.safetyLevel === 'danger') stats.dangerFloors++;
  });

  return resolveAfterDelay(stats);
}

// ─── 2. DANH SÁCH TẦNG ───────────────────────────────────────────────────────

/**
 * Lấy danh sách tất cả tầng (kèm summary — không có devices chi tiết)
 * Dùng cho panel trái / dropdown chọn tầng
 */
export function getFloorList() {
  const list = floorsStore.map(({ devices, exits, hazardZones, ...floor }) => ({
    ...floor,
    exits: exits.map(({ id, type, location, status, statusLabel }) => ({
      id,
      type,
      location,
      status,
      statusLabel,
    })),
    hazardZoneCount: (hazardZones || []).length,
  }));

  return resolveAfterDelay(clone(list));
}

/**
 * Lấy danh sách tầng có lọc theo mức an toàn
 * @param {string} safetyLevel - 'safe' | 'warning' | 'danger'
 */
export function filterFloorsBySafetyLevel(safetyLevel) {
  const filtered = floorsStore
    .filter((floor) => !safetyLevel || floor.safetyLevel === safetyLevel)
    .map(({ devices, exits, hazardZones, ...floor }) => ({
      ...floor,
      hazardZoneCount: (hazardZones || []).length,
    }));

  return resolveAfterDelay(clone(filtered));
}

// ─── 3. CHI TIẾT TẦNG ────────────────────────────────────────────────────────

/**
 * Lấy toàn bộ thông tin chi tiết một tầng (summary + devices + exits + hazardZones)
 * @param {string} floorId - VD: 'FLOOR-1', 'FLOOR-B1', 'FLOOR-ROOF'
 */
export function getFloorById(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  return resolveAfterDelay(floor ? clone(floor) : null);
}

/**
 * Lấy mức độ an toàn tổng thể của một tầng
 * @param {string} floorId
 * @returns {{ safetyLevel, safetyLevelLabel, safetyScore, summary }}
 */
export function getFloorSafetySummary(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay(null);

  const result = {
    id: floor.id,
    name: floor.name,
    level: floor.level,
    area: floor.area,
    safetyLevel: floor.safetyLevel,
    safetyLevelLabel: floor.safetyLevelLabel,
    safetyScore: floor.safetyScore,
    summary: floor.summary,
    hasHazardZone: floor.summary?.hasHazardZone || false,
    hazardZoneCount: floor.summary?.hazardZoneCount || 0,
  };

  return resolveAfterDelay(clone(result));
}

// ─── 4. THIẾT BỊ THEO TẦNG ───────────────────────────────────────────────────

/**
 * Lấy danh sách thiết bị trên một tầng
 * @param {string} floorId
 */
export function getDevicesByFloor(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  return resolveAfterDelay(floor ? clone(floor.devices || []) : []);
}

/**
 * Lọc thiết bị trên một tầng theo điều kiện
 * @param {string} floorId
 * @param {Object} filters
 * @param {string} filters.status - 'active' | 'warning' | 'danger' | 'maintenance' | 'inspection'
 * @param {string} filters.type - Loại thiết bị (tìm theo từ khóa trong trường `type`)
 * @param {string} filters.search - Tìm kiếm theo id, type, room, location
 */
export function filterDevicesByFloor(floorId, filters = {}) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay([]);

  const { status, type, search } = filters;

  const filtered = (floor.devices || []).filter((device) => {
    if (status && device.status !== status) return false;

    if (type) {
      if (!device.type.toLowerCase().includes(type.toLowerCase())) return false;
    }

    if (search) {
      const keyword = search.toLowerCase();
      const matchesId = device.id.toLowerCase().includes(keyword);
      const matchesType = device.type.toLowerCase().includes(keyword);
      const matchesRoom = device.room?.toLowerCase().includes(keyword);
      const matchesLocation = device.location?.toLowerCase().includes(keyword);
      const matchesModel = device.model?.toLowerCase().includes(keyword);

      if (!matchesId && !matchesType && !matchesRoom && !matchesLocation && !matchesModel) {
        return false;
      }
    }

    return true;
  });

  return resolveAfterDelay(clone(filtered));
}

/**
 * Lấy chi tiết một thiết bị cụ thể trên một tầng
 * @param {string} floorId
 * @param {string} deviceId
 */
export function getDeviceOnFloor(floorId, deviceId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay(null);

  const device = (floor.devices || []).find((d) => d.id === deviceId);
  return resolveAfterDelay(device ? clone(device) : null);
}

/**
 * Lấy thống kê thiết bị của một tầng theo trạng thái
 * @param {string} floorId
 * @returns {{ total, active, warning, danger, maintenance, inspection }}
 */
export function getFloorDeviceStats(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay(null);

  const stats = { total: 0, active: 0, warning: 0, danger: 0, maintenance: 0, inspection: 0 };

  (floor.devices || []).forEach((device) => {
    stats.total++;
    if (stats[device.status] !== undefined) stats[device.status]++;
  });

  return resolveAfterDelay(clone(stats));
}

/**
 * Cập nhật trạng thái thiết bị trên một tầng (mô phỏng PUT)
 * @param {string} floorId
 * @param {string} deviceId
 * @param {Object} updates - Các trường cần cập nhật (status, condition, maintenanceDue, ...)
 */
export function updateDeviceOnFloor(floorId, deviceId, updates) {
  const floorIndex = floorsStore.findIndex((f) => f.id === floorId);
  if (floorIndex === -1) return resolveAfterDelay(null);

  const devices = floorsStore[floorIndex].devices || [];
  const deviceIndex = devices.findIndex((d) => d.id === deviceId);
  if (deviceIndex === -1) return resolveAfterDelay(null);

  const updated = {
    ...devices[deviceIndex],
    ...updates,
    statusLabel:
      DEVICE_STATUS_LABEL[updates.status] || devices[deviceIndex].statusLabel,
  };

  floorsStore[floorIndex].devices[deviceIndex] = updated;

  // Tự động tính lại summary của tầng
  _recalcFloorSummary(floorIndex);

  return resolveAfterDelay(clone(updated));
}

// ─── 5. LỐI THOÁT THEO TẦNG ──────────────────────────────────────────────────

/**
 * Lấy danh sách lối thoát của một tầng
 * @param {string} floorId
 */
export function getExitsByFloor(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  return resolveAfterDelay(floor ? clone(floor.exits || []) : []);
}

/**
 * Lọc lối thoát của tầng theo trạng thái
 * @param {string} floorId
 * @param {string} exitStatus - 'available' | 'blocked' | 'inspection'
 */
export function filterExitsByFloor(floorId, exitStatus) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay([]);

  const filtered = (floor.exits || []).filter(
    (exit) => !exitStatus || exit.status === exitStatus
  );

  return resolveAfterDelay(clone(filtered));
}

// ─── 6. KHU VỰC NGUY HIỂM ────────────────────────────────────────────────────

/**
 * Lấy danh sách khu vực nguy hiểm của một tầng
 * @param {string} floorId
 */
export function getHazardZonesByFloor(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  return resolveAfterDelay(floor ? clone(floor.hazardZones || []) : []);
}

/**
 * Lấy tất cả khu vực nguy hiểm toàn toà nhà (có kèm thông tin tầng)
 */
export function getAllHazardZones() {
  const result = [];

  floorsStore.forEach((floor) => {
    (floor.hazardZones || []).forEach((zone) => {
      result.push({
        ...zone,
        floorId: floor.id,
        floorName: floor.name,
        floorLevel: floor.level,
      });
    });
  });

  return resolveAfterDelay(clone(result));
}

// ─── 7. XUẤT BÁO CÁO ─────────────────────────────────────────────────────────

/**
 * Tạo dữ liệu báo cáo an toàn PCCC cho một tầng (dùng để export PDF/CSV)
 * @param {string} floorId
 * @returns {Object} Báo cáo đầy đủ gồm thông tin tầng, thiết bị, lối thoát, khu vực nguy hiểm
 */
export function generateFloorReport(floorId) {
  const floor = floorsStore.find((f) => f.id === floorId);
  if (!floor) return resolveAfterDelay(null);

  const report = {
    reportId: `RPT-${floor.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    floor: {
      id: floor.id,
      name: floor.name,
      level: floor.level,
      area: floor.area,
      safetyLevel: floor.safetyLevel,
      safetyLevelLabel: floor.safetyLevelLabel,
      safetyScore: floor.safetyScore,
    },
    summary: floor.summary,
    devices: floor.devices || [],
    exits: floor.exits || [],
    hazardZones: floor.hazardZones || [],
    buildingInfo: {
      name: buildingInfoStore.name,
      address: buildingInfoStore.address,
      manager: buildingInfoStore.manager,
    },
  };

  return resolveAfterDelay(clone(report));
}

/**
 * Tạo báo cáo tổng hợp cho toàn bộ các tầng
 * @returns {Object} Báo cáo toàn toà nhà
 */
export function generateBuildingReport() {
  const floorReports = floorsStore.map((floor) => ({
    id: floor.id,
    name: floor.name,
    level: floor.level,
    area: floor.area,
    safetyLevel: floor.safetyLevel,
    safetyLevelLabel: floor.safetyLevelLabel,
    safetyScore: floor.safetyScore,
    summary: floor.summary,
    hazardZoneCount: (floor.hazardZones || []).length,
  }));

  const report = {
    reportId: `RPT-BUILDING-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    buildingInfo: buildingInfoStore,
    floorReports,
  };

  return resolveAfterDelay(clone(report));
}

// ─── 8. METADATA / LOOKUP ────────────────────────────────────────────────────

/**
 * Lấy danh mục loại thiết bị (dùng để render dropdown lọc)
 */
export function getDeviceTypes() {
  return resolveAfterDelay(clone(deviceTypesStore));
}

/**
 * Lấy danh sách mức an toàn và màu sắc tương ứng (dùng cho legend/badge)
 */
export function getSafetyLevels() {
  return resolveAfterDelay(clone(safetyLevelsStore));
}

/**
 * Lấy danh sách trạng thái thiết bị và màu sắc tương ứng (dùng cho filter/badge)
 */
export function getDeviceStatuses() {
  return resolveAfterDelay(clone(deviceStatusesStore));
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Tính lại summary.activeDevices / warningDevices / brokenDevices sau khi cập nhật
 * @param {number} floorIndex
 */
function _recalcFloorSummary(floorIndex) {
  const floor = floorsStore[floorIndex];
  const devices = floor.devices || [];

  const active = devices.filter((d) => d.status === 'active').length;
  const warning = devices.filter((d) => d.status === 'warning').length;
  const broken = devices.filter((d) => d.status === 'danger').length;

  floorsStore[floorIndex].summary = {
    ...floor.summary,
    totalDevices: devices.length,
    activeDevices: active,
    warningDevices: warning,
    brokenDevices: broken,
  };

  // Cập nhật safetyScore đơn giản: tỉ lệ thiết bị hoạt động tốt * 100
  if (devices.length > 0) {
    const score = Math.round((active / devices.length) * 100);
    floorsStore[floorIndex].safetyScore = score;

    if (score >= 80) {
      floorsStore[floorIndex].safetyLevel = 'safe';
      floorsStore[floorIndex].safetyLevelLabel = 'An toàn';
    } else if (score >= 50) {
      floorsStore[floorIndex].safetyLevel = 'warning';
      floorsStore[floorIndex].safetyLevelLabel = 'Cảnh báo';
    } else {
      floorsStore[floorIndex].safetyLevel = 'danger';
      floorsStore[floorIndex].safetyLevelLabel = 'Nguy hiểm';
    }
  }
}
