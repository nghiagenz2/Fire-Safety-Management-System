const devicesService = require('../services/devices.service');

async function getDevices(req, res, next) {
  try {
    const devices = await devicesService.getDevices(req.query);
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
}

async function getDeviceById(req, res, next) {
  try {
    const device = await devicesService.getDeviceById(req.params.id);
    if (!device) {
      res.status(404);
      throw new Error('Device not found');
    }

    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
}

async function getFloors(req, res, next) {
  try {
    const floors = await devicesService.getFloors();
    res.status(200).json({ success: true, data: floors });
  } catch (error) {
    next(error);
  }
}

async function createDevice(req, res, next) {
  try {
    const device = await devicesService.createDevice(req.body);
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
}

async function updateDevice(req, res, next) {
  try {
    const device = await devicesService.updateDevice(req.params.id, req.body);
    if (!device) {
      res.status(404);
      throw new Error('Device not found');
    }

    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
}

async function deleteDevice(req, res, next) {
  try {
    const deleted = await devicesService.deleteDevice(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Device not found');
    }

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDevices,
  getDeviceById,
  getFloors,
  createDevice,
  updateDevice,
  deleteDevice
};
