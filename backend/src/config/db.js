const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD
});

async function testConnection() {
  const result = await pool.query('SELECT NOW() AS now, PostGIS_Version() AS postgis_version');
  return result.rows[0];
}

module.exports = {
  pool,
  testConnection
};
