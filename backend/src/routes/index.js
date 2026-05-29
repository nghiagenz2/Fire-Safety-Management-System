const express = require('express');
const healthRoutes = require('./health.routes');
const devicesRoutes = require('./devices.routes');
const floorsRoutes = require('./floors.route');
const dashboardRoutes = require('./dashboard.route');
const incidentsRoutes = require('./incidents.route');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Fire Safety Management System API'
  });
});

router.use('/health', healthRoutes);
router.use('/devices', devicesRoutes);
router.use('/manager/floors', floorsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/incidents', incidentsRoutes);

module.exports = router;
