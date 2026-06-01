import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import { Cube, DoorOpen, CheckCircle, Warning } from '@phosphor-icons/react';
import '../../styles/ResidentHome.css';
import { getDeviceStatistics } from '../../services/devicesApi.js';
import { useSimulationStatus } from '../../hooks/useSimulationStatus.js';

function ResidentHomePage() {
  const [deviceTotal, setDeviceTotal] = useState('--');
  const [exitTotal, setExitTotal] = useState('--');
  const [selectedFloorId, setSelectedFloorId] = useState('all');
  const { isSimulationActive, simulationFloor } = useSimulationStatus();

  useEffect(() => {
    let isMounted = true;

    getDeviceStatistics()
      .then((stats) => {
        if (isMounted) {
          setDeviceTotal(stats.total);
          setExitTotal(stats.availableExits);
        }
      })
      .catch((error) => {
        console.error('Failed to load device statistics:', error);
        if (isMounted) {
          setDeviceTotal('--');
          setExitTotal('--');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getFloorDisplayName = (floorId) => {
    if (floorId === 'all') return 'Tất cả';
    if (floorId === 'floor_tret') return 'Trệt';
    return floorId.replace('floor_', '').replace('Tang ', '').trim();
  };

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
          <span className="resident-floor-chip typo-label">Tầng hiện tại: {getFloorDisplayName(selectedFloorId)}</span>
        </header>

        <BuildingModelViewer
          className="resident-home-model"
          showHeader={false}
          showCaption={false}
          ariaLabel="Khu vực mô hình 3D"
          highlightExits={true}
          selectedFloorId={selectedFloorId}
          onFloorChange={setSelectedFloorId}
        />

        <section className="resident-stats-grid">
          <div className="resident-panel stat-card-item bg-light-safe">
            <div className="stat-icon-wrapper green">
              <Cube size={24} weight="fill" />
            </div>
            <div>
              <p className="typo-h1 status-safe stat-card-value">{deviceTotal}</p>
              <p className="typo-body-md text-secondary stat-card-label">Tổng thiết bị</p>
            </div>
          </div>

          <div className="resident-panel stat-card-item bg-light-brand">
            <div className="stat-icon-wrapper blue">
              <DoorOpen size={24} weight="fill" />
            </div>
            <div>
              <p className="typo-h1 status-brand stat-card-value">{exitTotal}</p>
              <p className="typo-body-md text-secondary stat-card-label">Lối thoát khả dụng</p>
            </div>
          </div>

          {/* Thẻ trạng thái tòa nhà — đổi khi có mô phỏng cháy */}
          <div
            className={`resident-panel stat-card-item ${isSimulationActive ? 'bg-light-danger' : 'bg-light-safe'}`}
            style={isSimulationActive ? { borderLeft: '4px solid #ef4444', animation: 'pulse-danger 1.5s infinite' } : {}}
          >
            <div className={`stat-icon-wrapper ${isSimulationActive ? 'red' : 'green'}`}>
              {isSimulationActive
                ? <Warning size={24} weight="fill" color="#ef4444" />
                : <CheckCircle size={24} weight="fill" />
              }
            </div>
            <div>
              <p className={`typo-h1 stat-card-value small ${isSimulationActive ? 'status-danger' : 'status-safe'}`}>
                {isSimulationActive ? '⚠ Đang cháy' : 'An toàn'}
              </p>
              <p className="typo-body-md text-secondary stat-card-label">
                {isSimulationActive ? `Mô phỏng cháy · ${simulationFloor}` : 'Trạng thái tòa nhà'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentHomePage;
