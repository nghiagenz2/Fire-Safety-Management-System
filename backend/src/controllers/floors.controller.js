const { pool } = require('../config/db');

function getFloorLevel(floorName) {
  const normalized = floorName.toLowerCase();
  if (normalized.includes('tret') || normalized.includes('trệt')) return 0;
  const match = floorName.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

function getFloorArea(floorName) {
  const level = getFloorLevel(floorName);
  if (level === 0) return 'Sảnh chính & Khu thương mại';
  if (level === 1) return 'Khu văn phòng & Dịch vụ';
  if (level === 27 || floorName.toLowerCase().includes('thuong') || floorName.toLowerCase().includes('thượng')) {
    return 'Sân thượng & Kỹ thuật mái';
  }
  return 'Khu căn hộ & Hành lang';
}

function getFloorHazardZones(floorName) {
  const level = getFloorLevel(floorName);
  if (level === 0) {
    return [
      {
        id: 'HAZARD-TR-01',
        name: 'Phòng máy biến áp',
        type: 'Điện cao thế',
        riskLevel: 'warning',
        riskLevelLabel: 'Nguy cơ trung bình',
        note: 'Chỉ nhân viên kỹ thuật có phận sự mới được vào.'
      }
    ];
  }
  if (level === 12) {
    return [
      {
        id: 'HAZARD-F12-01',
        name: 'Kho rác tập trung',
        type: 'Vật liệu dễ cháy',
        riskLevel: 'warning',
        riskLevelLabel: 'Nguy cơ trung bình',
        note: 'Không để rác tràn ra lối đi cứu hỏa.'
      }
    ];
  }
  if (level === 27) {
    return [
      {
        id: 'HAZARD-F27-01',
        name: 'Phòng kỹ thuật mái',
        type: 'Thiết bị thông gió & Thang máy',
        riskLevel: 'danger',
        riskLevelLabel: 'Nguy cơ cao',
        note: 'Kiểm tra khóa cửa phòng máy thường xuyên.'
      }
    ];
  }
  return [];
}

async function getFloorsList(req, res, next) {
  try {
    // 1. Get unique floors from devices table sorted correctly
    const floorsResult = await pool.query(`
      SELECT floor
      FROM devices
      WHERE floor IS NOT NULL
      GROUP BY floor
      ORDER BY
        CASE WHEN floor = 'Tầng trệt' THEN 0 ELSE COALESCE(NULLIF(regexp_replace(floor, '\\D', '', 'g'), '')::int, 999) END,
        floor
    `);

    const floorNames = floorsResult.rows.map((row) => row.floor);

    // 2. Fetch device statistics grouped by floor (excluding doors)
    const statsResult = await pool.query(`
      SELECT 
        floor,
        COUNT(*) as total_devices,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_devices,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_devices,
        SUM(CASE WHEN status = 'danger' THEN 1 ELSE 0 END) as danger_devices,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_devices,
        SUM(CASE WHEN status = 'inspection' THEN 1 ELSE 0 END) as inspection_devices
      FROM devices
      WHERE floor IS NOT NULL AND type NOT IN ('Cửa phòng', 'Cửa thoát hiểm')
      GROUP BY floor
    `);

    const statsMap = {};
    statsResult.rows.forEach((row) => {
      statsMap[row.floor] = {
        total: parseInt(row.total_devices, 10) || 0,
        active: parseInt(row.active_devices, 10) || 0,
        warning: parseInt(row.warning_devices, 10) || 0,
        danger: parseInt(row.danger_devices, 10) || 0,
        maintenance: parseInt(row.maintenance_devices, 10) || 0,
        inspection: parseInt(row.inspection_devices, 10) || 0
      };
    });

    // 3. Fetch exits counts grouped by floor from escapes table
    const exitsResult = await pool.query(`
      SELECT floor, COUNT(*) as total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available
      FROM escapes
      GROUP BY floor
    `);

    const exitsMap = {};
    exitsResult.rows.forEach((row) => {
      exitsMap[row.floor] = {
        total: parseInt(row.total, 10) || 0,
        available: parseInt(row.available, 10) || 0
      };
    });

    // 4. Construct response list
    const floorsList = floorNames.map((name) => {
      const stats = statsMap[name] || { total: 0, active: 0, warning: 0, danger: 0, maintenance: 0, inspection: 0 };
      const exits = exitsMap[name] || { total: 0, available: 0 };

      const totalDevices = stats.total;
      const activeDevices = stats.active;
      const warningDevices = stats.warning + stats.inspection;
      const brokenDevices = stats.danger + stats.maintenance;

      const totalExits = exits.total;
      const availableExits = exits.available;

      // safetyScore computation: percentage of active devices
      let safetyScore = 100;
      if (totalDevices > 0) {
        safetyScore = Math.round((activeDevices / totalDevices) * 100);
      }

      let safetyLevel = 'safe';
      let safetyLevelLabel = 'An toàn';
      if (safetyScore < 70) {
        safetyLevel = 'danger';
        safetyLevelLabel = 'Nguy hiểm';
      } else if (safetyScore < 90) {
        safetyLevel = 'warning';
        safetyLevelLabel = 'Cảnh báo';
      }

      const hazardZones = getFloorHazardZones(name);

      return {
        id: name,
        name: name,
        level: getFloorLevel(name),
        area: getFloorArea(name),
        safetyLevel,
        safetyLevelLabel,
        safetyScore,
        summary: {
          totalDevices,
          activeDevices,
          warningDevices,
          brokenDevices,
          totalExits,
          availableExits,
          hasHazardZone: hazardZones.length > 0,
          hazardZoneCount: hazardZones.length
        }
      };
    });

    res.status(200).json({ success: true, data: floorsList });
  } catch (error) {
    next(error);
  }
}

async function getFloorById(req, res, next) {
  try {
    const { floorId } = req.params;

    // 1. Get devices on this floor (excluding doors)
    const devicesResult = await pool.query(
      `
      SELECT *
      FROM devices
      WHERE floor = $1 AND type NOT IN ('Cửa phòng', 'Cửa thoát hiểm')
      ORDER BY id ASC
      `,
      [floorId]
    );

    const devices = devicesResult.rows.map((row) => ({
      id: row.id,
      type: row.type,
      location: row.location,
      status: row.status,
      statusLabel: row.status_label,
      maintenanceDue: row.maintenance_due || '--',
      owner: row.owner_name || '--',
      model: row.model || '--',
      lastInspection: row.last_inspection || '--',
      installDate: row.install_date || '--',
      quantity: row.quantity || 1,
      condition: row.condition_note || '--',
      floor: row.floor
    }));

    // Calculate dynamic stats
    const totalDevices = devices.length;
    const activeDevices = devices.filter((d) => d.status === 'active').length;
    const warningDevices = devices.filter((d) => d.status === 'warning' || d.status === 'inspection').length;
    const brokenDevices = devices.filter((d) => d.status === 'danger' || d.status === 'maintenance').length;

    let safetyScore = 100;
    if (totalDevices > 0) {
      safetyScore = Math.round((activeDevices / totalDevices) * 100);
    }

    let safetyLevel = 'safe';
    let safetyLevelLabel = 'An toàn';
    if (safetyScore < 70) {
      safetyLevel = 'danger';
      safetyLevelLabel = 'Nguy hiểm';
    } else if (safetyScore < 90) {
      safetyLevel = 'warning';
      safetyLevelLabel = 'Cảnh báo';
    }

    // 2. Get exits on this floor from escapes table
    const escapesResult = await pool.query(
      `
      SELECT *
      FROM escapes
      WHERE floor = $1
      ORDER BY id ASC
      `,
      [floorId]
    );

    const exits = escapesResult.rows.map((row) => {
      let status = row.status;
      let statusLabel = row.status_label || 'Khả dụng';
      if (status === 'blocked' || status === 'unavailable') {
        status = 'blocked';
        statusLabel = 'Bị chặn';
      } else if (status === 'inspection') {
        status = 'inspection';
        statusLabel = 'Cần kiểm tra';
      } else {
        status = 'available';
        statusLabel = 'Khả dụng';
      }

      let formattedInspection = '--';
      if (row.last_inspection) {
        try {
          const dateObj = new Date(row.last_inspection);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            formattedInspection = `${day}/${month}/${year}`;
          } else {
            formattedInspection = row.last_inspection;
          }
        } catch (e) {
          formattedInspection = row.last_inspection;
        }
      }

      return {
        id: row.id,
        floor: row.floor,
        type: row.type || 'Cửa thoát hiểm',
        location: row.room || row.location || 'Hành lang thoát hiểm',
        status: status,
        statusLabel: statusLabel,
        lastInspection: formattedInspection,
        note: status === 'blocked' ? 'Lối thoát bị khóa hoặc có vật cản.' : null
      };
    });

    const hazardZones = getFloorHazardZones(floorId);

    const floorDetail = {
      id: floorId,
      name: floorId,
      level: getFloorLevel(floorId),
      area: getFloorArea(floorId),
      safetyLevel,
      safetyLevelLabel,
      safetyScore,
      summary: {
        totalDevices,
        activeDevices,
        warningDevices,
        brokenDevices,
        totalExits: exits.length,
        availableExits: exits.filter((e) => e.status === 'available').length,
        hasHazardZone: hazardZones.length > 0,
        hazardZoneCount: hazardZones.length
      },
      devices,
      exits,
      hazardZones
    };

    res.status(200).json({ success: true, data: floorDetail });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFloorsList,
  getFloorById
};
