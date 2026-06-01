const { pool } = require('../config/db');

function toTask(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    statusLabel: row.status_label,
    assignee: row.assignee,
    floor: row.floor,
    createdAt: row.created_at,
    dueAt: row.due_at,
    updatedAt: row.updated_at,
    relatedDevice: row.related_device
  };
}

async function findAll({ status, keyword } = {}) {
  const values = [];
  const conditions = [];

  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (keyword) {
    const wildCard = `%${keyword.trim().toLowerCase()}%`;
    values.push(wildCard);
    conditions.push(`(
      id ILIKE $${values.length}
      OR title ILIKE $${values.length}
      OR category ILIKE $${values.length}
      OR assignee ILIKE $${values.length}
      OR floor ILIKE $${values.length}
      OR related_device ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `
      SELECT *
      FROM tasks
      ${whereClause}
      ORDER BY due_at ASC, id ASC
    `,
    values
  );

  return result.rows.map(toTask);
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return toTask(result.rows[0]);
}

async function create(task) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  let finalId = `TASK-${rand}`;
  const check = await pool.query('SELECT id FROM tasks WHERE id = $1', [finalId]);
  if (check.rows.length > 0) {
    finalId = `TASK-${Date.now().toString().slice(-5)}`;
  }

  const status = task.status || 'pending';
  const statusLabel = task.statusLabel || 'Chờ thực hiện';

  // Tự sinh title nếu chưa có
  const title = task.title || `${task.category || 'Nhiệm vụ'} ${task.relatedDevice || ''}`.trim();

  const result = await pool.query(
    `
      INSERT INTO tasks (
        id, title, category, status, status_label,
        assignee, floor, due_at, related_device
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      finalId,
      title,
      task.category,
      status,
      statusLabel,
      task.assignee || null,
      task.floor || null,
      task.dueAt || null,
      task.relatedDevice || null
    ]
  );

  return toTask(result.rows[0]);
}

async function updateStatus(id, nextStatus) {
  const statusLabelMap = {
    pending: 'Chờ thực hiện',
    in_progress: 'Đang thực hiện',
    completed: 'Hoàn thành'
  };

  const nextStatusLabel = statusLabelMap[nextStatus] || nextStatus;

  const result = await pool.query(
    `
      UPDATE tasks
      SET
        status = $2,
        status_label = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, nextStatus, nextStatusLabel]
  );

  return toTask(result.rows[0]);
}

module.exports = {
  findAll,
  findById,
  create,
  updateStatus
};
