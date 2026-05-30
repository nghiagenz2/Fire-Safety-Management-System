const express = require("express");
const router = express.Router();
const incidentsController = require("../controllers/incidents.controller");

router.get("/", incidentsController.getAllIncidents);
router.put("/:id", incidentsController.updateIncidentStatus);

module.exports = router;
