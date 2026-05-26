const devicesRepository = require('../repositories/devices.repository');

const STATUS_LABEL = {
  active: 'Hoạt động tốt',
  warning: 'Cảnh báo',
  danger: 'Hỏng',
  maintenance: 'Bảo trì'
};

function normalizeDeviceInput(input = {}) {
  const status = input.status || 'active';

  return {
    ...input,
    status,
    statusLabel: input.statusLabel || STATUS_LABEL[status] || 'Chưa xác định',
    maintenanceDue: input.maintenanceDue || '--',
    owner: input.owner || '--',
    quantity: input.quantity || 1
  };
}

function createId(device) {
  const prefix = device.type?.toLowerCase().includes('tủ') ? 'CAB' : 'DEV';
  return `${prefix}-${Date.now()}`;
}

async function getDevices(filters) {
  return devicesRepository.findAll(filters);
}

async function getDeviceById(id) {
  return devicesRepository.findById(id);
}

async function getFloors() {
  return devicesRepository.findFloors();
}

async function createDevice(payload) {
  const device = normalizeDeviceInput(payload);
  device.id = device.id || createId(device);
  return devicesRepository.create(device);
}

async function updateDevice(id, payload) {
  const updates = { ...payload };
  if (updates.status && !updates.statusLabel) {
    updates.statusLabel = STATUS_LABEL[updates.status] || 'Chưa xác định';
  }

  return devicesRepository.update(id, updates);
}

async function deleteDevice(id) {
  return devicesRepository.remove(id);
}

module.exports = {
  getDevices,
  getDeviceById,
  getFloors,
  createDevice,
  updateDevice,
  deleteDevice
};
