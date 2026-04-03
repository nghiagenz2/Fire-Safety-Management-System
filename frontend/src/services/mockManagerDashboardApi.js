import managerDashboard from "../mocks/managerDashboard.json";

const MOCK_LATENCY_MS = 400;

const DEVICE_TYPE_MATCHERS = {
  fire_extinguisher: ["bình chữa cháy"],
  smoke_detector: ["cảm biến khói"],
  sprinkler: ["sprinkler", "vòi phun"],
  alarm_bell: ["chuông báo cháy", "còi báo cháy"],
  control_panel: ["tủ trung tâm"],
  exit_sign: ["biển chỉ dẫn thoát hiểm", "đèn chỉ dẫn thoát hiểm"],
};

const INCIDENT_TYPE_MATCHERS = {
  smoke_alert: ["khói bất thường"],
  signal_loss: ["mất tín hiệu"],
  low_pressure: ["áp suất thấp"],
  maintenance_overdue: ["quá hạn bảo trì"],
  escape_blocked: ["lối thoát bị chặn"],
  communication_error: ["lỗi truyền thông"],
};

let dashboardStore = clone(managerDashboard || {});

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function toArray(value, fallback = ["all"]) {
  if (Array.isArray(value) && value.length > 0) return value;
  if (typeof value === "string" && value.length > 0) return [value];
  return fallback;
}

function getReferenceDate() {
  const value = dashboardStore?.meta?.lastUpdated;
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getTimeWindow(timeRange, customRange) {
  const now = getReferenceDate();
  const todayStart = startOfDay(now);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (timeRange === "today") {
    return { start: todayStart, end: now };
  }

  if (timeRange === "last_7_days") {
    return { start: addDays(todayStart, -6), end: now };
  }

  if (timeRange === "last_30_days") {
    return { start: addDays(todayStart, -29), end: now };
  }

  if (timeRange === "this_month") {
    return { start: currentMonthStart, end: now };
  }

  if (timeRange === "last_3_months") {
    return { start: addMonths(currentMonthStart, -2), end: now };
  }

  if (timeRange === "last_12_months") {
    return { start: addMonths(currentMonthStart, -11), end: now };
  }

  if (timeRange === "custom") {
    const start = customRange?.startDate
      ? new Date(customRange.startDate)
      : addDays(todayStart, -29);
    const end = customRange?.endDate ? new Date(customRange.endDate) : now;

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }

  return { start: addDays(todayStart, -29), end: now };
}

function isInDateWindow(value, window) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= window.start && date <= window.end;
}

function normalizeFilters(filters = {}) {
  const defaults = dashboardStore?.filters?.default || {};

  return {
    timeRange: filters.timeRange || defaults.timeRange || "last_30_days",
    floors: toArray(filters.floors || defaults.floors || ["all"]),
    deviceTypes: toArray(
      filters.deviceTypes || defaults.deviceTypes || ["all"],
    ),
    incidentTypes: toArray(
      filters.incidentTypes || defaults.incidentTypes || ["all"],
    ),
  };
}

