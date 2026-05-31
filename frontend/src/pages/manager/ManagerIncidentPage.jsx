import { useState, useEffect } from 'react';
import { MagnifyingGlass, FunnelSimple } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import ManagerIncidentCard from '../../components/manager/ManagerIncidentCard';
import { getManagerIncidentsData, getSimulationIncident } from '../../services/managerIncidentsApi';
import './ManagerIncidentPage.css';

function mapDBToUI(dbIncident) {
  // Chuyển đổi dữ liệu từ DB thật sang chuẩn mà component giao diện đang dùng
  let mappedStatus = "Đang xử lý";
  if (dbIncident.status === "resolved") mappedStatus = "Dập tắt";
  else if (dbIncident.status === "false_alarm") mappedStatus = "Xác nhận sai";

  return {
    id: dbIncident.id,
    title: dbIncident.incident_type || "Sự cố chưa rõ",
    location: dbIncident.floor || "Không rõ vị trí",
    status: mappedStatus,
    severity: dbIncident.severity || "medium",
    startTime: dbIncident.startTime || new Date(dbIncident.occurredAt || dbIncident.occurred_at).toLocaleString("vi-VN"),
    resourcesDeployed: dbIncident.resourcesDeployed || [],
    affectedArea: dbIncident.affectedArea || [dbIncident.floor || "Không rõ vị trí"],
    description: dbIncident.description || "Không có mô tả chi tiết.",
  };
}

function ManagerIncidentPage() {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const filteredIncidents = incidents.filter((incident) => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (incident.title || '').toLowerCase().includes(searchLower) ||
      (incident.id || '').toLowerCase().includes(searchLower) ||
      (incident.location || '').toLowerCase().includes(searchLower);

    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    return {
      total: incidents.length,
      active: incidents.filter((i) => i.status === 'Đang xử lý').length,
      resolved: incidents.filter((i) => i.status === 'Dập tắt').length,
      falseAlarm: incidents.filter((i) => i.status === 'Xác nhận sai').length
    };
  };

  const stats = getStats();

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        const [dbData, simulationIncident] = await Promise.all([
          getManagerIncidentsData(),
          getSimulationIncident()
        ]);
        setIncidents([
          ...(simulationIncident ? [mapDBToUI(simulationIncident)] : []),
          ...dbData.map(mapDBToUI)
        ]);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu sự cố:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  return (
    <div className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <div className="incident-shell">
        {/* Page Title Section */}
        <div className="page-header-section">
          <p className="typo-label text-secondary">Sự cố</p>
          <h1 className="typo-h1">Quản lý các sự cố trong tòa nhà</h1>
        </div>
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label typo-label">Tổng cộng</div>
            <div className="stat-value typo-h1">{stats.total}</div>
          </div>
          <div className="stat-card stat-active">
            <div className="stat-label typo-label">Đang xử lý</div>
            <div className="stat-value typo-h1">{stats.active}</div>
          </div>
          <div className="stat-card stat-resolved">
            <div className="stat-label typo-label">Đã dập tắt</div>
            <div className="stat-value typo-h1">{stats.resolved}</div>
          </div>
          <div className="stat-card stat-false">
            <div className="stat-label typo-label">Báo động giả</div>
            <div className="stat-value typo-h1">{stats.falseAlarm}</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="incident-panel">
          <div className="filter-section">
            <div className="search-wrap">
              <MagnifyingGlass size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm sự cố..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-wrap">
              <FunnelSimple size={18} className="filter-icon" />
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Dập tắt">Đã dập tắt</option>
                <option value="Xác nhận sai">Báo động giả</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="incidents-container">
          {isLoading ? (
            <div className="p-8 text-center text-xl font-bold">Đang tải dữ liệu sự cố...</div>
          ) : filteredIncidents.length > 0 ? (
            <div className="incidents-grid">
              {filteredIncidents.map((incident) => (
                <ManagerIncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => setSelectedIncident(incident)}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p className="typo-body-lg">Không tìm thấy sự cố nào</p>
              <p className="typo-body-md">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </div>

      <ManagerBottomNav />
    </div>
  );
}

export default ManagerIncidentPage;
