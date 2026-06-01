import { useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, NotePencil, User, WarningCircle } from '@phosphor-icons/react';
import axios from 'axios';
import Header from '../../components/Header';
import FireStaffBottomNav from '../../components/firestaff/FireStaffBottomNav.jsx';
import { fetchFireStaffIncidents } from '../../services/mockFireStaffIncidentsApi.js';
import { getSimulationIncident } from '../../services/managerIncidentsApi.js';
import { getCurrentUser } from '../../services/authApi';

function getFloorInfo(floorValue) {
	const str = String(floorValue || '').toLowerCase();
	const isTret = str.includes('tret') || str.includes('trệt');
	let num = '';
	if (!isTret) {
		const match = str.match(/\d+/);
		if (match) {
			num = match[0];
		}
	}
	return { isTret, num };
}

function translateDoorNamesInText(text, floorValue) {
	if (!text) return '';
	const { isTret, num } = getFloorInfo(floorValue);
	
	return text.replace(/Cua_Phong_(\d+)/gi, (match, digits) => {
		const rawNum = digits.substring(0, 2);
		const roomIdx = parseInt(rawNum, 10);
		if (isNaN(roomIdx)) return match;
		
		if (isTret) {
			return `Cửa phòng ${String(roomIdx).padStart(3, '0')}`;
		} else {
			return `Cửa phòng ${num}${String(roomIdx).padStart(2, '0')}`;
		}
	});
}

