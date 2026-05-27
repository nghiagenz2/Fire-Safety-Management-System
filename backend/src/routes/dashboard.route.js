const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

router.get("/filters", dashboardController.getDashboardFilters);
router.post("/data", dashboardController.getDashboardData);

module.exports = router;
