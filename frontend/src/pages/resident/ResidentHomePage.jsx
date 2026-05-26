import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import { Cube, DoorOpen, CheckCircle } from '@phosphor-icons/react';
import '../../styles/ResidentHome.css';

function ResidentHomePage() {
  return (
    <main className="resident-screen resident-home-screen">
      <Header />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <div>
        <header className="resident-topbar">
          <div>
            <p className="typo-label text-secondary resident-overline">Cư dân - Trung tâm vận hành</p>
            <h1 className="typo-h1 resident-title">Trang chủ 3D</h1>
          </div>
        </header>

        <BuildingModelViewer
          className="resident-home-model"
          showHeader={false}
          showCaption={false}
          ariaLabel="Khu vực mô hình 3D"
        />

        <section className="resident-stats-grid">
          <div className="resident-panel stat-card-item bg-light-safe">
            <div className="stat-icon-wrapper green">
              <Cube size={24} weight="fill" />
            </div>
            <div>
              <p className="typo-h1 status-safe stat-card-value">38</p>
              <p className="typo-body-md text-secondary stat-card-label">Thiết bị hoạt động tốt</p>
            </div>
          </div>

          <div className="resident-panel stat-card-item bg-light-brand">
            <div className="stat-icon-wrapper blue">
              <DoorOpen size={24} weight="fill" />
            </div>
            <div>
              <p className="typo-h1 status-brand stat-card-value">12</p>
              <p className="typo-body-md text-secondary stat-card-label">Lối thoát khả dụng</p>
            </div>
          </div>

          <div className="resident-panel stat-card-item bg-light-safe">
            <div className="stat-icon-wrapper green">
              <CheckCircle size={24} weight="fill" />
            </div>
            <div>
              <p className="typo-h1 status-safe stat-card-value small">An toàn</p>
              <p className="typo-body-md text-secondary stat-card-label">Trạng thái tòa nhà</p>
            </div>
          </div>
        </section>
      </div>

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentHomePage;
