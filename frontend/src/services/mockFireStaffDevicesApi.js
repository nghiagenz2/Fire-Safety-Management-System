import fireStaffDevices from "../mocks/fireStaffDevices.json";

const API_BASE = '/api/devices';

const STATUS_LABEL = {
  safe: "Hoạt động tốt",
  warning: "Cần bảo trì",
  danger: "Hỏng/Lỗi",
};

// Local session cache for logs and attachments (since DB doesn't have these columns)
const sessionCache = {
  attachments: {},
  inspectionLogs: {},
  brokenReports: {},
};

async function fetchAllDbDevices() {
  try {
    const response = await fetch(API_BASE);
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error('Không tải được dữ liệu thiết bị.');
    }
    return payload.data;
  } catch (error) {
    console.error('Failed to fetch from backend, falling back to mock data:', error);
    return fireStaffDevices.map(item => ({
      id: item.id,
      type: item.type,
      location: item.location,
      status: item.status === 'safe' ? 'active' : (item.status === 'danger' ? 'danger' : 'warning'),
      status_label: STATUS_LABEL[item.status] || 'Chưa rõ',
      maintenance_due: item.maintenanceDue,
      owner_name: item.inspectorName || item.assignedTeam,
      last_inspection: item.lastInspection,
      glb_node_index: 1,
    }));
  }
}

function parseDDMMYYYY(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getMaintenanceCategory(maintenanceDue) {
  const dueDate = parseDDMMYYYY(maintenanceDue);
  if (!dueDate) {
    return "no_schedule";
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / dayMs);

  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 30) {
    return "due_30_days";
  }
  if (diffDays <= 90) {
    return "due_90_days";
  }
  return "future";
}

function sortFloors(floors) {
  return [...floors].sort((a, b) => {
    if (a === 'Tầng trệt') return -1;
    if (b === 'Tầng trệt') return 1;
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
}

function dbDeviceToFireStaff(device) {
  const nodeIndexStr = device.glbNodeName?.match(/\d+/)?.[0] || device.id?.match(/\d+$/)?.[0] || '01';
  const floorNum = device.floor?.match(/\d+/)?.[0] || 'G';
  const room = floorNum === 'G' ? 'Sảnh trệt' : `Phòng ${floorNum}${nodeIndexStr.padStart(2, '0')}`;

  let fireStaffStatus = 'warning';
  if (device.status === 'active') {
    fireStaffStatus = 'safe';
  } else if (device.status === 'danger') {
    fireStaffStatus = 'danger';
  } else if (device.status === 'warning') {
    fireStaffStatus = 'warning';
  }

  const fireStaffStatusLabel = STATUS_LABEL[fireStaffStatus] || device.statusLabel || 'Chưa rõ';

  return {
    id: device.id,
    type: device.type,
    floor: device.floor || 'Tầng 1',
    room: room,
    location: device.location || '',
    status: fireStaffStatus,
    statusLabel: fireStaffStatusLabel,
    maintenanceDue: device.maintenanceDue || '--',
    lastInspection: device.lastInspection || '--',
    inspectorName: device.owner || 'Chưa ghi nhận',
    glbNodeName: device.glbNodeName,
    glbNodeIndex: device.glbNodeIndex,
    glbTranslation: device.glbTranslation,
    attachments: sessionCache.attachments[device.id] || [],
    inspectionLogs: sessionCache.inspectionLogs[device.id] || [],
    brokenReports: sessionCache.brokenReports[device.id] || [],
  };
}

function applyFilters(devices, filters = {}) {
  const floor = filters.floor || "all";
  const type = filters.type || "all";
  const status = filters.status || "all";
  const maintenance = filters.maintenance || "all";
  const keyword = (filters.keyword || "").trim().toLowerCase();

  return devices.filter((device) => {
    const floorMatch = floor === "all" || device.floor === floor;
    const typeMatch = type === "all" || device.type === type;
    const statusMatch = status === "all" || device.status === status;

    const maintenanceCategory = getMaintenanceCategory(device.maintenanceDue);
    const maintenanceMatch =
      maintenance === "all" ||
      maintenanceCategory === maintenance ||
      (maintenance === "due_90_days" && maintenanceCategory === "due_30_days");

    const keywordMatch =
      keyword.length === 0 ||
      [
        device.id,
        device.type,
        device.floor,
        device.room,
        device.location,
        device.inspectorName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));

    return (
      floorMatch && typeMatch && statusMatch && maintenanceMatch && keywordMatch
    );
  });
}

function toTableRow(device) {
  return {
    id: device.id,
    code: device.id,
    type: device.type,
    floor: device.floor,
    areaOrRoom: device.room,
    status: device.status,
    statusLabel: device.statusLabel,
    maintenanceDue: device.maintenanceDue,
    lastInspection: device.lastInspection,
    inspectorName: device.inspectorName,
    actions: [
      "update_status",
      "record_inspection",
      "report_broken",
      "attach_image",
    ],
  };
}

export async function fetchFireStaffDeviceFilterOptions() {
  const dbDevices = await fetchAllDbDevices();
  const fireStaffDevices = dbDevices.map(dbDeviceToFireStaff);

  const uniqueFloors = [...new Set(fireStaffDevices.map((item) => item.floor))];
  const sortedFloors = sortFloors(uniqueFloors);

  return {
    floors: sortedFloors,
    types: [...new Set(fireStaffDevices.map((item) => item.type))],
    statuses: [
      { value: "safe", label: STATUS_LABEL.safe },
      { value: "warning", label: STATUS_LABEL.warning },
      { value: "danger", label: STATUS_LABEL.danger },
    ],
    maintenanceOptions: [
      { value: "all", label: "Tất cả" },
      { value: "overdue", label: "Quá hạn" },
      { value: "due_30_days", label: "Trong 30 ngày" },
      { value: "due_90_days", label: "Trong 90 ngày" },
      { value: "no_schedule", label: "Chưa có lịch" },
    ],
  };
}

export async function fetchFireStaffDeviceTableData(filters = {}) {
  const dbDevices = await fetchAllDbDevices();
  const fireStaffDevices = dbDevices.map(dbDeviceToFireStaff);
  const filtered = applyFilters(fireStaffDevices, filters).map(toTableRow);

  return {
    total: fireStaffDevices.length,
    filtered: filtered.length,
    items: filtered,
  };
}

export async function fetchFireStaffDevice3DData(filters = {}) {
  const dbDevices = await fetchAllDbDevices();
  const fireStaffDevices = dbDevices.map(dbDeviceToFireStaff);
  const filteredIds = new Set(
    applyFilters(fireStaffDevices, filters).map((item) => item.id)
  );

  const floorCounts = {};
  const nodes = fireStaffDevices.map((device) => {
    const fl = device.floor;
    if (floorCounts[fl] === undefined) {
      floorCounts[fl] = 0;
    }
    const idx = floorCounts[fl];
    floorCounts[fl] += 1;

    return {
      deviceId: device.id,
      floor: device.floor,
      room: device.room,
      type: device.type,
      status: device.status,
      highlight: filteredIds.has(device.id),
      position: {
        x: (idx % 6) * 3 - 7,
        y: Number(device.floor.replace(/[^0-9]/g, "")) || 1,
        z: Math.floor(idx / 6) * 3 - 7,
      },
    };
  });

  return {
    nodes,
    highlightedIds: [...filteredIds],
  };
}

export async function updateFireStaffDeviceStatus(deviceId, payload = {}) {
  const nextStatus = payload.status;
  if (!STATUS_LABEL[nextStatus]) {
    throw new Error("Trạng thái không hợp lệ");
  }

  const dbStatus = nextStatus === 'safe' ? 'active' : nextStatus;
  const dbStatusLabel = dbStatus === 'active' ? 'Hoạt động tốt' : (dbStatus === 'danger' ? 'Hỏng' : 'Cảnh báo');

  const response = await fetch(`${API_BASE}/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: dbStatus, statusLabel: dbStatusLabel })
  });

  const resPayload = await response.json();
  if (!response.ok || !resPayload.success) {
    throw new Error('Không thể cập nhật trạng thái lên server.');
  }

  const device = dbDeviceToFireStaff(resPayload.data);
  return toTableRow(device);
}

export async function recordFireStaffDeviceInspection(deviceId, payload = {}) {
  const inspectorName = payload.inspectorName || "Nhân viên chưa xác định";
  const inspectedAt = payload.inspectedAt || formatDDMMYYYY(new Date());

  const log = {
    id: `INS-${Date.now()}`,
    inspectorName,
    result: payload.result || "pass",
    note: payload.note || "",
    inspectedAt,
  };

  if (!sessionCache.inspectionLogs[deviceId]) {
    sessionCache.inspectionLogs[deviceId] = [];
  }
  sessionCache.inspectionLogs[deviceId].unshift(log);

  // Update inspection status on database
  const response = await fetch(`${API_BASE}/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lastInspection: inspectedAt,
      owner: inspectorName
    })
  });

  const resPayload = await response.json();
  if (!response.ok || !resPayload.success) {
    console.error('Failed to update inspection date in db:', resPayload.message);
  }

  return log;
}

