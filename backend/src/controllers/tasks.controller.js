const tasksRepository = require('../repositories/tasks.repository');

async function getTasks(req, res, next) {
  try {
    const { status, keyword } = req.query;

    const allTasks = await tasksRepository.findAll();
    const filteredTasks = await tasksRepository.findAll({ status, keyword });

    res.status(200).json({
      success: true,
      data: {
        total: allTasks.length,
        filtered: filteredTasks.length,
        items: filteredTasks
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getFilterOptions(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        statuses: [
          { value: 'pending', label: 'Chờ thực hiện' },
          { value: 'in_progress', label: 'Đang thực hiện' },
          { value: 'completed', label: 'Hoàn thành' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const { category, floor, relatedDevice, dueAt, assignee, status, statusLabel } = req.body;

    const taskData = {
      category,
      floor,
      relatedDevice,
      dueAt,
      assignee,
      status: status || 'pending',
      statusLabel: statusLabel || 'Chờ thực hiện'
    };

    const newTask = await tasksRepository.create(taskData);
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400);
      throw new Error('Status is required');
    }

    const updatedTask = await tasksRepository.updateStatus(id, status);
    if (!updatedTask) {
      res.status(404);
      throw new Error('Task not found');
    }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTasks,
  getFilterOptions,
  createTask,
  updateTaskStatus
};
