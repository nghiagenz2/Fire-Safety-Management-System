import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav';
import '../../styles/ResidentEscape.css';

function getStatusClass(status) {
  if (status === 'available') return 'status-safe';
  if (status === 'inspection') return 'status-warning';
  return 'status-danger';
}

function ResidentEscapePage() {
  const [escapes, setEscapes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEscapes = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('http://localhost:5000/api/escapes');
        setEscapes(response.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch escapes for resident:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEscapes();
  }, []);

  const filteredEscapes = escapes.filter(e => e.floor === 'Tầng 3');

  return (
    <main className="resident-screen">
      <Header />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <div>
        <header className="resident-topbar">
          <div>
            <p className="typo-label text-secondary resident-overline">Cư dân - Ứng phó khẩn cấp</p>
            <h1 className="typo-h1 resident-title">Lối thoát hiểm</h1>
          </div>
          <span className="resident-floor-chip typo-label">Tầng hiện tại: 3</span>
        </header>
        
        {/* Danh sách lối thoát */}
        <section className="resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Danh sách lối thoát</h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center typo-body-lg text-secondary">Đang tải dữ liệu lối thoát hiểm...</div>
          ) : (
            <ul className="resident-device-list">
              {filteredEscapes.map((escape) => (
                <li key={escape.id} className="resident-panel resident-device-card">
                  <div className="resident-device-row">
                    <p className="typo-label text-secondary">{escape.id}</p>
                    <span className={`resident-status-badge ${getStatusClass(escape.status)}`}>
                      {escape.statusLabel}
                    </span>
                  </div>
                  <h3 className="typo-h2 resident-device-type">{escape.type}</h3>
                  <p className="typo-body-md text-secondary" style={{ margin: 0 }}>{escape.location}</p>
                  <p className="typo-label route-connect-text">Kết nối đến: {escape.connectedTo}</p>
                  
                  {escape.status !== 'available' && (
                    <div className="route-warning-box">
                      <p className="typo-body-md route-warning-text">
                        {escape.status === 'inspection' ? 'Cần kiểm tra cửa/lối đi' : 'Lối thoát bị chặn hoặc không an toàn'}
                      </p>
                    </div>
                  )}
                </li>
              ))}

              {filteredEscapes.length === 0 && (
                <div className="p-8 text-center typo-body-lg text-secondary">
                  Không tìm thấy lối thoát hiểm nào.
                </div>
              )}
            </ul>
          )}
        </section>

        {/* Khung hướng dẫn khẩn cấp */}
        <section className="resident-panel resident-emergency-panel" style={{ marginTop: '24px' }}>
          <h2 className="typo-emergency resident-emergency-title">HƯỚNG DẪN THOÁT HIỂM KHẨN CẤP</h2>
          <ol className="resident-steps typo-body-md" style={{ color: '#991b1b', marginTop: '12px' }}>
            <li className="emergency-list-item">Giữ bình tĩnh và không hoảng loạn.</li>
            <li className="emergency-list-item">Di chuyển đến lối thoát gần nhất (ưu tiên thang bộ, tuyệt đối tránh thang máy).</li>
            <li className="emergency-list-item">Dùng khăn ướt che mũi miệng nếu có khói.</li>
            <li className="emergency-list-item">Di chuyển sát tường, cúi thấp người nếu có khói.</li>
            <li className="emergency-list-item">Tập trung tại điểm tập kết an toàn bên ngoài tòa nhà.</li>
          </ol>
        </section>

      </div>

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentEscapePage;
