const { pool } = require('../config/db');

function parseReportId(id) {
  if (typeof id === 'number') return id;
  const match = String(id || '').match(/\d+$/);
  return match ? Number(match[0]) : null;
}

function formatReportId(reportId, createdDate) {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  return `REP-${year}-${String(reportId).padStart(3, '0')}`;
}

function toReport(row) {
  if (!row) return null;

  return {
    reportId: row.ReportID,
    id: formatReportId(row.ReportID, row.CreatedDate),
    fireId: row.FireID,
    creatorId: row.CreatorID,
    creatorName: row.CreatorName || '',
    reportType: row.ReportType || 'monthly',
    filePath: row.FilePath || '',
    status: row.Status || 'Hoàn thành',
    createdDate: row.CreatedDate
  };
}

async function findAll({ search, type, status } = {}) {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      CAST(r."ReportID" AS text) ILIKE $${values.length}
      OR r."ReportType" ILIKE $${values.length}
      OR r."FilePath" ILIKE $${values.length}
      OR r."Status" ILIKE $${values.length}
      OR u."FullName" ILIKE $${values.length}
    )`);
  }

  if (type && type !== 'all') {
    values.push(type);
    conditions.push(`r."ReportType" = $${values.length}`);
  }

  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`r."Status" = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `
      SELECT r.*, u."FullName" AS "CreatorName"
      FROM "REPORT" r
      LEFT JOIN "USER" u ON u."UserID" = r."CreatorID"
      ${whereClause}
      ORDER BY r."CreatedDate" DESC NULLS LAST, r."ReportID" DESC
    `,
    values
  );

  return result.rows.map(toReport);
}

async function findById(id) {
  const reportId = parseReportId(id);
  if (!reportId) return null;

  const result = await pool.query(
    `
      SELECT r.*, u."FullName" AS "CreatorName"
      FROM "REPORT" r
      LEFT JOIN "USER" u ON u."UserID" = r."CreatorID"
      WHERE r."ReportID" = $1
    `,
    [reportId]
  );

  return toReport(result.rows[0]);
}

async function getNextId() {
  const result = await pool.query('SELECT COALESCE(MAX("ReportID"), 0) + 1 AS id FROM "REPORT"');
  return Number(result.rows[0].id);
}

async function create(report) {
  const reportId = report.reportId || parseReportId(report.id) || (await getNextId());
  const result = await pool.query(
    `
      INSERT INTO "REPORT" (
        "ReportID", "FireID", "CreatorID", "ReportType", "FilePath", "Status", "CreatedDate"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      reportId,
      report.fireId || null,
      report.creatorId || null,
      report.reportType,
      report.filePath,
      report.status,
      report.createdDate
    ]
  );

  return findById(result.rows[0].ReportID);
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
      UPDATE "REPORT"
      SET
        "FireID" = $2,
        "CreatorID" = $3,
        "ReportType" = $4,
        "FilePath" = $5,
        "Status" = $6,
        "CreatedDate" = $7
      WHERE "ReportID" = $1
      RETURNING *
    `,
    [
      parseReportId(id),
      next.fireId || null,
      next.creatorId || null,
      next.reportType,
      next.filePath,
      next.status,
      next.createdDate
    ]
  );

  return findById(result.rows[0].ReportID);
}

async function remove(id) {
  const reportId = parseReportId(id);
  if (!reportId) return false;

  const result = await pool.query('DELETE FROM "REPORT" WHERE "ReportID" = $1 RETURNING "ReportID"', [reportId]);
  return result.rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove
};
