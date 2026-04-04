import { ClipboardText, CheckCircle, Clock, XCircle } from '@phosphor-icons/react';
import './ManagerReportCard.css';

const getStatusClass = (status) => {
  const statusMap = {
    'Hoàn thành': 'status-completed',
    'Chờ phê duyệt': 'status-pending',
    'Đã từ chối': 'status-rejected'
  };
  return statusMap[status] || 'status-unknown';
};

const getStatusIcon = (status) => {
  const iconMap = {
    'Hoàn thành': <CheckCircle size={16} />,
    'Chờ phê duyệt': <Clock size={16} />,
    'Đã từ chối': <XCircle size={16} />
  };
  return iconMap[status] || null;
};

function ManagerReportCard({ report, onClick }) {
  return (
    <div className="report-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="report-card-header">
        <div className="report-title-section">
          <ClipboardText size={20} className="report-icon" />
          <div className="report-titles">
            <h3 className="typo-h2 report-title">{report.title}</h3>
            <p className="typo-body-md report-id">ID: {report.id}</p>
          </div>
        </div>
        <div className={`report-status typo-label ${getStatusClass(report.status)}`}>
          {getStatusIcon(report.status)}
          <span>{report.status}</span>
        </div>
      </div>

      <div className="report-info">
        <div className="info-item">
          <span className="typo-label info-label">Thời kỳ:</span>
          <span className="typo-body-md info-value">{report.period}</span>
        </div>
        <div className="info-item">
          <span className="typo-label info-label">Người lập:</span>
          <span className="typo-body-md info-value">{report.preparedBy}</span>
        </div>
      </div>

      <p className="typo-body-md report-summary">{report.summary}</p>

      {report.approvalsNeeded > 0 && (
        <div className="report-approvals">
          <span className="typo-label">Chờ {report.approvalsNeeded} phê duyệt</span>
        </div>
      )}

      <div className="report-footer">
        <span className="typo-label report-date">Tạo: {report.createdDate}</span>
      </div>
    </div>
  );
}

export default ManagerReportCard;
