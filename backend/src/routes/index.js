const express = require('express');
const healthRoutes = require('./health.routes');
const devicesRoutes = require('./devices.routes');
const escapesRoutes = require('./escapes.routes');

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fire Safety Management System API",
  });
});

router.use("/health", healthRoutes);
router.use("/devices", devicesRoutes);
router.use("/dashboard", require("./dashboard.route"));
router.use("/incidents", require("./incidents.route"));
router.use('/escapes', escapesRoutes);

module.exports = router;
