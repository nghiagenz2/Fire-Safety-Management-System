import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import Header from "../../components/Header";
import ManagerBottomNav from "../../components/manager/ManagerBottomNav";
import "../../styles/manager-shell.css";
import "../../styles/manager-dashboard.css";

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('vi-VN');
}

function getDeviceStatusClass(status) {
  if (!status) return 'status-inactive';
  if (status === 'active') return 'status-safe';
  if (status === 'warning') return 'status-warning';
  if (status === 'danger') return 'status-danger';
  if (status === 'resolved') return 'status-active'; // For incidents
    return 'status-warning';

  return 'status-inactive';
}

function ManagerDashboardPage() {
  const [filtersConfig, setFiltersConfig] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [filters, setFilters] = useState({
    floor: 'all',
    deviceType: 'all',
  });

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await axios.get(
          'http://localhost:5000/api/dashboard/filters'
        );
        const filters = response.data.data.options;
        setFiltersConfig(filters);
      } catch (error) {
        console.error('Failed to load dashboard filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await axios.post(
          'http://localhost:5000/api/dashboard/data',
          filters
        );
        setDashboard(response.data.data);
      } catch (error) {
        console.error('Failed to load manager dashboard:', error);
        setDashboard(null);
        setErrorMessage('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [filters]);

  const cards = dashboard?.summaryCards || {};
  const charts = dashboard?.charts || {};
  const actionableItems = dashboard?.actionableItems || { devices: [], incidents: [] };

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
            <h1 className="typo-h1 manager-device-title">Dashboard Dữ liệu PCCC</h1>
            <p className="typo-body-lg text-secondary manager-device-subtitle">
              Theo dõi tổng quan thiết bị và sự cố theo thời gian thực
            </p>
          </div>
        </header>

        <section className="manager-panel md-filter-panel" aria-label="Bộ lọc dashboard">
          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-floor">
              Lọc theo Tầng
            </label>
            <select
              id="md-floor"
              className="manager-filter-select manager-floor-select typo-body-lg"
              value={filters.floor}
              onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
            >
              <option value="all">Tất cả tầng</option>
              {(filtersConfig?.floors || []).filter(f => f.value !== 'all').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="md-device-type">
              Lọc theo Loại thiết bị
            </label>
            <select
              id="md-device-type"
              className="manager-filter-select manager-floor-select typo-body-lg"
              value={filters.deviceType}
              onChange={(e) => setFilters({ ...filters, deviceType: e.target.value })}
            >
              <option value="all">Tất cả thiết bị</option>
              {(filtersConfig?.deviceTypes || []).filter(f => f.value !== 'all').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {isLoading && (
          <p className="typo-body-lg text-secondary">Đang tải dữ liệu dashboard...</p>
        )}
        {errorMessage && !isLoading && (
          <p className="typo-body-lg status-danger">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && dashboard && (
          <>
            <section className="md-summary-grid" aria-label="Summary cards">
              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">{cards.totalDevices?.label}</p>
                <p className="typo-h1">{formatNumber(cards.totalDevices?.value)}</p>
                <p className="typo-label text-secondary">{cards.totalDevices?.unit}</p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">Tỷ lệ an toàn</p>
                <p className="typo-h1 status-safe">{cards.healthyDevices?.ratio || 0}%</p>
                <p className="typo-label text-secondary">
                  thiết bị hoạt động tốt
                </p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">{cards.failedOrMaintenanceDevices?.label}</p>
                <p className="typo-h1 status-warning">
                  {formatNumber(cards.failedOrMaintenanceDevices?.value)}
                </p>
                <p className="typo-label text-secondary">thiết bị cần chú ý</p>
              </article>

              <article className="manager-panel md-card">
                <p className="typo-label text-secondary">{cards.monthlyIncidents?.label}</p>
                <p className="typo-h1 status-danger">
                  {formatNumber(cards.monthlyIncidents?.value)}
                </p>
                <p className="typo-label text-secondary">sự cố chưa xử lý</p>
              </article>
            </section>

            <section className="md-chart-grid" aria-label="Khu vực biểu đồ">
              <article className="manager-panel md-chart-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.dynamicBarChart?.title}</h2>
                </header>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.dynamicBarChart?.data}
                      margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                        tickFormatter={(val) => {
                          if (typeof val !== 'string') return val;
                          const lower = val.toLowerCase();
                          if (lower.includes('trệt') || lower.includes('tret')) return 'Trệt';
                          
                          const numMatch = val.match(/\d+/);
                          if (numMatch) {
                            const num = parseInt(numMatch[0], 10);
                            if (num % 2 !== 0) return ''; // Ẩn các tầng số lẻ (1, 3, 5...)
                            return num.toString(); // Hiện các tầng số chẵn (2, 4, 6...)
                          }
                          return val;
                        }}
                        interval={0}
                      >
                        <Label value={charts.dynamicBarChart?.xAxisLabel} position="bottom" offset={0} style={{ fill: '#374151', fontSize: 14, fontWeight: 'bold' }} />
                      </XAxis>
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                        allowDecimals={false}
                      >
                        <Label value="Số lượng thiết bị" angle={-90} position="insideLeft" style={{ fill: '#374151', fontSize: 14, fontWeight: 'bold' }} />
                      </YAxis>
                      <BarTooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="totalDevices" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="manager-panel md-chart-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">{charts.deviceHealthRatio?.title}</h2>
                </header>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.deviceHealthRatio?.segments || []}
                        cx="50%"
                        cy="45%"
                        innerRadius={90}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="label"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(charts.deviceHealthRatio?.segments || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="md-table-grid" aria-label="Danh sách cần hành động">
              <article className="manager-panel md-table-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">Thiết bị cần chú ý</h2>
                </header>
                <div className="md-table-wrap">
                  <table className="manager-device-table md-table">
                    <thead>
                      <tr>
                        <th>ID Thiết bị</th>
                        <th>Tầng</th>
                        <th>Loại</th>
                        <th>Tình trạng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionableItems.devices.map((device) => (
                        <tr key={device.id}>
                          <td className="manager-device-id">{device.id}</td>
                          <td>{device.floor}</td>
                          <td>{device.type}</td>
                          <td>
                            <span
                              className={`manager-device-status ${getDeviceStatusClass(device.status)}`}
                            >
                              {device.status === 'warning' ? 'Cảnh báo' : 'Hỏng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {actionableItems.devices.length === 0 && (
                        <tr>
                          <td colSpan="4" className="manager-device-empty typo-body-lg">
                            Không có thiết bị nào cần chú ý.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="manager-panel md-table-card">
                <header className="md-chart-head">
                  <h2 className="typo-h2">Sự cố đang mở</h2>
                </header>
                <div className="md-table-wrap">
                  <table className="manager-device-table md-table">
                    <thead>
                      <tr>
                        <th>ID Sự cố</th>
                        <th>Tầng</th>
                        <th>Loại sự cố</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionableItems.incidents.map((incident) => (
                        <tr key={incident.id}>
                          <td className="manager-device-id">{incident.id}</td>
                          <td>{incident.floor}</td>
                          <td>{incident.incidentType}</td>
                          <td>{formatDateTime(incident.occurredAt)}</td>
                        </tr>
                      ))}
                      {actionableItems.incidents.length === 0 && (
                        <tr>
                          <td colSpan="4" className="manager-device-empty typo-body-lg">
                            Không có sự cố nào đang mở.
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
