const express = require('express');
const healthRoutes = require('./health.routes');
const devicesRoutes = require('./devices.routes');
const accountsRoutes = require('./accounts.routes');
const reportsRoutes = require('./reports.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Fire Safety Management System API'
  });
});

router.use('/health', healthRoutes);
router.use('/devices', devicesRoutes);
router.use('/accounts', accountsRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
