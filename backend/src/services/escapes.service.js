const escapesRepository = require('../repositories/escapes.repository');

const STATUS_LABEL = {
  available: 'Khả dụng',
  inspection: 'Cần kiểm tra',
  unavailable: 'Không khả dụng'
};

function normalizeEscapeInput(input = {}) {
  const status = input.status || 'available';
  const floor = input.floor || input.location || 'Chưa xác định';

  return {
    ...input,
    floor,
    location: input.location || floor,
    status,
    statusLabel: input.statusLabel || STATUS_LABEL[status] || 'Chưa xác định',
    width: input.width || '--',
    clearHeight: input.clearHeight || '--'
  };
}

async function getEscapes(filters) {
  return escapesRepository.findAll(filters);
}

async function getEscapeById(id) {
  return escapesRepository.findById(id);
}

async function getFloors() {
  return escapesRepository.findFloors();
}

async function createEscape(payload) {
  const escape = normalizeEscapeInput(payload);
  return escapesRepository.create(escape);
}

async function updateEscape(id, payload) {
  const updates = { ...payload };

  if (updates.status && !updates.statusLabel) {
    updates.statusLabel = STATUS_LABEL[updates.status] || 'Chưa xác định';
  }

  if (updates.floor && !updates.location) {
    updates.location = updates.floor;
  }

  return escapesRepository.update(id, updates);
}

async function deleteEscape(id) {
  return escapesRepository.remove(id);
}

module.exports = {
  getEscapes,
  getEscapeById,
  getFloors,
  createEscape,
  updateEscape,
  deleteEscape
};