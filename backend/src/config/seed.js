const { pool } = require("../config/db");

async function seedDatabase() {
  try {
    console.log("Đang tạo các bảng dữ liệu: exits, incidents...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exits (
        id VARCHAR(50) PRIMARY KEY,
        floor VARCHAR(50),
        status VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id VARCHAR(50) PRIMARY KEY,
        floor VARCHAR(50),
        incident_type VARCHAR(100),
        status VARCHAR(50),
        severity VARCHAR(50),
        occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Đang chèn dữ liệu mẫu vào Database...");
    await pool.query(`
      INSERT INTO exits (id, floor, status) VALUES
        ('EXIT-001', 'Tầng 1', 'available'),
        ('EXIT-002', 'Tầng 1', 'inspection'),
        ('EXIT-003', 'Tầng 2', 'available'),
        ('EXIT-004', 'Tầng 3', 'unavailable')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO incidents (id, floor, incident_type, status, severity, occurred_at) VALUES
        ('INC-001', 'Tầng 2', 'Khói bất thường', 'resolved', 'high', NOW() - INTERVAL '2 days'),
        ('INC-002', 'Tầng 1', 'Mất tín hiệu', 'in_progress', 'medium', NOW() - INTERVAL '5 hours'),
        ('INC-003', 'Tầng 3', 'Áp suất thấp', 'open', 'low', NOW() - INTERVAL '35 days')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log(
      "🎉 Khởi tạo dữ liệu thành công! Hãy ra ngoài web F5 lại trang Dashboard.",
    );
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo dữ liệu:", error.message);
  } finally {
    // Đóng kết nối sau khi chạy xong
    pool.end();
  }
}

seedDatabase();
