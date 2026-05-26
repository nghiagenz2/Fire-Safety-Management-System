const express = require('express');
const {
  getDevices,
  getDeviceById,
  getFloors,
  createDevice,
  updateDevice,
  deleteDevice
} = require('../controllers/devices.controller');

const router = express.Router();

router.get('/', getDevices);
router.get('/floors', getFloors);
router.get('/:id', getDeviceById);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);

module.exports = router;
