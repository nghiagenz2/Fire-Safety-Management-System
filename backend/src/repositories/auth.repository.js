const { pool } = require('../config/db');

function toAuthUser(row) {
  if (!row) return null;

  return {
    id: `ACC-${String(row.UserID).padStart(3, '0')}`,
    userId: row.UserID,
    username: row.Username || '',
    password: row.Password || '',
    fullName: row.FullName || '',
    phone: row.Phone || '',
    email: row.Email || '',
    isActive: row.IsActive,
    role: row.Role || 'resident'
  };
}

async function findByLogin(login) {
  const result = await pool.query(
    `
      SELECT *
      FROM "USER"
      WHERE LOWER("Email") = LOWER($1)
         OR LOWER("Username") = LOWER($1)
      LIMIT 1
    `,
    [login]
  );

  return toAuthUser(result.rows[0]);
}

module.exports = {
  findByLogin
};
