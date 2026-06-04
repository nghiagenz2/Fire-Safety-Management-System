const express = require('express');
const { getTasks, getFilterOptions, createTask, updateTaskStatus } = require('../controllers/tasks.controller');

const router = express.Router();

router.get('/', getTasks);
router.get('/filter-options', getFilterOptions);
router.post('/', createTask);
router.put('/:id/status', updateTaskStatus);

module.exports = router;
