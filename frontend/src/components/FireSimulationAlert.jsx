import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ModelLocationModal from './three/ModelLocationModal.jsx';
import './FireSimulationAlert.css';

function floorNameFromId(floorId = '') {
  if (floorId === 'floor_tret') return 'Tầng trệt';
  const match = String(floorId).match(/^floor_(\d+)$/);
  if (match) return `Tầng ${match[1]}`;
  return floorId || 'khu vực chưa xác định';
}

function getFriendlyDoorName(doorName, floorId) {
  if (!doorName) return '';
  if (doorName === 'Vị trí mặc định (Node 1)') return doorName;
  if (!doorName.toLowerCase().includes('cua_phong')) return doorName;

  const match = doorName.match(/\d+/);
  if (!match) return doorName;

  const rawNum = match[0].substring(0, 2);
  const roomIdx = parseInt(rawNum, 10);
  if (isNaN(roomIdx)) return doorName;

  const isTret = floorId === 'floor_tret' || floorId?.toLowerCase().includes('tret');
  if (isTret) {
    const roomNum = String(roomIdx).padStart(3, '0');
    return `Cửa phòng ${roomNum}`;
  } else {
    const num = String(floorId).replace('floor_', '').replace('Tang ', '').trim();
    const roomNum = String(roomIdx).padStart(2, '0');
    return `Cửa phòng ${num}${roomNum}`;
  }
}

function FireSimulationAlert() {
  const location = useLocation();
  const [simulation, setSimulation] = useState({ active: false });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const audience = useMemo(() => {
    if (location.pathname.startsWith('/resident')) return 'resident';
    if (location.pathname.startsWith('/manager')) return 'manager';
    return '';
  }, [location.pathname]);

  useEffect(() => {
    if (!audience) return undefined;

    let eventSource = null;
    let reconnectTimer = null;

    const connect = () => {
      eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/api/incidents/simulation/stream`);

      eventSource.onmessage = (event) => {
        try {
          const nextState = JSON.parse(event.data);
          setSimulation(nextState);
          if (nextState.active) {
            setIsDismissed(false);
          } else {
            setIsModelOpen(false);
          }
        } catch (error) {
          console.error('Failed to parse simulation alert event:', error);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimer = window.setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, [audience]);

  if (!audience || !simulation.active || isDismissed) {
    return null;
  }

  const floorName = floorNameFromId(simulation.floorId);
  const escapePath = audience === 'resident' ? '/resident/escape' : '/manager/escape';
  const secondaryPath = audience === 'resident' ? '/resident/guidance' : '/manager/incidents';
  const secondaryLabel = audience === 'resident' ? 'Xem hướng dẫn thoát hiểm' : 'Xem sự cố';

  return (
    <>
      <section className="fire-sim-alert" role="alert" aria-live="assertive">
        <button type="button" className="fire-sim-alert-close" aria-label="Đóng cảnh báo" onClick={() => setIsDismissed(true)}>
          ×
        </button>
        <p className="typo-h2 fire-sim-alert-title">CẢNH BÁO: PHÁT HIỆN CHÁY TẠI {floorName.toUpperCase()}</p>
        <p className="typo-body-md fire-sim-alert-copy">
          {simulation.origin
            ? `Vị trí mô phỏng: ${getFriendlyDoorName(simulation.origin, simulation.floorId)}. Ưu tiên xem lối thoát an toàn trước, sau đó xem hướng dẫn thao tác tại hiện trường.`
            : 'Ưu tiên xem lối thoát an toàn trước, sau đó xem hướng dẫn thao tác tại hiện trường.'}
        </p>

        <div className="fire-sim-alert-actions">
          <button type="button" className="fire-sim-alert-btn fire-sim-alert-primary typo-label" onClick={() => setIsModelOpen(true)}>
            Mở chỉ đường 3D
          </button>
          <Link to={escapePath} className="fire-sim-alert-btn fire-sim-alert-danger typo-label">
            Xem lối thoát an toàn
          </Link>
          <Link to={secondaryPath} className="fire-sim-alert-btn fire-sim-alert-secondary typo-label">
            {secondaryLabel}
          </Link>
        </div>
      </section>

      <ModelLocationModal
        isOpen={isModelOpen}
        title={`Chỉ đường thoát hiểm - ${floorName}`}
        subtitle={simulation.origin ? `Vị trí cháy: ${getFriendlyDoorName(simulation.origin, simulation.floorId)}` : 'Mô phỏng cháy đang hoạt động'}
        selectedFloorId={simulation.floorId || 'all'}
        highlightExits={true}
        onClose={() => setIsModelOpen(false)}
      />
    </>
  );
}

export default FireSimulationAlert;
