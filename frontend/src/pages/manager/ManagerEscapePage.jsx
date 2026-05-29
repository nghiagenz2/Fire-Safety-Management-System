import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, MapPin, NotePencil, Plus, Trash } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import {
  createEscapeRoute,
  deleteEscapeRoute,
  floorLabelToModelFloorId,
  getEscapeFloors,
  getEscapeRoutes,
  updateEscapeRoute
} from '../../services/escapeRoutesApi.js';
import '../../styles/manager-shell.css';

const statusFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Khả dụng' },
  { value: 'inspection', label: 'Cần kiểm tra' },
  { value: 'unavailable', label: 'Không khả dụng' }
];

function createInitialForm(floor = 'Tầng 1') {
  return {
    type: 'Cửa thoát hiểm',
    floor,
    location: floor,
    room: 'Lối ra chính',
    connectedTo: 'Lối ra chính',
    status: 'available',
    width: '1.2 m',
    clearHeight: '2.1 m',
    lastInspection: '',
    owner: '',
    glbNodeName: '',
    glbNodeIndex: ''
  };
}

function ManagerEscapePage() {
  const [escapes, setEscapes] = useState([]);
  const [floors, setFloors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeModelFloorId, setActiveModelFloorId] = useState('floor_1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEscapeId, setEditingEscapeId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState(createInitialForm());
  const [highlightedEscape, setHighlightedEscape] = useState(null);


  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [escapesData, floorsData] = await Promise.all([getEscapeRoutes(), getEscapeFloors()]);
        setEscapes(escapesData);
        setFloors(floorsData);
        if (floorsData.length > 0) {
          setFormState((current) => ({
            ...current,
            floor: current.floor || floorsData[0],
            location: current.location || floorsData[0]
          }));
        }
      } catch (error) {
        console.error('Failed to load manager escapes:', error);
        setEscapes([]);
        setFloors([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const visibleEscapes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return escapes.filter((escape) => {
      const isMatchingStatus = statusFilter === 'all' || escape.status === statusFilter;
      const isMatchingFloor = floorFilter === 'all' || escape.floor === floorFilter;
      const isMatchingKeyword =
        keyword.length === 0 ||
        escape.id.toLowerCase().includes(keyword) ||
        escape.type.toLowerCase().includes(keyword) ||
        escape.room.toLowerCase().includes(keyword) ||
        escape.connectedTo.toLowerCase().includes(keyword) ||
        escape.glbNodeName?.toLowerCase().includes(keyword);

      return isMatchingStatus && isMatchingFloor && isMatchingKeyword;
    });
  }, [escapes, search, statusFilter, floorFilter]);

  const sortedFloors = useMemo(
    () => floors.slice().sort((left, right) => left.localeCompare(right, 'vi')),
    [floors]
  );

  const selectedFloorLabel = useMemo(() => {
    if (floorFilter !== 'all') {
      return floorFilter;
    }

    return visibleEscapes[0]?.floor || floors[0] || 'Tầng 1';
  }, [floorFilter, visibleEscapes, floors]);

  const selectedModelFloorId = activeModelFloorId;

  function handleFloorFilterChange(nextFloorLabel) {
    setFloorFilter(nextFloorLabel);
    setHighlightedEscape(null);
    if (nextFloorLabel === 'all') {
      setActiveModelFloorId('all');
    } else {
      setActiveModelFloorId(floorLabelToModelFloorId(nextFloorLabel));
    }
  }

  function handleModelFloorChange(nextFloorId) {
    setActiveModelFloorId(nextFloorId);
    setHighlightedEscape(null);
    if (nextFloorId === 'all') {
      setFloorFilter('all');
    } else {
      // Find matching floor label from floors list
      const matchedFloor = floors.find((floorLabel) => floorLabelToModelFloorId(floorLabel) === floorLabelToModelFloorId(nextFloorId));
      if (matchedFloor) {
        setFloorFilter(matchedFloor);
      }
    }
  }

  function openCreateForm() {
    const defaultFloor = floors[0] || 'Tầng 1';
    setEditingEscapeId('');
    setFormError('');
    setFormState(createInitialForm(defaultFloor));
    setIsFormOpen(true);
  }

  function openEditForm(escape) {
    setEditingEscapeId(escape.id);
    setFormError('');
    setFormState({
      type: escape.type || '',
      floor: escape.floor || escape.location || 'Tầng 1',
      location: escape.location || escape.floor || 'Tầng 1',
      room: escape.room || '',
      connectedTo: escape.connectedTo || '',
      status: escape.status || 'available',
      width: escape.width || '',
      clearHeight: escape.clearHeight || '',
      lastInspection: escape.lastInspection || '',
      owner: escape.owner || '',
      glbNodeName: escape.glbNodeName || '',
      glbNodeIndex: escape.glbNodeIndex ?? ''
    });
    setActiveModelFloorId(escape.glbFloorId || floorLabelToModelFloorId(escape.floor || escape.location));
    setIsFormOpen(true);
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
      ...(field === 'floor' ? { location: value } : null)
    }));
  }

  async function handleSaveEscape(event) {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');

    const payload = {
      ...formState,
      glbNodeIndex: formState.glbNodeIndex === '' ? null : Number(formState.glbNodeIndex),
      floor: formState.floor,
      location: formState.location || formState.floor
    };

    try {
      if (editingEscapeId) {
        await updateEscapeRoute(editingEscapeId, payload);
      } else {
        await createEscapeRoute(payload);
      }

      const [escapesData, floorsData] = await Promise.all([getEscapeRoutes(), getEscapeFloors()]);
      setEscapes(escapesData);
      setFloors(floorsData);
      setIsFormOpen(false);
      setEditingEscapeId('');
      setFormState(createInitialForm(floorsData[0] || 'Tầng 1'));
    } catch (error) {
      console.error('Failed to save escape route:', error);
      setFormError('Không lưu được lối thoát. Vui lòng kiểm tra lại dữ liệu nhập.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEscape(escapeId) {
    const confirmed = window.confirm('Xóa lối thoát này khỏi danh sách?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteEscapeRoute(escapeId);
      const [escapesData, floorsData] = await Promise.all([getEscapeRoutes(), getEscapeFloors()]);
      setEscapes(escapesData);
      setFloors(floorsData);
    } catch (error) {
      console.error('Failed to delete escape route:', error);
    }
  }

  return (
    <main className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <section className="manager-device-shell">
        <header className="manager-device-head">
          <div>
            <p className="typo-label text-secondary manager-overline">Ban quản lý - Quản lý lối thoát</p>
            <h1 className="typo-h1 manager-device-title">Quản lý Lối thoát hiểm</h1>
            <p className="typo-body-lg text-secondary manager-device-subtitle">
              Cập nhật lối thoát, thông số kích thước và gắn đúng từng tầng trong mô hình 3D.
            </p>
          </div>

          <button type="button" className="manager-device-add-btn typo-body-lg" onClick={openCreateForm}>
            <Plus size={18} weight="bold" />
            <span>Thêm tuyến thoát</span>
          </button>
        </header>

        <BuildingModelViewer
          className="manager-escape-model"
          showCaption={false}
          selectedFloorId={selectedModelFloorId}
          highlightedEscape={highlightedEscape}
          onSelectedFloorChange={handleModelFloorChange}
          ariaLabel="Mô hình 3D lối thoát"
          title="Mô hình 3D lối thoát"
        />

        <section className="manager-panel manager-device-filter" aria-label="Bộ lọc lối thoát">
          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-escape-search">Tìm kiếm</label>
            <div className="manager-search-wrap">
              <MagnifyingGlass size={22} className="manager-search-icon" />
              <input
                id="manager-escape-search"
                className="manager-search-input typo-body-lg"
                placeholder="Mã lối thoát, tầng, node 3D..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-escape-status">Trạng thái</label>
            <select
              id="manager-escape-status"
              className="manager-filter-select typo-body-lg"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-escape-floor">Tầng</label>
            <select
              id="manager-escape-floor"
              className="manager-filter-select typo-body-lg"
              value={floorFilter}
              onChange={(event) => handleFloorFilterChange(event.target.value)}
            >
              <option value="all">Tất cả tầng</option>
              {sortedFloors.map((floor) => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>
          </div>
        </section>

        {isFormOpen && (
          <div className="manager-modal-backdrop" role="dialog" aria-modal="true" aria-label="Biểu mẫu lối thoát">
            <div className="manager-panel manager-escape-modal">
              <form onSubmit={handleSaveEscape}>
                <div className="manager-escape-modal-head">
                  <div>
                    <p className="typo-label text-secondary" style={{ margin: '0 0 4px' }}>
                      {editingEscapeId ? `Chỉnh sửa — ${editingEscapeId}` : 'Thêm lối thoát mới'}
                    </p>
                    <h2 className="typo-h2" style={{ margin: 0 }}>Thông tin lối thoát</h2>
                  </div>
                  <button type="button" className="manager-escape-close-btn" aria-label="Đóng" onClick={() => setIsFormOpen(false)}>✕</button>
                </div>

                <div className="manager-escape-form-grid">
                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Loại</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      required
                      value={formState.type}
                      onChange={(e) => updateField('type', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Tầng</span>
                    <select
                      className="manager-escape-input typo-body-lg"
                      value={formState.floor}
                      onChange={(e) => updateField('floor', e.target.value)}
                    >
                      {sortedFloors.length > 0
                        ? sortedFloors.map((floor) => <option key={floor} value={floor}>{floor}</option>)
                        : <option value="Tầng 1">Tầng 1</option>}
                    </select>
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Phòng / Khu vực</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      value={formState.room}
                      onChange={(e) => updateField('room', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Kết nối đến</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      value={formState.connectedTo}
                      onChange={(e) => updateField('connectedTo', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Trạng thái</span>
                    <select
                      className="manager-escape-input typo-body-lg"
                      value={formState.status}
                      onChange={(e) => updateField('status', e.target.value)}
                    >
                      <option value="available">Khả dụng</option>
                      <option value="inspection">Cần kiểm tra</option>
                      <option value="unavailable">Không khả dụng</option>
                    </select>
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Chiều rộng</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      placeholder="vd: 1.2 m"
                      value={formState.width}
                      onChange={(e) => updateField('width', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Cao thông thủy</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      placeholder="vd: 2.1 m"
                      value={formState.clearHeight}
                      onChange={(e) => updateField('clearHeight', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Người phụ trách</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      value={formState.owner}
                      onChange={(e) => updateField('owner', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Kiểm tra gần nhất</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      type="date"
                      value={formState.lastInspection}
                      onChange={(e) => updateField('lastInspection', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Node 3D</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      placeholder="Tên node trong GLB"
                      value={formState.glbNodeName}
                      onChange={(e) => updateField('glbNodeName', e.target.value)}
                    />
                  </label>

                  <label className="manager-escape-field">
                    <span className="manager-escape-label typo-label">Chỉ số node</span>
                    <input
                      className="manager-escape-input typo-body-lg"
                      type="number"
                      placeholder="Số thứ tự node"
                      value={formState.glbNodeIndex}
                      onChange={(e) => updateField('glbNodeIndex', e.target.value)}
                    />
                  </label>
                </div>

                {formError && (
                  <p className="typo-body-md manager-escape-error">{formError}</p>
                )}

                <div className="manager-escape-form-actions">
                  <button type="button" className="manager-account-cancel-btn typo-body-lg" onClick={() => setIsFormOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="manager-device-add-btn typo-body-lg" disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : editingEscapeId ? 'Cập nhật' : 'Thêm lối thoát'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        <section className="manager-panel manager-device-table-panel" aria-label="Danh sách lối thoát">
          <table className="manager-device-table">
            <thead>
              <tr>
                <th>MÃ LỐI THOÁT</th>
                <th>LOẠI</th>
                <th>TẦNG</th>
                <th>TRẠNG THÁI</th>
                <th>RỘNG</th>
                <th>CAO TT</th>
                <th>KẾT NỐI ĐẾN</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td className="manager-device-empty typo-body-lg" colSpan={8}>
                    Đang tải danh sách lối thoát...
                  </td>
                </tr>
              )}

              {!isLoading && visibleEscapes.map((escape) => (
                <tr key={escape.id}>
                  <td className="manager-device-id">{escape.id}</td>
                  <td>{escape.type}</td>
                  <td>{escape.location}</td>
                  <td>
                    <span className={`manager-device-status status-${escape.status}`}>
                      {escape.statusLabel}
                    </span>
                  </td>
                  <td>{escape.width || '--'}</td>
                  <td>{escape.clearHeight || '--'}</td>
                  <td>{escape.connectedTo}</td>
                  <td>
                    <div className="manager-device-actions">
                      <button type="button" className="manager-action-btn edit" aria-label="Chỉnh sửa lối thoát" onClick={() => openEditForm(escape)}>
                        <NotePencil size={17} weight="regular" />
                      </button>
                      <button
                        type="button"
                        className="manager-action-btn location"
                        aria-label="Xem vị trí lối thoát"
                        onClick={() => {
                          const targetFloorId = escape.glbFloorId || floorLabelToModelFloorId(escape.floor || escape.location);
                          setActiveModelFloorId(targetFloorId);
                          setHighlightedEscape(escape);

                          // Scroll to 3D model view smoothly so the manager can see it
                          const viewerElement = document.querySelector('.manager-escape-model');
                          if (viewerElement) {
                            viewerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <MapPin size={17} weight="regular" />
                      </button>
                      <button type="button" className="manager-action-btn delete" aria-label="Xóa lối thoát" onClick={() => handleDeleteEscape(escape.id)}>
                        <Trash size={17} weight="regular" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && visibleEscapes.length === 0 && (
                <tr>
                  <td className="manager-device-empty typo-body-lg" colSpan={8}>
                    Không tìm thấy lối thoát phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>
      <ManagerBottomNav />
    </main>
  );
}

export default ManagerEscapePage;