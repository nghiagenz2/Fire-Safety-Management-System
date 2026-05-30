import { useState, useEffect, useMemo } from 'react';
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
	MapTrifold,
	Shield,
	ShieldWarning,
	Sliders,
	Warning,
	WarningDiamond,
	Wrench,
	X,
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import {
	getFloorList,
	getFloorById,
	getDeviceTypes,
	generateFloorReport,
	getBuildingInfo,
} from '../../services/managerFloorsApi';
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

function DeviceDetailModal({ device, onClose }) {
	if (!device) return null;
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
					<div className="floor-device-modal-row">
						<span className="floor-device-modal-key typo-label text-secondary">Trạng thái</span>
						<span className={`manager-device-status status-${device.status} typo-label`}>
							{device.statusLabel}
						</span>
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
				</div>

				<div className="floor-device-modal-footer">
					<button type="button" className="floor-modal-action-btn floor-modal-action-btn--secondary typo-body-md" onClick={onClose}>
						Đóng
					</button>
					<button type="button" className="floor-modal-action-btn floor-modal-action-btn--primary typo-body-md">
						<MapTrifold size={16} />
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
	const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'exits' | 'hazards'

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
							Ban quản lý · UC04
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
											icon={<Wrench size={18} weight="duotone" />}
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
										<Wrench size={16} />
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
																	>
																		<MapTrifold size={17} />
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
				/>
			)}

			<ManagerBottomNav />
		</main>
	);
}

export default ManagerFloorCheckPage;
