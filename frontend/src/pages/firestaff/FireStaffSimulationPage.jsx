import { useEffect, useMemo, useState } from 'react';
import { Fire, Play } from '@phosphor-icons/react';
import FireStaffBottomNav from '../../components/firestaff/FireStaffBottomNav.jsx';
import { fetchFireStaffSimulationConfig } from '../../services/mockFireStaffSimulationApi.js';

function FireStaffSimulationPage() {
	const [simulationAreas, setSimulationAreas] = useState([]);
	const [areaToPoint, setAreaToPoint] = useState({});
	const [safeExits, setSafeExits] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedFloor, setSelectedFloor] = useState('Tầng 1');
	const [fireOrigin, setFireOrigin] = useState('');
	const [fireLevel, setFireLevel] = useState('medium');
	const [hasSimulated, setHasSimulated] = useState(false);

	useEffect(() => {
		let isMounted = true;

		fetchFireStaffSimulationConfig()
			.then((config) => {
				if (!isMounted) {
					return;
				}

				setSimulationAreas(config.simulationAreas || []);
				setAreaToPoint(config.areaToPoint || {});
				setSafeExits(config.safeExits || []);
				setFireOrigin(config.defaultFireOrigin || '');
			})
			.finally(() => {
				if (isMounted) {
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const spreadByLevel = {
		low: 1,
		medium: 2,
		high: 3
	};

	const spreadLevel = spreadByLevel[fireLevel];

	const riskAreas = useMemo(() => {
		if (!hasSimulated || !fireOrigin || !areaToPoint[fireOrigin]) {
			return [];
		}

		const [fireRow, fireCol] = areaToPoint[fireOrigin];
		return simulationAreas.filter((area) => {
			if (!areaToPoint[area]) {
				return false;
			}

			const [row, col] = areaToPoint[area];
			const distance = Math.abs(row - fireRow) + Math.abs(col - fireCol);
			return distance <= spreadLevel;
		});
	}, [hasSimulated, simulationAreas, areaToPoint, fireOrigin, spreadLevel]);

	const optimalRoute = useMemo(() => {
		if (!fireOrigin || !areaToPoint[fireOrigin] || safeExits.length === 0) {
			return [];
		}

		const [fireRow, fireCol] = areaToPoint[fireOrigin];
		const chosenExit = safeExits
			.map((exit) => {
				if (!areaToPoint[exit]) {
					return { exit, distance: Number.POSITIVE_INFINITY };
				}

				const [exitRow, exitCol] = areaToPoint[exit];
				return { exit, distance: Math.abs(exitRow - fireRow) + Math.abs(exitCol - fireCol) };
			})
			.sort((a, b) => a.distance - b.distance)[0].exit;

		return [fireOrigin, 'B5', 'A5', chosenExit].filter((value, index, arr) => arr.indexOf(value) === index);
	}, [areaToPoint, fireOrigin, safeExits]);

	function handleStartSimulation() {
		if (!fireOrigin) {
			return;
		}

		setHasSimulated(true);
	}

	return (
		<main className="firestaff-screen">
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
						<option value="Tầng 1">Tầng 1</option>
						<option value="Tầng 2">Tầng 2</option>
						<option value="Tầng 3">Tầng 3</option>
					</select>

					<label className="typo-body-md firestaff-sim-label" htmlFor="simulation-fire-position">
						Vị trí cháy
					</label>
					<input
						id="simulation-fire-position"
						className="firestaff-sim-input typo-body-md"
						value={fireOrigin}
						placeholder="Click vào bản đồ để chọn"
						readOnly
					/>

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
						onClick={handleStartSimulation}
						disabled={isLoading || !fireOrigin}
					>
						<Play size={18} weight="bold" />
						<span>Bắt đầu mô phỏng</span>
					</button>
				</article>

				<article className="firestaff-panel firestaff-sim-map-card">
					<h2 className="typo-h2 firestaff-section-title">Khu vực mô phỏng</h2>
					<div className="firestaff-sim-map-surface" aria-label="Khu vực mô phỏng cháy">
						{!hasSimulated && (
							<div className="firestaff-sim-placeholder">
								<Fire size={64} weight="duotone" />
								<p className="typo-body-lg">Chọn các thông số và bắt đầu mô phỏng</p>
								<p className="typo-body-md text-secondary">Vùng cháy và tuyến thoát sẽ được hiển thị ở đây</p>
							</div>
						)}

						{hasSimulated && (
							<div className="firestaff-sim-grid">
								{simulationAreas.map((area) => {
									const isOrigin = area === fireOrigin;
									const isRisk = riskAreas.includes(area);
									const isRoute = optimalRoute.includes(area);
									const className = `firestaff-sim-cell typo-label ${
										isOrigin ? 'fire' : isRisk ? 'danger' : isRoute ? 'route' : ''
									}`;

									return (
										<button
											type="button"
											key={area}
											className={className}
											onClick={() => {
												setFireOrigin(area);
												setHasSimulated(false);
											}}
										>
											{area}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<p className="typo-body-md text-secondary firestaff-sim-result">
						{hasSimulated
							? `Tuyến đề xuất: ${optimalRoute.join(' → ') || '--'}`
							: 'Chọn vị trí cháy trên bản đồ sau khi chạy mô phỏng để điều chỉnh kịch bản.'}
					</p>
					{isLoading && <p className="typo-label text-secondary">Đang tải cấu hình mô phỏng...</p>}
				</article>
			</section>

			<FireStaffBottomNav />
		</main>
	);
}

export default FireStaffSimulationPage;
