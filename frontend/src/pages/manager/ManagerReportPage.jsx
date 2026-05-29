import { useEffect, useMemo, useState } from 'react';
import {
  ArrowSquareOut,
  FunnelSimple,
  MagnifyingGlass,
  NotePencil,
  Plus,
  Trash,
  X
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import ManagerReportCard from '../../components/manager/ManagerReportCard';
import {
  createManagerReport,
  deleteManagerReport,
  getManagerReports,
  updateManagerReport
} from '../../services/managerReportsApi';
import './ManagerReportPage.css';

const reportTypes = [
  { value: 'monthly', label: 'Báo cáo hàng tháng' },
  { value: 'quarterly', label: 'Báo cáo hàng quý' },
  { value: 'inspection', label: 'Kiểm tra' },
  { value: 'drill', label: 'Diễn tập' },
  { value: 'risk_assessment', label: 'Đánh giá rủi ro' }
];

const reportStatuses = [
  'Hoàn thành',
  'Chờ phê duyệt',
  'Đã từ chối'
];

const initialFormState = {
  reportType: 'monthly',
  status: 'Hoàn thành',
  creatorId: '',
  fireId: '',
  filePath: '',
  createdDate: ''
};

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toPayload(formState) {
  return {
    reportType: formState.reportType,
    status: formState.status,
    creatorId: formState.creatorId ? Number(formState.creatorId) : null,
    fireId: formState.fireId ? Number(formState.fireId) : null,
    filePath: formState.filePath.trim(),
    createdDate: formState.createdDate || new Date().toISOString()
  };
}

function ManagerReportPage() {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedReport, setSelectedReport] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [formState, setFormState] = useState(initialFormState);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await getManagerReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load manager reports:', error);
      setErrorMessage(error.message || 'Không tải được danh sách báo cáo.');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        report.title.toLowerCase().includes(normalizedSearch) ||
        report.id.toLowerCase().includes(normalizedSearch) ||
        report.preparedBy.toLowerCase().includes(normalizedSearch);

      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesType = filterType === 'all' || report.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, filterStatus, filterType]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      completed: reports.filter((report) => report.status === 'Hoàn thành').length,
      pending: reports.filter((report) => report.status === 'Chờ phê duyệt').length,
      rejected: reports.filter((report) => report.status === 'Đã từ chối').length
    }),
    [reports]
  );

  const openCreateForm = () => {
    setEditingReportId(null);
    setFormState({
      ...initialFormState,
      status: 'Hoàn thành',
      createdDate: toDateTimeLocal(new Date().toISOString())
    });
    setIsFormOpen(true);
  };

  const openEditForm = (report) => {
    setEditingReportId(report.id);
    setFormState({
      reportType: report.type || 'monthly',
      status: report.status || 'Hoàn thành',
      creatorId: report.creatorId || '',
      fireId: report.fireId || '',
      filePath: report.filePath || '',
      createdDate: toDateTimeLocal(report.createdAt) || toDateTimeLocal(new Date().toISOString())
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingReportId(null);
    setFormState(initialFormState);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();

    try {
      setErrorMessage('');
      if (editingReportId) {
        await updateManagerReport(editingReportId, toPayload(formState));
      } else {
        await createManagerReport(toPayload(formState));
      }

      await loadReports();
      closeForm();
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to save manager report:', error);
      setErrorMessage(error.message || 'Không lưu được báo cáo.');
    }
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Xóa báo cáo ${report.id}?`)) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteManagerReport(report.id);
      setReports((prev) => prev.filter((item) => item.id !== report.id));
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to delete manager report:', error);
      setErrorMessage(error.message || 'Không xóa được báo cáo.');
    }
  };

  const handleOpenFile = (filePath) => {
    if (!filePath) return;
    window.open(filePath, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <div className="report-shell">
        <div className="page-header-section">
          <p className="typo-label text-secondary">Báo cáo</p>
          <h1 className="typo-h1">Xem và quản lý các báo cáo an toàn PCCC</h1>
        </div>

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

        <div className="report-header">
          <h2 className="typo-h2">Danh sách báo cáo</h2>
          <button className="create-report-btn" type="button" onClick={openCreateForm}>
            <Plus size={18} weight="bold" />
            <span>Tạo báo cáo</span>
          </button>
        </div>

        <div className="report-panel">
          <div className="filter-section">
            <div className="search-wrap">
              <MagnifyingGlass size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm báo cáo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="filter-wrap">
              <FunnelSimple size={18} className="filter-icon" />
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'Đã từ chối' ? 'Bị từ chối' : status}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-wrap">
              <select
                className="filter-select"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
              >
                <option value="all">Tất cả loại</option>
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="report-inline-error typo-body-md" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="reports-container">
          {filteredReports.length > 0 ? (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <ManagerReportCard
                  key={report.id}
                  report={report}
                  onClick={() => setSelectedReport(report)}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p className="typo-body-lg">
                {isLoading ? 'Đang tải danh sách báo cáo...' : 'Không tìm thấy báo cáo nào'}
              </p>
              <p className="typo-body-md">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </div>

      {selectedReport && (
        <div className="report-modal-backdrop" role="presentation">
          <section className="report-modal" aria-label="Chi tiết báo cáo">
            <header className="report-modal-head">
              <div>
                <p className="typo-label text-secondary">{selectedReport.id}</p>
                <h2 className="typo-h2">{selectedReport.title}</h2>
              </div>
              <button
                type="button"
                className="report-icon-btn"
                aria-label="Đóng chi tiết báo cáo"
                onClick={() => setSelectedReport(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="report-detail-grid">
              <div>
                <span className="typo-label">Loại báo cáo</span>
                <p className="typo-body-lg">{reportTypes.find((item) => item.value === selectedReport.type)?.label || selectedReport.type}</p>
              </div>
              <div>
                <span className="typo-label">Người lập</span>
                <p className="typo-body-lg">{selectedReport.preparedBy}</p>
              </div>
              <div>
                <span className="typo-label">Ngày tạo</span>
                <p className="typo-body-lg">{selectedReport.createdDate || '--'}</p>
              </div>
              <div>
                <span className="typo-label">Trạng thái</span>
                <p className="typo-body-lg">{selectedReport.status}</p>
              </div>
              <div>
                <span className="typo-label">Fire ID</span>
                <p className="typo-body-lg">{selectedReport.fireId || '--'}</p>
              </div>
            </div>

            <p className="typo-body-md report-detail-summary">{selectedReport.summary}</p>

            <div className="report-modal-actions">
              <button type="button" className="report-secondary-btn" onClick={() => handleOpenFile(selectedReport.filePath)} disabled={!selectedReport.filePath}>
                <ArrowSquareOut size={17} />
                <span>Mở file</span>
              </button>
              <button type="button" className="report-secondary-btn" onClick={() => openEditForm(selectedReport)}>
                <NotePencil size={17} />
                <span>Chỉnh sửa</span>
              </button>
              <button type="button" className="report-danger-btn" onClick={() => handleDeleteReport(selectedReport)}>
                <Trash size={17} />
                <span>Xóa</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {isFormOpen && (
        <div className="report-modal-backdrop" role="presentation">
          <section className="report-modal" aria-label="Form báo cáo">
            <header className="report-modal-head">
              <div>
                <p className="typo-label text-secondary">Báo cáo</p>
                <h2 className="typo-h2">{editingReportId ? 'Chỉnh sửa báo cáo' : 'Tạo báo cáo'}</h2>
              </div>
              <button
                type="button"
                className="report-icon-btn"
                aria-label="Đóng form báo cáo"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </header>

            <form className="report-form" onSubmit={handleSubmitForm}>
              <label className="report-form-item" htmlFor="report-type">
                <span className="typo-body-md">Loại báo cáo</span>
                <select
                  id="report-type"
                  className="filter-select report-form-control"
                  value={formState.reportType}
                  onChange={(event) => handleFormChange('reportType', event.target.value)}
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="report-form-item" htmlFor="report-status">
                <span className="typo-body-md">Trạng thái</span>
                <select
                  id="report-status"
                  className="filter-select report-form-control"
                  value={formState.status}
                  onChange={(event) => handleFormChange('status', event.target.value)}
                >
                  {reportStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="report-form-item" htmlFor="report-creator">
                <span className="typo-body-md">Creator ID</span>
                <input
                  id="report-creator"
                  type="number"
                  min="1"
                  className="search-input report-form-control"
                  value={formState.creatorId}
                  onChange={(event) => handleFormChange('creatorId', event.target.value)}
                />
              </label>

              <label className="report-form-item" htmlFor="report-fire">
                <span className="typo-body-md">Fire ID</span>
                <input
                  id="report-fire"
                  type="number"
                  min="1"
                  className="search-input report-form-control"
                  value={formState.fireId}
                  onChange={(event) => handleFormChange('fireId', event.target.value)}
                />
              </label>

              <label className="report-form-item" htmlFor="report-created-date">
                <span className="typo-body-md">Ngày tạo</span>
                <input
                  id="report-created-date"
                  type="datetime-local"
                  className="search-input report-form-control"
                  value={formState.createdDate}
                  onChange={(event) => handleFormChange('createdDate', event.target.value)}
                />
              </label>

              <label className="report-form-item report-form-wide" htmlFor="report-file">
                <span className="typo-body-md">File path</span>
                <input
                  id="report-file"
                  className="search-input report-form-control"
                  placeholder="/reports/report-001.pdf"
                  value={formState.filePath}
                  onChange={(event) => handleFormChange('filePath', event.target.value)}
                />
              </label>

              <div className="report-form-actions">
                <button type="button" className="report-secondary-btn" onClick={closeForm}>
                  Hủy
                </button>
                <button type="submit" className="create-report-btn">
                  Lưu
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ManagerBottomNav />
    </div>
  );
}

export default ManagerReportPage;
