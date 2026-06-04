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

async function saveSimulationToDb(state) {
  if (!state.active || !state.startTime) return null;

  const id = `INC-SIM-${Date.now().toString().slice(-6)}`;
  let floorName = "Tầng trệt";
  if (state.floorId && state.floorId !== "floor_tret") {
    const num = state.floorId.replace("floor_", "");
    floorName = `Tầng ${num}`;
  }

  const incidentType = state.origin
    ? `Mô phỏng cháy (${state.origin})`
    : "Mô phỏng cháy";

  const displayId = id;
  const summary = incidentType;
  const assignee = state.assignee || "Đội trực ca PCCC";
  const sourceLabel = "Hệ thống mô phỏng";
  const detail = `Mô phỏng sự cố cháy khởi phát tại vị trí ${state.origin || "không xác định"} ở ${floorName}.`;

  try {
    const result = await pool.query(
      `INSERT INTO incidents (
        id, floor, incident_type, status, severity, occurred_at,
        display_id, summary, assignee, source_label, detail
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        floorName,
        incidentType,
        "active",
        state.level || "medium",
        new Date(state.startTime),
        displayId,
        summary,
        assignee,
        sourceLabel,
        detail
      ]
    );
    console.log(`Saved simulation run ${id} to database.`);
    return result.rows[0];
  } catch (error) {
    console.error("Failed to save simulation to database:", error);
    return null;
  }
}

exports.setSimulationState = async (req, res) => {
  const { active, origin, level, floorId, assignee } = req.body;

  let startTime = currentSimulationState.startTime;
  if (active && !currentSimulationState.active) {
    startTime = Date.now();
  } else if (!active && currentSimulationState.active) {
    await saveSimulationToDb({
      ...currentSimulationState,
      assignee
    });
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
      `SELECT 
        id, 
        floor, 
        incident_type, 
        status, 
        severity, 
        occurred_at as "occurredAt",
        display_id as "displayId",
        summary,
        assignee,
        source_label as "sourceLabel",
        detail
       FROM incidents 
       ORDER BY occurred_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, assignee, detail } = req.body;

  if (id === "SIM-FIRE-ACTIVE") {
    if (status === "resolved" && currentSimulationState.active) {
      const savedIncident = await saveSimulationToDb({
        ...currentSimulationState,
        assignee
      });

      currentSimulationState = {
        active: false,
        origin: "",
        level: "medium",
        floorId: "floor_tret",
        startTime: null
      };

      const elapsedMs = 0;
      const updateData = JSON.stringify({ ...currentSimulationState, elapsedMs });
      sseClients.forEach(client => {
        client.write(`data: ${updateData}\n\n`);
      });

      return res.json({ success: true, data: savedIncident || { id, status: "resolved" } });
    } else {
      return res.json({ success: true, data: { id, status } });
    }
  }

  try {
    const fields = [];
    const values = [];

    if (status !== undefined) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }
    if (assignee !== undefined) {
      values.push(assignee);
      fields.push(`assignee = $${values.length}`);
    }
    if (detail !== undefined) {
      values.push(detail);
      fields.push(`detail = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE incidents SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
