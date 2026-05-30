import axios from "axios";

const API_BASE = "http://localhost:5000/api/manager/floors";

export async function getFloorList() {
  const response = await axios.get(`${API_BASE}`);
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error("Lỗi tải danh sách tầng");
}

export async function getFloorById(floorId) {
  const response = await axios.get(`${API_BASE}/${encodeURIComponent(floorId)}`);
  if (response.data && response.data.success) {
    return response.data.data;
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
