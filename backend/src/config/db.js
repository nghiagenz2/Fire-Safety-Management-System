const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    } catch (err) {
      console.warn("Warning: Could not create extension postgis:", err.message);
    }
    const result = await client.query("SELECT NOW() AS now");
    let postgis_version = "undefined";
    try {
      const postgisRes = await client.query("SELECT PostGIS_Version();");
      if (postgisRes.rows.length > 0) {
        const row = postgisRes.rows[0];
        postgis_version = row[Object.keys(row)[0]];
      }
    } catch (err) {
      // PostGIS not enabled/supported
    }
    return {
      now: result.rows[0].now,
      postgis_version,
    };
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  testConnection,
};
