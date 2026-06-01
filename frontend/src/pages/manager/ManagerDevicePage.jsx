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
import { createDevice, deleteDevice, getDevices, getDeviceFloors, updateDevice } from '../../services/devicesApi.js';
import '../../styles/manager-shell.css';

const statusFilters = [
	{ value: 'all', label: 'Tất cả' },
	{ value: 'active', label: 'Hoạt động tốt' },
	{ value: 'warning', label: 'Cảnh báo' },
	{ value: 'danger', label: 'Hỏng' },
	{ value: 'maintenance', label: 'Bảo trì' }
];


function convertDDMMYYYYToYYYYMMDD(dateStr) {
	if (!dateStr || dateStr === '--') return '';
	const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (match) {
		const [, dd, mm, yyyy] = match;
		return `${yyyy}-${mm}-${dd}`;
	}
	if (dateStr.includes('-')) {
		return dateStr.split('T')[0];
	}
	return '';
}

function convertYYYYMMDDToDDMMYYYY(dateStr) {
	if (!dateStr) return '--';
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (match) {
		const [, yyyy, mm, dd] = match;
		return `${dd}/${mm}/${yyyy}`;
	}
	return dateStr;
}

function createInitialForm(floor = 'Tầng 1') {
	return {
		type: 'Bình chữa cháy',
		floor,
		location: floor,
		status: 'active',
		maintenanceDue: '',
		owner: '',
		model: '',
		lastInspection: '',
		installDate: '',
		quantity: 1,
		condition: '',
		glbNodeName: '',
		glbNodeIndex: ''
	};
}

function getDisplayLocation(device) {
	return device.floor || device.location?.split(',')[0]?.trim() || '--';
}

