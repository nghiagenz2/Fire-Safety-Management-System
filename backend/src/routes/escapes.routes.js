const express = require('express');
const {
  getEscapes,
  getEscapeById,
  getFloors,
  createEscape,
  updateEscape,
  deleteEscape
} = require('../controllers/escapes.controller');

const router = express.Router();

router.get('/', getEscapes);
router.get('/floors', getFloors);
router.get('/:id', getEscapeById);
router.post('/', createEscape);
router.put('/:id', updateEscape);
router.delete('/:id', deleteEscape);

module.exports = router;