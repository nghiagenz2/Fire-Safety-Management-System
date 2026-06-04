const { pool } = require('./db');
const { importDevices } = require('../../scripts/importDevicesFromGlb');
const { importEscapes } = require('../../scripts/importEscapesFromGlb');

async function ensureManagerTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "USER" (
      "UserID" int PRIMARY KEY,
      "Username" varchar,
      "Password" varchar,
      "FullName" varchar,
      "Phone" varchar,
      "Email" varchar,
      "IsActive" boolean,
      "Role" varchar
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "REPORT" (
      "ReportID" int PRIMARY KEY,
      "FireID" int,
      "CreatorID" int,
      "ReportType" varchar,
      "FilePath" varchar,
      "Status" varchar DEFAULT 'Hoàn thành',
      "CreatedDate" timestamp
    )
  `);

  // Đảm bảo bảng incidents tồn tại và đồng bộ cấu trúc
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      floor TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      display_id TEXT,
      summary TEXT,
      assignee TEXT,
      source_label TEXT,
      detail TEXT
    )
  `);

  // Seed default incidents if the table is empty
  const incidentCountResult = await pool.query('SELECT COUNT(*) FROM incidents');
  const incidentCount = parseInt(incidentCountResult.rows[0].count, 10);
  if (incidentCount === 0) {
    console.log("Seeding default incidents...");
    await pool.query(`
      INSERT INTO incidents (
        id, floor, incident_type, status, severity, occurred_at,
        display_id, summary, assignee, source_label, detail
      ) VALUES
        (
          'INC-001', 'Tầng 2', 'Khói bất thường', 'resolved', 'high', NOW() - INTERVAL '2 days',
          'INC-2026-001', 'Phát hiện khói nhẹ từ phòng B201', 'Trần Văn B', 'Hệ thống báo cháy', 'Phát hiện khói nhẹ từ phòng B201.'
        ),
        (
          'INC-002', 'Tầng 1', 'Mất tín hiệu', 'resolved', 'medium', NOW() - INTERVAL '5 hours',
          'INC-2026-002', 'Mất tín hiệu cảm biến tầng 1', 'Trần Thị Hồng', 'Hệ thống báo cháy', 'Đám cháy cục bộ, đã kích hoạt sprinkler, tiếp tục theo dõi tái bùng phát.'
        ),
        (
          'INC-003', 'Tầng trệt', 'Áp suất thấp', 'in_progress', 'low', NOW() - INTERVAL '35 days',
          'INC-2026-003', 'Áp suất thấp tại trạm bơm', 'Đội trực ca PCCC', 'Hệ thống báo cháy', 'Áp suất thấp tại trạm bơm phòng kỹ thuật.'
        )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Seeding default incidents completed.");
  }

    // Seed default users if the table is empty
  const userCountResult = await pool.query('SELECT COUNT(*) FROM "USER"');
  const count = parseInt(userCountResult.rows[0].count, 10);
  if (count === 0) {
    console.log("Seeding default user accounts...");
    const mockUsers = [
      [1, 'tuan.nm', 'P@ssw0rd123', 'Nguyễn Minh Tuấn', '0903123456', 'tuan.nm@pccc3d.vn', true, 'manager'],
      [2, 'hong.tt', 'P@ssw0rd123', 'Trần Thị Hồng', '0912345678', 'hong.tt@pccc3d.vn', true, 'firestaff'],
      [3, 'nam.lv', 'P@ssw0rd123', 'Lê Văn Nam', '0987000111', 'nam.lv@pccc3d.vn', false, 'firestaff'],
      [4, 'anh.pq', 'P@ssw0rd123', 'Phạm Quỳnh Anh', '0909888777', 'anh.pq@pccc3d.vn', false, 'resident'],
      [5, 'linh.dn', 'P@ssw0rd123', 'Đỗ Nhật Linh', '0933555444', 'linh.dn@pccc3d.vn', true, 'manager'],
      [6, 'khang.bh', 'P@ssw0rd123', 'Bùi Hữu Khang', '0977333222', 'khang.bh@pccc3d.vn', true, 'resident']
    ];

    for (const user of mockUsers) {
      await pool.query(`
        INSERT INTO "USER" ("UserID", "Username", "Password", "FullName", "Phone", "Email", "IsActive", "Role")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, user);
    }
    console.log("Seeding default user accounts completed.");
  }

  // Tạo bảng tasks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      status_label TEXT DEFAULT 'Chờ thực hiện',
      assignee TEXT,
      floor TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      due_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      related_device TEXT
    )
  `);


  // Tự động kiểm tra và import bảng devices
  let seedDevices = false;
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'devices'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      seedDevices = true;
    } else {
      const countCheck = await pool.query('SELECT COUNT(*) FROM devices');
      if (parseInt(countCheck.rows[0].count, 10) === 0) {
        seedDevices = true;
      }
    }
  } catch (err) {
    seedDevices = true;
  }

  if (seedDevices) {
    console.log("Bảng devices chưa tồn tại hoặc trống. Bắt đầu tự động import từ model GLB...");
    try {
      await importDevices();
      console.log("Tự động import thiết bị hoàn tất.");
    } catch (err) {
      console.error("Không thể tự động seed dữ liệu thiết bị:", err.message);
    }
  }

  // Tự động kiểm tra và import bảng escapes
  let seedEscapes = false;
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'escapes'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      seedEscapes = true;
    } else {
      const countCheck = await pool.query('SELECT COUNT(*) FROM escapes');
      if (parseInt(countCheck.rows[0].count, 10) === 0) {
        seedEscapes = true;
      }
    }
  } catch (err) {
    seedEscapes = true;
  }

  if (seedEscapes) {
    console.log("Bảng escapes chưa tồn tại hoặc trống. Bắt đầu tự động import từ model GLB...");
    try {
      await importEscapes();
      console.log("Tự động import lối thoát hiểm hoàn tất.");
    } catch (err) {
      console.error("Không thể tự động seed dữ liệu lối thoát hiểm:", err.message);
    }
  }

  // Tự động seed dữ liệu tasks nếu trống
  try {
    const taskCountResult = await pool.query('SELECT COUNT(*) FROM tasks');
    const taskCount = parseInt(taskCountResult.rows[0].count, 10);
    if (taskCount === 0) {
      console.log("Bảng tasks trống. Bắt đầu tự động seed dữ liệu...");
      const mockTasks = [
        ['TASK-001', 'Kiểm tra hệ thống cảm biến khói', 'Kiểm tra', 'pending', 'Chờ thực hiện', 'Trần Thị Hồng', 'Tầng 1', '2026-06-10 10:00:00+07', 'Cảm biến khói tầng 1 (SD-01)'],
        ['TASK-002', 'Bảo trì đầu phun sprinkler', 'Bảo trì', 'in_progress', 'Đang thực hiện', 'Trần Thị Hồng', 'Tầng 3', '2026-06-15 15:30:00+07', 'Vòi phun nước tự động tầng 3 (SP-03)'],
        ['TASK-003', 'Kiểm tra bình chữa cháy xách tay', 'Kiểm tra', 'completed', 'Hoàn thành', 'Trần Thị Hồng', 'Tầng trệt', '2026-06-01 17:00:00+07', 'Bình chữa cháy xách tay tầng trệt (FE-05)'],
        ['TASK-004', 'Bảo trì loa thông báo khẩn cấp', 'Bảo trì', 'pending', 'Chờ thực hiện', 'Lê Văn Nam', 'Tầng 2', '2026-06-20 09:00:00+07', 'Loa thông báo tầng 2 (SPK-02)'],
        ['TASK-005', 'Kiểm tra cửa thoát hiểm hành lang', 'Kiểm tra', 'completed', 'Hoàn thành', 'Trần Thị Hồng', 'Tầng 4', '2026-05-25 14:00:00+07', 'Cửa thoát hiểm hành lang tầng 4 (ED-04)']
      ];

      for (const task of mockTasks) {
        await pool.query(`
          INSERT INTO tasks (
            id, title, category, status, status_label, assignee, floor, due_at, related_device
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, task);
      }
      console.log("Tự động seed dữ liệu tasks hoàn tất.");
    }
  } catch (err) {
    console.error("Không thể tự động seed dữ liệu tasks:", err.message);
  }
}

module.exports = {
  ensureManagerTables
};

