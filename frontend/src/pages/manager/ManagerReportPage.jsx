import { useState } from 'react';
import { MagnifyingGlass, FunnelSimple, Plus } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import ManagerReportCard from '../../components/manager/ManagerReportCard';
import reportsData from '../../mocks/managerReports.json';
import './ManagerReportPage.css';

function ManagerReportPage() {
  const [reports, setReports] = useState(reportsData.reports);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.includes(searchTerm) ||
      report.preparedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesType = filterType === 'all' || report.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStats = () => {
    return {
      total: reports.length,
      completed: reports.filter((r) => r.status === 'Hoàn thành').length,
      pending: reports.filter((r) => r.status === 'Chờ phê duyệt').length,
      rejected: reports.filter((r) => r.status === 'Đã từ chối').length
    };
  };

  const stats = getStats();

  return (
    <div className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />

      <div className="report-shell">
        {/* Page Title Section */}
        <div className="page-header-section">
          <p className="typo-label text-secondary">Báo cáo</p>
          <h1 className="typo-h1">Xem và quản lý các báo cáo an toàn PCCC</h1>
        </div>
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label typo-label">Tổng cộng</div>
            <div className="stat-value typo-h1">{stats.total}</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-label typo-label">Hoàn thành</div>
            <div className="stat-value typo-h1">{stats.completed}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-label typo-label">Chờ phê duyệt</div>
            <div className="stat-value typo-h1">{stats.pending}</div>
          </div>
          <div className="stat-card stat-rejected">
            <div className="stat-label typo-label">Bị từ chối</div>
            <div className="stat-value typo-h1">{stats.rejected}</div>
          </div>
        </div>

        {/* Header Bar */}
        <div className="report-header">
          <h2 className="typo-h2">Danh sách báo cáo</h2>
          <button className="create-report-btn">
            <Plus size={18} weight="bold" />
            <span>Tạo báo cáo</span>
          </button>
        </div>

        {/* Filter Section */}
        <div className="report-panel">
          <div className="filter-section">
            <div className="search-wrap">
              <MagnifyingGlass size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm báo cáo..."
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
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Chờ phê duyệt">Chờ phê duyệt</option>
                <option value="Đã từ chối">Bị từ chối</option>
              </select>
            </div>

            <div className="filter-wrap">
              <select
                className="filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Tất cả loại</option>
                <option value="monthly">Báo cáo hàng tháng</option>
                <option value="inspection">Kiểm tra</option>
                <option value="drill">Diễn tập</option>
                <option value="risk_assessment">Đánh giá rủi ro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="reports-container">
          {filteredReports.length > 0 ? (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <ManagerReportCard
                  key={report.id}
                  report={report}
                  onClick={() => console.log('View report:', report.id)}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p className="typo-body-lg">Không tìm thấy báo cáo nào</p>
              <p className="typo-body-md">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </div>

      <ManagerBottomNav />
    </div>
  );
}

export default ManagerReportPage;
