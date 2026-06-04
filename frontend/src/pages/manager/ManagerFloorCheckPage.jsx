import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	Buildings,
	CheckCircle,
	ClipboardText,
	CubeFocus,
	Door,
	Fire,
	MagnifyingGlass,
	MapPin,
	Shield,
	ShieldWarning,
	Sliders,
	UserPlus,
	Warning,
	WarningDiamond,
	FireExtinguisher,
	X,
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import ModelLocationModal from '../../components/three/ModelLocationModal.jsx';
import {
	getFloorList,
	getFloorById,
	getDeviceTypes,
	generateFloorReport,
	getBuildingInfo,
	updateDeviceStatus,
} from '../../services/managerFloorsApi';
import { createTask, fetchFireStaffTaskList, fetchFireStaffUsers } from '../../services/mockFireStaffTasksApi';
import '../../styles/manager-shell.css';
import '../../styles/manager-floor-check.css';

// ─── Badge helpers ────────────────────────────────────────────────────────────

const SAFETY_ICON = {
	safe: <Shield size={16} weight="fill" />,
	warning: <ShieldWarning size={16} weight="fill" />,
	danger: <WarningDiamond size={16} weight="fill" />,
};

const DEVICE_STATUS_FILTERS = [
	{ value: 'all', label: 'Tất cả' },
	{ value: 'active', label: 'Hoạt động tốt' },
	{ value: 'warning', label: 'Cảnh báo' },
	{ value: 'danger', label: 'Hỏng' },
	{ value: 'maintenance', label: 'Bảo trì' },
	{ value: 'inspection', label: 'Cần kiểm tra' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SafetyScoreRing({ score, level }) {
	const radius = 28;
	const circ = 2 * Math.PI * radius;
	const filled = (score / 100) * circ;

	const colorMap = { safe: '#22c55e', warning: '#f59e0b', danger: '#ef4444' };
	const color = colorMap[level] || '#9ca3af';

	return (
		<div className="floor-score-ring-wrap" aria-label={`Điểm an toàn: ${score}/100`}>
			<svg width="72" height="72" viewBox="0 0 72 72" className="floor-score-ring-svg">
				<circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
				<circle
					cx="36"
					cy="36"
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={`${filled} ${circ - filled}`}
					strokeDashoffset={circ / 4}
					style={{ transition: 'stroke-dasharray 0.6s ease' }}
				/>
			</svg>
			<span className="floor-score-ring-value" style={{ color }}>
				{score}
			</span>
		</div>
	);
}

function StatCard({ icon, value, label, colorClass }) {
	return (
		<div className={`floor-stat-card ${colorClass}`}>
			<span className="floor-stat-icon">{icon}</span>
			<span className="floor-stat-value typo-h2">{value}</span>
			<span className="floor-stat-label typo-label">{label}</span>
		</div>
	);
}

const DEVICE_STATUS_OPTIONS = [
	{ value: 'active', label: 'Hoạt động tốt' },
	{ value: 'warning', label: 'Cảnh báo' },
	{ value: 'maintenance', label: 'Bảo trì' },
	{ value: 'danger', label: 'Hỏng' },
];

function DeviceDetailModal({ device, onClose, onView3d, onUpdated }) {
	const [editStatus, setEditStatus] = useState(device?.status || 'active');
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [saveErr, setSaveErr] = useState('');

	if (!device) return null;

	const handleUpdate = async () => {
		if (editStatus === device.status) {
			setSaveMsg('Trạng thái không thay đổi.');
			setTimeout(() => setSaveMsg(''), 2000);
			return;
		}
		setSaving(true);
		setSaveErr('');
		setSaveMsg('');
		try {
			const updated = await updateDeviceStatus(device.id, editStatus);
			setSaveMsg('Cập nhật thành công!');
			if (onUpdated) onUpdated(updated);
			setTimeout(() => {
				setSaveMsg('');
				onClose();
			}, 1200);
		} catch (err) {
			setSaveErr(err.message || 'Lỗi cập nhật.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="manager-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Chi tiết thiết bị"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="manager-panel floor-device-modal">
				<div className="floor-device-modal-head">
					<div>
						<p className="typo-label text-secondary floor-device-modal-id">{device.id}</p>
						<h2 className="typo-h2 floor-device-modal-title">{device.type}</h2>
					</div>
					<button
						type="button"
						className="floor-modal-close-btn"
						onClick={onClose}
						aria-label="Đóng"
					>
						<X size={20} />
					</button>
				</div>

				<div className="floor-device-modal-body">
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Model</span>
						<span className="floor-device-modal-val typo-body-md">{device.model || '—'}</span>
					</div>
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Phòng</span>
						<span className="floor-device-modal-val typo-body-md">{device.room || '—'}</span>
					</div>
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Vị trí</span>
						<span className="floor-device-modal-val typo-body-md">{device.location || '—'}</span>
					</div>

					{/* Trạng thái có thể chỉnh sửa */}
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Trạng thái</span>
						<select
							id="device-status-select"
							className="manager-filter-select typo-body-md"
							style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', minWidth: '150px', fontSize: '13px' }}
							value={editStatus}
							onChange={(e) => setEditStatus(e.target.value)}
						>
							{DEVICE_STATUS_OPTIONS.map(opt => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>

					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">
							Kiểm tra lần cuối
						</span>
						<span className="floor-device-modal-val typo-body-md">
							{device.lastInspection || '—'}
						</span>
					</div>
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Hạn bảo trì</span>
						<span className="floor-device-modal-val typo-body-md">
							{device.maintenanceDue || '—'}
						</span>
					</div>
					<div className="floor-device-modal-row floor-device-modal-row--full">
						<span className="floor-device-modal-key typo-label text-secondary">Tình trạng</span>
						<span className="floor-device-modal-val typo-body-md">
							{device.condition || '—'}
						</span>
					</div>

					{/* Feedback messages */}
					{saveMsg && (
						<div className="floor-device-modal-row floor-device-modal-row--full">
							<span style={{ color: '#065f46', backgroundColor: '#d1fae5', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', width: '100%', display: 'block' }}>
								{saveMsg}
							</span>
						</div>
					)}
					{saveErr && (
						<div className="floor-device-modal-row floor-device-modal-row--full">
							<span style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', width: '100%', display: 'block' }}>
								{saveErr}
							</span>
						</div>
					)}
				</div>

				<div className="floor-device-modal-footer">
					<button type="button" className="floor-modal-action-btn floor-modal-action-btn--secondary typo-body-md" onClick={onClose} disabled={saving}>
						Đóng
					</button>
					<button
						type="button"
						className="floor-modal-action-btn floor-modal-action-btn--secondary typo-body-md"
						onClick={handleUpdate}
						disabled={saving || editStatus === device.status}
						style={{ backgroundColor: editStatus !== device.status ? '#f0fdf4' : undefined, borderColor: editStatus !== device.status ? '#16a34a' : undefined, color: editStatus !== device.status ? '#15803d' : undefined }}
					>
						{saving ? 'Đang lưu...' : 'Cập nhật'}
					</button>
					<button type="button" className="floor-modal-action-btn floor-modal-action-btn--primary typo-body-md" onClick={onView3d}>
						<MapPin size={16} />
						Xem trên 3D
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ManagerFloorCheckPage() {
	const navigate = useNavigate();
	const [floorList, setFloorList] = useState([]);
	const [buildingInfo, setBuildingInfo] = useState(null);
	const [selectedFloorId, setSelectedFloorId] = useState(null);
	const [floorDetail, setFloorDetail] = useState(null);
	const [deviceTypes, setDeviceTypes] = useState([]);

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');

	const [selectedDevice, setSelectedDevice] = useState(null);
	const [modelTarget, setModelTarget] = useState(null);
	const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'exits' | 'hazards'

	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

	const [isLoadingList, setIsLoadingList] = useState(true);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [exportSuccess, setExportSuccess] = useState(false);

	// ── Load floor list & building info ──
	useEffect(() => {
		const load = async () => {
			try {
				setIsLoadingList(true);
				const [list, info, types] = await Promise.all([
					getFloorList(),
					getBuildingInfo(),
					getDeviceTypes(),
				]);
				setFloorList(list);
				setBuildingInfo(info);
				setDeviceTypes(types);
				if (list && list.length > 0 && window.innerWidth > 1024) {
					setSelectedFloorId(list[0].id);
				}
			} catch (err) {
				console.error('Failed to load floors:', err);
			} finally {
				setIsLoadingList(false);
			}
		};
		load();
	}, []);

	// ── Load floor detail when selection changes ──
	useEffect(() => {
		if (!selectedFloorId) return;
		const load = async () => {
			try {
				setIsLoadingDetail(true);
				setFloorDetail(null);
				setSearch('');
				setStatusFilter('all');
				setTypeFilter('all');
				setActiveTab('devices');
				const detail = await getFloorById(selectedFloorId);
				setFloorDetail(detail);
			} catch (err) {
				console.error('Failed to load floor detail:', err);
			} finally {
				setIsLoadingDetail(false);
			}
		};
		load();
	}, [selectedFloorId]);

	// ── Back to floor list (clears selection) ──
	const handleBackToList = () => {
		setSelectedFloorId(null);
		setFloorDetail(null);
	};

	// ── Filtered devices ──
	const filteredDevices = useMemo(() => {
		if (!floorDetail?.devices) return [];
		const keyword = search.trim().toLowerCase();
		return floorDetail.devices.filter((d) => {
			if (statusFilter !== 'all' && d.status !== statusFilter) return false;
			if (typeFilter !== 'all' && !d.type.toLowerCase().includes(typeFilter.toLowerCase()))
				return false;
			if (
				keyword &&
				!d.id.toLowerCase().includes(keyword) &&
				!d.type.toLowerCase().includes(keyword) &&
				!d.room?.toLowerCase().includes(keyword) &&
				!d.location?.toLowerCase().includes(keyword)
			)
				return false;
			return true;
		});
	}, [floorDetail, search, statusFilter, typeFilter]);

	// ── Export report ──
	const handleExport = async () => {
		if (!selectedFloorId || isExporting) return;
		try {
			setIsExporting(true);
			const report = await generateFloorReport(selectedFloorId);
			const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `BaoCao_${floorDetail?.name?.replace(/\s/g, '_') || selectedFloorId}_${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			setExportSuccess(true);
			setTimeout(() => setExportSuccess(false), 2500);
		} catch (err) {
			console.error('Export failed:', err);
		} finally {
			setIsExporting(false);
		}
	};

	const summary = floorDetail?.summary;
	const handleViewDevice3d = (device) => {
		setModelTarget(device);
		setSelectedDevice(null);
	};

	const handleDeviceUpdated = async (updatedDevice) => {
		// Cập nhật dữ liệu thiết bị cục bộ lập tức để giao diện mượt mà
		setFloorDetail((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				devices: prev.devices.map((d) =>
					d.id === updatedDevice.id ? { ...d, ...updatedDevice } : d
				),
			};
		});

		// Gọi API tải lại thông tin tầng và danh sách tầng để đồng bộ điểm số và thẻ thống kê
		try {
			const detail = await getFloorById(selectedFloorId);
			setFloorDetail(detail);

			const list = await getFloorList();
			setFloorList(list);
		} catch (err) {
			console.error('Failed to refresh floor detail after update:', err);
		}
	};

	return (
		<main className="manager-screen">
			<Header roleLabel="Ban quản lý" homePath="/manager/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>
			<section className="floor-check-shell manager-device-shell">
				{/* ── Page header ── */}
				<header className="manager-device-head">
					<div className="floor-page-title-group">
						{floorDetail && (
							<button
								type="button"
								className="floor-back-btn typo-body-md"
								onClick={handleBackToList}
								aria-label="Quay lại danh sách tầng"
							>
								<ArrowLeft size={16} weight="bold" />
								<span>Danh sách tầng</span>
							</button>
						)}
						<p className="typo-label text-secondary manager-overline">
							Ban quản lý - Kiểm tra tầng
						</p>
						<h1 className="typo-h1 manager-device-title">
							Kiểm tra trạng thái an toàn theo tầng
						</h1>
						<p className="typo-body-lg text-secondary manager-device-subtitle floor-subtitle-ellipsis">
							{buildingInfo?.name
								? `${buildingInfo.name} — ${buildingInfo.address}`
								: 'Bcon City — Đường Thống Nhất, Dĩ An, Bình Dương'}
						</p>
					</div>

					<div className="floor-check-header-actions">
						<button
							id="btn-export-floor-report"
							type="button"
							className={`floor-export-btn typo-body-md ${exportSuccess ? 'floor-export-btn--success' : ''}`}
							onClick={handleExport}
							disabled={!floorDetail || isExporting}
							aria-live="polite"
						>
							{exportSuccess ? (
								<><CheckCircle size={17} weight="fill" /><span>Đã xuất!</span></>
							) : isExporting ? (
								<><span className="floor-export-spinner" /><span>Đang xuất...</span></>
							) : (
								<><ClipboardText size={17} /><span>Xuất báo cáo</span></>
							)}
						</button>

						<button
							id="btn-assign-floor-task"
							type="button"
							className="floor-export-btn floor-assign-btn typo-body-md"
							disabled={!floorDetail}
							onClick={() => {
								if (!floorDetail) return;
								setIsAssignModalOpen(true);
							}}
						>
							<UserPlus size={17} />
							<span>Giao nhiệm vụ</span>
						</button>

						<button
							id="btn-view-3d-floor"
							type="button"
							className="manager-device-add-btn typo-body-md"
							onClick={() => navigate('/manager/home')}
						>
							<CubeFocus size={17} weight="bold" />
							<span>Xem 3D</span>
						</button>
					</div>
				</header>

				{/* ── Main layout: 2-col when no selection, full-width when selected ── */}
				<div className={`floor-check-layout ${(floorDetail || isLoadingDetail) && window.innerWidth <= 1024 ? 'floor-check-layout--detail' : ''}`}>
					{/* ── LEFT: Floor list panel — hidden when floor selected ── */}
					<aside
						className={`floor-list-panel manager-panel ${(floorDetail || isLoadingDetail) && window.innerWidth <= 1024 ? 'floor-list-panel--hidden' : ''}`}
						aria-label="Danh sách tầng"
						aria-hidden={!!(floorDetail || isLoadingDetail) && window.innerWidth <= 1024}
					>
						<div className="floor-list-panel-head">
							<p className="typo-label text-secondary">DANH SÁCH TẦNG</p>
							<span className="typo-label floor-list-count">{floorList.length} tầng</span>
						</div>

						{isLoadingList ? (
							<div className="floor-list-skeleton">
								{[1, 2, 3, 4, 5].map((k) => (
									<div key={k} className="floor-list-skeleton-item" />
								))}
							</div>
						) : (
							<ul className="floor-list" role="listbox" aria-label="Chọn tầng">
								{floorList.map((floor) => (
									<li key={floor.id} role="none">
										<button
											id={`floor-item-${floor.id}`}
											role="option"
											aria-selected={selectedFloorId === floor.id}
											className={`floor-list-item ${selectedFloorId === floor.id ? 'is-selected' : ''}`}
											onClick={() => setSelectedFloorId(floor.id)}
										>
											<div className="floor-list-item-top">
												<span className="floor-list-item-name typo-body-md">
													{floor.name}
												</span>
												<div className="floor-list-badges">
													{floor.summary?.hasHazardZone && (
														<span className="floor-hazard-tag floor-hazard-tag--amber typo-label">
															<Warning size={11} weight="fill" />
															Khu vực cần lưu ý
														</span>
													)}
													<span className={`floor-safety-badge floor-safety-badge--${floor.safetyLevel}`}>
														{SAFETY_ICON[floor.safetyLevel]}
														{floor.safetyLevelLabel}
													</span>
												</div>
											</div>
											<div className="floor-list-item-bottom">
												<span className="typo-label text-secondary">{floor.area}</span>
												<span className="floor-list-score typo-label" style={{
													color: floor.safetyLevel === 'safe' ? '#15803d' : floor.safetyLevel === 'warning' ? '#b45309' : '#b91c1c'
												}}>
													{floor.safetyScore}/100
												</span>
											</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</aside>

					{/* ── RIGHT: Floor detail ── */}
					<div className="floor-detail-panel">
						{isLoadingDetail && (
							<div className="floor-loading-overlay" aria-busy="true">
								<span className="floor-loading-spinner" />
								<p className="typo-body-lg text-secondary">Đang tải dữ liệu tầng...</p>
							</div>
						)}

						{!isLoadingDetail && floorDetail && (
							<>
								{/* ── Safety summary card ── */}
								<div className="manager-panel floor-summary-card">
									<div className="floor-summary-header">
										<div className="floor-summary-title-group">
											<p className="typo-label text-secondary floor-summary-overline">
												TẦNG ĐANG CHỌN
											</p>
											<h2 className="typo-h2 floor-summary-name">{floorDetail.name}</h2>
											<p className="typo-body-md text-secondary">{floorDetail.area}</p>
										</div>

										<div className="floor-summary-score-group">
											<SafetyScoreRing
												score={floorDetail.safetyScore}
												level={floorDetail.safetyLevel}
											/>
											<span
												className={`floor-safety-badge floor-safety-badge--${floorDetail.safetyLevel} floor-safety-badge--lg`}
											>
												{SAFETY_ICON[floorDetail.safetyLevel]}
												{floorDetail.safetyLevelLabel}
											</span>
										</div>
									</div>

									<div className="floor-stat-row">
										<StatCard
											icon={<FireExtinguisher size={18} weight="duotone" />}
											value={summary?.activeDevices ?? '—'}
											label="Thiết bị hoạt động"
											colorClass="floor-stat-card--safe"
										/>
										<StatCard
											icon={<Warning size={18} weight="duotone" />}
											value={(summary?.warningDevices ?? 0) + (summary?.brokenDevices ?? 0)}
											label="Hỏng / Cảnh báo"
											colorClass={
												(summary?.warningDevices ?? 0) + (summary?.brokenDevices ?? 0) > 0
													? 'floor-stat-card--danger'
													: 'floor-stat-card--safe'
											}
										/>
										<StatCard
											icon={<Door size={18} weight="duotone" />}
											value={`${floorDetail.exits?.filter((e) => e.status === 'available').length ?? 0}/${floorDetail.exits?.length ?? 0}`}
											label="Lối thoát khả dụng"
											colorClass={
												floorDetail.exits?.filter((e) => e.status !== 'available').length > 0
													? 'floor-stat-card--warning'
													: 'floor-stat-card--safe'
											}
										/>
										<StatCard
											icon={<Fire size={18} weight="duotone" />}
											value={
												floorDetail.summary?.hasHazardZone
													? `${floorDetail.summary.hazardZoneCount} vùng`
													: 'Không có'
											}
											label="Khu vực nguy hiểm"
											colorClass={
												floorDetail.summary?.hasHazardZone
													? 'floor-stat-card--danger'
													: 'floor-stat-card--safe'
											}
										/>
									</div>
								</div>

								{/* ── Tab bar ── */}
								<div className="floor-tab-bar" role="tablist" aria-label="Xem chi tiết tầng">
									<button
										id="tab-devices"
										role="tab"
										aria-selected={activeTab === 'devices'}
										className={`floor-tab-btn typo-body-md ${activeTab === 'devices' ? 'is-active' : ''}`}
										onClick={() => setActiveTab('devices')}
									>
										<FireExtinguisher size={16} />
										Thiết bị
										<span className="floor-tab-count">{floorDetail.devices?.length ?? 0}</span>
									</button>
									<button
										id="tab-exits"
										role="tab"
										aria-selected={activeTab === 'exits'}
										className={`floor-tab-btn typo-body-md ${activeTab === 'exits' ? 'is-active' : ''}`}
										onClick={() => setActiveTab('exits')}
									>
										<Door size={16} />
										Lối thoát
										<span className="floor-tab-count">{floorDetail.exits?.length ?? 0}</span>
									</button>
									{floorDetail.summary?.hasHazardZone && (
										<button
											id="tab-hazards"
											role="tab"
											aria-selected={activeTab === 'hazards'}
											className={`floor-tab-btn floor-tab-btn--danger typo-body-md ${activeTab === 'hazards' ? 'is-active' : ''}`}
											onClick={() => setActiveTab('hazards')}
										>
											<WarningDiamond size={16} />
											Khu vực nguy hiểm
											<span className="floor-tab-count floor-tab-count--danger">
												{floorDetail.hazardZones?.length ?? 0}
											</span>
										</button>
									)}
								</div>

								{/* ── Tab: Devices ── */}
								{activeTab === 'devices' && (
									<div
										role="tabpanel"
										aria-labelledby="tab-devices"
										className="floor-tab-content"
									>
										{/* Filter toolbar */}
										<div className="manager-panel floor-device-filter-bar">
											<div className="manager-filter-item">
												<div className="manager-search-wrap">
													<MagnifyingGlass size={18} className="manager-search-icon" />
													<input
														id="floor-device-search"
														className="manager-search-input typo-body-md"
														placeholder="Mã, loại, phòng..."
														value={search}
														onChange={(e) => setSearch(e.target.value)}
													/>
												</div>
											</div>

											<div className="manager-filter-item">
												<select
													id="floor-device-status-filter"
													className="manager-filter-select typo-body-md"
													value={statusFilter}
													onChange={(e) => setStatusFilter(e.target.value)}
												>
													{DEVICE_STATUS_FILTERS.map((f) => (
														<option key={f.value} value={f.value}>
															{f.label}
														</option>
													))}
												</select>
											</div>

											<div className="manager-filter-item">
												<select
													id="floor-device-type-filter"
													className="manager-filter-select typo-body-md"
													value={typeFilter}
													onChange={(e) => setTypeFilter(e.target.value)}
												>
													<option value="all">Tất cả loại</option>
													{deviceTypes.map((t) => (
														<option key={t.id} value={t.label}>
															{t.label}
														</option>
													))}
												</select>
											</div>

											<p className="floor-filter-count typo-label text-secondary">
												{filteredDevices.length}/{floorDetail.devices?.length ?? 0} thiết bị
											</p>
										</div>

										{/* Device table */}
										<div className="manager-panel manager-device-table-panel floor-device-table-wrap">
											<table className="manager-device-table floor-device-table">
												<thead>
													<tr>
														<th>MÃ THIẾT BỊ</th>
														<th>LOẠI</th>
														<th>PHÒNG / VỊ TRÍ</th>
														<th>TRẠNG THÁI</th>
														<th>HẠN BẢO TRÌ</th>
														<th>THAO TÁC</th>
													</tr>
												</thead>
												<tbody>
													{filteredDevices.map((device) => (
														<tr key={device.id} className="floor-device-row">
															<td className="manager-device-id">{device.id}</td>
															<td>{device.type}</td>
															<td>
																<p className="floor-device-room typo-body-md">{device.room}</p>
																<p className="typo-label text-secondary floor-device-location">
																	{device.location}
																</p>
															</td>
															<td>
																<span
																	className={`manager-device-status status-${device.status}`}
																>
																	{device.statusLabel}
																</span>
															</td>
															<td className={device.maintenanceDue === 'Đang xử lý' || device.maintenanceDue === 'Đang kiểm tra kỹ thuật' ? 'floor-due-urgent' : ''}>
																{device.maintenanceDue}
															</td>
															<td>
																<div className="manager-device-actions">
																	<button
																		type="button"
																		id={`btn-device-detail-${device.id}`}
																		className="manager-action-btn edit"
																		aria-label={`Xem chi tiết ${device.id}`}
																		onClick={() => setSelectedDevice(device)}
																	>
																		<Sliders size={17} />
																	</button>
																	<button
																		type="button"
																		id={`btn-device-3d-${device.id}`}
																		className="manager-action-btn location"
																		aria-label={`Xem ${device.id} trên 3D`}
																		onClick={() => handleViewDevice3d(device)}
																	>
																		<MapPin size={17} />
																	</button>
																</div>
															</td>
														</tr>
													))}

													{filteredDevices.length === 0 && (
														<tr>
															<td colSpan={6} className="manager-device-empty typo-body-lg">
																Không có thiết bị phù hợp với bộ lọc hiện tại.
															</td>
														</tr>
													)}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* ── Tab: Exits ── */}
								{activeTab === 'exits' && (
									<div
										role="tabpanel"
										aria-labelledby="tab-exits"
										className="floor-tab-content floor-exit-grid"
									>
										{(floorDetail.exits || []).map((exit) => (
											<div key={exit.id} className={`manager-panel floor-exit-card floor-exit-card--${exit.status}`}>
												<div className="floor-exit-card-head">
													<Door size={20} weight="duotone" className="floor-exit-icon" />
													<span
														className={`manager-device-status status-${exit.status === 'available' ? 'available' : exit.status === 'blocked' ? 'danger' : 'inspection'}`}
													>
														{exit.statusLabel}
													</span>
												</div>
												<p className="typo-body-md floor-exit-type">{exit.type}</p>
												<p className="typo-label text-secondary floor-exit-location">
													{exit.location}
												</p>
												{exit.note && (
													<p className="floor-exit-note typo-label">
														<Warning size={13} weight="fill" /> {exit.note}
													</p>
												)}
												<p className="typo-label text-secondary floor-exit-inspection">
													Kiểm tra: {exit.lastInspection}
												</p>
											</div>
										))}
									</div>
								)}

								{/* ── Tab: Hazard Zones ── */}
								{activeTab === 'hazards' && (
									<div
										role="tabpanel"
										aria-labelledby="tab-hazards"
										className="floor-tab-content floor-hazard-list"
									>
										{(floorDetail.hazardZones || []).length === 0 ? (
											<div className="manager-panel floor-empty-state">
												<Shield size={40} weight="duotone" className="floor-empty-icon" />
												<p className="typo-body-lg">Không có khu vực nguy hiểm trên tầng này.</p>
											</div>
										) : (
											(floorDetail.hazardZones || []).map((zone) => (
												<div
													key={zone.id}
													className={`manager-panel floor-hazard-card floor-hazard-card--${zone.riskLevel}`}
												>
													<div className="floor-hazard-card-head">
														<WarningDiamond size={22} weight="fill" className="floor-hazard-icon" />
														<div>
															<p className="typo-body-md floor-hazard-name">{zone.name}</p>
															<p className="typo-label text-secondary">{zone.type}</p>
														</div>
														<span className={`floor-risk-badge floor-risk-badge--${zone.riskLevel}`}>
															{zone.riskLevelLabel}
														</span>
													</div>
													{zone.note && (
														<p className="floor-hazard-note typo-body-md">{zone.note}</p>
													)}
												</div>
											))
										)}
									</div>
								)}
							</>
						)}

						{!isLoadingDetail && !floorDetail && !isLoadingList && (
							<div className="manager-panel floor-empty-state">
								<Buildings size={48} weight="duotone" className="floor-empty-icon" />
								<p className="typo-body-lg text-secondary">Chọn tầng để xem thông tin an toàn.</p>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Device detail modal */}
			{selectedDevice && (
				<DeviceDetailModal
					device={selectedDevice}
					onClose={() => setSelectedDevice(null)}
					onView3d={() => handleViewDevice3d(selectedDevice)}
					onUpdated={handleDeviceUpdated}
				/>
			)}

			<ModelLocationModal
				isOpen={Boolean(modelTarget)}
				title={modelTarget ? `Vị trí ${modelTarget.id}` : 'Vị trí thiết bị'}
				subtitle={modelTarget ? `${modelTarget.type} - ${floorDetail?.name || modelTarget.floor || ''}` : ''}
				selectedFloorId={floorDetail?.name || modelTarget?.floor || 'all'}
				focusedNodeName={modelTarget?.glbNodeName || modelTarget?.model || ''}
				highlightExits={true}
				focusedNodeHighlightColor="#f97316"
				onClose={() => setModelTarget(null)}
			/>

			{isAssignModalOpen && (
				<TaskAssignModal
					isOpen={isAssignModalOpen}
					onClose={() => setIsAssignModalOpen(false)}
					floorList={floorList}
					defaultFloorId={floorDetail?.id}
				/>
			)}

			<ManagerBottomNav />
		</main>
	);
}

function TaskAssignModal({ isOpen, onClose, floorList, defaultFloorId }) {
	const [modalTab, setModalTab] = useState('create'); // 'create' | 'list'
	const [taskType, setTaskType] = useState('Kiểm tra');
	const [floorId, setFloorId] = useState(defaultFloorId || '');
	const [deviceId, setDeviceId] = useState('');
	const [dueAt, setDueAt] = useState('');
	const [assigneeId, setAssigneeId] = useState('');
	const [loading, setLoading] = useState(false);
	const [devices, setDevices] = useState([]);
	const [loadingDevices, setLoadingDevices] = useState(false);
	const [staffList, setStaffList] = useState([]);
	const [loadingStaff, setLoadingStaff] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	// Quản lý danh sách nhiệm vụ đã giao
	const [assignedTasks, setAssignedTasks] = useState([]);
	const [loadingTasks, setLoadingTasks] = useState(false);

	const loadTasksForFloor = useCallback(async (targetFloorId) => {
		if (!targetFloorId) {
			setAssignedTasks([]);
			return;
		}
		setLoadingTasks(true);
		try {
			const res = await fetchFireStaffTaskList();
			const tasksForFloor = (res.items || []).filter(t => t.floor === targetFloorId);
			setAssignedTasks(tasksForFloor);
		} catch (err) {
			console.error("Lỗi lấy danh sách nhiệm vụ đã giao:", err);
		} finally {
			setLoadingTasks(false);
		}
	}, []);

	// Load danh sách nhân viên PCCC khi modal mở
	useEffect(() => {
		if (!isOpen) return;
		setLoadingStaff(true);
		fetchFireStaffUsers()
			.then((users) => {
				setStaffList(users);
				if (users.length > 0) setAssigneeId(users[0].id);
			})
			.finally(() => setLoadingStaff(false));
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			setFloorId(defaultFloorId || '');
			setTaskType('Kiểm tra');
			setDeviceId('');
			setDueAt('');
			setSuccessMessage('');
			setErrorMessage('');
			setModalTab('create');
			if (defaultFloorId) {
				loadTasksForFloor(defaultFloorId);
			}
		}
	}, [isOpen, defaultFloorId, loadTasksForFloor]);

	useEffect(() => {
		if (floorId) {
			loadTasksForFloor(floorId);
		}
	}, [floorId, loadTasksForFloor]);

	useEffect(() => {
		if (!floorId) {
			setDevices([]);
			return;
		}

		let isMounted = true;
		setLoadingDevices(true);
		getFloorById(floorId)
			.then((detail) => {
				if (!isMounted) return;
				const devList = (detail.devices || []).map(d => ({
					id: d.id,
					name: `${d.type} (${d.id}) - ${d.room || d.location || ''}`,
					raw: d
				}));
				const exitList = (detail.exits || []).map(e => ({
					id: e.id,
					name: `${e.type} (${e.id}) - ${e.location || ''}`,
					raw: e
				}));
				const all = [...devList, ...exitList];
				setDevices(all);
				if (all.length > 0) {
					setDeviceId(all[0].id);
				} else {
					setDeviceId('');
				}
			})
			.catch((err) => {
				console.error(err);
			})
			.finally(() => {
				if (isMounted) setLoadingDevices(false);
			});

		return () => {
			isMounted = false;
		};
	}, [floorId]);

	if (!isOpen) return null;

	const formatDateTime = (isoString) => {
		if (!isoString) return '--';
		try {
			const date = new Date(isoString);
			if (isNaN(date.getTime())) return isoString;
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			return `${hours}:${minutes} ${day}/${month}/${year}`;
		} catch (e) {
			return isoString;
		}
	};

	const getStatusBadgeStyle = (status) => {
		switch (status) {
			case 'completed':
				return { backgroundColor: '#d1fae5', color: '#065f46' };
			case 'in_progress':
				return { backgroundColor: '#dbeafe', color: '#1e40af' };
			default:
				return { backgroundColor: '#fef3c7', color: '#92400e' };
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!floorId) {
			setErrorMessage('Vui lòng chọn tầng.');
			return;
		}
		if (!deviceId) {
			setErrorMessage('Vui lòng chọn thiết bị hoặc cửa thoát hiểm.');
			return;
		}
		if (!dueAt) {
			setErrorMessage('Vui lòng chọn thời hạn hoàn thành.');
			return;
		}

		setLoading(true);
		setErrorMessage('');
		setSuccessMessage('');

		try {
			const selectedDevice = devices.find(d => d.id === deviceId);
			const relatedDeviceName = selectedDevice ? selectedDevice.name : deviceId;
			
			// Tìm zone từ thiết bị được chọn
			let zone = '';
			if (selectedDevice && selectedDevice.raw) {
				zone = selectedDevice.raw.room || selectedDevice.raw.location || '';
			}

			// Lấy tên nhân viên được chọn
			const selectedStaff = staffList.find(s => s.id === assigneeId);
			const assigneeName = selectedStaff ? selectedStaff.fullName : '';

			const payload = {
				category: taskType,
				floor: floorId,
				relatedDevice: relatedDeviceName,
				dueAt: new Date(dueAt).toISOString(),
				assignee: assigneeName,
				status: 'pending',
				statusLabel: 'Chờ thực hiện'
			};

			await createTask(payload);
			setSuccessMessage('Giao nhiệm vụ thành công!');
			
			// Tải lại danh sách nhiệm vụ
			await loadTasksForFloor(floorId);

			setTimeout(() => {
				setSuccessMessage('');
				setModalTab('list'); // Tự động chuyển sang tab danh sách nhiệm vụ đã giao
			}, 1000);
		} catch (err) {
			setErrorMessage(err.message || 'Lỗi khi giao nhiệm vụ.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="manager-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1000 }}>
			<div className="manager-panel floor-device-modal" style={{ maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
				<div className="floor-device-modal-head" style={{ marginBottom: '15px' }}>
					<div>
						<h2 className="typo-h2">Quản lý nhiệm vụ</h2>
						<p className="typo-label text-secondary">Giao và theo dõi tiến độ nhiệm vụ PCCC</p>
					</div>
					<button type="button" className="floor-modal-close-btn" onClick={onClose}>
						<X size={20} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
					<button
						type="button"
						style={{
							flex: 1,
							padding: '12px',
							border: 'none',
							background: 'none',
							borderBottom: modalTab === 'create' ? '3px solid #2563eb' : '3px solid transparent',
							color: modalTab === 'create' ? '#2563eb' : '#6b7280',
							fontWeight: '600',
							fontSize: '14px',
							cursor: 'pointer',
							transition: 'all 0.2s'
						}}
						onClick={() => setModalTab('create')}
					>
						Giao nhiệm vụ mới
					</button>
					<button
						type="button"
						style={{
							flex: 1,
							padding: '12px',
							border: 'none',
							background: 'none',
							borderBottom: modalTab === 'list' ? '3px solid #2563eb' : '3px solid transparent',
							color: modalTab === 'list' ? '#2563eb' : '#6b7280',
							fontWeight: '600',
							fontSize: '14px',
							cursor: 'pointer',
							transition: 'all 0.2s'
						}}
						onClick={() => setModalTab('list')}
					>
						Nhiệm vụ đã giao ({assignedTasks.length})
					</button>
				</div>

				{modalTab === 'create' ? (
					<form onSubmit={handleSubmit} className="floor-device-modal-body" style={{ gap: '16px', display: 'flex', flexDirection: 'column', padding: 0 }}>
						{successMessage && (
							<div style={{ padding: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
								{successMessage}
							</div>
						)}
						{errorMessage && (
							<div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
								{errorMessage}
							</div>
						)}

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label className="typo-label text-secondary" htmlFor="assign-floor" style={{ alignSelf: 'flex-start' }}>CHỌN TẦNG</label>
							<select
								id="assign-floor"
								className="manager-filter-select typo-body-md"
								style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', height: '40px' }}
								value={floorId}
								onChange={(e) => setFloorId(e.target.value)}
								required
							>
								<option value="">-- Chọn tầng --</option>
								{floorList.map((f) => (
									<option key={f.id} value={f.id}>{f.name}</option>
								))}
							</select>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label className="typo-label text-secondary" htmlFor="assign-type" style={{ alignSelf: 'flex-start' }}>LOẠI NHIỆM VỤ</label>
							<select
								id="assign-type"
								className="manager-filter-select typo-body-md"
								style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', height: '40px' }}
								value={taskType}
								onChange={(e) => setTaskType(e.target.value)}
								required
							>
								<option value="Kiểm tra">Kiểm tra</option>
								<option value="Bảo trì">Bảo trì</option>
							</select>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label className="typo-label text-secondary" htmlFor="assign-device" style={{ alignSelf: 'flex-start' }}>THIẾT BỊ / CỬA THOÁT HIỂM</label>
							<select
								id="assign-device"
								className="manager-filter-select typo-body-md"
								style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', height: '40px' }}
								value={deviceId}
								onChange={(e) => setDeviceId(e.target.value)}
								disabled={loadingDevices || !floorId}
								required
							>
								{loadingDevices && <option>Đang tải danh sách thiết bị...</option>}
								{!loadingDevices && devices.length === 0 && <option value="">-- Không có thiết bị trên tầng này --</option>}
								{!loadingDevices && devices.map((d) => (
									<option key={d.id} value={d.id}>{d.name}</option>
								))}
							</select>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label className="typo-label text-secondary" htmlFor="assign-staff" style={{ alignSelf: 'flex-start' }}>NHÂN VIÊN THỰC HIỆN</label>
							<select
								id="assign-staff"
								className="manager-filter-select typo-body-md"
								style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', height: '40px' }}
								value={assigneeId}
								onChange={(e) => setAssigneeId(e.target.value)}
								disabled={loadingStaff}
								required
							>
								{loadingStaff && <option>Đang tải danh sách nhân viên...</option>}
								{!loadingStaff && staffList.length === 0 && <option value="">-- Không có nhân viên PCCC --</option>}
								{!loadingStaff && staffList.map((s) => (
									<option key={s.id} value={s.id}>{s.fullName} ({s.username})</option>
								))}
							</select>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label className="typo-label text-secondary" htmlFor="assign-due" style={{ alignSelf: 'flex-start' }}>THỜI HẠN HOÀN THÀNH</label>
							<input
								id="assign-due"
								type="datetime-local"
								className="manager-search-input typo-body-md"
								style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', height: '40px' }}
								value={dueAt}
								onChange={(e) => setDueAt(e.target.value)}
								required
							/>
						</div>

						<div className="floor-device-modal-footer" style={{ marginTop: '20px', padding: 0, border: 'none', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
							<button
								type="button"
								className="floor-modal-action-btn floor-modal-action-btn--secondary typo-body-md"
								onClick={onClose}
								disabled={loading}
								style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer' }}
							>
								Hủy
							</button>
							<button
								type="submit"
								className="floor-modal-action-btn floor-modal-action-btn--primary typo-body-md"
								disabled={loading || loadingDevices || !deviceId}
								style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
							>
								{loading ? 'Đang gửi...' : 'Giao nhiệm vụ'}
							</button>
						</div>
					</form>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
						{loadingTasks ? (
							<div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }} className="typo-body-md">
								Đang tải danh sách nhiệm vụ...
							</div>
						) : assignedTasks.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
								<p className="typo-body-md" style={{ marginBottom: '10px' }}>Chưa có nhiệm vụ nào được giao cho tầng này.</p>
								<button
									type="button"
									onClick={() => setModalTab('create')}
									style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
								>
									+ Giao nhiệm vụ ngay
								</button>
							</div>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
								{assignedTasks.map((task) => (
									<div
										key={task.id}
										style={{
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											padding: '12px 16px',
											backgroundColor: '#f9fafb',
											display: 'flex',
											flexDirection: 'column',
											gap: '8px',
											textAlign: 'left'
										}}
									>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
											<h4 className="typo-body-md" style={{ fontWeight: '600', margin: 0, color: '#111827' }}>
												{task.title || `${task.category} ${task.relatedDevice}`}
											</h4>
											<span
												style={{
													fontSize: '11px',
													fontWeight: '600',
													padding: '2px 8px',
													borderRadius: '12px',
													whiteSpace: 'nowrap',
													...getStatusBadgeStyle(task.status)
												}}
											>
												{task.statusLabel || task.status}
											</span>
										</div>

										<p className="typo-label text-secondary" style={{ margin: 0, fontSize: '12px' }}>
											{task.description}
										</p>

										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', flexWrap: 'wrap', gap: '6px' }}>
											<div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
												<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
													<span style={{ color: '#6b7280' }}>Hạn:</span>
													<span style={{ fontWeight: '500', color: '#374151' }}>{formatDateTime(task.dueAt)}</span>
												</div>
												{task.assignee && (
													<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
														<span style={{ color: '#6b7280' }}>Nhân viên:</span>
														<span style={{ fontWeight: '500', color: '#1e40af' }}>{task.assignee}</span>
													</div>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						<div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
							<button
								type="button"
								className="floor-modal-action-btn floor-modal-action-btn--secondary typo-body-md"
								onClick={onClose}
								style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer' }}
							>
								Đóng
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default ManagerFloorCheckPage;
