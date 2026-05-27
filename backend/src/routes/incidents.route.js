const express = require("express");
const router = express.Router();
const incidentsController = require("../controllers/incidents.controller");

router.get("/", incidentsController.getIncidents);

module.exports = router;
