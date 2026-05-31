import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import { Cube, DoorOpen, CheckCircle } from '@phosphor-icons/react';
import '../../styles/ResidentHome.css';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import { getDeviceStatistics } from '../../services/mockManagerDevicesApi.js';

function ManagerHomePage() {
	const [deviceTotal, setDeviceTotal] = useState('--');
	const [exitTotal, setExitTotal] = useState('--');

	useEffect(() => {
		let isMounted = true;

		getDeviceStatistics()
			.then((stats) => {
				if (isMounted) {
					setDeviceTotal(stats.total);
					setExitTotal(stats.availableExits);
				}
			})
			.catch((error) => {
				console.error('Failed to load device statistics:', error);
				if (isMounted) {
					setDeviceTotal('--');
					setExitTotal('--');
				}
			});

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<main className="manager-screen">
			<Header roleLabel="Ban quản lý" homePath="/manager/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>

			<div className="manager-device-shell">
				<header className="manager-topbar">
					<div>
						<p className="typo-label text-secondary manager-overline">Ban quản lý - Trung tâm vận hành</p>
						<h1 className="typo-h1 manager-title">Mô hình 3D tổng quan</h1>
					</div>
				</header>

				<BuildingModelViewer highlightExits={true} title="" showHeader={false} />

				<section className="resident-stats-grid" aria-label="Thống kê tổng quan">
					<div className="resident-panel stat-card-item bg-light-safe">
						<div className="stat-icon-wrapper green">
							<Cube size={24} weight="fill" />
						</div>
						<div>
							<p className="typo-h1 status-safe stat-card-value">{deviceTotal}</p>
							<p className="typo-body-md text-secondary stat-card-label">Tổng thiết bị</p>
						</div>
					</div>

					<div className="resident-panel stat-card-item bg-light-brand">
						<div className="stat-icon-wrapper blue">
							<DoorOpen size={24} weight="fill" />
						</div>
						<div>
							<p className="typo-h1 status-brand stat-card-value">{exitTotal}</p>
							<p className="typo-body-md text-secondary stat-card-label">Lối thoát khả dụng</p>
						</div>
					</div>

					<div className="resident-panel stat-card-item bg-light-safe">
						<div className="stat-icon-wrapper green">
							<CheckCircle size={24} weight="fill" />
						</div>
						<div>
							<p className="typo-h1 status-safe stat-card-value small">An toàn</p>
							<p className="typo-body-md text-secondary stat-card-label">Trạng thái tòa nhà</p>
						</div>
					</div>
				</section>
			</div>

			<ManagerBottomNav />
		</main>
	);
}

export default ManagerHomePage;
