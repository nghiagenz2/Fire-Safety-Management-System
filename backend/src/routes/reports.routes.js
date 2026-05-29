const express = require('express');
const {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportFilters
} = require('../controllers/reports.controller');

const router = express.Router();

router.get('/', getReports);
router.get('/filters', getReportFilters);
router.get('/:id', getReportById);
router.post('/', createReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

module.exports = router;