function ManagerDevicePage() {
	const [searchParams] = useSearchParams();
	const [devices, setDevices] = useState([]);
	const [floors, setFloors] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');
	const [floorFilter, setFloorFilter] = useState('all');
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [modelTarget, setModelTarget] = useState(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingDevice, setEditingDevice] = useState(null);
	const [deletingDevice, setDeletingDevice] = useState(null);
	const [formState, setFormState] = useState(createInitialForm());
	const [formError, setFormError] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		setSearch(searchParams.get('search') || '');
	}, [searchParams]);

	const loadData = async () => {
			try {
				setIsLoading(true);
				setLoadError('');
				const [devicesData, floorsData] = await Promise.all([
					getDevices(),
					getDeviceFloors()
				]);
				setDevices(devicesData);
				setFloors(floorsData);
			} catch (error) {
				console.error('Failed to load manager devices:', error);
				setDevices([]);
				setFloors([]);
				setLoadError('Không đọc được dữ liệu thiết bị từ BconCity.glb.');
			} finally {
				setIsLoading(false);
			}
		};

	useEffect(() => {

		loadData();
	}, []);

	const updateField = (field, value) => {
		setFormState((current) => ({
			...current,
			[field]: value,
			...(field === 'floor' ? { location: value } : null)
		}));
	};

	const openCreateForm = () => {
		setEditingDevice(null);
		setFormError('');
		setFormState(createInitialForm(floors[0] || 'Tầng 1'));
		setIsFormOpen(true);
	};

	const openEditForm = (device) => {
		setEditingDevice(device);
		setFormError('');
		setFormState({
			type: device.type || '',
			floor: device.floor || floors[0] || 'Tầng 1',
			location: device.location || device.floor || '',
			status: device.status || 'active',
			maintenanceDue: device.maintenanceDue || '',
			owner: device.owner || '',
			model: device.model || '',
			lastInspection: convertDDMMYYYYToYYYYMMDD(device.lastInspection),
			installDate: device.installDate || '',
			quantity: device.quantity || 1,
			condition: device.condition || '',
			glbNodeName: device.glbNodeName || '',
			glbNodeIndex: device.glbNodeIndex ?? ''
		});
		setIsFormOpen(true);
	};

	const handleSaveDevice = async (event) => {
		event.preventDefault();
		setFormError('');
		try {
			setIsSaving(true);
			const payload = {
				...formState,
				lastInspection: convertYYYYMMDDToDDMMYYYY(formState.lastInspection),
				quantity: Number(formState.quantity) || 1,
				glbNodeIndex: formState.glbNodeIndex === '' ? null : Number(formState.glbNodeIndex)
			};
			if (editingDevice) {
				await updateDevice(editingDevice.id, payload);
			} else {
				await createDevice(payload);
			}
			await loadData();
			setIsFormOpen(false);
			setEditingDevice(null);
		} catch (error) {
			console.error('Failed to save device:', error);
			setFormError('Không thể lưu thiết bị. Vui lòng kiểm tra dữ liệu nhập.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteDevice = async () => {
		if (!deletingDevice) return;
		try {
			setIsDeleting(true);
			await deleteDevice(deletingDevice.id);
			await loadData();
			setDeletingDevice(null);
		} catch (error) {
			console.error('Failed to delete device:', error);
		} finally {
			setIsDeleting(false);
		}
	};

	const deviceTypes = useMemo(() => {
		const types = new Set(devices.map((device) => device.type).filter(Boolean));
		return ['all', ...Array.from(types)];
	}, [devices]);

	const filteredDevices = useMemo(() => {
		const keyword = search.trim().toLowerCase();

		return devices.filter((device) => {
			const isMatchingStatus =
				statusFilter === 'all' || device.status === statusFilter;
			const isMatchingFloor =
				floorFilter === 'all' || device.floor === floorFilter;
			const isMatchingType =
				typeFilter === 'all' || device.type === typeFilter;
			const isMatchingKeyword =
				keyword.length === 0 ||
				device.id.toLowerCase().includes(keyword) ||
				device.type.toLowerCase().includes(keyword) ||
				device.location.toLowerCase().includes(keyword) ||
				device.glbNodeName?.toLowerCase().includes(keyword);

			return isMatchingStatus && isMatchingFloor && isMatchingType && isMatchingKeyword;
		});
	}, [devices, search, statusFilter, floorFilter, typeFilter]);

	return (
		<main className="manager-screen">
			<Header roleLabel="Ban quản lý" homePath="/manager/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>
			<section className="manager-device-shell">
				<header className="manager-device-head">
					<div>
						<p className="typo-label text-secondary manager-overline">Ban quản lý - Quản lý thiết bị</p>
						<h1 className="typo-h1 manager-device-title">Quản lý Thiết bị PCCC</h1>
						<p className="typo-body-lg text-secondary manager-device-subtitle">
							Quản lý toàn bộ thiết bị PCCC trên nền GIS
						</p>
					</div>

					<button type="button" className="manager-device-add-btn typo-body-lg" onClick={openCreateForm}>
						<Plus size={18} weight="bold" />
						<span>Thêm mới</span>
					</button>
				</header>

				<section className="manager-panel manager-device-filter" aria-label="Bộ lọc thiết bị">
					<div className="manager-filter-item">
						<label className="typo-body-lg" htmlFor="manager-device-search">Tìm kiếm</label>
						<div className="manager-search-wrap">
							<MagnifyingGlass size={22} className="manager-search-icon" />
							<input
								id="manager-device-search"
								className="manager-search-input typo-body-lg"
								placeholder="Mã hoặc loại thiết bị..."
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</div>

					<div className="manager-filter-item">
						<label className="typo-body-lg" htmlFor="manager-device-status">Trạng thái</label>
						<select
							id="manager-device-status"
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
						<label className="typo-body-lg" htmlFor="manager-device-type">Loại thiết bị</label>
						<select
							id="manager-device-type"
							className="manager-filter-select typo-body-lg"
							value={typeFilter}
							onChange={(event) => setTypeFilter(event.target.value)}
						>
							<option value="all">Tất cả loại</option>
							{deviceTypes.filter(type => type !== 'all').map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>

					<div className="manager-filter-item">
						<label className="typo-body-lg" htmlFor="manager-device-floor">Tầng</label>
						<select
							id="manager-device-floor"
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

				<section className="manager-panel manager-device-table-panel" aria-label="Danh sách thiết bị">
					<table className="manager-device-table">
						<thead>
							<tr>
								<th>MÃ THIẾT BỊ</th>
								<th>LOẠI</th>
								<th>VỊ TRÍ</th>
								<th>TRẠNG THÁI</th>
								<th>HẠN BẢO TRÌ</th>
								<th>NGƯỜI PHỤ TRÁCH</th>
								<th>THAO TÁC</th>
							</tr>
						</thead>

						<tbody>
							{isLoading && (
								<tr>
									<td className="manager-device-empty typo-body-lg" colSpan={7}>
										Đang đọc thiết bị từ mô hình BconCity.glb...
									</td>
								</tr>
							)}

							{!isLoading && loadError && (
								<tr>
									<td className="manager-device-empty typo-body-lg" colSpan={7}>
										{loadError}
									</td>
								</tr>
							)}

							{!isLoading && !loadError && filteredDevices.map((device) => (
								<tr key={device.id}>
									<td className="manager-device-id">{device.id}</td>
									<td>{device.type}</td>
									<td>{getDisplayLocation(device)}</td>
									<td>
										<span className={`manager-device-status status-${device.status}`}>
											{device.statusLabel}
										</span>
									</td>
									<td>{device.maintenanceDue}</td>
									<td>{device.owner}</td>
									<td>
										<div className="manager-device-actions">
											<button type="button" className="manager-action-btn edit" aria-label="Chỉnh sửa thiết bị" onClick={() => openEditForm(device)}>
												<NotePencil size={17} weight="regular" />
											</button>
											<button
												type="button"
												className="manager-action-btn location"
												aria-label="Xem vị trí thiết bị"
												onClick={() => {
													if (device.glbNodeName) {
														setModelTarget(device);
													}
												}}
											>
												<MapPin size={17} weight="regular" />
											</button>
											<button type="button" className="manager-action-btn delete" aria-label="Xóa thiết bị" onClick={() => setDeletingDevice(device)}>
												<Trash size={17} weight="regular" />
											</button>
										</div>
									</td>
								</tr>
							))}

							{!isLoading && !loadError && filteredDevices.length === 0 && (
								<tr>
									<td className="manager-device-empty typo-body-lg" colSpan={7}>
										Không tìm thấy thiết bị phù hợp bộ lọc hiện tại.
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
									{editingDevice ? `Chỉnh sửa - ${editingDevice.id}` : 'Tạo mới thiết bị'}
								</p>
								<h2 className="typo-h2 text-primary">Thông tin thiết bị PCCC</h2>
							</div>
							<button type="button" className="manager-escape-close-btn" onClick={() => setIsFormOpen(false)} aria-label="Đóng">
								<X size={20} />
							</button>
						</div>

						{formError ? <p className="manager-escape-error typo-body-md">{formError}</p> : null}

						<form onSubmit={handleSaveDevice}>
							<div className="manager-escape-form-grid">
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Loại</span>
									<input className="manager-escape-input typo-body-lg" value={formState.type} onChange={(e) => updateField('type', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Tầng</span>
									<select className="manager-escape-input typo-body-lg" value={formState.floor} onChange={(e) => updateField('floor', e.target.value)}>
										{(floors.length > 0 ? floors : ['Tầng 1']).map((floor) => <option key={floor} value={floor}>{floor}</option>)}
									</select>
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Vị trí</span>
									<input className="manager-escape-input typo-body-lg" value={formState.location} onChange={(e) => updateField('location', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Trạng thái</span>
									<select className="manager-escape-input typo-body-lg" value={formState.status} onChange={(e) => updateField('status', e.target.value)}>
										<option value="active">Hoạt động tốt</option>
										<option value="warning">Cảnh báo</option>
										<option value="danger">Hỏng</option>
										<option value="maintenance">Bảo trì</option>
									</select>
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Hạn bảo trì</span>
									<input className="manager-escape-input typo-body-lg" value={formState.maintenanceDue} onChange={(e) => updateField('maintenanceDue', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Người phụ trách</span>
									<input className="manager-escape-input typo-body-lg" value={formState.owner} onChange={(e) => updateField('owner', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Model</span>
									<input className="manager-escape-input typo-body-lg" value={formState.model} onChange={(e) => updateField('model', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Kiểm tra gần nhất</span>
									<input type="date" className="manager-escape-input typo-body-lg" value={formState.lastInspection} onChange={(e) => updateField('lastInspection', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Node 3D</span>
									<input className="manager-escape-input typo-body-lg" value={formState.glbNodeName} onChange={(e) => updateField('glbNodeName', e.target.value)} />
								</label>
								<label className="manager-escape-field">
									<span className="manager-escape-label typo-label">Chỉ số node</span>
									<input type="number" className="manager-escape-input typo-body-lg" value={formState.glbNodeIndex} onChange={(e) => updateField('glbNodeIndex', e.target.value)} />
								</label>
							</div>

							<div className="manager-escape-form-actions">
								<button type="button" className="manager-account-cancel-btn typo-body-lg" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Hủy</button>
								<button type="submit" className="manager-device-add-btn typo-body-lg" disabled={isSaving}>
									{isSaving ? 'Đang lưu...' : editingDevice ? 'Cập nhật' : 'Lưu thiết bị'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deletingDevice && (
				<div className="manager-modal-backdrop" onClick={() => setDeletingDevice(null)}>
					<div className="manager-panel manager-escape-delete-modal" onClick={(e) => e.stopPropagation()}>
						<div className="manager-escape-delete-icon">
							<WarningCircle size={24} weight="fill" />
						</div>
						<h3 className="typo-h2 manager-escape-delete-title">Xác nhận xóa thiết bị</h3>
						<p className="typo-body-md text-secondary manager-escape-delete-copy">
							Bạn có chắc muốn xóa <strong>{deletingDevice.id}</strong>? Thao tác này không thể hoàn tác.
						</p>
						<div className="manager-escape-delete-actions">
							<button type="button" className="manager-account-cancel-btn typo-body-lg" onClick={() => setDeletingDevice(null)} disabled={isDeleting}>Hủy</button>
							<button type="button" className="manager-device-add-btn manager-escape-delete-confirm typo-body-lg" onClick={handleDeleteDevice} disabled={isDeleting}>
								{isDeleting ? 'Đang xóa...' : 'Xóa thiết bị'}
							</button>
						</div>
					</div>
				</div>
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
		</main>
	);
}

export default ManagerDevicePage;
