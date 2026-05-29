const escapesService = require('../services/escapes.service');

async function getEscapes(req, res, next) {
  try {
    const escapes = await escapesService.getEscapes(req.query);
    res.status(200).json({ success: true, data: escapes });
  } catch (error) {
    next(error);
  }
}

async function getEscapeById(req, res, next) {
  try {
    const escape = await escapesService.getEscapeById(req.params.id);
    if (!escape) {
      res.status(404);
      throw new Error('Escape route not found');
    }

    res.status(200).json({ success: true, data: escape });
  } catch (error) {
    next(error);
  }
}

async function getFloors(req, res, next) {
  try {
    const floors = await escapesService.getFloors();
    res.status(200).json({ success: true, data: floors });
  } catch (error) {
    next(error);
  }
}

async function createEscape(req, res, next) {
  try {
    const escape = await escapesService.createEscape(req.body);
    res.status(201).json({ success: true, data: escape });
  } catch (error) {
    next(error);
  }
}

async function updateEscape(req, res, next) {
  try {
    const escape = await escapesService.updateEscape(req.params.id, req.body);
    if (!escape) {
      res.status(404);
      throw new Error('Escape route not found');
    }

    res.status(200).json({ success: true, data: escape });
  } catch (error) {
    next(error);
  }
}

async function deleteEscape(req, res, next) {
  try {
    const deleted = await escapesService.deleteEscape(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Escape route not found');
    }

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEscapes,
  getEscapeById,
  getFloors,
  createEscape,
  updateEscape,
  deleteEscape
};