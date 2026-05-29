const { pool } = require('../config/db');

const STATUS_LABEL = {
  available: 'Khả dụng',
  inspection: 'Cần kiểm tra',
  unavailable: 'Không khả dụng'
};

const MODEL_FLOOR_LABELS = {
  'Tầng trệt': 'floor_tret'
};

for (let floorNumber = 1; floorNumber <= 27; floorNumber += 1) {
  MODEL_FLOOR_LABELS[`Tầng ${floorNumber}`] = `floor_${floorNumber}`;
}

function floorLabelToModelFloorId(floor = '') {
  return MODEL_FLOOR_LABELS[floor] || null;
}

function createId(payload = {}) {
  const baseType = String(payload.type || 'EXIT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6) || 'EXIT';
  const floorCode = String(floorLabelToModelFloorId(payload.floor) || 'FLOOR')
    .replace(/^floor_/, 'F')
    .toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${baseType}-${floorCode}-${rand}`;
}

function toEscape(row) {
  if (!row) return null;

  return {
    id: row.id,
    type: row.type,
    location: row.location,
    status: row.status,
    statusLabel: row.status_label,
    lastInspection: row.last_inspection,
    owner: row.owner_name,
    floor: row.floor,
    room: row.room,
    connectedTo: row.connected_to,
    width: row.width || '--',
    clearHeight: row.clear_height || '--',
    glbFloorId: floorLabelToModelFloorId(row.floor),
    glbNodeName: row.glb_node_name,
    glbNodeIndex: row.glb_node_index,
    glbTranslation: row.glb_translation,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findAll({ status, floor, search } = {}) {
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
      OR room ILIKE $${values.length}
      OR connected_to ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT *
      FROM escapes
      ${whereClause}
      ORDER BY id ASC
    `,
    values
  );

  return result.rows.map(toEscape);
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM escapes WHERE id = $1', [id]);
  return toEscape(result.rows[0]);
}

async function findFloors() {
  const result = await pool.query(`
    SELECT floor
    FROM escapes
    WHERE floor IS NOT NULL
    GROUP BY floor
    ORDER BY
      CASE WHEN floor = 'Tầng trệt' THEN 0 ELSE COALESCE(NULLIF(regexp_replace(floor, '\\D', '', 'g'), '')::int, 999) END,
      floor
  `);

  return result.rows.map((row) => row.floor);
}

async function create(escape) {
  const result = await pool.query(
    `
      INSERT INTO escapes (
        id, type, location, status, status_label, last_inspection, owner_name,
        floor, room, connected_to, width, clear_height,
        glb_node_name, glb_node_index, glb_translation
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15::jsonb
      )
      RETURNING *
    `,
    [
      escape.id || createId(escape),
      escape.type,
      escape.location || escape.floor,
      escape.status || 'available',
      escape.statusLabel || STATUS_LABEL[escape.status || 'available'],
      escape.lastInspection || null,
      escape.owner || escape.ownerName || null,
      escape.floor,
      escape.room || null,
      escape.connectedTo || null,
      escape.width || '--',
      escape.clearHeight || '--',
      escape.glbNodeName || null,
      escape.glbNodeIndex != null ? parseInt(escape.glbNodeIndex, 10) : null,
      escape.glbTranslation ? JSON.stringify(escape.glbTranslation) : null
    ]
  );

  return toEscape(result.rows[0]);
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
      UPDATE escapes
      SET
        type = $2,
        location = $3,
        status = $4,
        status_label = $5,
        last_inspection = $6,
        owner_name = $7,
        floor = $8,
        room = $9,
        connected_to = $10,
        width = $11,
        clear_height = $12,
        glb_node_name = $13,
        glb_node_index = $14,
        glb_translation = $15::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      next.type,
      next.location || next.floor,
      next.status,
      next.statusLabel || STATUS_LABEL[next.status],
      next.lastInspection,
      next.owner,
      next.floor,
      next.room,
      next.connectedTo,
      next.width || '--',
      next.clearHeight || '--',
      next.glbNodeName,
      next.glbNodeIndex,
      next.glbTranslation ? JSON.stringify(next.glbTranslation) : null
    ]
  );

  return toEscape(result.rows[0]);
}

async function remove(id) {
  const result = await pool.query('DELETE FROM escapes WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  findFloors,
  create,
  update,
  remove,
  floorLabelToModelFloorId
};