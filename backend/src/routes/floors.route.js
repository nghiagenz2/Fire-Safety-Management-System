const express = require('express');
const router = express.Router();
const floorsController = require('../controllers/floors.controller');

router.get('/', floorsController.getFloorsList);
router.get('/:floorId', floorsController.getFloorById);

module.exports = router;