function includesAnyKeyword(source, keywords = []) {
  const normalized = String(source || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function matchDeviceType(deviceTypeText, selectedDeviceTypes) {
  if (selectedDeviceTypes.includes("all")) return true;

  return selectedDeviceTypes.some((type) => {
    const keywords = DEVICE_TYPE_MATCHERS[type] || [];
    return includesAnyKeyword(deviceTypeText, keywords);
  });
}

function matchIncidentType(incidentTypeText, selectedIncidentTypes) {
  if (selectedIncidentTypes.includes("all")) return true;

  return selectedIncidentTypes.some((type) => {
    const keywords = INCIDENT_TYPE_MATCHERS[type] || [];
    return includesAnyKeyword(incidentTypeText, keywords);
  });
}

function filterFloorData(floorRows, selectedFloors) {
  if (selectedFloors.includes("all")) return floorRows;
  return floorRows.filter((row) => selectedFloors.includes(row.floor));
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

function buildSummaryCards(floorRows, incidents) {
  const totalDevices = sumBy(floorRows, "totalDevices");
  const healthyDevices = sumBy(floorRows, "healthyDevices");
  const failedDevices = sumBy(floorRows, "failedDevices");
  const maintenanceDevices = sumBy(floorRows, "maintenanceDevices");
  const availableExits = sumBy(floorRows, "availableExits");
  const totalExits = sumBy(floorRows, "totalExits");

  const severityBreakdown = {
    critical: incidents.filter((item) => item.severity === "critical").length,
    high: incidents.filter((item) => item.severity === "high").length,
    medium: incidents.filter((item) => item.severity === "medium").length,
    low: incidents.filter((item) => item.severity === "low").length,
  };

  return {
    totalDevices: {
      ...(dashboardStore.summaryCards?.totalDevices || {}),
      value: totalDevices,
    },
    healthyDevices: {
      ...(dashboardStore.summaryCards?.healthyDevices || {}),
      value: healthyDevices,
      ratio:
        totalDevices > 0
          ? Number(((healthyDevices / totalDevices) * 100).toFixed(1))
          : 0,
    },
    failedOrMaintenanceDevices: {
      ...(dashboardStore.summaryCards?.failedOrMaintenanceDevices || {}),
      value: failedDevices + maintenanceDevices,
      breakdown: {
        failed: failedDevices,
        maintenance: maintenanceDevices,
      },
    },
    availableExits: {
      ...(dashboardStore.summaryCards?.availableExits || {}),
      value: availableExits,
      total: totalExits,
      ratio:
        totalExits > 0
          ? Number(((availableExits / totalExits) * 100).toFixed(1))
          : 0,
    },
    monthlyIncidents: {
      ...(dashboardStore.summaryCards?.monthlyIncidents || {}),
      value: incidents.length,
      severityBreakdown,
    },
  };
}

function monthToDate(monthValue) {
  const match = String(monthValue || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return new Date(year, month, 1);
}

function filterChartByTimeRange(chartRows, window) {
  return chartRows.filter((item) => {
    const monthDate = monthToDate(item.month);
    if (!monthDate) return true;
    return (
      monthDate >=
        new Date(window.start.getFullYear(), window.start.getMonth(), 1) &&
      monthDate <= new Date(window.end.getFullYear(), window.end.getMonth(), 1)
    );
  });
}

function aggregateIncidentsByMonth(incidents) {
  const map = new Map();

  incidents.forEach((item) => {
    const date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(monthKey, (map.get(monthKey) || 0) + 1);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, incidentCount]) => ({ month, incidentCount }));
}

function buildChartData(
  baseCharts,
  filteredFloors,
  filteredIncidents,
  timeWindow,
  hasIncidentDimensionFilter,
) {
  const devicesByFloor = {
    ...(baseCharts.devicesByFloor || {}),
    data: filterFloorData(
      baseCharts.devicesByFloor?.data || [],
      filteredFloors.map((row) => row.floor),
    ),
  };

  const exitStatusByFloor = {
    ...(baseCharts.exitStatusByFloor || {}),
    data: filterFloorData(
      baseCharts.exitStatusByFloor?.data || [],
      filteredFloors.map((row) => row.floor),
    ),
  };

  const totalHealthy = sumBy(filteredFloors, "healthyDevices");
  const totalFailed = sumBy(filteredFloors, "failedDevices");
  const totalMaintenance = sumBy(filteredFloors, "maintenanceDevices");
  const total = totalHealthy + totalFailed + totalMaintenance;

  const deviceHealthRatio = {
    ...(baseCharts.deviceHealthRatio || {}),
    total,
    segments: [
      {
        key: "healthy",
        label: "Tốt",
        value: totalHealthy,
        color: "#2E7D32",
      },
      {
        key: "failed",
        label: "Hỏng",
        value: totalFailed,
        color: "#C62828",
      },
      {
        key: "maintenance",
        label: "Bảo trì",
        value: totalMaintenance,
        color: "#ED6C02",
      },
    ],
  };

  const baseLineData = baseCharts.incidentsOverTime?.data || [];
  const incidentsOverTime = {
    ...(baseCharts.incidentsOverTime || {}),
    data: hasIncidentDimensionFilter
      ? aggregateIncidentsByMonth(filteredIncidents)
      : filterChartByTimeRange(baseLineData, timeWindow),
  };

  return {
    devicesByFloor,
    deviceHealthRatio,
    incidentsOverTime,
    exitStatusByFloor,
  };
}

/**
 * Lấy toàn bộ dữ liệu dashboard gốc (không lọc)
 */
export function getManagerDashboardRaw() {
  return resolveAfterDelay(clone(dashboardStore));
}

/**
 * Lấy options bộ lọc dashboard
 */
export function getManagerDashboardFilterOptions() {
  return resolveAfterDelay(clone(dashboardStore?.filters || {}));
}

/**
 * Lấy dữ liệu dashboard đã áp dụng bộ lọc.
 * @param {Object} filters
 * @param {string} filters.timeRange
 * @param {string[]|string} filters.floors
 * @param {string[]|string} filters.deviceTypes
 * @param {string[]|string} filters.incidentTypes
 * @param {Object} customRange - Chỉ dùng khi timeRange = 'custom'
 * @param {string} customRange.startDate - ISO datetime
 * @param {string} customRange.endDate - ISO datetime
 */
export function getManagerDashboardData(filters = {}, customRange = null) {
  const normalizedFilters = normalizeFilters(filters);
  const timeWindow = getTimeWindow(normalizedFilters.timeRange, customRange);

  const allFloors = clone(dashboardStore?.buildingOverviewByFloor || []);
  const filteredFloors = filterFloorData(allFloors, normalizedFilters.floors);

  const allIncidents = clone(dashboardStore?.recentIncidents || []);
  const filteredIncidents = allIncidents.filter((item) => {
    const matchTime = isInDateWindow(item.occurredAt, timeWindow);
    const matchFloor =
      normalizedFilters.floors.includes("all") ||
      normalizedFilters.floors.includes(item.floor);
    const isDeviceTypeMatched = matchDeviceType(
      item.deviceType,
      normalizedFilters.deviceTypes,
    );
    const isIncidentTypeMatched = matchIncidentType(
      item.incidentType,
      normalizedFilters.incidentTypes,
    );

    return (
      matchTime && matchFloor && isDeviceTypeMatched && isIncidentTypeMatched
    );
  });

  const allAlerts = clone(dashboardStore?.recentAlerts || []);
  const filteredAlerts = allAlerts.filter((item) => {
    const matchTime = isInDateWindow(item.createdAt, timeWindow);
    const matchFloor =
      normalizedFilters.floors.includes("all") ||
      normalizedFilters.floors.includes(item.floor);
    return matchTime && matchFloor;
  });

  const allFireEvents = clone(dashboardStore?.fireEventHistory || []);
  const filteredFireEvents = allFireEvents.filter((item) => {
    const matchTime = isInDateWindow(item.occurredAt, timeWindow);
    const matchFloor =
      normalizedFilters.floors.includes("all") ||
      normalizedFilters.floors.includes(item.floor);
    return matchTime && matchFloor;
  });

  const hasIncidentDimensionFilter =
    !normalizedFilters.floors.includes("all") ||
    !normalizedFilters.deviceTypes.includes("all") ||
    !normalizedFilters.incidentTypes.includes("all");

  const charts = buildChartData(
    clone(dashboardStore?.charts || {}),
    filteredFloors,
    filteredIncidents,
    timeWindow,
    hasIncidentDimensionFilter,
  );

  const result = {
    meta: clone(dashboardStore?.meta || {}),
    layout: clone(dashboardStore?.layout || {}),
    appliedFilters: normalizedFilters,
    filterWindow: {
      startDate: timeWindow.start.toISOString(),
      endDate: timeWindow.end.toISOString(),
    },
    summaryCards: buildSummaryCards(filteredFloors, filteredIncidents),
    buildingOverviewByFloor: filteredFloors,
    charts,
    recentIncidents: filteredIncidents,
    recentAlerts: filteredAlerts,
    fireEventHistory: filteredFireEvents,
    filters: clone(dashboardStore?.filters || {}),
  };

  return resolveAfterDelay(result);
}

/**
 * Reset lại store mock về dữ liệu ban đầu
 */
export function resetManagerDashboardMockData() {
  dashboardStore = clone(managerDashboard || {});
  return resolveAfterDelay(true);
}
