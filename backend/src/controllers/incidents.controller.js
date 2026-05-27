const { pool } = require("../config/db");

const getIncidents = async (req, res) => {
  try {
    // Lấy toàn bộ sự cố, sắp xếp theo thời gian mới nhất lên đầu
    const result = await pool.query(
      "SELECT * FROM incidents ORDER BY occurred_at DESC",
    );

    console.log(`✅ Đã lấy ${result.rows.length} sự cố từ Database!`);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sự cố:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getIncidents };
