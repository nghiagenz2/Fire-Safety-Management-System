const express = require("express");
const router = express.Router();
const incidentsController = require("../controllers/incidents.controller");

router.get("/simulation", incidentsController.getSimulationState);
router.get("/simulation/stream", incidentsController.simulationStream);
router.post("/simulation", incidentsController.setSimulationState);
router.get("/", incidentsController.getAllIncidents);
router.put("/:id", incidentsController.updateIncidentStatus);

module.exports = router;
