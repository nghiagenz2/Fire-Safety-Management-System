const { pool } = require('../config/db');

function toDevice(row) {
  if (!row) return null;

  const nodeIndexStr = row.glb_node_name?.match(/\d+/)?.[0] || row.id?.match(/\d+$/)?.[0] || '01';
  const floorNum = row.floor?.match(/\d+/)?.[0] || 'G';
  const room = floorNum === 'G' ? 'Sảnh trệt' : `Phòng ${floorNum}${nodeIndexStr.padStart(2, '0')}`;

  return {
    id: row.id,
    type: row.type,
    location: row.location,
    status: row.status,
    statusLabel: row.status_label,
    maintenanceDue: row.maintenance_due,
    owner: row.owner_name,
    model: row.model,
    lastInspection: row.last_inspection,
    installDate: row.install_date,
    quantity: row.quantity,
    condition: row.condition_note,
    floor: row.floor,
    room: room,
    glbNodeName: row.glb_node_name,
    glbNodeIndex: row.glb_node_index,
    glbTranslation: row.glb_translation,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findAll({ status, floor, search, allTypes } = {}) {
  const values = [];
  const conditions = [];

  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (floor && floor !== 'all') {
    values.push(floor);
    conditions.push(`floor = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      id ILIKE $${values.length}
      OR type ILIKE $${values.length}
      OR location ILIKE $${values.length}
      OR glb_node_name ILIKE $${values.length}
    )`);
  }

  if (allTypes !== 'true' && allTypes !== true) {
    conditions.push("type IN ('Bình chữa cháy', 'Tủ chữa cháy')");
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT *
      FROM devices
      ${whereClause}
      ORDER BY id ASC
    `,
    values
  );

  return result.rows.map(toDevice);
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
  return toDevice(result.rows[0]);
}

async function findFloors() {
  const result = await pool.query(`
    SELECT floor
    FROM devices
    WHERE floor IS NOT NULL
    GROUP BY floor
    ORDER BY
      CASE WHEN floor = 'Tầng trệt' THEN 0 ELSE COALESCE(NULLIF(regexp_replace(floor, '\\D', '', 'g'), '')::int, 999) END,
      floor
  `);

  return result.rows.map((row) => row.floor);
}

async function create(device) {
  const result = await pool.query(
    `
      INSERT INTO devices (
        id, type, location, status, status_label, maintenance_due, owner_name,
        model, last_inspection, install_date, quantity, condition_note, floor,
        glb_node_name, glb_node_index, glb_translation
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16::jsonb
      )
      RETURNING *
    `,
    [
      device.id,
      device.type,
      device.location,
      device.status,
      device.statusLabel,
      device.maintenanceDue,
      device.owner,
      device.model,
      device.lastInspection,
      device.installDate,
      device.quantity || 1,
      device.condition,
      device.floor,
      device.glbNodeName,
      device.glbNodeIndex,
      device.glbTranslation ? JSON.stringify(device.glbTranslation) : null
    ]
  );

  return toDevice(result.rows[0]);
}

async function update(id, updates) {
  const current = await findById(id);
  if (!current) return null;

  const next = {
    ...current,
    ...updates
  };

  const result = await pool.query(
    `
      UPDATE devices
      SET
        type = $2,
        location = $3,
        status = $4,
        status_label = $5,
        maintenance_due = $6,
        owner_name = $7,
        model = $8,
        last_inspection = $9,
        install_date = $10,
        quantity = $11,
        condition_note = $12,
        floor = $13,
        glb_node_name = $14,
        glb_node_index = $15,
        glb_translation = $16::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      next.type,
      next.location,
      next.status,
      next.statusLabel,
      next.maintenanceDue,
      next.owner,
      next.model,
      next.lastInspection,
      next.installDate,
      next.quantity || 1,
      next.condition,
      next.floor,
      next.glbNodeName,
      next.glbNodeIndex,
      next.glbTranslation ? JSON.stringify(next.glbTranslation) : null
    ]
  );

  return toDevice(result.rows[0]);
}

async function remove(id) {
  const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  findFloors,
  create,
  update,
  remove
};
