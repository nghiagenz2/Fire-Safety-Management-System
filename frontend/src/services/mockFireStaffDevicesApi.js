import fireStaffDevices from "../mocks/fireStaffDevices.json";

const MOCK_LATENCY_MS = 400;

const STATUS_LABEL = {
  safe: "Hoạt động tốt",
  warning: "Cần bảo trì",
  danger: "Hỏng/Lỗi",
};

let devicesStore = (fireStaffDevices || []).map((item) => ({
  ...item,
  inspectorName: item.inspectorName || item.assignedTeam || "Chưa ghi nhận",
  attachments: item.attachments || [],
  inspectionLogs: item.inspectionLogs || [],
  brokenReports: item.brokenReports || [],
}));

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
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

function findDeviceById(deviceId) {
  const device = devicesStore.find((item) => item.id === deviceId);
  if (!device) {
    throw new Error(`Không tìm thấy thiết bị ${deviceId}`);
  }
  return device;
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
    statusLabel: device.statusLabel || STATUS_LABEL[device.status] || "Chưa rõ",
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

export function fetchFireStaffDeviceFilterOptions() {
  return resolveAfterDelay({
    floors: [...new Set(devicesStore.map((item) => item.floor))],
    types: [...new Set(devicesStore.map((item) => item.type))],
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
  });
}

export function fetchFireStaffDeviceTableData(filters = {}) {
  const filtered = applyFilters(devicesStore, filters).map(toTableRow);
  return resolveAfterDelay({
    total: devicesStore.length,
    filtered: filtered.length,
    items: clone(filtered),
  });
}

export function fetchFireStaffDevice3DData(filters = {}) {
  const filteredIds = new Set(
    applyFilters(devicesStore, filters).map((item) => item.id),
  );
  const nodes = devicesStore.map((device, index) => ({
    deviceId: device.id,
    floor: device.floor,
    room: device.room,
    type: device.type,
    status: device.status,
    highlight: filteredIds.has(device.id),
    position: {
      x: (index % 3) * 3 - 3,
      y: Number(device.floor.replace(/[^0-9]/g, "")) || 1,
      z: Math.floor(index / 3) * 3 - 3,
    },
  }));

  return resolveAfterDelay({
    nodes: clone(nodes),
    highlightedIds: [...filteredIds],
  });
}

export function updateFireStaffDeviceStatus(deviceId, payload = {}) {
  const device = findDeviceById(deviceId);
  const nextStatus = payload.status;

  if (!STATUS_LABEL[nextStatus]) {
    return Promise.reject(new Error("Trạng thái không hợp lệ"));
  }

  device.status = nextStatus;
  device.statusLabel = payload.statusLabel || STATUS_LABEL[nextStatus];
  return resolveAfterDelay(clone(toTableRow(device)));
}

export function recordFireStaffDeviceInspection(deviceId, payload = {}) {
  const device = findDeviceById(deviceId);
  const inspectorName = payload.inspectorName || "Nhân viên chưa xác định";
  const inspectedAt = payload.inspectedAt || formatDDMMYYYY(new Date());

  const log = {
    id: `INS-${Date.now()}`,
    inspectorName,
    result: payload.result || "pass",
    note: payload.note || "",
    inspectedAt,
  };

  device.inspectorName = inspectorName;
  device.lastInspection = inspectedAt;
  device.inspectionLogs.unshift(log);

  return resolveAfterDelay(clone(log));
}

export function reportFireStaffDeviceBroken(deviceId, payload = {}) {
  const device = findDeviceById(deviceId);
  const report = {
    id: `RPT-${Date.now()}`,
    reporterName: payload.reporterName || "Nhân viên chưa xác định",
    issueSummary: payload.issueSummary || "Thiết bị lỗi",
    severity: payload.severity || "high",
    createdAt: new Date().toISOString(),
  };

  device.status = "danger";
  device.statusLabel = STATUS_LABEL.danger;
  device.brokenReports.unshift(report);

  return resolveAfterDelay(clone(report));
}

export function attachFireStaffDeviceInspectionImage(deviceId, payload = {}) {
  const device = findDeviceById(deviceId);
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

  device.attachments.unshift(attachment);
  return resolveAfterDelay(clone(attachment));
}

export function resetFireStaffDevicesMockState() {
  devicesStore = (fireStaffDevices || []).map((item) => ({
    ...item,
    inspectorName: item.inspectorName || item.assignedTeam || "Chưa ghi nhận",
    attachments: item.attachments || [],
    inspectionLogs: item.inspectionLogs || [],
    brokenReports: item.brokenReports || [],
  }));

  return resolveAfterDelay(true);
}
