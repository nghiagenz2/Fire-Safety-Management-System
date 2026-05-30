const { pool } = require("../src/config/db");

function generateMaintenanceDue(index) {
  const day = ((index * 7) % 28 + 1).toString().padStart(2, "0");
  const month = ((index * 3) % 12 + 1).toString().padStart(2, "0");
  const year = 2026 + (index % 2);
  return `${day}/${month}/${year}`;
}

async function run() {
  try {
    console.log("Fetching devices from database...");
    const res = await pool.query("SELECT id FROM devices ORDER BY id");
    const devices = res.rows;
    console.log(`Found ${devices.length} devices. Updating maintenance_due...`);

    for (let i = 0; i < devices.length; i++) {
      const deviceId = devices[i].id;
      const maintenanceDue = generateMaintenanceDue(i);
      await pool.query(
        "UPDATE devices SET maintenance_due = $1 WHERE id = $2",
        [maintenanceDue, deviceId]
      );
    }

    console.log("Database update completed successfully!");
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    await pool.end();
  }
}

run();