export async function reportFireStaffDeviceBroken(deviceId, payload = {}) {
  const report = {
    id: `RPT-${Date.now()}`,
    reporterName: payload.reporterName || "Nhân viên chưa xác định",
    issueSummary: payload.issueSummary || "Thiết bị lỗi",
    severity: payload.severity || "high",
    createdAt: new Date().toISOString(),
  };

  if (!sessionCache.brokenReports[deviceId]) {
    sessionCache.brokenReports[deviceId] = [];
  }
  sessionCache.brokenReports[deviceId].unshift(report);

  // Update status to danger in database
  const response = await fetch(`${API_BASE}/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'danger',
      statusLabel: 'Hỏng'
    })
  });

  const resPayload = await response.json();
  if (!response.ok || !resPayload.success) {
    throw new Error('Không thể báo cáo hỏng lên server.');
  }

  return report;
}

export async function attachFireStaffDeviceInspectionImage(deviceId, payload = {}) {
  const now = Date.now();
  const fileName = payload.fileName || `inspection-${now}.jpg`;

  const attachment = {
    id: `IMG-${now}`,
    fileName,
    caption: payload.caption || "",
    uploadedBy: payload.uploadedBy || "Nhân viên chưa xác định",
    uploadedAt: new Date().toISOString(),
    url: `/mock/firestaff/${deviceId}/${fileName}`,
  };

  if (!sessionCache.attachments[deviceId]) {
    sessionCache.attachments[deviceId] = [];
  }
  sessionCache.attachments[deviceId].unshift(attachment);

  return attachment;
}

export async function resetFireStaffDevicesMockState() {
  sessionCache.attachments = {};
  sessionCache.inspectionLogs = {};
  sessionCache.brokenReports = {};
  return true;
}
