const API_BASE = '/api/devices';

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

function mapDeviceForResident(device) {
  const nodeIndex = device.glbNodeName?.match(/\d+/)?.[0] || device.id?.match(/\d+$/)?.[0] || '01';
  const floorNum = device.floor?.match(/\d+/)?.[0] || 'G';
  const room = device.room || (floorNum === 'G' ? 'Sảnh trệt' : `Phòng ${floorNum}${nodeIndex.padStart(2, '0')}`);
  const seed = device.id ? device.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0) : 10;
  const isCabinet = device.type?.toLowerCase().includes('tủ');
  const isCo2 = device.type?.toLowerCase().includes('co2') || device.model?.toLowerCase().includes('co2');

  let usageScope = 'Thiết bị chữa cháy khẩn cấp';
  let caution = 'Chú ý an toàn khi sử dụng.';
  let instructionSteps = ['Sử dụng theo hướng dẫn trên nhãn thiết bị.'];

  if (isCabinet) {
    usageScope = 'Tủ chứa thiết bị chữa cháy gồm vòi phun và bình chữa cháy.';
    caution = 'Đảm bảo lối tiếp cận tủ không bị che khuất.';
    instructionSteps = [
      'Mở cửa tủ chữa cháy.',
      'Kéo cuộn vòi chữa cháy ra ngoài.',
      'Lắp lăng phun vào đầu vòi, vặn chặt van nước để dập lửa.'
    ];
  } else if (isCo2) {
    usageScope = 'Đám cháy thiết bị điện hoặc tủ điện nhỏ.';
    caution = 'Không cầm trực tiếp vào loa phun kim loại khi đang xả CO2.';
    instructionSteps = [
      'Rút chốt an toàn trên thân bình.',
      'Đứng xuôi chiều gió, hướng loa phun vào gốc lửa.',
      'Bóp cò và quét ngang đều tay từ gần đến xa.'
    ];
  } else {
    usageScope = 'Đám cháy chất rắn, chất lỏng dễ cháy quy mô nhỏ.';
    caution = 'Sau khi xịt cần quan sát hiện tượng cháy bùng trở lại.';
    instructionSteps = [
      'Lắc nhẹ bình 2 đến 3 lần trước khi sử dụng.',
      'Rút chốt, giữ vòi hướng vào chân đám cháy.',
      'Bóp cò dứt khoát và quét theo hình rẻ quạt.'
    ];
  }

  let residentStatus = 'safe';
  if (device.status === 'danger') {
    residentStatus = 'danger';
  } else if (device.status === 'warning' || device.status === 'maintenance') {
    residentStatus = 'warning';
  }

  return {
    ...device,
    room,
    nearestExit: floorNum === 'G' ? 'Cửa sảnh chính' : `Cửa thoát hiểm E${floorNum}`,
    distanceToResident: (seed % 20) + 5,
    usageScope,
    caution,
    instructionSteps,
    status: residentStatus,
    statusLabel:
      residentStatus === 'safe'
        ? 'Hoạt động tốt'
        : residentStatus === 'warning'
          ? 'Bảo trì'
          : 'Hỏng tín hiệu'
  };
}

export function getDevices(filters = {}) {
  return request(toQueryString(filters));
}

export function getDeviceById(deviceId) {
  return request(`/${encodeURIComponent(deviceId)}`);
}

export function getDeviceFloors() {
  return request('/floors');
}

export function createDevice(deviceData) {
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

export function updateDevice(deviceId, updates) {
  return request(`/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteDevice(deviceId) {
  await request(`/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE'
  });

  return true;
}

export async function getDeviceStatistics() {
  const [devices, escapePayload] = await Promise.all([
    getDevices({ allTypes: true }),
    fetch('/api/escapes').then((response) => response.json()).catch(() => ({ data: [] }))
  ]);
  const escapes = Array.isArray(escapePayload?.data) ? escapePayload.data : [];

  const stats = devices.reduce(
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
      totalExits: 0,
      availableExits: 0
    }
  );

  stats.totalExits = escapes.length;
  stats.availableExits = escapes.filter((escape) => escape.status === 'available').length;
  return stats;
}

export async function getResidentDevices(filters = {}) {
  const devices = await getDevices(filters);
  return devices.map(mapDeviceForResident);
}
