import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Door, MagnifyingGlass, MapPin, ShieldWarning, Stairs } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ModelLocationModal from '../../components/three/ModelLocationModal.jsx';
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

const statusFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Khả dụng' },
  { value: 'inspection', label: 'Cần kiểm tra' },
  { value: 'unavailable', label: 'Không khả dụng' }
];

function getEscapeIcon(type) {
  if (!type) return Door;
  if (type.toLowerCase().includes('thang')) return Stairs;
  if (type.toLowerCase().includes('cửa')) return Door;
  return ShieldWarning;
}

function ResidentEscapePage() {
  const [searchParams] = useSearchParams();
  const [escapes, setEscapes] = useState([]);
  const [floors, setFloors] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [modelTarget, setModelTarget] = useState(null);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const [routes, floorList] = await Promise.all([getResidentEscapeRoutes(), getEscapeFloors()]);
        if (!mounted) return;
        setEscapes(routes);
        setFloors(floorList);
      } catch (err) {
        console.error('Failed to load resident escape data', err);
        setEscapes([]);
        setFloors([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const floorEscapes = useMemo(() => {
    if (selectedFloor === 'all') return escapes;
    const selectedFloorId = floorLabelToModelFloorId(selectedFloor);
    return escapes.filter((escape) => floorLabelToModelFloorId(escape.floor) === selectedFloorId);
  }, [escapes, selectedFloor]);

  const visibleEscapes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return floorEscapes.filter((escape) => {
      const matchStatus = statusFilter === 'all' || escape.status === statusFilter;
      const matchSearch =
        keyword.length === 0 ||
        escape.id.toLowerCase().includes(keyword) ||
        escape.type.toLowerCase().includes(keyword) ||
        escape.floor.toLowerCase().includes(keyword) ||
        escape.room?.toLowerCase().includes(keyword) ||
        escape.connectedTo?.toLowerCase().includes(keyword) ||
        escape.glbNodeName?.toLowerCase().includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [floorEscapes, search, statusFilter]);

  const availableCount = floorEscapes.filter((escape) => escape.status === 'available').length;
  const warningCount = floorEscapes.filter((escape) => escape.status === 'inspection').length;

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

        <section className="resident-list-section">
          <div className="resident-section-heading">
            <h2 className="typo-h2">Danh sách lối thoát của tầng này</h2>
            <p className="typo-label text-secondary">
              {availableCount} khả dụng, {warningCount} cần kiểm tra
            </p>
          </div>

          <section className="resident-data-filter" aria-label="Bộ lọc lối thoát">
            <div className="resident-filter-search">
              <MagnifyingGlass size={20} className="resident-filter-search-icon" />
              <input
                className="resident-filter-input typo-body-md"
                placeholder="Tìm lối thoát theo mã, tầng hoặc node 3D"
                aria-label="Tìm lối thoát"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select
              className="resident-filter-select typo-body-md"
              aria-label="Lọc tầng"
              value={selectedFloor}
              onChange={(event) => {
                setSelectedFloor(event.target.value);
              }}
            >
              <option value="all">Tất cả tầng</option>
              {(floors.length > 0 ? floors : ['Tang 1']).map((floor) => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>

            <select
              className="resident-filter-select typo-body-md"
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </section>

          {isLoading ? (
            <div className="resident-panel resident-escape-state-card">
              <p className="typo-body-lg text-secondary resident-escape-state-copy">Đang tải danh sách lối thoát...</p>
            </div>
          ) : floorEscapes.length === 0 ? (
            <div className="resident-panel resident-escape-state-card">
              <p className="typo-body-lg text-secondary resident-escape-state-copy">
                {selectedFloor === 'all'
                  ? 'Hiện chưa có lối thoát được gắn dữ liệu.'
                  : 'Tầng này hiện chưa có lối thoát được gắn dữ liệu.'}
              </p>
            </div>
          ) : visibleEscapes.length === 0 ? (
            <div className="resident-panel resident-escape-state-card">
              <p className="typo-body-lg text-secondary resident-escape-state-copy">
                Không có lối thoát phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <ul className="resident-device-list">
              {visibleEscapes.map((escape) => {
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
                          {escape.status === 'inspection'
                            ? 'Cần kiểm tra trước khi sử dụng.'
                            : 'Không khả dụng vào thời điểm này.'}
                        </p>
                      </div>
                    )}

                    <div className="resident-route-footer">
                      <button
                        type="button"
                        className="typo-label text-secondary resident-route-footer-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => {
                          setSelectedFloor(modelFloorIdToFloorLabel(escape.glbFloorId || floorLabelToModelFloorId(escape.floor)) || escape.floor);
                          setModelTarget(escape);
                        }}
                      >
                        <MapPin size={14} weight="fill" /> Xem trong mô hình 3D
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
            <li className="emergency-list-item">
              Di chuyển đến lối thoát gần nhất (ưu tiên thang bộ, tuyệt đối tránh thang máy).
            </li>
            <li className="emergency-list-item">Dùng khăn ướt che mũi miệng nếu có khói.</li>
            <li className="emergency-list-item">Di chuyển sát tường, cúi thấp người nếu có khói.</li>
            <li className="emergency-list-item">Tập trung tại điểm tập kết an toàn bên ngoài tòa nhà.</li>
          </ol>
        </section>
      </section>

      <ModelLocationModal
        isOpen={Boolean(modelTarget)}
        title={modelTarget ? `Vị trí ${modelTarget.id}` : 'Vị trí lối thoát'}
        subtitle={modelTarget ? `${modelTarget.type} - ${modelTarget.floor || modelTarget.location || ''}` : ''}
        selectedFloorId={modelTarget ? (modelTarget.glbFloorId || floorLabelToModelFloorId(modelTarget.floor)) : 'all'}
        focusedNodeName={modelTarget?.glbNodeName || ''}
        highlightExits={true}
        highlightedEscape={modelTarget}
        onClose={() => setModelTarget(null)}
      />

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentEscapePage;
