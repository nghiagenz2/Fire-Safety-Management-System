const { pool } = require('../config/db');

function parseAccountId(id) {
  if (typeof id === 'number') return id;
  const match = String(id || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function formatAccountId(userId) {
  return `ACC-${String(userId).padStart(3, '0')}`;
}

function toAccount(row) {
  if (!row) return null;

  return {
    id: formatAccountId(row.UserID),
    userId: row.UserID,
    fullName: row.FullName || '',
    username: row.Username || '',
    password: row.Password || '',
    email: row.Email || '',
    phone: row.Phone || '',
    role: row.Role || 'resident',
    isActive: row.IsActive,
    lastActiveAt: '--'
  };
}

async function findAll({ keyword, role, status } = {}) {
  const values = [];
  const conditions = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(`(
      "FullName" ILIKE $${values.length}
      OR "Username" ILIKE $${values.length}
      OR "Email" ILIKE $${values.length}
      OR "Phone" ILIKE $${values.length}
      OR "Role" ILIKE $${values.length}
    )`);
  }

  if (role && role !== 'all') {
    values.push(role);
    conditions.push(`"Role" = $${values.length}`);
  }

  if (status && status !== 'all') {
    values.push(status === 'active');
    conditions.push(`"IsActive" = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT *
      FROM "USER"
      ${whereClause}
      ORDER BY "UserID" ASC
    `,
    values
  );

  return result.rows.map(toAccount);
}

async function findById(id) {
  const userId = parseAccountId(id);
  if (!userId) return null;

  const result = await pool.query('SELECT * FROM "USER" WHERE "UserID" = $1', [userId]);
  return toAccount(result.rows[0]);
}

async function getNextId() {
  const result = await pool.query('SELECT COALESCE(MAX("UserID"), 0) + 1 AS id FROM "USER"');
  return Number(result.rows[0].id);
}

async function create(account) {
  const userId = account.userId || parseAccountId(account.id) || (await getNextId());
  const result = await pool.query(
    `
      INSERT INTO "USER" (
        "UserID", "Username", "Password", "FullName", "Phone", "Email", "IsActive", "Role"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      userId,
      account.username,
      account.password,
      account.fullName,
      account.phone,
      account.email,
      account.isActive,
      account.role
    ]
  );

  return toAccount(result.rows[0]);
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
      UPDATE "USER"
      SET
        "Username" = $2,
        "Password" = $3,
        "FullName" = $4,
        "Phone" = $5,
        "Email" = $6,
        "IsActive" = $7,
        "Role" = $8
      WHERE "UserID" = $1
      RETURNING *
    `,
    [
      parseAccountId(id),
      next.username,
      next.password,
      next.fullName,
      next.phone,
      next.email,
      next.isActive,
      next.role
    ]
  );

  return toAccount(result.rows[0]);
}

async function remove(id) {
  const userId = parseAccountId(id);
  if (!userId) return false;

  const result = await pool.query('DELETE FROM "USER" WHERE "UserID" = $1 RETURNING "UserID"', [userId]);
  return result.rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove
};
