import { useEffect, useMemo, useState } from "react";
import {
  attachFireStaffDeviceInspectionImage,
  fetchFireStaffDevice3DData,
  fetchFireStaffDeviceFilterOptions,
  fetchFireStaffDeviceTableData,
  recordFireStaffDeviceInspection,
  reportFireStaffDeviceBroken,
  updateFireStaffDeviceStatus,
} from "../../services/mockFireStaffDevicesApi.js";
import Header from "../../components/Header";
import FireStaffBottomNav from "../../components/firestaff/FireStaffBottomNav.jsx";
import { getCurrentUser } from "../../services/authApi.js";

const DEFAULT_FILTERS = {
  floor: "all",
  type: "all",
  status: "all",
  maintenance: "all",
  keyword: "",
};

function FireStaffDevicePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    floors: [],
    types: [],
    statuses: [],
    maintenanceOptions: [],
  });
  const [tableData, setTableData] = useState({
    total: 0,
    filtered: 0,
    items: [],
  });
  const [modelData, setModelData] = useState({ nodes: [], highlightedIds: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [statusModalDevice, setStatusModalDevice] = useState(null);
  const [nextStatus, setNextStatus] = useState("safe");
  const [attachModalDevice, setAttachModalDevice] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  async function refreshPageData(activeFilters) {
    const [table, model] = await Promise.all([
      fetchFireStaffDeviceTableData(activeFilters),
      fetchFireStaffDevice3DData(activeFilters),
    ]);

    setTableData(table);
    setModelData(model);

    if (table.items.length === 0) {
      setSelectedDeviceId("");
      return;
    }

    const hasSelected = table.items.some(
      (item) => item.id === selectedDeviceId,
    );
    if (!hasSelected) {
      setSelectedDeviceId(table.items[0].id);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchFireStaffDeviceFilterOptions().then((options) => {
      if (!isMounted) {
        return;
      }
      setFilterOptions(options);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetchFireStaffDeviceTableData(filters),
      fetchFireStaffDevice3DData(filters),
    ])
      .then(([table, model]) => {
        if (!isMounted) {
          return;
        }

        setTableData(table);
        setModelData(model);

        if (table.items.length === 0) {
          setSelectedDeviceId("");
          return;
        }

        const hasSelected = table.items.some(
          (item) => item.id === selectedDeviceId,
        );
        if (!hasSelected) {
          setSelectedDeviceId(table.items[0].id);
        }
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

  const selectedDevice = useMemo(() => {
    return tableData.items.find((item) => item.id === selectedDeviceId) || null;
  }, [selectedDeviceId, tableData.items]);

  const groupedModelNodes = useMemo(() => {
    const grouped = modelData.nodes.reduce((accumulator, node) => {
      if (!accumulator[node.floor]) {
        accumulator[node.floor] = [];
      }
      accumulator[node.floor].push(node);
      return accumulator;
    }, {});

    return Object.entries(grouped).sort((a, b) =>
      b[0].localeCompare(a[0], "vi"),
    );
  }, [modelData.nodes]);

  function updateFilter(key, value) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function openStatusModal(device) {
    setStatusModalDevice(device);
    setNextStatus(device.status);
  }

  function closeStatusModal() {
    setStatusModalDevice(null);
  }

  async function handleConfirmUpdateStatus() {
    if (!statusModalDevice) {
      return;
    }

    setIsSubmittingAction(true);
    try {
      const chosenStatus =
        filterOptions.statuses.find((item) => item.value === nextStatus) ||
        null;

      await updateFireStaffDeviceStatus(statusModalDevice.id, {
        status: nextStatus,
        statusLabel: chosenStatus?.label,
      });
      await refreshPageData(filters);
      closeStatusModal();
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleRecordInspection(device) {
    setIsSubmittingAction(true);
    try {
      const currentUser = getCurrentUser();
      const inspectorName = currentUser?.fullName || "Nhân viên PCCC trực ca";
      await recordFireStaffDeviceInspection(device.id, {
        inspectorName,
        result: "pass",
        note: "Kiểm tra định kỳ - thiết bị hoạt động ổn định.",
      });
      await refreshPageData(filters);
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleReportBroken(device) {
    setIsSubmittingAction(true);
    try {
      const currentUser = getCurrentUser();
      const reporterName = currentUser?.fullName || "Nhân viên PCCC trực ca";
      await reportFireStaffDeviceBroken(device.id, {
        reporterName,
        issueSummary: "Phát hiện lỗi cần xử lý kỹ thuật.",
        severity: "high",
      });
      await refreshPageData(filters);
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function openAttachModal(device) {
    setAttachModalDevice(device);
    setSelectedFileName("");
    setImageCaption("");
  }

  function closeAttachModal() {
    setAttachModalDevice(null);
  }

  async function handleConfirmAttachImage() {
    if (!attachModalDevice) {
      return;
    }

    setIsSubmittingAction(true);
    try {
      const currentUser = getCurrentUser();
      const uploadedBy = currentUser?.fullName || "Nhân viên PCCC trực ca";
      const fallbackFileName = `${attachModalDevice.id.toLowerCase()}-inspection.jpg`;
      await attachFireStaffDeviceInspectionImage(attachModalDevice.id, {
        fileName: selectedFileName || fallbackFileName,
        caption: imageCaption || "Ảnh kiểm tra nhanh hiện trường",
        uploadedBy,
      });
      closeAttachModal();
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <main className="firestaff-screen">
      <Header roleLabel="Nhân viên PCCC" homePath="/firestaff/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <header className="firestaff-sim-hero firestaff-device-header">
        <div>
          <h1 className="typo-h1">Quản lý thiết bị PCCC</h1>
          <p className="typo-body-md text-secondary">
            Theo dõi trạng thái thiết bị, thao tác kiểm tra và quan sát vị trí
            trên mô hình 3D.
          </p>
        </div>
      </header>

      <section
        className="firestaff-device-filters firestaff-panel"
        aria-label="Bộ lọc thiết bị"
      >
        <div className="firestaff-device-filter-grid">
          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="device-filter-floor"
          >
            Tầng
            <select
              id="device-filter-floor"
              className="firestaff-sim-select typo-body-md"
              value={filters.floor}
              onChange={(event) => updateFilter("floor", event.target.value)}
            >
              <option value="all">Tất cả</option>
              {filterOptions.floors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </select>
          </label>

          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="device-filter-type"
          >
            Loại thiết bị
            <select
              id="device-filter-type"
              className="firestaff-sim-select typo-body-md"
              value={filters.type}
              onChange={(event) => updateFilter("type", event.target.value)}
            >
              <option value="all">Tất cả</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="device-filter-status"
          >
            Trạng thái
            <select
              id="device-filter-status"
              className="firestaff-sim-select typo-body-md"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="all">Tất cả</option>
              {filterOptions.statuses.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="device-filter-maintenance"
          >
            Hạn bảo trì
            <select
              id="device-filter-maintenance"
              className="firestaff-sim-select typo-body-md"
              value={filters.maintenance}
              onChange={(event) =>
                updateFilter("maintenance", event.target.value)
              }
            >
              {filterOptions.maintenanceOptions.map((maintenanceOption) => (
                <option
                  key={maintenanceOption.value}
                  value={maintenanceOption.value}
                >
                  {maintenanceOption.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="firestaff-device-filter-item typo-body-md"
            htmlFor="device-filter-keyword"
          >
            Từ khóa
            <input
              id="device-filter-keyword"
              className="firestaff-sim-input typo-body-md"
              type="search"
              placeholder="Mã thiết bị, khu vực, người kiểm tra"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="firestaff-device-layout">
        <article className="firestaff-panel firestaff-device-table-card">
          <header className="firestaff-device-card-header">
            <h2 className="typo-h2">Bảng dữ liệu thiết bị</h2>
            <p className="typo-label text-secondary">
              {tableData.filtered}/{tableData.total} thiết bị
            </p>
          </header>

          <div className="firestaff-device-table-wrap">
            <table className="firestaff-device-table typo-body-md">
              <thead>
                <tr>
                  <th>Mã thiết bị</th>
                  <th>Loại thiết bị</th>
                  <th>Tầng</th>
                  <th>Trạng thái</th>
                  <th>Hạn bảo trì</th>
                  <th>Lần kiểm tra gần nhất</th>
                  <th>Nhân viên kiểm tra</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="8"
                      className="firestaff-device-empty typo-body-md"
                    >
                      Đang tải dữ liệu thiết bị...
                    </td>
                  </tr>
                )}

                {!isLoading && tableData.items.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="firestaff-device-empty typo-body-md"
                    >
                      Không có thiết bị phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  tableData.items.map((device) => (
                    <tr
                      key={device.id}
                      className={
                        selectedDeviceId === device.id ? "is-selected" : ""
                      }
                      onClick={() => setSelectedDeviceId(device.id)}
                    >
                      <td>{device.code}</td>
                      <td>{device.type}</td>
                      <td>{device.floor}</td>
                      <td>
                        <span
                          className={`firestaff-device-status status-${device.status}`}
                        >
                          {device.statusLabel}
                        </span>
                      </td>
                      <td>{device.maintenanceDue}</td>
                      <td>{device.lastInspection}</td>
                      <td>{device.inspectorName}</td>
                      <td>
                        <div className="firestaff-device-actions">
                          <button
                            type="button"
                            className="firestaff-device-action-btn typo-label"
                            onClick={(event) => {
                              event.stopPropagation();
                              openStatusModal(device);
                            }}
                            disabled={isSubmittingAction}
                          >
                            Cập nhật
                          </button>
                          <button
                            type="button"
                            className="firestaff-device-action-btn typo-label"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRecordInspection(device);
                            }}
                            disabled={isSubmittingAction}
                          >
                            Kiểm tra
                          </button>
                          <button
                            type="button"
                            className="firestaff-device-action-btn typo-label danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleReportBroken(device);
                            }}
                            disabled={isSubmittingAction}
                          >
                            Báo hỏng
                          </button>
                          <button
                            type="button"
                            className="firestaff-device-action-btn typo-label"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAttachModal(device);
                            }}
                            disabled={isSubmittingAction}
                          >
                            Đính ảnh
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {statusModalDevice && (
        <section
          className="firestaff-device-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Cập nhật trạng thái thiết bị"
        >
          <article className="firestaff-panel firestaff-device-modal">
            <header className="firestaff-device-modal-header">
              <div>
                <h2 className="typo-h2">Cập nhật trạng thái</h2>
                <p className="typo-body-md text-secondary">
                  {statusModalDevice.code} - {statusModalDevice.type}
                </p>
              </div>
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={closeStatusModal}
                disabled={isSubmittingAction}
              >
                Đóng
              </button>
            </header>

            <label
              className="firestaff-device-filter-item typo-body-md"
              htmlFor="device-status-update-select"
            >
              Chọn trạng thái mới
              <select
                id="device-status-update-select"
                className="firestaff-sim-select typo-body-md"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
              >
                {filterOptions.statuses.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="firestaff-device-modal-actions">
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={closeStatusModal}
                disabled={isSubmittingAction}
              >
                Hủy
              </button>
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={handleConfirmUpdateStatus}
                disabled={isSubmittingAction}
              >
                Xác nhận cập nhật
              </button>
            </div>
          </article>
        </section>
      )}

      {attachModalDevice && (
        <section
          className="firestaff-device-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Đính kèm ảnh kiểm tra"
        >
          <article className="firestaff-panel firestaff-device-modal">
            <header className="firestaff-device-modal-header">
              <div>
                <h2 className="typo-h2">Đính kèm ảnh kiểm tra</h2>
                <p className="typo-body-md text-secondary">
                  {attachModalDevice.code} - {attachModalDevice.type}
                </p>
              </div>
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={closeAttachModal}
                disabled={isSubmittingAction}
              >
                Đóng
              </button>
            </header>

            <label
              className="firestaff-device-filter-item typo-body-md"
              htmlFor="device-image-file-input"
            >
              Chọn file ảnh (mô phỏng)
              <input
                id="device-image-file-input"
                type="file"
                accept="image/*"
                className="firestaff-sim-input typo-body-md"
                onChange={(event) => {
                  const file = event.target.files && event.target.files[0];
                  setSelectedFileName(file ? file.name : "");
                }}
              />
            </label>

            {selectedFileName && (
              <p className="typo-label text-secondary">
                File đã chọn: {selectedFileName}
              </p>
            )}

            <label
              className="firestaff-device-filter-item typo-body-md"
              htmlFor="device-image-caption-input"
            >
              Ghi chú ảnh
              <input
                id="device-image-caption-input"
                type="text"
                className="firestaff-sim-input typo-body-md"
                placeholder="Ví dụ: Ảnh đầu phun khu vực hành lang B"
                value={imageCaption}
                onChange={(event) => setImageCaption(event.target.value)}
              />
            </label>

            <div className="firestaff-device-modal-actions">
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={closeAttachModal}
                disabled={isSubmittingAction}
              >
                Hủy
              </button>
              <button
                type="button"
                className="firestaff-device-action-btn typo-label"
                onClick={handleConfirmAttachImage}
                disabled={isSubmittingAction}
              >
                Xác nhận đính ảnh
              </button>
            </div>
          </article>
        </section>
      )}

      <FireStaffBottomNav />
    </main>
  );
}

export default FireStaffDevicePage;
