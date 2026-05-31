import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import {
	MagnifyingGlass,
	MapPin,
	NotePencil,
	Plus,
	Trash
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import '../../styles/manager-shell.css';
import '../../styles/ResidentEscape.css';

const statusFilters = [
	{ value: 'all', label: 'Tất cả' },
	{ value: 'available', label: 'Khả dụng' },
	{ value: 'inspection', label: 'Cần kiểm tra' },
	{ value: 'unavailable', label: 'Không khả dụng' }
];

function modelFloorIdToLabel(floorId) {
  if (!floorId || floorId === 'all') return 'all';
  if (floorId === 'floor_tret') return 'Tầng trệt';
  const match = floorId.match(/^floor_(\d+)$/);
  if (match) {
    return `Tầng ${match[1]}`;
  }
  return floorId;
}

function labelToModelFloorId(label) {
  if (!label || label === 'all') return 'all';
  if (label === 'Tầng trệt') return 'floor_tret';
  const match = label.match(/^Tầng (\d+)$/);
  if (match) {
    return `floor_${match[1]}`;
  }
  return label;
}

function ManagerEscapePage() {
	const [escapes, setEscapes] = useState([]);
	const [floors, setFloors] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [floorFilter, setFloorFilter] = useState('all');
	const [isLoading, setIsLoading] = useState(true);
	const [focusedNode, setFocusedNode] = useState(null);
	const [editingEscape, setEditingEscape] = useState(null);
	const [newStatus, setNewStatus] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	const handleSaveStatus = async (e) => {
		e.preventDefault();
		if (!editingEscape) return;

		try {
			setIsSaving(true);
			const response = await axios.put(`http://localhost:5000/api/escapes/${editingEscape.id}`, {
				status: newStatus
			});
			if (response.data && response.data.success) {
				const updatedEscape = response.data.data;
				setEscapes(prev => prev.map(esc => esc.id === editingEscape.id ? { ...esc, ...updatedEscape } : esc));
				setEditingEscape(null);
			} else {
				alert('Không thể lưu thay đổi trạng thái.');
			}
		} catch (error) {
			console.error('Failed to update escape status:', error);
			alert('Đã xảy ra lỗi khi cập nhật trạng thái.');
		} finally {
			setIsSaving(false);
		}
	};

	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				const [escapesRes, floorsRes] = await Promise.all([
					axios.get('http://localhost:5000/api/escapes'),
					axios.get('http://localhost:5000/api/escapes/floors')
				]);
				setEscapes(escapesRes.data?.data || []);
				setFloors(floorsRes.data?.data || []);
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

	const filteredEscapes = useMemo(() => {
		const keyword = search.trim().toLowerCase();

		return escapes.filter((escape) => {
			const isMatchingStatus =
				statusFilter === 'all' || escape.status === statusFilter;
			const isMatchingFloor =
				floorFilter === 'all' || escape.floor === floorFilter;
			const isMatchingKeyword =
				keyword.length === 0 ||
				escape.id.toLowerCase().includes(keyword) ||
				escape.type.toLowerCase().includes(keyword) ||
				escape.room.toLowerCase().includes(keyword);

			return isMatchingStatus && isMatchingFloor && isMatchingKeyword;
		});
	}, [escapes, search, statusFilter, floorFilter]);

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
							Quản lý và kiểm tra tính liên thông của mạng lưới thoát hiểm
						</p>
					</div>

					<button type="button" className="manager-device-add-btn typo-body-lg">
						<Plus size={18} weight="bold" />
						<span>Thêm tuyến thoát</span>
					</button>
				</header>

				<BuildingModelViewer
					className="manager-escape-model"
					showHeader={false}
					showCaption={false}
					ariaLabel="Mô hình 3D lối thoát hiểm"
					highlightExits={true}
					selectedFloorId={labelToModelFloorId(floorFilter)}
					onFloorChange={(floorId) => setFloorFilter(modelFloorIdToLabel(floorId))}
					focusedNodeName={focusedNode}
				/>

				<section className="manager-panel manager-device-filter" aria-label="Bộ lọc lối thoát">
					<div className="manager-filter-item">
						<label className="typo-body-lg" htmlFor="manager-escape-search">Tìm kiếm</label>
						<div className="manager-search-wrap">
							<MagnifyingGlass size={22} className="manager-search-icon" />
							<input
								id="manager-escape-search"
								className="manager-search-input typo-body-lg"
								placeholder="Mã lối thoát hoặc loại..."
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
								<option key={filter.value} value={filter.value}>
									{filter.label}
								</option>
							))}
						</select>
					</div>

					<div className="manager-filter-item">
						<label className="typo-body-lg" htmlFor="manager-escape-floor">Tầng</label>
						<select
							id="manager-escape-floor"
							className="manager-filter-select typo-body-lg"
							value={floorFilter}
							onChange={(event) => setFloorFilter(event.target.value)}
						>
							<option value="all">Tất cả tầng</option>
							{floors.map((floor) => (
								<option key={floor} value={floor}>
									{floor}
								</option>
							))}
						</select>
					</div>
				</section>

				<section className="manager-panel manager-device-table-panel" aria-label="Danh sách lối thoát">
					<table className="manager-device-table">
						<thead>
							<tr>
								<th>MÃ LỐI THOÁT</th>
								<th>LOẠI</th>
								<th>TẦNG</th>
								<th>TRẠNG THÁI</th>
								<th>KẾT NỐI ĐẾN</th>
								<th>THAO TÁC</th>
							</tr>
						</thead>

						<tbody>
							{filteredEscapes.map((escape) => (
								<tr key={escape.id}>
									<td className="manager-device-id">{escape.id}</td>
									<td>{escape.type}</td>
									<td>{escape.location}</td>
									<td>
										<span className={`manager-device-status status-${escape.status}`}>
											{escape.statusLabel}
										</span>
									</td>
									<td>{escape.connectedTo}</td>
									<td>
										<div className="manager-device-actions">
											<button
												type="button"
												className="manager-action-btn edit"
												aria-label="Chỉnh sửa lối thoát"
												onClick={() => {
													setEditingEscape(escape);
													setNewStatus(escape.status);
												}}
											>
												<NotePencil size={17} weight="regular" />
											</button>
											<button
												type="button"
												className="manager-action-btn location"
												aria-label="Xem vị trí lối thoát"
												onClick={() => {
													if (escape.glbNodeName) {
														setFocusedNode({ name: escape.glbNodeName, timestamp: Date.now() });
														const modelElement = document.querySelector('.manager-escape-model');
														if (modelElement) {
															modelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
														}
													}
												}}
											>
												<MapPin size={17} weight="regular" />
											</button>
											<button type="button" className="manager-action-btn delete" aria-label="Xóa lối thoát">
												<Trash size={17} weight="regular" />
											</button>
										</div>
									</td>
								</tr>
							))}

							{filteredEscapes.length === 0 && (
								<tr>
									<td className="manager-device-empty typo-body-lg" colSpan={6}>
										Không tìm thấy lối thoát phù hợp bộ lọc hiện tại.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</section>
			</section>
			<ManagerBottomNav />

			{editingEscape && (
				<div className="manager-modal-backdrop" onClick={() => setEditingEscape(null)}>
					<div className="manager-panel manager-account-modal" onClick={(e) => e.stopPropagation()}>
						<div className="manager-account-modal-head">
							<h2 className="typo-h2 text-primary" style={{ margin: 0 }}>Cập nhật trạng thái</h2>
							<p className="typo-body-lg text-secondary" style={{ margin: '6px 0 0 0' }}>
								Thay đổi trạng thái hoạt động của lối thoát hiểm <strong>{editingEscape.id}</strong>
							</p>
						</div>

						<form className="manager-account-form" onSubmit={handleSaveStatus}>
							<div className="manager-account-form-item">
								<span className="typo-body-lg">Mã lối thoát hiểm</span>
								<input
									type="text"
									className="manager-form-input typo-body-lg"
									value={editingEscape.id}
									disabled
								/>
							</div>

							<div className="manager-account-form-item">
								<span className="typo-body-lg">Trạng thái</span>
								<select
									className="manager-form-input typo-body-lg"
									value={newStatus}
									onChange={(e) => setNewStatus(e.target.value)}
								>
									<option value="available">Khả dụng</option>
									<option value="inspection">Cần kiểm tra</option>
									<option value="unavailable">Không khả dụng</option>
								</select>
							</div>

							<div className="manager-account-form-actions">
								<button
									type="button"
									className="manager-account-cancel-btn typo-body-lg"
									onClick={() => setEditingEscape(null)}
									disabled={isSaving}
								>
									Hủy
								</button>
								<button
									type="submit"
									className="manager-device-add-btn typo-body-lg"
									disabled={isSaving}
								>
									{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	);
}

export default ManagerEscapePage;
