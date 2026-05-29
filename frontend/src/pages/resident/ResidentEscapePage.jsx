import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Door, ShieldWarning, Stairs } from '@phosphor-icons/react';
import Header from '../../components/Header';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav';
import {
  floorLabelToModelFloorId,
  getEscapeFloors,
  getResidentEscapeRoutes,
  modelFloorIdToFloorLabel
} from '../../services/escapeRoutesApi.js';
import '../../styles/ResidentEscape.css';

const statusClassMap = {
  available: 'status-safe',
  inspection: 'status-warning',
  unavailable: 'status-unavailable'
};

function getEscapeIcon(type) {
  if (!type) return Door;
  if (type.toLowerCase().includes('thang')) return Stairs;
  if (type.toLowerCase().includes('cửa')) return Door;
  return ShieldWarning;
}

function ResidentEscapePage() {
  const [escapes, setEscapes] = useState([]);
  const [floors, setFloors] = useState([]);
  const [modelFloors, setModelFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('Tang 1');
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedEscape, setHighlightedEscape] = useState(null);


  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const [routes, floorList] = await Promise.all([getResidentEscapeRoutes(), getEscapeFloors()]);
        if (!mounted) return;
        setEscapes(routes);
        setFloors(floorList);
        if (floorList && floorList.length > 0) setSelectedFloor((f) => f || floorList[0]);
      } catch (err) {
        console.error('Failed to load resident escape data', err);
        setEscapes([]);
        setFloors([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const floorEscapes = useMemo(() => {
    const selectedFloorId = floorLabelToModelFloorId(selectedFloor);
    return escapes.filter((escape) => floorLabelToModelFloorId(escape.floor) === selectedFloorId);
  }, [escapes, selectedFloor]);

  const availableCount = floorEscapes.filter((escape) => escape.status === 'available').length;
  const warningCount = floorEscapes.filter((escape) => escape.status === 'inspection').length;

  const selectedModelFloorId = useMemo(() => {
    const selectedFloorId = floorLabelToModelFloorId(selectedFloor);
    const modelMatch = modelFloors.find((floor) => floorLabelToModelFloorId(floor.name || floor.id) === selectedFloorId);
    return modelMatch?.id || selectedFloorId;
  }, [modelFloors, selectedFloor]);

  return (
    <main className="resident-screen">
      <Header />
      <div className="app-header-spacer" aria-hidden="true"></div>

      <section className="resident-escape-shell">
        <header className="resident-topbar">
          <div>
            <p className="typo-label text-secondary resident-overline">Cư dân - Ứng phó khẩn cấp</p>
            <h1 className="typo-h1 resident-title">Lối thoát hiểm</h1>
            <p className="typo-body-md text-secondary" style={{ margin: 0 }}>
              Chỉ hiển thị lối thoát của tầng đang ở để tránh rối thông tin khi sử dụng hằng ngày.
            </p>
          </div>
        </header>

        <section className="resident-panel resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Chọn tầng đang ở</h2>
          </div>

          <div className="resident-floor-layout">
            <div className="resident-panel resident-floor-summary">
              <p className="typo-label text-secondary">Tầng đang xem</p>
              <p className="typo-h2 resident-floor-summary-title">{selectedFloor}</p>
              <p className="typo-body-md text-secondary resident-floor-summary-copy">
                Chọn tầng trực tiếp trong khung mô hình 3D bên dưới.
              </p>
              <p className="typo-body-md text-secondary resident-floor-summary-copy">
                {availableCount} lối thoát khả dụng, {warningCount} mục cần kiểm tra.
              </p>
            </div>
          </div>

          <div className="resident-model-wrap">
            <BuildingModelViewer
              className="resident-home-model"
              showHeader={true}
              showCaption={true}
              showFloorSelector={true}
              title="Mô hình 3D lối thoát"
              ariaLabel="Mô hình 3D lối thoát theo tầng"
              selectedFloorId={selectedModelFloorId}
              highlightedEscape={highlightedEscape}
              onSelectedFloorChange={(nextFloorId) => {
                setHighlightedEscape(null);
                if (nextFloorId === 'all') {
                  const fallbackFloor = floors[0] || selectedFloor || 'Tang 1';
                  setSelectedFloor(fallbackFloor);
                  return;
                }
                const nextFloorEntry = modelFloors.find((floor) => 
                  floorLabelToModelFloorId(floor.id) === floorLabelToModelFloorId(nextFloorId) ||
                  floorLabelToModelFloorId(floor.name) === floorLabelToModelFloorId(nextFloorId)
                );
                const nextFloor = nextFloorEntry ? (nextFloorEntry.name || nextFloorEntry.id) : modelFloorIdToFloorLabel(nextFloorId) || nextFloorId;
                if (nextFloor) {
                  setSelectedFloor(nextFloor);
                  return;
                }
              }}
              onFloorsLoaded={(modelFloorEntries) => {
                if (Array.isArray(modelFloorEntries) && modelFloorEntries.length > 0) {
                  setModelFloors(modelFloorEntries);
                  const selectedFloorId = floorLabelToModelFloorId(selectedFloor);
                  const matchingEntry = modelFloorEntries.find((floorEntry) => 
                    floorLabelToModelFloorId(floorEntry.name || floorEntry.id) === selectedFloorId
                  );
                  if (matchingEntry) {
                    setSelectedFloor(matchingEntry.name || matchingEntry.id);
                  } else {
                    setSelectedFloor(modelFloorEntries[0].name || modelFloorEntries[0].id);
                  }
                }
              }}
            />
          </div>
        </section>

        <section className="resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Danh sách lối thoát của tầng này</h2>
          </div>

          {isLoading ? (
            <div className="resident-panel resident-escape-state-card">
              <p className="typo-body-lg text-secondary resident-escape-state-copy">Đang tải danh sách lối thoát...</p>
            </div>
          ) : floorEscapes.length === 0 ? (
            <div className="resident-panel resident-escape-state-card">
              <p className="typo-body-lg text-secondary resident-escape-state-copy">Tầng này hiện chưa có lối thoát được gắn dữ liệu.</p>
            </div>
          ) : (
            <ul className="resident-device-list">
              {floorEscapes.map((escape) => {
                const EscapeIcon = getEscapeIcon(escape.type);

                return (
                  <li key={escape.id} className="resident-panel resident-device-card">
                    <div className="resident-device-row">
                      <p className="typo-label text-secondary">{escape.id}</p>
                      <span className={`resident-status-badge ${statusClassMap[escape.status] || 'status-safe'}`}>
                        {escape.statusLabel}
                      </span>
                    </div>

                    <div className="resident-route-head">
                      <div className={`stat-icon-wrapper ${escape.status === 'available' ? 'green' : 'blue'} resident-route-icon`}>
                        <EscapeIcon size={22} weight="fill" />
                      </div>
                      <div>
                        <h3 className="typo-h2 resident-device-type resident-route-title">{escape.type}</h3>
                        <p className="typo-body-md text-secondary resident-route-floor">{escape.floor}</p>
                      </div>
                    </div>

                    <p className="typo-label route-connect-text">Kết nối đến: {escape.connectedTo}</p>

                    <div className="resident-route-metrics">
                      <div className="resident-panel resident-route-metric">
                        <p className="typo-label text-secondary resident-route-metric-label">Rộng</p>
                        <p className="typo-body-lg resident-route-metric-value">{escape.width || '--'}</p>
                      </div>
                      <div className="resident-panel resident-route-metric">
                        <p className="typo-label text-secondary resident-route-metric-label">Cao thông thủy</p>
                        <p className="typo-body-lg resident-route-metric-value">{escape.clearHeight || '--'}</p>
                      </div>
                      <div className="resident-panel resident-route-metric">
                        <p className="typo-label text-secondary resident-route-metric-label">Node 3D</p>
                        <p className="typo-body-lg resident-route-metric-value">{escape.glbNodeName || 'Chưa gắn'}</p>
                      </div>
                    </div>

                    {escape.status !== 'available' && (
                      <div className="route-warning-box">
                        <p className="typo-body-md route-warning-text">
                          {escape.status === 'inspection' ? 'Cần kiểm tra trước khi sử dụng.' : 'Không khả dụng vào thời điểm này.'}
                        </p>
                      </div>
                    )}

                    <div className="resident-route-footer">
                      <button
                        type="button"
                        className="typo-label text-secondary resident-route-footer-link"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const targetFloorId = escape.glbFloorId || floorLabelToModelFloorId(escape.floor);
                          const nextFloorEntry = modelFloors.find((f) => 
                            floorLabelToModelFloorId(f.id) === targetFloorId ||
                            floorLabelToModelFloorId(f.name) === targetFloorId
                          );
                          const nextFloorName = nextFloorEntry ? (nextFloorEntry.name || nextFloorEntry.id) : modelFloorIdToFloorLabel(targetFloorId) || targetFloorId;
                          
                          setSelectedFloor(nextFloorName);
                          setHighlightedEscape(escape);
                          
                          // Scroll to 3D model view smoothly so the resident can see it
                          const viewerElement = document.querySelector('.resident-home-model');
                          if (viewerElement) {
                            viewerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        Xem trong mô hình 3D <ArrowRight size={14} weight="bold" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="resident-panel resident-emergency-panel resident-escape-emergency-panel">
          <h2 className="typo-emergency resident-emergency-title">HƯỚNG DẪN THOÁT HIỂM KHẨN CẤP</h2>
          <ol className="resident-steps typo-body-md">
            <li className="emergency-list-item">Giữ bình tĩnh và không hoảng loạn.</li>
            <li className="emergency-list-item">Di chuyển đến lối thoát gần nhất (ưu tiên thang bộ, tuyệt đối tránh thang máy).</li>
            <li className="emergency-list-item">Dùng khăn ướt che mũi miệng nếu có khói.</li>
            <li className="emergency-list-item">Di chuyển sát tường, cúi thấp người nếu có khói.</li>
            <li className="emergency-list-item">Tập trung tại điểm tập kết an toàn bên ngoài tòa nhà.</li>
          </ol>
        </section>
      </section>

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentEscapePage;