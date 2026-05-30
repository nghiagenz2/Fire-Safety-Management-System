import { useMemo, useState, useEffect } from 'react';
import {
	MagnifyingGlass,
	MapPin,
	NotePencil,
	Plus,
	Trash
} from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import { getManagerDevices, getFloors } from '../../services/mockManagerDevicesApi';
import '../../styles/manager-shell.css';

const statusFilters = [
	{ value: 'all', label: 'Tất cả' },
	{ value: 'active', label: 'Hoạt động tốt' },
	{ value: 'warning', label: 'Cảnh báo' },
	{ value: 'danger', label: 'Hỏng' },
	{ value: 'maintenance', label: 'Bảo trì' }
];

function getDisplayLocation(device) {
	return device.floor || device.location?.split(',')[0]?.trim() || '--';
}

function ManagerDevicePage() {
	const [devices, setDevices] = useState([]);
	const [floors, setFloors] = useState([]);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');
	const [floorFilter, setFloorFilter] = useState('all');
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				setLoadError('');
				const [devicesData, floorsData] = await Promise.all([
					getManagerDevices(),
					getFloors()
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

		loadData();
	}, []);

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

					<button type="button" className="manager-device-add-btn typo-body-lg">
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
											<button type="button" className="manager-action-btn edit" aria-label="Chỉnh sửa thiết bị">
												<NotePencil size={17} weight="regular" />
											</button>
											<button type="button" className="manager-action-btn location" aria-label="Xem vị trí thiết bị">
												<MapPin size={17} weight="regular" />
											</button>
											<button type="button" className="manager-action-btn delete" aria-label="Xóa thiết bị">
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
		</main>
	);
}

export default ManagerDevicePage;
