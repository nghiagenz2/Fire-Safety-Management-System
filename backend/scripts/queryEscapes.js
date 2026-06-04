const { pool } = require('../src/config/db');

async function queryEscapes() {
  try {
    const result = await pool.query(
      "SELECT id, glb_node_name, glb_translation FROM escapes WHERE floor = 'Tầng trệt'"
    );
    console.log("Escapes at Tầng trệt:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await pool.end();
  }
}

queryEscapes();
