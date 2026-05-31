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
}

module.exports = {
  ensureManagerTables
};
