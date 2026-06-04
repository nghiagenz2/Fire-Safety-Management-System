import { WarningDiamond, Clock, MapPin, Users, Flame } from '@phosphor-icons/react';
import './ManagerIncidentCard.css';

const getSeverityClass = (severity) => {
  const severityMap = {
    'Nguy cơ cao': 'severity-high',
    'Trung bình': 'severity-medium',
    'Thấp': 'severity-low'
  };
  return severityMap[severity] || 'severity-unknown';
};

const getStatusClass = (status) => {
  const statusMap = {
    'Đang xử lý': 'status-active',
    'Dập tắt': 'status-resolved',
    'Xác nhận sai': 'status-false-alarm'
  };
  return statusMap[status] || 'status-unknown';
};

function ManagerIncidentCard({ incident, onClick }) {
  return (
    <div className="incident-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="incident-card-header">
        <div className="incident-title-section">
          <WarningDiamond size={20} weight="fill" className={getSeverityClass(incident.severity)} />
          <div className="incident-titles">
            <h3 className="typo-h2 incident-title">{incident.title}</h3>
            <p className="typo-body-md incident-id">ID: {incident.displayId || incident.id}</p>
          </div>
        </div>
        <span className={`incident-status typo-label ${getStatusClass(incident.status)}`}>
          {incident.status}
        </span>
      </div>

      <div className="incident-meta">
        <div className="meta-item">
          <MapPin size={16} />
          <span className="typo-body-md">{incident.location}</span>
        </div>
        <div className="meta-item">
          <Clock size={16} />
          <span className="typo-body-md">{incident.startTime}</span>
        </div>
        <div className="meta-item">
          <Users size={16} />
          <span className="typo-body-md">{incident.assignee || "Đội trực ca PCCC"}</span>
        </div>
      </div>

      <p className="typo-body-md incident-description">{incident.description}</p>

      <div className="incident-affected-areas">
        {incident.affectedArea.map((area) => (
          <span key={area} className="area-badge typo-label">
            {area}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ManagerIncidentCard;
