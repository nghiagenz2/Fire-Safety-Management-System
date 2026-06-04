const { pool } = require("../config/db");
const { currentSimulationState } = require("./incidents.controller");

function getFloorOrder(floorName) {
  if (!floorName) return 999;
  const normalized = floorName.toLowerCase();
  if (normalized.includes("tret") || normalized.includes("trệt")) return 0;
  const match = floorName.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

exports.getFilterOptions = async (req, res) => {
  try {
    // Truy vấn dữ liệu thực tế cho bộ lọc
    const floorRes = await pool.query(
      "SELECT DISTINCT floor FROM devices WHERE type IN ('Bình chữa cháy', 'Tủ chữa cháy')"
    );
    const deviceTypeRes = await pool.query(
      "SELECT DISTINCT type FROM devices WHERE type IN ('Bình chữa cháy', 'Tủ chữa cháy')"
    );
    const incidentTypeRes = await pool.query(
      "SELECT DISTINCT incident_type FROM incidents",
    );

    const floorsRaw = floorRes.rows.map((r) => r.floor);
    floorsRaw.sort(
      (a, b) => getFloorOrder(a) - getFloorOrder(b) || a.localeCompare(b),
    );
    const floors = [
      { value: "all", label: "Tất cả tầng" },
      ...floorsRaw.map((f) => ({ value: f, label: f })),
    ];
    const deviceTypes = [
      { value: "all", label: "Tất cả thiết bị" },
      ...deviceTypeRes.rows.map((r) => ({ value: r.type, label: r.type })),
    ];
    const incidentTypes = [
      { value: "all", label: "Tất cả sự cố" },
      ...incidentTypeRes.rows.map((r) => ({
        value: r.incident_type,
        label: r.incident_type,
      })),
    ];
    const deviceStatuses = [
      { value: "all", label: "Tất cả tình trạng" },
      ...["active", "warning", "danger"].map((s) => ({
        value: s,
        label:
          s === "active"
            ? "Hoạt động tốt"
            : s === "warning"
              ? "Cảnh báo"
              : "Hỏng",
      })),
    ];

    res.json({
      success: true,
      data: {
        options: {
          timeRange: [{ value: "last_30_days", label: "30 ngày gần đây" }],
          floors,
          deviceTypes,
          incidentTypes,
          deviceStatuses,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { floor, deviceType } = req.body;

    // 1. Xây dựng điều kiện lọc cho Thiết bị (Devices)
    let deviceConditions = ["type IN ('Bình chữa cháy', 'Tủ chữa cháy')"];
    let deviceParams = [];
    if (floor && floor !== "all") {
      deviceParams.push(floor);
      deviceConditions.push(`floor = $${deviceParams.length}`);
    }
    if (deviceType && deviceType !== "all") {
      deviceParams.push(deviceType);
      deviceConditions.push(`type = $${deviceParams.length}`);
    }
    let deviceWhere = "WHERE " + deviceConditions.join(" AND ");

    // 2. Xây dựng điều kiện lọc cho Sự cố (Incidents)
    let incidentConditions = [];
    let incidentParams = [];
    if (floor && floor !== "all") {
      incidentParams.push(floor);
      incidentConditions.push(`floor = $${incidentParams.length}`);
    }
    let incidentWhere =
      incidentConditions.length > 0
        ? "WHERE " + incidentConditions.join(" AND ")
        : "";

    let openIncidentWhere =
      incidentConditions.length > 0
        ? "WHERE status <> 'resolved' AND " + incidentConditions.join(" AND ")
        : "WHERE status <> 'resolved'";

    // 3. Thực thi các truy vấn SQL đã được gắn bộ lọc
    const devicesRes = await pool.query(
      `SELECT status, COUNT(*) FROM devices ${deviceWhere} GROUP BY status`,
      deviceParams,
    );
    let total = 0,
      healthy = 0,
      warning = 0,
      danger = 0;
    devicesRes.rows.forEach((r) => {
      const count = parseInt(r.count);
      total += count;
      if (r.status === "active") healthy += count;
      else if (r.status === "warning") warning += count;
      else if (r.status === "danger") danger += count;
    });

    let barChartRes;
    let barChartTitle = "";
    let barXAxis = "";
    if (!floor || floor === "all") {
      barChartRes = await pool.query(
        `SELECT floor AS "label", COUNT(*) as "totalDevices" FROM devices ${deviceWhere} GROUP BY floor`,
        deviceParams,
      );
      barChartTitle = "Số thiết bị theo tầng";
      barXAxis = "Tầng";
    } else {
      barChartRes = await pool.query(
        `SELECT type AS "label", COUNT(*) as "totalDevices" FROM devices ${deviceWhere} GROUP BY type`,
        deviceParams,
      );
      barChartTitle = `Phân bổ thiết bị tại ${floor}`;
      barXAxis = "Loại thiết bị";
    }

    let chartData = barChartRes.rows.map((r) => ({
      label: r.label,
      totalDevices: parseInt(r.totalDevices),
    }));
    if (!floor || floor === "all") {
      chartData.sort(
        (a, b) =>
          getFloorOrder(a.label) - getFloorOrder(b.label) ||
          a.label.localeCompare(b.label),
      );
    } else {
      chartData.sort((a, b) => a.label.localeCompare(b.label));
    }

    const incidentsRes = await pool.query(
      `SELECT id, floor, incident_type as "incidentType", status, occurred_at as "occurredAt" FROM incidents ${incidentWhere} ORDER BY occurred_at DESC LIMIT 10`,
      incidentParams,
    );
    const incidentsCountRes = await pool.query(
      `SELECT COUNT(*) FROM incidents ${incidentWhere}`,
      incidentParams,
    );

    // Lấy danh sách thiết bị có vấn đề cho bảng "Actionable"
    const newCondition = `status <> 'active'`;
    let actionableWhere = deviceWhere
      ? `${deviceWhere} AND ${newCondition}`
      : `WHERE ${newCondition}`;

    const actionableDevicesRes = await pool.query(
      `SELECT id, floor, type, status FROM devices ${actionableWhere} ORDER BY floor, id LIMIT 10`,
      deviceParams,
    );
    const allIncidentsRes = await pool.query(
      `SELECT id, floor, incident_type as "incidentType", status, occurred_at as "occurredAt" FROM incidents ${incidentWhere} ORDER BY occurred_at DESC LIMIT 10`,
      incidentParams,
    );

    let incidentsCount = parseInt(incidentsCountRes.rows[0].count);
    let allIncidents = allIncidentsRes.rows;

    if (currentSimulationState && currentSimulationState.active) {
      let floorName = "Tầng trệt";
      if (currentSimulationState.floorId && currentSimulationState.floorId !== "floor_tret") {
        const num = currentSimulationState.floorId.replace("floor_", "");
        floorName = `Tầng ${num}`;
      }
      
      const simIncident = {
        id: 'SIM-FIRE-ACTIVE',
        floor: floorName,
        incidentType: 'Mô phỏng cháy đang hoạt động',
        status: 'open',
        occurredAt: currentSimulationState.startTime ? new Date(currentSimulationState.startTime).toISOString() : new Date().toISOString()
      };

      if (!floor || floor === "all" || floor === floorName) {
        incidentsCount += 1;
        allIncidents = [simIncident, ...allIncidents];
      }
    }

    let segments = [
      { key: "healthy", label: "Tốt", value: healthy, color: "#2E7D32" },
      { key: "warning", label: "Cảnh báo", value: warning, color: "#f59e0b" },
      { key: "danger", label: "Hỏng", value: danger, color: "#C62828" },
    ].filter(s => s.value > 0);

    if (total === 0) {
      segments = [
        { key: "empty", label: "Chưa có thiết bị", value: 1, color: "#cbd5e1" },
      ];
    }

    res.json({
      success: true,
      data: {
        summaryCards: {
          totalDevices: {
            label: "Tổng số thiết bị",
            value: total,
            unit: "thiết bị",
          },
          healthyDevices: {
            label: "Thiết bị hoạt động tốt",
            value: healthy,
            ratio: Math.round((healthy / total) * 100),
          },
          failedOrMaintenanceDevices: {
            label: "Thiết bị hỏng/cảnh báo",
            value: warning + danger,
          },
          availableExits: {
            label: "Lối thoát khả dụng",
            value: 27,
            total: 27,
            ratio: 100,
          },
          monthlyIncidents: {
            label: "Sự cố",
            value: incidentsCount,
          },
        },
        charts: {
          dynamicBarChart: {
            title: barChartTitle,
            xAxisLabel: barXAxis,
            data: chartData,
          },
          deviceHealthRatio: {
            title: "Tỷ lệ thiết bị",
            segments: segments,
          },
        },
        recentIncidents: incidentsRes.rows,
        actionableItems: {
          devices: actionableDevicesRes.rows,
          incidents: allIncidents,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
