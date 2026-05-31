import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	MagnifyingGlass,
	MapPin,
	NotePencil,
	Plus,
	Trash,
	X,
	WarningCircle
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import ModelLocationModal from '../../components/three/ModelLocationModal.jsx';
import {
	createEscapeRoute,
	deleteEscapeRoute,
	getEscapeFloors,
	getEscapeRoutes,
	updateEscapeRoute
} from '../../services/escapeRoutesApi.js';
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

function toStatusLabel(status) {
	if (status === 'available') return 'Khả dụng';
	if (status === 'inspection') return 'Cần kiểm tra';
	if (status === 'unavailable') return 'Không khả dụng';
	return 'Chưa xác định';
}

function createInitialForm(floor = 'Tầng 1') {
	return {
		type: 'Cửa thoát hiểm',
		floor,
		room: `Hành lang thoát hiểm ${floor}`,
		connectedTo: '',
		status: 'available',
		width: '1.2 m',
		clearHeight: '2.1 m',
		owner: '',
		lastInspection: '',
		glbNodeName: '',
		glbNodeIndex: ''
	};
}

function ManagerEscapePage() {
	const [searchParams] = useSearchParams();
	const [escapes, setEscapes] = useState([]);
	const [floors, setFloors] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [floorFilter, setFloorFilter] = useState('all');
	const [isLoading, setIsLoading] = useState(true);
	const [modelTarget, setModelTarget] = useState(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEscape, setEditingEscape] = useState(null);
	const [formState, setFormState] = useState(createInitialForm());
	const [isSaving, setIsSaving] = useState(false);
	const [deletingEscape, setDeletingEscape] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [formError, setFormError] = useState('');

	const loadData = async () => {
		try {
			setIsLoading(true);
			const [escapesData, floorsData] = await Promise.all([
				getEscapeRoutes(),
				getEscapeFloors()
			]);
			setEscapes(escapesData);
			setFloors(floorsData);
		} catch (error) {
			console.error('Failed to load manager escapes:', error);
			setEscapes([]);
			setFloors([]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveEscape = async (e) => {
		e.preventDefault();
		setFormError('');

		try {
			setIsSaving(true);
			const payload = {
				...formState,
				location: formState.floor,
				statusLabel: toStatusLabel(formState.status),
				glbNodeIndex: formState.glbNodeIndex === '' ? null : Number(formState.glbNodeIndex)
			};

			if (editingEscape) {
				await updateEscapeRoute(editingEscape.id, payload);
			} else {
				await createEscapeRoute(payload);
			}

			await loadData();
			setIsFormOpen(false);
			setEditingEscape(null);
			setFormState(createInitialForm(floors[0] || 'Tầng 1'));
		} catch (error) {
			console.error('Failed to save escape:', error);
			setFormError('Không thể lưu lối thoát. Vui lòng kiểm tra lại dữ liệu.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteEscape = async () => {
		if (!deletingEscape) return;

		try {
			setIsDeleting(true);
			await deleteEscapeRoute(deletingEscape.id);
			await loadData();
			setDeletingEscape(null);
		} catch (error) {
			console.error('Failed to delete escape:', error);
		} finally {
			setIsDeleting(false);
		}
	};

	const openCreateModal = () => {
		setFormError('');
		setEditingEscape(null);
		setFormState(createInitialForm(floors[0] || 'Tầng 1'));
		setIsFormOpen(true);
	};

	const openEditModal = (escape) => {
		setFormError('');
		setEditingEscape(escape);
		setFormState({
			type: escape.type || '',
			floor: escape.floor || escape.location || floors[0] || 'Tầng 1',
			room: escape.room || '',
			connectedTo: escape.connectedTo || '',
			status: escape.status || 'available',
			width: escape.width || '',
			clearHeight: escape.clearHeight || '',
			owner: escape.owner || '',
			lastInspection: escape.lastInspection || '',
			glbNodeName: escape.glbNodeName || '',
			glbNodeIndex: escape.glbNodeIndex ?? ''
		});
		setIsFormOpen(true);
	};

	const updateField = (field, value) => {
		setFormState((current) => ({
			...current,
			[field]: value
		}));
	};

	useEffect(() => {
		setSearch(searchParams.get('search') || '');
	}, [searchParams]);

	useEffect(() => {
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

					<button type="button" className="manager-device-add-btn typo-body-lg" onClick={openCreateModal}>
						<Plus size={18} weight="bold" />
						<span>Thêm tuyến thoát</span>
					</button>
				</header>

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
												openEditModal(escape);
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
														setModelTarget(escape);
													}
												}}
											>
												<MapPin size={17} weight="regular" />
											</button>
											<button
												type="button"
												className="manager-action-btn delete"
												aria-label="Xóa lối thoát"
												onClick={() => setDeletingEscape(escape)}
											>
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

			{isFormOpen && (
				<div className="manager-modal-backdrop" onClick={() => setIsFormOpen(false)}>
					<div className="manager-panel manager-escape-modal" onClick={(e) => e.stopPropagation()}>
						<div className="manager-escape-modal-head">
							<div>
								<p className="typo-label text-secondary manager-escape-modal-overline">
									{editingEscape ? `Chỉnh sửa - ${editingEscape.id}` : 'Tạo mới lối thoát'}
								</p>
								<h2 className="typo-h2 text-primary">Thông tin lối thoát</h2>
							</div>
							<button
								type="button"
								className="manager-escape-close-btn"
								onClick={() => setIsFormOpen(false)}
								aria-label="Đóng"
							>
								<X size={20} />
							</button>
						</div>

						{formError ? (
							<p className="manager-escape-error typo-body-md">{formError}</p>
						) : null}

						<form onSubmit={handleSaveEscape}>
							<div className="manager-escape-form-grid">
							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Loại</span>
								<input
									type="text"
									className="manager-escape-input typo-body-lg"
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
									{(floors.length > 0 ? floors : ['Tầng 1']).map((floor) => (
										<option key={floor} value={floor}>{floor}</option>
									))}
								</select>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Phòng / Khu vực</span>
								<input
									type="text"
									className="manager-escape-input typo-body-lg"
									value={formState.room}
									onChange={(e) => updateField('room', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Kết nối đến</span>
								<input
									type="text"
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
									type="text"
									className="manager-escape-input typo-body-lg"
									value={formState.width}
									onChange={(e) => updateField('width', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Cao thông thủy</span>
								<input
									type="text"
									className="manager-escape-input typo-body-lg"
									value={formState.clearHeight}
									onChange={(e) => updateField('clearHeight', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Người phụ trách</span>
								<input
									type="text"
									className="manager-escape-input typo-body-lg"
									value={formState.owner}
									onChange={(e) => updateField('owner', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Kiểm tra gần nhất</span>
								<input
									type="date"
									className="manager-escape-input typo-body-lg"
									value={formState.lastInspection}
									onChange={(e) => updateField('lastInspection', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Node 3D</span>
								<input
									type="text"
									className="manager-escape-input typo-body-lg"
									value={formState.glbNodeName}
									onChange={(e) => updateField('glbNodeName', e.target.value)}
								/>
							</label>

							<label className="manager-escape-field">
								<span className="manager-escape-label typo-label">Chỉ số node</span>
								<input
									type="number"
									className="manager-escape-input typo-body-lg"
									value={formState.glbNodeIndex}
									onChange={(e) => updateField('glbNodeIndex', e.target.value)}
								/>
							</label>
							</div>

							<div className="manager-escape-form-actions">
								<button
									type="button"
									className="manager-account-cancel-btn typo-body-lg"
									onClick={() => setIsFormOpen(false)}
									disabled={isSaving}
								>
									Hủy
								</button>
								<button
									type="submit"
									className="manager-device-add-btn typo-body-lg"
									disabled={isSaving}
								>
									{isSaving ? 'Đang lưu...' : editingEscape ? 'Cập nhật' : 'Lưu lối thoát'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deletingEscape && (
				<div className="manager-modal-backdrop" onClick={() => setDeletingEscape(null)}>
					<div className="manager-panel manager-escape-delete-modal" onClick={(e) => e.stopPropagation()}>
						<div className="manager-escape-delete-icon">
							<WarningCircle size={24} weight="fill" />
						</div>
						<h3 className="typo-h2 manager-escape-delete-title">Xác nhận xóa lối thoát</h3>
						<p className="typo-body-md text-secondary manager-escape-delete-copy">
							Bạn có chắc muốn xóa <strong>{deletingEscape.id}</strong>? Thao tác này không thể hoàn tác.
							</p>
						<div className="manager-escape-delete-actions">
							<button
								type="button"
								className="manager-account-cancel-btn typo-body-lg"
								onClick={() => setDeletingEscape(null)}
								disabled={isDeleting}
							>
								Hủy
							</button>
							<button
								type="button"
								className="manager-device-add-btn manager-escape-delete-confirm typo-body-lg"
								onClick={handleDeleteEscape}
								disabled={isDeleting}
							>
								{isDeleting ? 'Đang xóa...' : 'Xóa lối thoát'}
							</button>
						</div>
					</div>
				</div>
			)}

			<ModelLocationModal
				isOpen={Boolean(modelTarget)}
				title={modelTarget ? `Vị trí ${modelTarget.id}` : 'Vị trí lối thoát'}
				subtitle={modelTarget ? `${modelTarget.type} - ${modelTarget.floor || modelTarget.location || ''}` : ''}
				selectedFloorId={modelTarget ? labelToModelFloorId(modelTarget.floor || modelTarget.location) : 'all'}
				focusedNodeName={modelTarget?.glbNodeName || ''}
				highlightExits={true}
				highlightedEscape={modelTarget}
				onClose={() => setModelTarget(null)}
			/>
		</main>
	);
}

export default ManagerEscapePage;
