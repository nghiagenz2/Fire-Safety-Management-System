import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import FireStaffBottomNav from '../../components/firestaff/FireStaffBottomNav';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import { Cube, DoorOpen, CheckCircle } from '@phosphor-icons/react';
import '../../styles/ResidentHome.css';
import { getDeviceStatistics } from '../../services/mockManagerDevicesApi.js';

function FireStaffHomePage() {
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
		<main className="resident-screen resident-home-screen">
			<Header roleLabel="Nhân viên PCCC" homePath="/firestaff/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>
			<div>
				<header className="resident-topbar">
					<div>
						<p className="typo-label text-secondary resident-overline">Nhân viên PCCC - Trung tâm vận hành</p>
						<h1 className="typo-h1 resident-title">Trang chủ 3D</h1>
					</div>
				</header>

				<BuildingModelViewer
					className="resident-home-model"
					showHeader={false}
					showCaption={false}
					ariaLabel="Khu vực mô hình 3D"
					highlightExits={true}
				/>

				<section className="resident-stats-grid">
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

			<FireStaffBottomNav />
		</main>
	);
}

export default FireStaffHomePage;
