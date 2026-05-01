import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav';
import '../../styles/ResidentEscape.css';

function ResidentEscapePage() {
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
        </header>
        {/* Khối Sơ đồ lối thoát (Placeholder) */}
        <section className="resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Sơ đồ lối thoát</h2>
          </div>
          <div 
            className="resident-panel" 
            style={{ 
              minHeight: '300px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderStyle: 'dashed',
              backgroundColor: '#f8fafc'
            }}
          >
            <p className="typo-h2 text-secondary">Mô hình 3D hiện tại chưa có</p>
          </div>
        </section>

        {/* Danh sách lối thoát */}
        <section className="resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Danh sách lối thoát</h2>
          </div>
          
          <ul className="resident-device-list">
            <li className="resident-panel resident-device-card">
              <div className="resident-device-row">
                <p className="typo-label text-secondary">EXIT-F1-MAIN</p>
                <span className="resident-status-badge status-safe">Khả dụng</span>
              </div>
              <h3 className="typo-h2 resident-device-type">Cửa thoát hiểm</h3>
              <p className="typo-body-md text-secondary" style={{ margin: 0 }}>Tầng 1</p>
              <p className="typo-label route-connect-text">Kết nối đến: Lối ra chính</p>
            </li>

            <li className="resident-panel resident-device-card">
              <div className="resident-device-row">
                <p className="typo-label text-secondary">STAIRS-F1-F2</p>
                <span className="resident-status-badge status-safe">Khả dụng</span>
              </div>
              <h3 className="typo-h2 resident-device-type">Thang bộ</h3>
              <p className="typo-body-md text-secondary" style={{ margin: 0 }}>Tầng 1</p>
              <p className="typo-label route-connect-text">Kết nối đến: Tầng 2</p>
            </li>

            <li className="resident-panel resident-device-card">
              <div className="resident-device-row">
                <p className="typo-label text-secondary">EMERG-F2-001</p>
                <span className="resident-status-badge status-safe">Khả dụng</span>
              </div>
              <h3 className="typo-h2 resident-device-type">Thang thoát hiểm</h3>
              <p className="typo-body-md text-secondary" style={{ margin: 0 }}>Tầng 2</p>
              <p className="typo-label route-connect-text">Kết nối đến: Thang thoát hiểm ngoài</p>
            </li>

            <li className="resident-panel resident-device-card">
              <div className="resident-device-row">
                <p className="typo-label text-secondary">EXIT-F3-SIDE</p>
                <span className="resident-status-badge status-warning">Cần kiểm tra</span>
              </div>
              <h3 className="typo-h2 resident-device-type">Cửa thoát hiểm</h3>
              <p className="typo-body-md text-secondary" style={{ margin: 0 }}>Tầng 3</p>
              <p className="typo-label route-connect-text">Kết nối đến: Lối ra phụ</p>
              <div className="route-warning-box">
                <p className="typo-body-md route-warning-text">Cần kiểm tra khóa cửa</p>
              </div>
            </li>
          </ul>
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
