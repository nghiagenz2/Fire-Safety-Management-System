const { pool } = require('./db');

async function ensureManagerTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "USER" (
      "UserID" int PRIMARY KEY,
      "Username" varchar,
      "Password" varchar,
      "FullName" varchar,
      "Phone" varchar,
      "Email" varchar,
      "IsActive" boolean,
      "Role" varchar
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "REPORT" (
      "ReportID" int PRIMARY KEY,
      "FireID" int,
      "CreatorID" int,
      "ReportType" varchar,
      "FilePath" varchar,
      "Status" varchar DEFAULT 'Hoàn thành',
      "CreatedDate" timestamp
    )
  `);
}

module.exports = {
  ensureManagerTables
};
