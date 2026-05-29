const reportsRepository = require('../repositories/reports.repository');

const REPORT_TYPE_LABEL = {
  monthly: 'Báo cáo hàng tháng',
  quarterly: 'Báo cáo hàng quý',
  inspection: 'Báo cáo kiểm tra',
  drill: 'Báo cáo diễn tập',
  risk_assessment: 'Báo cáo đánh giá rủi ro'
};

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN').format(date);
}

function decorateReport(report) {
  if (!report) return null;

  const type = report.reportType || 'monthly';
  const typeLabel = REPORT_TYPE_LABEL[type] || 'Báo cáo';
  const createdDate = formatDate(report.createdDate);

  return {
    id: report.id,
    reportId: report.reportId,
    title: `${typeLabel} ${report.id}`,
    period: createdDate || '--',
    createdDate,
    status: 'Hoàn thành',
    type,
    summary: report.filePath ? `Tệp báo cáo: ${report.filePath}` : 'Chưa có tệp báo cáo đính kèm',
    stats: {},
    preparedBy: report.creatorName || `User ${report.creatorId || '--'}`,
    approvalsNeeded: 0,
    fireId: report.fireId,
    creatorId: report.creatorId,
    filePath: report.filePath
  };
}

function normalizeReportInput(input = {}) {
  return {
    fireId: input.fireId,
    creatorId: input.creatorId,
    reportType: input.reportType || input.type || 'monthly',
    filePath: input.filePath || '',
    createdDate: input.createdDate || new Date().toISOString()
  };
}

function normalizeReportUpdates(input = {}) {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(input, 'fireId')) updates.fireId = input.fireId;
  if (Object.prototype.hasOwnProperty.call(input, 'creatorId')) updates.creatorId = input.creatorId;
  if (Object.prototype.hasOwnProperty.call(input, 'reportType')) updates.reportType = input.reportType;
  if (Object.prototype.hasOwnProperty.call(input, 'type')) updates.reportType = input.type;
  if (Object.prototype.hasOwnProperty.call(input, 'filePath')) updates.filePath = input.filePath;
  if (Object.prototype.hasOwnProperty.call(input, 'createdDate')) updates.createdDate = input.createdDate;

  return updates;
}

async function getReports(filters = {}) {
  if (filters.status && filters.status !== 'all' && filters.status !== 'Hoàn thành') {
    return [];
  }

  const reports = await reportsRepository.findAll({
    search: filters.search || filters.keyword,
    type: filters.type
  });

  return reports.map(decorateReport);
}

async function getReportById(id) {
  return decorateReport(await reportsRepository.findById(id));
}

async function createReport(payload) {
  return decorateReport(await reportsRepository.create(normalizeReportInput(payload)));
}

async function updateReport(id, payload) {
  return decorateReport(await reportsRepository.update(id, normalizeReportUpdates(payload)));
}

async function deleteReport(id) {
  return reportsRepository.remove(id);
}

function getReportFilters() {
  return {
    statuses: ['Hoàn thành'],
    types: Object.keys(REPORT_TYPE_LABEL),
    periods: ['Tháng', 'Quý', 'Năm']
  };
}

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportFilters
};
