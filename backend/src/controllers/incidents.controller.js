const { pool } = require("../config/db");

let currentSimulationState = {
  active: false,
  origin: "",
  level: "medium",
  floorId: "floor_tret",
  startTime: null
};

let sseClients = [];

exports.simulationStream = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  res.write("\n");

  // Send current state with calculated elapsedMs immediately on connection
  const elapsedMs = currentSimulationState.active && currentSimulationState.startTime
    ? (Date.now() - currentSimulationState.startTime)
    : 0;
  
  res.write(`data: ${JSON.stringify({ ...currentSimulationState, elapsedMs })}\n\n`);

  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter(client => client !== res);
  });
};

exports.getSimulationState = (req, res) => {
  const elapsedMs = currentSimulationState.active && currentSimulationState.startTime
    ? (Date.now() - currentSimulationState.startTime)
    : 0;
  res.json({
    success: true,
    data: {
      ...currentSimulationState,
      elapsedMs
    }
  });
};

exports.setSimulationState = (req, res) => {
  const { active, origin, level, floorId } = req.body;
  
  let startTime = currentSimulationState.startTime;
  if (active && !currentSimulationState.active) {
    startTime = Date.now();
  } else if (!active) {
    startTime = null;
  }

  currentSimulationState = {
    active: !!active,
    origin: origin || "",
    level: level || "medium",
    floorId: floorId || "floor_tret",
    startTime
  };

  // Broadcast the update in real-time to all SSE clients
  const elapsedMs = 0;
  const updateData = JSON.stringify({ ...currentSimulationState, elapsedMs });
  sseClients.forEach(client => {
    client.write(`data: ${updateData}\n\n`);
  });

  res.json({ success: true, data: { ...currentSimulationState, elapsedMs } });
};

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
