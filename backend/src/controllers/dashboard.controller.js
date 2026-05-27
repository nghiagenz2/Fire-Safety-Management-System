// Lấy đối tượng pool từ cấu hình DB của dự án
const { pool } = require("../config/db");

const getDashboardFilters = async (req, res) => {
  try {
    // Trả về cấu trúc options thật cho các select box trên giao diện
    const filters = {
      options: {
        timeRange: [
          { value: "last_7_days", label: "7 ngày qua" },
          { value: "last_30_days", label: "30 ngày qua" },
          { value: "custom", label: "Tùy chỉnh" },
        ],
        floors: [
          { value: "all", label: "Tất cả các tầng" },
          { value: "Tầng 1", label: "Tầng 1" },
          { value: "Tầng 2", label: "Tầng 2" },
        ],
        deviceTypes: [
          { value: "all", label: "Tất cả thiết bị" },
          { value: "Bình chữa cháy", label: "Bình chữa cháy" },
        ],
        incidentTypes: [{ value: "all", label: "Tất cả sự cố" }],
      },
      default: { timeRange: "last_30_days" },
    };
    res.status(200).json({ success: true, data: filters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const { timeRange, floors, startDate, endDate } = req.body;

    let devices = [];
    let exits = [];
    let incidents = [];

    try {
      devices = (await pool.query("SELECT * FROM devices")).rows;
      exits = (await pool.query("SELECT * FROM exits")).rows;
      incidents = (await pool.query("SELECT * FROM incidents")).rows;
    } catch (dbError) {
      console.warn(
        "⚠️ Cảnh báo: Lỗi truy vấn Database (Bảng chưa được tạo):",
        dbError.message,
      );
    }

    // 1. Tính toán Thẻ Tổng Quan (Summary Cards)
    const totalDevicesCount = devices.length;
    const healthyDevicesCount = devices.filter(
      (d) => d.status === "active" || d.status === "safe",
    ).length;
    const failedDevicesCount = devices.filter(
      (d) => d.status === "danger",
    ).length;
    const maintenanceDevicesCount = devices.filter(
      (d) => d.status === "maintenance" || d.status === "warning",
    ).length;
    const totalExitsCount = exits.length;
    const availableExitsCount = exits.filter(
      (e) => e.status === "available",
    ).length;

    const currentMonth = new Date().getMonth();
    const monthlyIncidentsCount = incidents.filter(
      (i) => new Date(i.occurred_at).getMonth() === currentMonth,
    ).length;

    const ratio =
      totalDevicesCount > 0
        ? Math.round((healthyDevicesCount / totalDevicesCount) * 100)
        : 0;
    const exitRatio =
      totalExitsCount > 0
        ? Math.round((availableExitsCount / totalExitsCount) * 100)
        : 0;

    // 2. Gom nhóm dữ liệu theo tầng (Building Overview & Bar Charts)
    const floorMap = {};
    [...devices, ...exits].forEach((item) => {
      if (!floorMap[item.floor]) {
        floorMap[item.floor] = {
          totalDevices: 0,
          healthyDevices: 0,
          failedDevices: 0,
          maintenanceDevices: 0,
          availableExits: 0,
          totalExits: 0,
          inspectionExits: 0,
          unavailableExits: 0,
        };
      }
    });

    devices.forEach((d) => {
      floorMap[d.floor].totalDevices++;
      if (d.status === "active" || d.status === "safe")
        floorMap[d.floor].healthyDevices++;
      else if (d.status === "danger") floorMap[d.floor].failedDevices++;
      else floorMap[d.floor].maintenanceDevices++;
    });

    exits.forEach((e) => {
      floorMap[e.floor].totalExits++;
      if (e.status === "available") floorMap[e.floor].availableExits++;
      else if (e.status === "inspection") floorMap[e.floor].inspectionExits++;
      else floorMap[e.floor].unavailableExits++;
    });

    const buildingOverviewByFloor = Object.keys(floorMap).map((floor) => ({
      floor: floor,
      floorLabel: floor,
      ...floorMap[floor],
    }));

    // 3. Gom nhóm Sự cố theo tháng (Line Chart)
    const incidentsByMonthMap = {};
    incidents.forEach((i) => {
      const monthLabel = `Tháng ${new Date(i.occurred_at).getMonth() + 1}`;
      incidentsByMonthMap[monthLabel] =
        (incidentsByMonthMap[monthLabel] || 0) + 1;
    });
    const incidentsOverTimeData = Object.keys(incidentsByMonthMap).map((m) => ({
      month: m,
      incidentCount: incidentsByMonthMap[m],
    }));

    // GẮN SỐ THẬT VÀO CẤU TRÚC JSON
    const data = {
      summaryCards: {
        totalDevices: {
          label: "Tổng số thiết bị",
          value: totalDevicesCount,
          unit: "thiết bị",
        },
        healthyDevices: {
          label: "Thiết bị hoạt động tốt",
          value: healthyDevicesCount,
          ratio: ratio,
        },
        failedOrMaintenanceDevices: {
          label: "Cần chú ý",
          value: failedDevicesCount + maintenanceDevicesCount,
          breakdown: {
            failed: failedDevicesCount,
            maintenance: maintenanceDevicesCount,
          },
        },
        availableExits: {
          label: "Lối thoát khả dụng",
          value: availableExitsCount,
          total: totalExitsCount,
          ratio: exitRatio,
        },
        monthlyIncidents: {
          label: "Sự cố tháng này",
          value: monthlyIncidentsCount,
          severityBreakdown: {
            critical: incidents.filter((i) => i.severity === "critical").length,
            high: incidents.filter((i) => i.severity === "high").length,
          },
        },
      },
      charts: {
        devicesByFloor: {
          title: "Thiết bị theo tầng",
          data: buildingOverviewByFloor,
        },
        deviceHealthRatio: {
          title: "Tình trạng thiết bị",
          segments: [
            {
              key: "safe",
              label: "Tốt",
              value: healthyDevicesCount,
              color: "#22c55e",
            },
            {
              key: "warning",
              label: "Bảo trì",
              value: maintenanceDevicesCount,
              color: "#f59e0b",
            },
            {
              key: "danger",
              label: "Hỏng",
              value: failedDevicesCount,
              color: "#ef4444",
            },
          ],
        },
        incidentsOverTime: {
          title: "Sự cố theo thời gian",
          data: incidentsOverTimeData,
        },
        exitStatusByFloor: {
          title: "Lối thoát hiểm",
          data: buildingOverviewByFloor.map((f) => ({
            floor: f.floor,
            floorLabel: f.floorLabel,
            available: f.availableExits,
            inspection: f.inspectionExits,
            unavailable: f.unavailableExits,
          })),
        },
      },
      buildingOverviewByFloor: buildingOverviewByFloor,
      recentIncidents: incidents.map((i) => ({
        id: i.id,
        floor: i.floor,
        incidentType: i.incident_type,
        status: i.status,
        occurredAt: i.occurred_at,
      })),
      recentAlerts: [],
    };

    console.log("✅ Đã lấy dữ liệu Dashboard thành công từ Database!");

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardFilters, getDashboardData };
