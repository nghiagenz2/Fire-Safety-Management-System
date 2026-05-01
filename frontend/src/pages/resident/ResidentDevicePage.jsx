import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav.jsx';
import { fetchResidentDevices } from '../../services/mockResidentDevicesApi.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'safe', label: 'Hoạt động' },
  { value: 'warning', label: 'Bảo trì' },
  { value: 'danger', label: 'Lỗi/Hỏng' }
];

function ResidentDevicePage() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchResidentDevices()
      .then((data) => {
        if (isMounted) {
          setDevices(data);
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
      const matchStatus = statusFilter === 'all' || device.status === statusFilter;
      const keyword = search.trim().toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        device.id.toLowerCase().includes(keyword) ||
        device.type.toLowerCase().includes(keyword) ||
        device.location.toLowerCase().includes(keyword) ||
        device.floor.toLowerCase().includes(keyword) ||
        device.room.toLowerCase().includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [devices, search, statusFilter]);

  function handleStatusFilterChange(nextFilter) {
    setStatusFilter(nextFilter);
    if (nextFilter === 'all') {
      setSearch('');
    }
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
        <span className="resident-floor-chip typo-label">Tầng hiện tại: 3</span>
      </header>
      <section className="resident-search-wrap">
        <input
          className="resident-search-input typo-body-md"
          placeholder="Tìm thiết bị theo mã, tầng hoặc khu vực"
          aria-label="Tìm thiết bị"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <section className="resident-filter-row" aria-label="Lọc trạng thái thiết bị">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`resident-filter-pill typo-label ${statusFilter === filter.value ? 'is-active' : ''}`}
            onClick={() => handleStatusFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="resident-panel resident-emergency-panel" aria-live="polite">
        <p className="typo-emergency resident-emergency-title">Cảnh báo: phát hiện cháy tại tầng 3</p>
        <p className="typo-body-md resident-emergency-copy">Ưu tiên xem lối thoát hiểm an toàn trước, sau đó xem hướng dẫn thao tác tại hiện trường.</p>
        <div className="resident-cta-row">
          <Link to="/resident/escape" className="resident-cta-alert typo-label">
            Xem lối thoát an toàn
          </Link>
          <Link to="/resident/guidance" className="resident-cta-alert resident-cta-secondary typo-label">
            Xem hướng dẫn thoát hiểm
          </Link>
        </div>
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
                <p className="typo-body-md text-secondary">{device.floor}, {device.room} - {device.location}</p>
                <p className="typo-label text-secondary">Lối thoát gần nhất: {device.nearestExit} | Cách bạn: {device.distanceToResident}m</p>
                <p className="typo-label text-secondary">Hạn bảo trì: {device.maintenanceDue}</p>

                <button
                  type="button"
                  className="resident-primary-btn typo-body-md"
                  onClick={() => setSelectedDevice(device)}
                >
                  Xem cách dùng
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
            <p className="typo-label text-secondary">Model: {selectedDevice.model}</p>
            <p className="typo-label text-secondary">Vị trí: {selectedDevice.location}</p>
            <p className="typo-label text-secondary">Tầng/Phòng: {selectedDevice.floor}, {selectedDevice.room}</p>
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

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentDevicePage;
