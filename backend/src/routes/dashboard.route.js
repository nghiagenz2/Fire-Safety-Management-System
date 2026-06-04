const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

router.get("/filters", dashboardController.getFilterOptions);
router.post("/data", dashboardController.getDashboardData);

module.exports = router;
