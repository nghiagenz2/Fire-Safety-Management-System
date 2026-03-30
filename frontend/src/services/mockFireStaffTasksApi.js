import fireStaffTasks from "../mocks/fireStaffTasks.json";

const MOCK_LATENCY_MS = 450;

const STATUS_ORDER = ["pending", "in_progress", "completed"];
const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

const PRIORITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

let tasksStore = (fireStaffTasks || []).map((task) => ({
  ...task,
  checklist: task.checklist || [],
  attachments: task.attachments || [],
}));

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const dueA = new Date(a.dueAt || a.createdAt || 0).getTime();
    const dueB = new Date(b.dueAt || b.createdAt || 0).getTime();

    if (dueA !== dueB) {
      return dueA - dueB;
    }

    const rankA = PRIORITY_RANK[a.priority] ?? Number.MAX_SAFE_INTEGER;
    const rankB = PRIORITY_RANK[b.priority] ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return String(a.id).localeCompare(String(b.id));
  });
}

function applyTaskFilters(tasks, filters = {}) {
  const status = filters.status || "all";
  const priority = filters.priority || "all";
  const category = filters.category || "all";
  const assignee = filters.assignee || "all";
  const team = filters.team || "all";
  const floor = filters.floor || "all";
  const incidentId = filters.incidentId || "all";
  const keyword = (filters.keyword || "").trim().toLowerCase();

  return tasks.filter((task) => {
    const statusMatch = status === "all" || task.status === status;
    const priorityMatch = priority === "all" || task.priority === priority;
    const categoryMatch = category === "all" || task.category === category;
    const assigneeMatch = assignee === "all" || task.assignee === assignee;
    const teamMatch = team === "all" || task.team === team;
    const floorMatch = floor === "all" || task.floor === floor;
    const incidentMatch =
      incidentId === "all" || task.incidentId === incidentId;

    const keywordMatch =
      keyword.length === 0 ||
      [
        task.id,
        task.title,
        task.description,
        task.assignee,
        task.team,
        task.zone,
        task.incidentId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));

    return (
      statusMatch &&
      priorityMatch &&
      categoryMatch &&
      assigneeMatch &&
      teamMatch &&
      floorMatch &&
      incidentMatch &&
      keywordMatch
    );
  });
}

function buildCountMap(tasks, field, order = []) {
  const counts = tasks.reduce((acc, task) => {
    const key = task[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (order.length === 0) {
    return counts;
  }

  return order.reduce((acc, key) => {
    acc[key] = counts[key] || 0;
    return acc;
  }, {});
}

function calculateCompletionRate(tasks) {
  if (!tasks.length) {
    return 0;
  }

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  return Math.round((completedCount / tasks.length) * 100);
}

export function fetchFireStaffTaskFilterOptions() {
  const categoryLabels = {};
  tasksStore.forEach((task) => {
    if (!task.category) {
      return;
    }
    categoryLabels[task.category] =
      categoryLabels[task.category] || task.category;
  });

  return resolveAfterDelay({
    statuses: STATUS_ORDER.map((value) => ({
      value,
      label:
        tasksStore.find((task) => task.status === value)?.statusLabel || value,
    })),
    priorities: PRIORITY_ORDER.map((value) => ({
      value,
      label:
        tasksStore.find((task) => task.priority === value)?.priorityLabel ||
        value,
    })),
    categories: [
      ...new Set(tasksStore.map((task) => task.category).filter(Boolean)),
    ].map((value) => ({
      value,
      label: categoryLabels[value],
    })),
    assignees: [
      ...new Set(tasksStore.map((task) => task.assignee).filter(Boolean)),
    ],
    teams: [...new Set(tasksStore.map((task) => task.team).filter(Boolean))],
    floors: [...new Set(tasksStore.map((task) => task.floor).filter(Boolean))],
    incidents: [
      ...new Set(tasksStore.map((task) => task.incidentId).filter(Boolean)),
    ],
  });
}

export function fetchFireStaffTaskOverview(filters = {}) {
  const filteredTasks = applyTaskFilters(tasksStore, filters);

  return resolveAfterDelay({
    total: filteredTasks.length,
    completionRate: calculateCompletionRate(filteredTasks),
    byStatus: buildCountMap(filteredTasks, "status", STATUS_ORDER),
    byPriority: buildCountMap(filteredTasks, "priority", PRIORITY_ORDER),
  });
}

export function fetchFireStaffTaskList(filters = {}) {
  const filteredTasks = applyTaskFilters(tasksStore, filters);
  const sortedItems = sortTasks(filteredTasks);

  return resolveAfterDelay({
    total: tasksStore.length,
    filtered: sortedItems.length,
    items: clone(sortedItems),
  });
}

export function fetchFireStaffTaskById(taskId) {
  const task = tasksStore.find((item) => item.id === taskId);

  if (!task) {
    return Promise.reject(new Error(`Khong tim thay nhiem vu ${taskId}`));
  }

  return resolveAfterDelay(clone(task));
}

export function updateFireStaffTaskStatus(taskId, nextStatus) {
  const task = tasksStore.find((item) => item.id === taskId);

  if (!task) {
    return Promise.reject(new Error(`Khong tim thay nhiem vu ${taskId}`));
  }

  if (!STATUS_ORDER.includes(nextStatus)) {
    return Promise.reject(new Error("Trang thai nhiem vu khong hop le"));
  }

  const statusLabelMap = {
    pending: "Chờ thực hiện",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
  };

  task.status = nextStatus;
  task.statusLabel = statusLabelMap[nextStatus] || nextStatus;
  task.updatedAt = new Date().toISOString();
  task.progress =
    nextStatus === "completed"
      ? 100
      : nextStatus === "in_progress"
        ? Math.max(task.progress || 0, 20)
        : 0;

  return resolveAfterDelay(clone(task));
}
