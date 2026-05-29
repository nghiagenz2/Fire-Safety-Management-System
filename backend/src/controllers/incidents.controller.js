const { pool } = require("../config/db");

exports.getAllIncidents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, incident_type as title, incident_type as description, floor as location, floor, status, occurred_at as "occurredAt" FROM incidents ORDER BY occurred_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
