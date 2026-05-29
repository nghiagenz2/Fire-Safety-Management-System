const reportsService = require('../services/reports.service');

async function getReports(req, res, next) {
  try {
    const reports = await reportsService.getReports(req.query);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

async function getReportById(req, res, next) {
  try {
    const report = await reportsService.getReportById(req.params.id);
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function createReport(req, res, next) {
  try {
    const report = await reportsService.createReport(req.body);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function updateReport(req, res, next) {
  try {
    const report = await reportsService.updateReport(req.params.id, req.body);
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function deleteReport(req, res, next) {
  try {
    const deleted = await reportsService.deleteReport(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Report not found');
    }

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
}

async function getReportFilters(req, res, next) {
  try {
    res.status(200).json({ success: true, data: reportsService.getReportFilters() });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportFilters
};
