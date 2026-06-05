export async function getManagerIncidentsData() {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/incidents`);
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error(payload.message || "Lỗi tải dữ liệu sự cố");
}

export async function getSimulationIncident() {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/incidents/simulation`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success || !payload.data?.active) {
    return null;
  }

  const data = payload.data;
  const floorName = data.floorId === 'floor_tret'
    ? 'Tầng trệt'
    : `Tầng ${String(data.floorId || '').replace('floor_', '')}`;

  return {
    id: 'SIM-FIRE-ACTIVE',
    incident_type: 'Mô phỏng cháy đang hoạt động',
    floor: floorName,
    status: 'open',
    severity: data.level === 'high' ? 'Nguy cơ cao' : data.level === 'low' ? 'Thấp' : 'Trung bình',
    occurredAt: data.startTime ? new Date(data.startTime).toISOString() : new Date().toISOString(),
    resourcesDeployed: [],
    affectedArea: [floorName],
    description: data.origin
      ? `Mô phỏng sự cố cháy khởi phát tại vị trí ${data.origin} ở ${floorName}.`
      : 'Nhân viên PCCC đang bật mô phỏng cháy.'
  };
}
