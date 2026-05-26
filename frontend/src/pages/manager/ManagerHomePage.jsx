import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import { Cube, DoorOpen, CheckCircle } from '@phosphor-icons/react';
import '../../styles/ResidentHome.css';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';

function ManagerHomePage() {
	return (
		<main className="manager-screen">
			<Header roleLabel="Ban quản lý" homePath="/manager/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>

			<div className="manager-device-shell">
				<header className="manager-topbar">
					<div>
						<p className="typo-label text-secondary manager-overline">Ban quản lý - Trung tâm vận hành</p>
						<h1 className="typo-h1 manager-title">Mô hình 3D tổng quan</h1>
						<p className="typo-body-md text-secondary">
							Quan sát mô hình tòa nhà trực tiếp, xoay góc nhìn và kiểm tra tổng thể nhanh hơn.
						</p>
					</div>
				</header>

				<BuildingModelViewer />

				<section className="resident-stats-grid" aria-label="Thống kê tổng quan">
					<div className="resident-panel stat-card-item bg-light-safe">
						<div className="stat-icon-wrapper green">
							<Cube size={24} weight="fill" />
						</div>
						<div>
							<p className="typo-h1 status-safe stat-card-value">38</p>
							<p className="typo-body-md text-secondary stat-card-label">Thiết bị hoạt động tốt</p>
						</div>
					</div>

					<div className="resident-panel stat-card-item bg-light-brand">
						<div className="stat-icon-wrapper blue">
							<DoorOpen size={24} weight="fill" />
						</div>
						<div>
							<p className="typo-h1 status-brand stat-card-value">12</p>
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
