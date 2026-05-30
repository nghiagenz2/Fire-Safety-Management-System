const { pool } = require("../config/db");

exports.getAllIncidents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, floor, incident_type, status, severity, occurred_at as "occurredAt" FROM incidents ORDER BY occurred_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
