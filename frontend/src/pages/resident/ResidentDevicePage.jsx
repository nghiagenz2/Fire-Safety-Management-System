import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, MapPin } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav.jsx';
import ModelLocationModal from '../../components/three/ModelLocationModal.jsx';
import { getDeviceFloors, getResidentDevices } from '../../services/devicesApi.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'safe', label: 'Hoạt động' },
  { value: 'warning', label: 'Bảo trì' },
  { value: 'danger', label: 'Lỗi/Hỏng' }
];

function ResidentDevicePage() {
  const [searchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [floors, setFloors] = useState([]);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [modelTarget, setModelTarget] = useState(null);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getResidentDevices(), getDeviceFloors()])
      .then(([data, floorList]) => {
        if (isMounted) {
          setDevices(data);
          setFloors(floorList);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchFloor = floorFilter === 'all' || device.floor === floorFilter;
      const matchStatus = statusFilter === 'all' || device.status === statusFilter;
      const keyword = search.trim().toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        device.id.toLowerCase().includes(keyword) ||
        device.type.toLowerCase().includes(keyword) ||
        device.location.toLowerCase().includes(keyword) ||
        device.floor.toLowerCase().includes(keyword) ||
        device.room.toLowerCase().includes(keyword);

      return matchFloor && matchStatus && matchSearch;
    });
  }, [devices, floorFilter, search, statusFilter]);

  function handleStatusFilterChange(nextFilter) {
    setStatusFilter(nextFilter);
  }

  return (
    <main className="resident-screen">
      <Header />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <header className="resident-topbar">
        <div>
          <p className="typo-label text-secondary resident-overline">Cư dân - Tra cứu nhanh</p>
          <h1 className="typo-h1 resident-title">Thiết bị PCCC</h1>
          <p className="typo-label text-secondary resident-read-only-note">Chế độ cư dân: chỉ xem thông tin thiết bị.</p>
        </div>
        <span className="resident-floor-chip typo-label">Tầng hiện tại: {floorFilter === 'all' ? 'Tất cả' : floorFilter}</span>
      </header>
      <section className="resident-data-filter" aria-label="Bộ lọc thiết bị">
        <div className="resident-filter-search">
          <MagnifyingGlass size={20} className="resident-filter-search-icon" />
          <input
            className="resident-filter-input typo-body-md"
            placeholder="Tìm thiết bị theo mã, tầng hoặc khu vực"
            aria-label="Tìm thiết bị"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="resident-filter-select typo-body-md"
          aria-label="Lọc tầng"
          value={floorFilter}
          onChange={(event) => setFloorFilter(event.target.value)}
        >
          <option value="all">Tất cả tầng</option>
          {floors.map((floor) => (
            <option key={floor} value={floor}>{floor}</option>
          ))}
        </select>

        <select
          className="resident-filter-select typo-body-md"
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(event) => handleStatusFilterChange(event.target.value)}
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
      </section>

      <section className="resident-list-section">
        <div className="resident-section-heading">
          <h2 className="typo-h2">Danh sách thiết bị gần bạn</h2>
          <p className="typo-label text-secondary">
            {filteredDevices.length}/{devices.length} thiết bị
          </p>
        </div>

        {isLoading && (
          <ul className="resident-device-list" aria-label="Đang tải danh sách thiết bị">
            <li className="resident-panel resident-device-card resident-skeleton" />
            <li className="resident-panel resident-device-card resident-skeleton" />
          </ul>
        )}

        {!isLoading && filteredDevices.length > 0 && (
          <ul className="resident-device-list">
            {filteredDevices.map((device) => (
              <li key={device.id} className="resident-panel resident-device-card">
                <div className="resident-device-row">
                  <p className="typo-label text-secondary">{device.id}</p>
                  <span className={`resident-status-badge status-${device.status}`}>{device.statusLabel}</span>
                </div>

                <h3 className="typo-h2 resident-device-type">{device.type}</h3>
                <p className="typo-body-md text-secondary">{device.floor}, {device.room}{device.location && device.location !== device.floor ? ` - ${device.location}` : ''}</p>
                <p className="typo-label text-secondary">Lối thoát gần nhất: {device.nearestExit} | Cách bạn: {device.distanceToResident}m</p>
                <p className="typo-label text-secondary">Hạn bảo trì: {device.maintenanceDue}</p>

                <button
                  type="button"
                  className="resident-primary-btn typo-body-md"
                  onClick={() => setSelectedDevice(device)}
                >
                  Xem cách dùng
                </button>
                <button
                  type="button"
                  className="resident-secondary-btn typo-body-md"
                  onClick={() => setModelTarget(device)}
                  disabled={!device.glbNodeName}
                >
                  <MapPin size={16} weight="fill" /> Xem vị trí trên mô hình 3D
                </button>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && filteredDevices.length === 0 && (
          <article className="resident-panel resident-empty-state" aria-live="polite">
            <p className="typo-h2">Chưa có thiết bị phù hợp</p>
            <p className="typo-body-md text-secondary">
              Thử đổi từ khóa tìm kiếm hoặc chọn trạng thái khác để xem danh sách thiết bị.
            </p>
          </article>
        )}
      </section>

      {selectedDevice && (
        <section className="resident-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Thông tin thiết bị">
          <article className="resident-sheet resident-panel">
            <header className="resident-sheet-header">
              <h2 className="typo-h2">{selectedDevice.type}</h2>
              <button type="button" className="resident-close-btn typo-label" onClick={() => setSelectedDevice(null)}>
                Đóng
              </button>
            </header>

            <p className="typo-label text-secondary">Mã: {selectedDevice.id}</p>
            <p className="typo-label text-secondary">Vị trí: {selectedDevice.location}</p>
            <p className="typo-label text-secondary">Phòng: {selectedDevice.room}</p>
            <p className="typo-label text-secondary">Trạng thái: {selectedDevice.statusLabel}</p>
            <p className="typo-label text-secondary">Lần kiểm tra gần nhất: {selectedDevice.lastInspection}</p>
            <p className="typo-label text-secondary">Phạm vi sử dụng: {selectedDevice.usageScope}</p>
            <p className="typo-label text-secondary">Lưu ý an toàn: {selectedDevice.caution}</p>

            <ol className="resident-steps typo-body-md">
              {selectedDevice.instructionSteps.map((step, index) => (
                <li key={`${selectedDevice.id}-step-${index}`}>{step}</li>
              ))}
            </ol>
          </article>
        </section>
      )}

      <ModelLocationModal
        isOpen={Boolean(modelTarget)}
        title={modelTarget ? `Vị trí ${modelTarget.id}` : 'Vị trí thiết bị'}
        subtitle={modelTarget ? `${modelTarget.type} - ${modelTarget.floor || modelTarget.location || ''}` : ''}
        selectedFloorId={modelTarget ? (modelTarget.glbFloorId || modelTarget.floor || 'all') : 'all'}
        focusedNodeName={modelTarget?.glbNodeName || ''}
        highlightExits={true}
        focusedNodeHighlightColor="#f97316"
        onClose={() => setModelTarget(null)}
      />

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentDevicePage;
