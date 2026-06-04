import {
  createManagerEscape,
  deleteManagerEscape,
  getEscapeFloors as getMockEscapeFloors,
  getManagerEscapeById,
  getManagerEscapes,
  updateManagerEscape
} from './mockManagerEscapesApi';

const API_BASE = '/api/escapes';

const STATUS_LABEL = {
  available: 'Khả dụng',
  inspection: 'Cần kiểm tra',
  unavailable: 'Không khả dụng'
};

function normalizeFloorToken(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function canonicalFloorIdFromValue(floor = '') {
  const normalized = normalizeFloorToken(floor);

  if (!normalized) return 'all';
  if (normalized.includes('tret') || normalized.includes('trt')) return 'floor_tret';

  const match = normalized.match(/(?:floor|tang)?(\d+)/);
  if (match) return `floor_${parseInt(match[1], 10)}`;

  return normalized;
}

function labelFromCanonicalFloorId(floorId = '') {
  if (floorId === 'floor_tret') return 'Tầng trệt';

  const match = String(floorId).match(/^floor_(\d+)$/);
  if (match) return `Tầng ${parseInt(match[1], 10)}`;

  return String(floorId || '');
}

function floorLabelToModelFloorId(floor = '') {
  return canonicalFloorIdFromValue(floor);
}

function modelFloorIdToFloorLabel(floorId = '') {
  return labelFromCanonicalFloorId(canonicalFloorIdFromValue(floorId));
}

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
    throw new Error(payload.message || 'Không tải được dữ liệu lối thoát.');
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

function addDerivedFields(escape) {
  if (!escape) return escape;

  const floor = escape.floor || escape.location || 'Chưa xác định';
  const floorId = canonicalFloorIdFromValue(floor);

  return {
    ...escape,
    floor,
    location: escape.location || floor,
    statusLabel: escape.statusLabel || STATUS_LABEL[escape.status] || 'Chưa xác định',
    glbFloorId: escape.glbFloorId || floorId
  };
}

async function fallbackList(filters = {}) {
  const escapes = await getManagerEscapes();

  return escapes
    .map(addDerivedFields)
    .filter((escape) => {
      if (filters.status && filters.status !== 'all' && escape.status !== filters.status) return false;
      if (filters.floor && filters.floor !== 'all' && escape.floor !== filters.floor) return false;

      const keyword = String(filters.search || '').trim().toLowerCase();
      if (!keyword) return true;

      return [
        escape.id,
        escape.type,
        escape.floor,
        escape.location,
        escape.room,
        escape.connectedTo,
        escape.glbNodeName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
}

export async function getEscapeRoutes(filters = {}) {
  try {
    const data = await request(toQueryString(filters));
    return data.map(addDerivedFields);
  } catch (error) {
    return fallbackList(filters);
  }
}

export async function getEscapeRouteById(escapeId) {
  try {
    const data = await request(`/${encodeURIComponent(escapeId)}`);
    return addDerivedFields(data);
  } catch (error) {
    const escape = await getManagerEscapeById(escapeId);
    return addDerivedFields(escape);
  }
}

export async function getEscapeFloors() {
  try {
    return await request('/floors');
  } catch (error) {
    return getMockEscapeFloors();
  }
}

export async function createEscapeRoute(payload) {
  const body = {
    ...payload,
    status: payload.status || 'available',
    statusLabel: payload.statusLabel || STATUS_LABEL[payload.status || 'available'] || 'Chưa xác định'
  };

  try {
    const data = await request('', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return addDerivedFields(data);
  } catch (error) {
    return createManagerEscape(body);
  }
}

export async function updateEscapeRoute(escapeId, updates) {
  const body = { ...updates };

  if (body.status && !body.statusLabel) {
    body.statusLabel = STATUS_LABEL[body.status] || 'Chưa xác định';
  }

  try {
    const data = await request(`/${encodeURIComponent(escapeId)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    return addDerivedFields(data);
  } catch (error) {
    return updateManagerEscape(escapeId, body);
  }
}

export async function deleteEscapeRoute(escapeId) {
  try {
    await request(`/${encodeURIComponent(escapeId)}`, {
      method: 'DELETE'
    });

    return true;
  } catch (error) {
    return deleteManagerEscape(escapeId);
  }
}

export async function getResidentEscapeRoutes(filters = {}) {
  return getEscapeRoutes(filters);
}

export { floorLabelToModelFloorId, modelFloorIdToFloorLabel };
