const API_BASE = `${import.meta.env.VITE_API_URL}/api/floors`;

export async function getFloorList() {
  const response = await fetch(API_BASE);
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error("Lỗi tải danh sách tầng");
}

export async function getFloorById(floorId) {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(floorId)}`);
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error("Lỗi tải chi tiết tầng");
}

export async function getDeviceTypes() {
  return [
    { id: 'fire_cabinet', label: 'Tủ chữa cháy' },
    { id: 'fire_extinguisher', label: 'Bình chữa cháy' }
  ];
}

export async function getBuildingInfo() {
  return {
    name: "Bcon City",
    address: "Đường Thống Nhất, Dĩ An, Bình Dương",
    manager: "Ban Quản Lý Bcon City",
    overallSafetyScore: 98,
    overallSafetyLevel: "safe",
    overallSafetyLevelLabel: "An toàn"
  };
}

export async function generateFloorReport(floorId) {
  const floorData = await getFloorById(floorId);
  return {
    reportId: `RPT-${floorId}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    floor: {
      id: floorData.id,
      name: floorData.name,
      level: floorData.level,
      area: floorData.area,
      safetyLevel: floorData.safetyLevel,
      safetyLevelLabel: floorData.safetyLevelLabel,
      safetyScore: floorData.safetyScore,
    },
    summary: floorData.summary,
    devices: floorData.devices || [],
    exits: floorData.exits || [],
    hazardZones: floorData.hazardZones || [],
    buildingInfo: {
      name: "Bcon City",
      address: "Đường Thống Nhất, Dĩ An, Bình Dương",
      manager: "Ban Quản Lý Bcon City",
    },
  };
}

export async function updateDeviceStatus(deviceId, status) {
  const STATUS_LABEL = {
    active: 'Hoạt động tốt',
    warning: 'Cảnh báo',
    danger: 'Hỏng',
    maintenance: 'Bảo trì'
  };
  const response = await fetch(`/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, statusLabel: STATUS_LABEL[status] || status })
  });
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error(payload.message || 'Lỗi cập nhật trạng thái thiết bị');
}
