import { useEffect, useMemo, useState } from "react";
import FireStaffBottomNav from "../../components/firestaff/FireStaffBottomNav.jsx";
import {
  fetchFireStaffTaskFilterOptions,
  fetchFireStaffTaskList,
  updateFireStaffTaskStatus,
} from "../../services/mockFireStaffTasksApi.js";

const DEFAULT_FILTERS = {
  status: "all",
  keyword: "",
};

const CATEGORY_LABEL = {
  isolation: "Cô lập an toàn",
  evacuation: "Điều phối sơ tán",
  verification: "Kiểm tra xác minh",
  logistics: "Điều phối thiết bị",
  reporting: "Báo cáo hiện trường",
};

const RELATED_DEVICE_LABEL = {
  isolation: "Tủ điện khu vực",
  evacuation: "Loa hướng dẫn sơ tán",
  verification: "Sprinkler / cảm biến nhiệt",
  logistics: "Bình chữa cháy CO2",
  reporting: "Thiết bị ghi nhận hiện trường",
};

function formatDueDate(isoValue) {
  if (!isoValue) {
    return "Chưa có hạn";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có hạn";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildStatusClass(status) {
  if (status === "completed") {
    return "status-completed";
  }
  if (status === "in_progress") {
    return "status-in-progress";
  }
  return "status-pending";
}

function FireStaffTaskPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [taskData, setTaskData] = useState({
    total: 0,
    filtered: 0,
    items: [],
  });
  const [statusOptions, setStatusOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState("");

  async function refreshTaskData(activeFilters) {
    const data = await fetchFireStaffTaskList(activeFilters);
    setTaskData(data);
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchFireStaffTaskFilterOptions(),
      fetchFireStaffTaskList(DEFAULT_FILTERS),
    ])
      .then(([options, listData]) => {
        if (!isMounted) {
          return;
        }

        setStatusOptions(options.statuses || []);
        setTaskData(listData);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    fetchFireStaffTaskList(filters)
      .then((listData) => {
        if (!isMounted) {
          return;
        }
        setTaskData(listData);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const summary = useMemo(() => {
    const pending = taskData.items.filter(
      (item) => item.status === "pending",
    ).length;
    const inProgress = taskData.items.filter(
      (item) => item.status === "in_progress",
    ).length;
    const completed = taskData.items.filter(
      (item) => item.status === "completed",
    ).length;

    return { pending, inProgress, completed };
  }, [taskData.items]);

  function updateFilter(key, value) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleUpdateTaskStatus(taskId, nextStatus) {
    setIsUpdatingTaskId(taskId);
    try {
      await updateFireStaffTaskStatus(taskId, nextStatus);
      await refreshTaskData(filters);
    } finally {
      setIsUpdatingTaskId("");
    }
  }

  return (
    <main className="firestaff-screen">
      <header className="firestaff-sim-hero firestaff-task-header">
        <div>
          <h1 className="typo-h1">Nhiệm vụ kiểm tra / bảo trì</h1>
          <p className="typo-body-md text-secondary">
            Quản lý các nhiệm vụ được giao, thực hiện và cập nhật trạng thái
            theo tiến độ xử lý.
          </p>
        </div>
      </header>

      <section className="firestaff-task-summary">
        <article className="firestaff-panel firestaff-task-kpi">
          <p className="typo-label text-secondary">Chưa thực hiện</p>
          <p className="typo-h2">{summary.pending}</p>
        </article>
        <article className="firestaff-panel firestaff-task-kpi">
          <p className="typo-label text-secondary">Đang thực hiện</p>
          <p className="typo-h2">{summary.inProgress}</p>
        </article>
        <article className="firestaff-panel firestaff-task-kpi">
          <p className="typo-label text-secondary">Hoàn thành</p>
          <p className="typo-h2">{summary.completed}</p>
        </article>
      </section>

      <section
        className="firestaff-task-filters firestaff-panel"
        aria-label="Bộ lọc nhiệm vụ"
      >
        <div className="firestaff-task-filter-grid">
          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="task-filter-status"
          >
            Trạng thái
            <select
              id="task-filter-status"
              className="firestaff-sim-select typo-body-md"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="all">Tất cả</option>
              {statusOptions.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="task-filter-keyword"
          >
            Từ khóa
            <input
              id="task-filter-keyword"
              className="firestaff-sim-input typo-body-md"
              type="search"
              value={filters.keyword}
              placeholder="Mã nhiệm vụ, khu vực, người phụ trách"
              onChange={(event) => updateFilter("keyword", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section
        className="firestaff-task-table-card firestaff-panel"
        aria-live="polite"
      >
        <header className="firestaff-device-card-header">
          <h2 className="typo-h2">Bảng nhiệm vụ</h2>
          <p className="typo-label text-secondary">
            {taskData.filtered}/{taskData.total} nhiệm vụ
          </p>
        </header>

        <div className="firestaff-device-table-wrap">
          <table className="firestaff-device-table firestaff-task-table typo-body-md">
            <thead>
              <tr>
                <th>Mã nhiệm vụ</th>
                <th>Loại nhiệm vụ</th>
                <th>Thiết bị liên quan</th>
                <th>Tầng / khu vực</th>
                <th>Thời hạn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan="6"
                    className="firestaff-device-empty typo-body-md"
                  >
                    Đang tải dữ liệu nhiệm vụ...
                  </td>
                </tr>
              )}

              {!isLoading &&
                taskData.items.map((task) => {
                  const isUpdating = isUpdatingTaskId === task.id;
                  const statusClass = buildStatusClass(task.status);

                  return (
                    <tr key={task.id}>
                      <td>
                        <p className="firestaff-task-code typo-label">
                          {task.id}
                        </p>
                      </td>
                      <td>
                        {CATEGORY_LABEL[task.category] ||
                          task.category ||
                          "Chưa phân loại"}
                      </td>
                      <td>
                        {task.relatedDevice ||
                          RELATED_DEVICE_LABEL[task.category] ||
                          "Chưa gán thiết bị"}
                      </td>
                      <td>{`${task.floor || "--"} / ${task.zone || "--"}`}</td>
                      <td>{formatDueDate(task.dueAt)}</td>
                      <td>
                        <select
                          className={`firestaff-task-status-select typo-label ${statusClass}`}
                          value={task.status}
                          disabled={isUpdating}
                          onChange={(event) =>
                            handleUpdateTaskStatus(task.id, event.target.value)
                          }
                        >
                          {statusOptions.map((statusOption) => (
                            <option
                              key={`${task.id}-${statusOption.value}`}
                              value={statusOption.value}
                            >
                              {statusOption.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && taskData.items.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="firestaff-device-empty typo-body-md"
                  >
                    Không có nhiệm vụ phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FireStaffBottomNav />
    </main>
  );
}

export default FireStaffTaskPage;
