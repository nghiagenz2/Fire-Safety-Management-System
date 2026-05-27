import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import ManagerBottomNav from "../../components/manager/ManagerBottomNav";
import {
  getManagerDashboardData,
  getManagerDashboardFilterOptions,
} from "../../services/managerDashboardApi";
import "../../styles/manager-shell.css";
import "../../styles/manager-dashboard.css";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString("vi-VN");
}

function getStatusClass(status) {
  if (!status) return "status-inactive";
  if (status === "resolved") return "status-active";
  if (
    status === "investigating" ||
    status === "in_progress" ||
    status === "open"
  )
    return "status-warning";
  return "status-inactive";
}

function BarChart({ data = [], valueKey, labelKey, color = "#146C94" }) {
  if (data.length === 0) {
    return <p className="typo-body-md text-secondary">Không có dữ liệu.</p>;
  }

  const maxValue = Math.max(
    ...data.map((item) => Number(item[valueKey] || 0)),
    1,
  );

  const padding = 40;
  const chartWidth = 700;
  const chartHeight = 300;
  const totalWidth = chartWidth + padding * 2;
  const totalHeight = chartHeight + padding * 2;

  const barWidth = Math.max(chartWidth / data.length / 1.5, 32);
  const barGap = (chartWidth - data.length * barWidth) / (data.length + 1);

  // Grid lines
  const gridLines = [];
  const step = Math.ceil(maxValue / 5);
  for (let i = 0; i <= 5; i++) {
    const value = i * step;
    const y = padding + chartHeight - (value / maxValue) * chartHeight;
    gridLines.push(
      <line
        key={`grid-${i}`}
        x1={padding}
        y1={y}
        x2={totalWidth - padding}
        y2={y}
        stroke="#e2e8f0"
        strokeWidth="1"
      />,
    );
  }

  // Bars
  const bars = data.map((item, index) => {
    const value = Number(item[valueKey] || 0);
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding + barGap + index * (barWidth + barGap);
    const y = padding + chartHeight - barHeight;

    return (
      <g key={`bar-${index}`}>
        <defs>
          <linearGradient
            id={`grad-${index}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
            <stop
              offset="100%"
              style={{ stopColor: color, stopOpacity: 0.7 }}
            />
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={barWidth}
          height={Math.max(barHeight, 2)}
          fill={`url(#grad-${index})`}
          rx="4"
        />
        <text
          x={x + barWidth / 2}
          y={y - 8}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#1e293b"
        >
          {value}
        </text>
      </g>
    );
  });

  // X-axis labels
  const xLabels = data.map((item, index) => {
    const x = padding + barGap + index * (barWidth + barGap) + barWidth / 2;
    return (
      <text
        key={`label-${index}`}
        x={x}
        y={totalHeight - 12}
        textAnchor="middle"
        fontSize="12"
        fill="#64748b"
      >
        {item[labelKey]}
      </text>
    );
  });

  // Y-axis scale
  const yScale = [];
  for (let i = 0; i <= 5; i++) {
    const value = i * step;
    const y = padding + chartHeight - (value / maxValue) * chartHeight;
    yScale.push(
      <text
        key={`scale-${i}`}
        x={padding - 10}
        y={y + 4}
        textAnchor="end"
        fontSize="11"
        fill="#94a3b8"
      >
        {value}
      </text>,
    );
  }

  return (
    <div className="md-bar-chart-wrap">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="md-bar-chart"
        role="img"
        aria-label="Biểu đồ cột số thiết bị theo tầng"
      >
        {gridLines}
        {yScale}
        {bars}
        {xLabels}
        {/* Axes */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={padding + chartHeight}
          stroke="#1e293b"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={totalWidth - padding}
          y2={padding + chartHeight}
          stroke="#1e293b"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function DonutChart({ segments = [] }) {
  const total = segments.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  if (total === 0) {
    return <p className="typo-body-md text-secondary">Không có dữ liệu.</p>;
  }

  const size = 200;
  const radius = 70;
  const strokeWidth = 20;
  const centerX = size / 2;
  const centerY = size / 2;

  // Build pie slices
  let angleStart = -90; // Start from top
  const paths = segments.map((segment, index) => {
    const value = Number(segment.value || 0);
    const percent = (value / total) * 100;
    const sliceAngle = (percent / 100) * 360;
    const angleEnd = angleStart + sliceAngle;

    // Convert to radians
    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (angleEnd * Math.PI) / 180;

    // Calculate points
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // Large arc flag
    const largeArc = sliceAngle > 180 ? 1 : 0;

    // Path data for stroke (donut ring)
    const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

    // Calculate label position (middle of slice)
    const labelAngle = angleStart + sliceAngle / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelRadius = radius + 12;
    const labelX = centerX + labelRadius * Math.cos(labelRad);
    const labelY = centerY + labelRadius * Math.sin(labelRad);

    angleStart = angleEnd;

    return (
      <g key={segment.key}>
        <path
          d={pathData}
          stroke={segment.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {percent >= 8 && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="600"
            fill="#1e293b"
          >
            {Math.round(percent)}%
          </text>
        )}
      </g>
    );
  });

  return (
    <div className="md-donut-container">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="md-donut-svg"
        role="img"
        aria-label="Biểu đồ tròn tỉ lệ thiết bị"
      >
        {paths}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth / 2 - 8}
          fill="#ffffff"
        />
        <text
          x={centerX}
          y={centerY - 12}
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill="#1e293b"
        >
          {formatNumber(total)}
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Thiết bị
        </text>
      </svg>
      
    </div>
  );
}

function LineChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <p className="typo-body-md text-secondary">
        Không có dữ liệu theo bộ lọc hiện tại.
      </p>
    );
  }

  const width = 720;
  const height = 220;
  const maxValue = Math.max(
    ...data.map((item) => Number(item.incidentCount || 0)),
    1,
  );
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((item, index) => {
      const x = index * stepX;
      const y =
        height -
        (Number(item.incidentCount || 0) / maxValue) * (height - 24) -
        12;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="md-line-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="md-line-chart"
        role="img"
        aria-label="Biểu đồ đường sự cố theo thời gian"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#6A1B9A"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((item, index) => {
          const x = index * stepX;
          const y =
            height -
            (Number(item.incidentCount || 0) / maxValue) * (height - 24) -
            12;
          return (
            <circle
              key={`${item.month}-${item.incidentCount}`}
              cx={x}
              cy={y}
              r="4"
              fill="#6A1B9A"
            />
          );
        })}
      </svg>
      <div className="md-line-labels">
        {data.map((item) => (
          <span key={item.month} className="typo-label text-secondary">
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}

function StackedBarChart({ data = [] }) {
  const maxValue = Math.max(
    ...data.map(
      (item) =>
        Number(item.available || 0) +
        Number(item.inspection || 0) +
        Number(item.unavailable || 0),
    ),
    1,
  );

  return (
    <div
      className="md-stacked-chart"
      role="img"
      aria-label="Biểu đồ trạng thái lối thoát theo tầng"
    >
      {data.map((item) => {
        const total =
          Number(item.available || 0) +
          Number(item.inspection || 0) +
          Number(item.unavailable || 0);
        const barWidth = `${(total / maxValue) * 100}%`;
        const availableWidth =
          total > 0 ? `${(Number(item.available || 0) / total) * 100}%` : "0%";
        const inspectionWidth =
          total > 0 ? `${(Number(item.inspection || 0) / total) * 100}%` : "0%";
        const unavailableWidth =
          total > 0
            ? `${(Number(item.unavailable || 0) / total) * 100}%`
            : "0%";

        return (
          <div key={item.floor} className="md-stacked-row">
            <p className="typo-label md-stacked-floor">{item.floorLabel}</p>
            <div className="md-stacked-track" style={{ width: barWidth }}>
              <div
                className="md-stack available"
                style={{ width: availableWidth }}
              />
              <div
                className="md-stack inspection"
                style={{ width: inspectionWidth }}
              />
              <div
                className="md-stack unavailable"
                style={{ width: unavailableWidth }}
              />
            </div>
            <p className="typo-label text-secondary md-stacked-value">
              {total}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ManagerDashboardPage() {
  const [filtersConfig, setFiltersConfig] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [timeRange, setTimeRange] = useState("last_30_days");
  const [floor, setFloor] = useState("all");
  const [deviceType, setDeviceType] = useState("all");
  const [incidentType, setIncidentType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const filters = await getManagerDashboardFilterOptions();
        setFiltersConfig(filters);
        setTimeRange(filters?.default?.timeRange || "last_30_days");
      } catch (error) {
        console.error("Failed to load dashboard filter options:", error);
      }
    };

    loadFilterOptions();
  }, []);

  const filterPayload = useMemo(
    () => ({
      timeRange,
      floors: [floor],
      deviceTypes: [deviceType],
      incidentTypes: [incidentType],
    }),
    [timeRange, floor, deviceType, incidentType],
  );

  const customRange = useMemo(() => {
    if (timeRange !== "custom" || !customStartDate || !customEndDate)
      return null;
    return {
      startDate: `${customStartDate}T00:00:00+07:00`,
      endDate: `${customEndDate}T23:59:59+07:00`,
    };
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (timeRange === "custom" && (!customStartDate || !customEndDate)) {
      return;
    }

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await getManagerDashboardData(filterPayload, customRange);
        setDashboard(data);
      } catch (error) {
        console.error("Failed to load manager dashboard:", error);
        setDashboard(null);
        setErrorMessage("Không thể tải dữ liệu dashboard. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [filterPayload, customRange, timeRange, customStartDate, customEndDate]);

  const cards = dashboard?.summaryCards || {};
  const charts = dashboard?.charts || {};
  const floorRows = dashboard?.buildingOverviewByFloor || [];

  return (
    <main className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <section className="manager-device-shell">
        <header className="manager-device-head">
          <div>
            <p className="typo-label text-secondary manager-overline">
              Ban quản lý - Dashboard thống kê
            </p>
            <h1 className="typo-h1 manager-device-title">
              Dashboard Dữ liệu PCCC
            </h1>
            <p className="typo-body-lg text-secondary manager-device-subtitle">
              Theo dõi tổng quan thiết bị, lối thoát và sự cố theo thời gian thực.
            </p>
          </div>
        </header>

        <section
          className="manager-panel md-filter-panel"
          aria-label="Bộ lọc dashboard"
        >
          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-time-range">
              Khoảng thời gian
            </label>
            <select
              id="md-time-range"
              className="manager-filter-select typo-body-lg"
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value)}
            >
              {(filtersConfig?.options?.timeRange || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-floor">
              Tầng
            </label>
            <select
              id="md-floor"
              className="manager-filter-select typo-body-lg"
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
            >
              {(filtersConfig?.options?.floors || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-device-type">
              Loại thiết bị
            </label>
            <select
              id="md-device-type"
              className="manager-filter-select typo-body-lg"
              value={deviceType}
              onChange={(event) => setDeviceType(event.target.value)}
            >
              {(filtersConfig?.options?.deviceTypes || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-incident-type">
              Loại sự cố
            </label>
            <select
              id="md-incident-type"
              className="manager-filter-select typo-body-lg"
              value={incidentType}
              onChange={(event) => setIncidentType(event.target.value)}
            >
              {(filtersConfig?.options?.incidentTypes || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {timeRange === "custom" && (
            <div className="md-custom-range">
              <div className="manager-filter-item">
                <label className="typo-body-lg" htmlFor="md-custom-start">
                  Từ ngày
                </label>
                <input
                  id="md-custom-start"
                  type="date"
                  className="manager-filter-select typo-body-lg"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                />
              </div>

              <div className="manager-filter-item">
                <label className="typo-body-lg" htmlFor="md-custom-end">
                  Đến ngày
                </label>
                <input
                  id="md-custom-end"
                  type="date"
                  className="manager-filter-select typo-body-lg"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        {isLoading && (
          <p className="typo-body-lg text-secondary">
            Đang tải dữ liệu dashboard...
          </p>
        )}
        {errorMessage && !isLoading && (
          <p className="typo-body-lg status-danger">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && dashboard && (
          <>
            <section className="md-summary-grid" aria-label="Summary cards">
              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">
                  {cards.totalDevices?.label}
                </p>
                <p className="typo-h1">
                  {formatNumber(cards.totalDevices?.value)}
                </p>
                <p className="typo-label text-secondary">
                  {cards.totalDevices?.unit}
                </p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">
                  {cards.healthyDevices?.label}
                </p>
                <p className="typo-h1 status-safe">
                  {formatNumber(cards.healthyDevices?.value)}
                </p>
                <p className="typo-label text-secondary">
                  {cards.healthyDevices?.ratio}% hoạt động tốt
                </p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">
                  {cards.failedOrMaintenanceDevices?.label}
                </p>
                <p className="typo-h1 status-warning">
                  {formatNumber(cards.failedOrMaintenanceDevices?.value)}
                </p>
                <p className="typo-label text-secondary">
                  Hỏng:{" "}
                  {formatNumber(
                    cards.failedOrMaintenanceDevices?.breakdown?.failed,
                  )}{" "}
                  | Bảo trì:{" "}
                  {formatNumber(
                    cards.failedOrMaintenanceDevices?.breakdown?.maintenance,
                  )}
                </p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">
                  {cards.availableExits?.label}
                </p>
                <p className="typo-h1 status-brand">
                  {formatNumber(cards.availableExits?.value)}
                </p>
                <p className="typo-label text-secondary">
                  {formatNumber(cards.availableExits?.total)} lối thoát |{" "}
                  {cards.availableExits?.ratio}% khả dụng
                </p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">
                  {cards.monthlyIncidents?.label}
                </p>
                <p className="typo-h1 status-danger">
                  {formatNumber(cards.monthlyIncidents?.value)}
                </p>
                <p className="typo-label text-secondary">
                  Critical:{" "}
                  {cards.monthlyIncidents?.severityBreakdown?.critical || 0} |
                  High: {cards.monthlyIncidents?.severityBreakdown?.high || 0}
                </p>
              </article>
            </section>

            <section className="md-chart-grid" aria-label="Khu vực biểu đồ">
              <article className="manager-panel md-chart-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.devicesByFloor?.title}</h2>
                </header>
                <BarChart
                  data={charts.devicesByFloor?.data || []}
                  valueKey="totalDevices"
                  labelKey="floorLabel"
                  color="#146C94"
                />
              </article>

              <article className="manager-panel md-chart-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.deviceHealthRatio?.title}</h2>
                </header>
                <div className="md-donut-layout">
                  <DonutChart
                    segments={charts.deviceHealthRatio?.segments || []}
                  />
                  <ul className="md-legend">
                    {(charts.deviceHealthRatio?.segments || []).map(
                      (segment) => (
                        <li key={segment.key}>
                          <span
                            className="md-legend-dot"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="typo-body-md">{segment.label}</span>
                          <strong className="typo-body-md">
                            {formatNumber(segment.value)}
                          </strong>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </article>

              <article className="manager-panel md-chart-card md-chart-card-wide">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.incidentsOverTime?.title}</h2>
                </header>
                <LineChart data={charts.incidentsOverTime?.data || []} />
              </article>

              <article className="manager-panel md-chart-card md-chart-card-wide">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.exitStatusByFloor?.title}</h2>
                </header>
                <StackedBarChart data={charts.exitStatusByFloor?.data || []} />
                <div className="md-stack-legend">
                  <span>
                    <i className="dot available" /> Khả dụng
                  </span>
                  <span>
                    <i className="dot inspection" /> Cần kiểm tra
                  </span>
                  <span>
                    <i className="dot unavailable" /> Không khả dụng
                  </span>
                </div>
              </article>
            </section>

            <section
              className="manager-panel md-floor-overview"
              aria-label="Tổng hợp theo tầng"
            >
              <h2 className="typo-h2">Tổng hợp theo tầng</h2>
              <div className="md-floor-grid">
                {floorRows.map((row) => (
                  <article key={row.floor} className="md-floor-item">
                    <p className="typo-body-md">
                      <strong>{row.floorLabel}</strong>
                    </p>
                    <p className="typo-label text-secondary">
                      Thiết bị: {row.totalDevices} | Tốt: {row.healthyDevices}
                    </p>
                    <p className="typo-label text-secondary">
                      Hỏng/Bảo trì: {row.failedDevices + row.maintenanceDevices}
                    </p>
                    <p className="typo-label text-secondary">
                      Lối thoát khả dụng: {row.availableExits}/{row.totalExits}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="md-table-grid"
              aria-label="Danh sách sự cố và cảnh báo gần đây"
            >
              <article className="manager-panel md-table-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">Sự cố gần đây</h2>
                </header>
                <div className="md-table-wrap">
                  <table className="manager-device-table md-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Thời gian</th>
                        <th>Tầng</th>
                        <th>Loại</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboard.recentIncidents || []).map((incident) => (
                        <tr key={incident.id}>
                          <td className="manager-device-id">{incident.id}</td>
                          <td>{formatDateTime(incident.occurredAt)}</td>
                          <td>{incident.floor}</td>
                          <td>{incident.incidentType}</td>
                          <td>
                            <span
                              className={`manager-device-status ${getStatusClass(incident.status)}`}
                            >
                              {incident.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(dashboard.recentIncidents || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="manager-device-empty typo-body-lg"
                          >
                            Không có sự cố trong bộ lọc đã chọn.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="manager-panel md-table-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">Cảnh báo gần đây</h2>
                </header>
                <div className="md-table-wrap">
                  <table className="manager-device-table md-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Thời gian</th>
                        <th>Tầng</th>
                        <th>Nguồn</th>
                        <th>Ưu tiên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboard.recentAlerts || []).map((alert) => (
                        <tr key={alert.id}>
                          <td className="manager-device-id">{alert.id}</td>
                          <td>{formatDateTime(alert.createdAt)}</td>
                          <td>{alert.floor}</td>
                          <td>{alert.source}</td>
                          <td>
                            <span
                              className={`manager-device-status ${getStatusClass(alert.status)}`}
                            >
                              {alert.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(dashboard.recentAlerts || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="manager-device-empty typo-body-lg"
                          >
                            Không có cảnh báo trong bộ lọc đã chọn.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        )}
      </section>

      <ManagerBottomNav />
    </main>
  );
}

export default ManagerDashboardPage;