function FireStaffIncidentPage() {
	const [incidents, setIncidents] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [resolvedIds, setResolvedIds] = useState([]);
	const [detailIncidentId, setDetailIncidentId] = useState('');

	useEffect(() => {
		let isMounted = true;

		Promise.all([
			fetchFireStaffIncidents(),
			getSimulationIncident()
		])
			.then(([incidentData, simulationIncident]) => {
				if (!isMounted) {
					return;
				}

				const combinedIncidents = [
					...(simulationIncident ? [simulationIncident] : []),
					...incidentData
				];

				setIncidents(combinedIncidents);
				const initialResolved = combinedIncidents
					.filter((incident) => incident.status === 'resolved')
					.map((incident) => incident.id);
				setResolvedIds(initialResolved);
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

	const incidentCards = useMemo(() => {
		return incidents.map((incident) => {
			const isResolved = resolvedIds.includes(incident.id) || incident.status === 'resolved';
			
			let occurredAtStr = '—';
			if (incident.occurredAt) {
				const date = new Date(incident.occurredAt);
				if (!isNaN(date.getTime())) {
					const yyyy = date.getFullYear();
					const mm = String(date.getMonth() + 1).padStart(2, '0');
					const dd = String(date.getDate()).padStart(2, '0');
					const hh = String(date.getHours()).padStart(2, '0');
					const min = String(date.getMinutes()).padStart(2, '0');
					occurredAtStr = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
				}
			}

			let severityLabel = incident.severity || 'Trung bình';
			let severityClass = 'medium';
			if (incident.severity === 'high' || incident.severity === 'Nguy cơ cao') {
				severityLabel = 'Cao';
				severityClass = 'danger';
			} else if (incident.severity === 'medium' || incident.severity === 'Trung bình') {
				severityLabel = 'Trung bình';
				severityClass = 'medium';
			} else if (incident.severity === 'low' || incident.severity === 'Thấp') {
				severityLabel = 'Thấp';
				severityClass = 'low';
			}

			const floorValue = incident.floor || 'Tầng trệt';
			const rawSummary = incident.summary || incident.incident_type || incident.title || 'Sự cố PCCC';
			const rawDetail = incident.detail || incident.description || 'Phát hiện sự cố cảnh báo từ cảm biến hệ thống.';

			return {
				id: incident.id,
				displayId: incident.displayId || incident.id,
				summary: translateDoorNamesInText(rawSummary, floorValue),
				severityLabel,
				severityClass,
				occurredAt: occurredAtStr,
				locationLabel: translateDoorNamesInText(floorValue, floorValue),
				assignee: incident.assignee || 'Đội trực ca PCCC',
				sourceLabel: incident.id === 'SIM-FIRE-ACTIVE' ? 'Hệ thống mô phỏng' : (incident.sourceLabel || 'Hệ thống báo cháy'),
				detail: translateDoorNamesInText(rawDetail, floorValue),
				isResolved
			};
		});
	}, [incidents, resolvedIds]);

	const detailIncident = useMemo(() => {
		if (!detailIncidentId) {
			return null;
		}

		return incidentCards.find((incident) => incident.id === detailIncidentId) || null;
	}, [detailIncidentId, incidentCards]);

	async function markIncidentResolved(incidentId) {
		const currentUser = getCurrentUser();
		const assigneeName = currentUser?.fullName || 'Đội trực ca PCCC';
		try {
			await axios.put(`http://localhost:5000/api/incidents/${incidentId}`, { 
				status: 'resolved',
				assignee: assigneeName
			});
		} catch (error) {
			console.error("Lỗi khi cập nhật trạng thái sự cố:", error);
		}
		
		setIncidents((prevIncidents) => 
			prevIncidents.map((inc) => 
				inc.id === incidentId 
					? { ...inc, status: 'resolved', assignee: assigneeName } 
					: inc
			)
		);

		setResolvedIds((previous) => {
			if (previous.includes(incidentId)) {
				return previous;
			}
			return [...previous, incidentId];
		});
	}
	return (
		<main className="firestaff-screen">
			<Header roleLabel="Nhân viên PCCC" homePath="/firestaff/home" />
			<div className="app-header-spacer" aria-hidden="true"></div>
			<header className="firestaff-sim-hero">
				<div>
					<h1 className="typo-h1">Xử lý Sự cố</h1>
					<p className="typo-body-md text-secondary">Theo dõi và xử lý các sự cố cháy thực tế</p>
				</div>
			</header>

			<section className="firestaff-incident-list" aria-live="polite">
				{isLoading && (
					<article className="firestaff-panel firestaff-incident-card firestaff-incident-skeleton" />
				)}

				{!isLoading &&
					incidentCards.map((incident) => {
						const statusLabel = incident.isResolved ? 'Đã xử lý' : 'Đang xử lý';
						const statusClass = incident.isResolved ? 'resolved' : 'in-progress';

						return (
							<article key={incident.id} className="firestaff-panel firestaff-incident-card">
								<div className="firestaff-incident-head">
									<h2 className="typo-h2 firestaff-incident-id">{incident.displayId}</h2>
									<div className="firestaff-incident-badges">
										<span className={`firestaff-incident-badge status-${statusClass} typo-label`}>{statusLabel}</span>
										{incident.sourceLabel && (
											<span className="firestaff-incident-badge source typo-label">{incident.sourceLabel}</span>
										)}
									</div>
								</div>

								<p className="typo-body-lg firestaff-incident-summary">{incident.summary}</p>

								<div className="firestaff-incident-meta typo-body-md">
									<p>
										<Clock size={18} />
										<span>{incident.occurredAt}</span>
									</p>
									<p>
										<MapPin size={18} />
										<span>{incident.locationLabel}</span>
									</p>
									<p>
										<WarningCircle size={18} />
										<span>Mức độ: {incident.severityLabel}</span>
									</p>
									<p>
										<User size={18} />
										<span>Phụ trách: {incident.assignee}</span>
									</p>
								</div>

								<div className="firestaff-incident-actions">
									{!incident.isResolved && (
										<button
											type="button"
											className="firestaff-incident-btn success typo-body-md"
											onClick={() => markIncidentResolved(incident.id)}
										>
											Đánh dấu đã xử lý
										</button>
									)}
									<button type="button" className="firestaff-incident-btn typo-body-md">
										<NotePencil size={16} />
										<span>Ghi log</span>
									</button>
									<button
										type="button"
										className="firestaff-incident-btn typo-body-md"
										onClick={() => setDetailIncidentId(incident.id)}
									>
										Chi tiết
									</button>
								</div>
							</article>
						);
					})}

				{!isLoading && incidentCards.length === 0 && (
					<article className="firestaff-panel firestaff-incident-card">
						<p className="typo-body-md text-secondary">Chưa có sự cố nào để hiển thị.</p>
					</article>
				)}
			</section>

			{detailIncident && (
				<section
					className="firestaff-incident-detail-backdrop"
					role="dialog"
					aria-modal="true"
					aria-label="Chi tiết sự cố"
				>
					<article className="firestaff-panel firestaff-incident-detail-modal">
						<header className="firestaff-incident-detail-header">
							<div>
								<h2 className="typo-h2">Chi tiết sự cố {detailIncident.displayId}</h2>
								<p className="typo-body-md text-secondary">{detailIncident.summary}</p>
							</div>
							<button
								type="button"
								className="firestaff-incident-btn typo-body-md"
								onClick={() => setDetailIncidentId('')}
							>
								Đóng
							</button>
						</header>

						<div className="firestaff-incident-detail-content typo-body-md">
							<p>
								<strong>Mức độ:</strong> {detailIncident.severityLabel}
							</p>
							<p>
								<strong>Thời gian:</strong> {detailIncident.occurredAt}
							</p>
							<p>
								<strong>Vị trí:</strong> {detailIncident.locationLabel}
							</p>
							<p>
								<strong>Phụ trách:</strong> {detailIncident.assignee}
							</p>
							<p>
								<strong>Mô tả:</strong> {detailIncident.detail}
							</p>
						</div>
					</article>
				</section>
			)}

			<FireStaffBottomNav />
		</main>
	);
}

export default FireStaffIncidentPage;
