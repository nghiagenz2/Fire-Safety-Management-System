import { useEffect, useMemo, useState } from 'react';
import { Play } from '@phosphor-icons/react';
import Header from '../../components/Header';
import FireStaffBottomNav from '../../components/firestaff/FireStaffBottomNav.jsx';
import BuildingModelViewer from '../../components/three/BuildingModelViewer.jsx';
import '../../styles/ResidentHome.css';
import { getCurrentUser } from '../../services/authApi';

function FireStaffSimulationPage() {
	const [selectedFloor, setSelectedFloor] = useState('Tầng trệt');
	const [fireOrigin, setFireOrigin] = useState('');
	const [fireLevel, setFireLevel] = useState('medium');
	const [hasSimulated, setHasSimulated] = useState(false);
	const [doorsByFloor, setDoorsByFloor] = useState({});

	const floorsList = useMemo(() => {
		return [
			'Tầng trệt',
			...Array.from({ length: 27 }, (_, i) => `Tầng ${i + 1}`)
		];
	}, []);

	const selectedFloorId = useMemo(() => {
		if (selectedFloor === 'Tầng trệt') return 'floor_tret';
		const num = selectedFloor.replace('Tầng ', '');
		return `floor_${num}`;
	}, [selectedFloor]);

	const currentFloorDoors = useMemo(() => {
		return doorsByFloor[selectedFloorId] || [];
	}, [doorsByFloor, selectedFloorId]);

	// Fetch initial simulation state on mount
	useEffect(() => {
		let isMounted = true;
		const fetchActiveSimulation = async () => {
			try {
				const response = await fetch('http://localhost:5000/api/incidents/simulation');
				const result = await response.json();
				if (isMounted && result.success && result.data && result.data.active) {
					const { origin, level, floorId } = result.data;

					// Map floorId back to floor display name
					let floorName = 'Tầng trệt';
					if (floorId !== 'floor_tret') {
						const num = floorId.replace('floor_', '');
						floorName = `Tầng ${num}`;
					}

					setSelectedFloor(floorName);
					setFireOrigin(origin);
					setFireLevel(level);
					setHasSimulated(true);
				}
			} catch (error) {
				console.error('Failed to fetch initial simulation state:', error);
			}
		};
		fetchActiveSimulation();
		return () => {
			isMounted = false;
		};
	}, []);

	// Auto-select first door when changing floor if current selected door is not on this floor
	useEffect(() => {
		if (currentFloorDoors.length > 0) {
			const hasValidOrigin = currentFloorDoors.includes(fireOrigin);
			if (!hasValidOrigin) {
				setFireOrigin(currentFloorDoors[0]);
			}
		}
	}, [selectedFloorId, currentFloorDoors, fireOrigin]);

	async function handleStartSimulation() {
		if (!fireOrigin) {
			return;
		}
		try {
			await fetch('http://localhost:5000/api/incidents/simulation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					active: true,
					origin: fireOrigin,
					level: fireLevel,
					floorId: selectedFloorId
				})
			});
			setHasSimulated(true);
		} catch (error) {
			console.error('Failed to start simulation on backend:', error);
			setHasSimulated(true); // Fallback to local only
		}
	}

	async function handleStopSimulation() {
		const currentUser = getCurrentUser();
		const assigneeName = currentUser?.fullName || 'Đội trực ca PCCC';
		try {
			await fetch('http://localhost:5000/api/incidents/simulation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					active: false,
					origin: '',
					level: 'medium',
					floorId: 'floor_tret',
					assignee: assigneeName
				})
			});
			setHasSimulated(false);
		} catch (error) {
			console.error('Failed to stop simulation on backend:', error);
			setHasSimulated(false);
		}
	}

	return (
		<main className="firestaff-screen">
			<Header roleLabel="Nhân viên PCCC" homePath="/firestaff/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>
			<header className="firestaff-sim-hero">
				<div>
					<h1 className="typo-h1">Mô phỏng tình huống cháy</h1>
					<p className="typo-body-md text-secondary">Tạo và chạy mô phỏng để kiểm tra tuyến thoát hiểm</p>
				</div>
			</header>

			<section className="firestaff-sim-layout">
				<article className="firestaff-panel firestaff-sim-control-card">
					<h2 className="typo-h2 firestaff-section-title">Điều khiển mô phỏng</h2>

					<label className="typo-body-md firestaff-sim-label" htmlFor="simulation-floor-select">
						Chọn tầng
					</label>
					<select
						id="simulation-floor-select"
						className="firestaff-sim-select typo-body-md"
						value={selectedFloor}
						onChange={(event) => setSelectedFloor(event.target.value)}
					>
						{floorsList.map((floor) => (
							<option key={floor} value={floor}>
								{floor}
							</option>
						))}
					</select>

					<label className="typo-body-md firestaff-sim-label" htmlFor="simulation-fire-position">
						Vị trí cháy
					</label>
					<select
						id="simulation-fire-position"
						className="firestaff-sim-select typo-body-md"
						value={fireOrigin}
						onChange={(event) => setFireOrigin(event.target.value)}
					>
						<option value="">-- Chọn vị trí cháy --</option>
						{currentFloorDoors.map((doorName) => {
							let label = doorName;
							if (doorName.toLowerCase().includes('cua_phong')) {
								const match = doorName.match(/\d+/);
								if (match) {
									const rawNum = match[0].substring(0, 2);
									const roomIdx = parseInt(rawNum, 10);
									if (!isNaN(roomIdx)) {
										if (selectedFloor === 'Tầng trệt') {
											label = `Cửa phòng ${String(roomIdx).padStart(3, '0')}`;
										} else {
											const floorNum = selectedFloor.replace('Tầng ', '');
											label = `Cửa phòng ${floorNum}${String(roomIdx).padStart(2, '0')}`;
										}
									}
								}
							}
							return (
								<option key={doorName} value={doorName}>
									{label}
								</option>
							);
						})}
					</select>

					<label className="typo-body-md firestaff-sim-label" htmlFor="simulation-fire-level">
						Mức độ cháy
					</label>
					<select
						id="simulation-fire-level"
						className="firestaff-sim-select typo-body-md"
						value={fireLevel}
						onChange={(event) => setFireLevel(event.target.value)}
					>
						<option value="low">Thấp</option>
						<option value="medium">Trung bình</option>
						<option value="high">Cao</option>
					</select>

					<button
						type="button"
						className="firestaff-sim-start-btn typo-body-lg"
						style={hasSimulated ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}
						onClick={hasSimulated ? handleStopSimulation : handleStartSimulation}
						disabled={!fireOrigin}
					>
						{hasSimulated ? (
							<span>Dừng mô phỏng</span>
						) : (
							<>
								<Play size={18} weight="bold" />
								<span>Bắt đầu mô phỏng</span>
							</>
						)}
					</button>
				</article>

				<article className="firestaff-panel firestaff-sim-map-card">
					<h2 className="typo-h2 firestaff-section-title">Khu vực mô phỏng</h2>
					<div className="firestaff-sim-map-surface" aria-label="Khu vực mô phỏng cháy">
						<div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
							<BuildingModelViewer
								className="resident-home-model"
								showHeader={false}
								showCaption={false}
								ariaLabel="Khu vực mô hình 3D"
								highlightExits={true}
								selectedFloorId={selectedFloorId}
								onDoorsLoaded={setDoorsByFloor}
								simulationActive={hasSimulated}
								simulationOrigin={fireOrigin}
								simulationLevel={fireLevel}
							/>
						</div>
					</div>

					<p className="typo-body-md text-secondary firestaff-sim-result">
						{hasSimulated
							? 'Hệ thống đang chạy kịch bản mô phỏng tình huống cháy.'
							: 'Chọn tầng và vị trí cửa phòng để bắt đầu chạy mô phỏng.'}
					</p>
				</article>
			</section>

			<FireStaffBottomNav />
		</main>
	);
}

export default FireStaffSimulationPage;
