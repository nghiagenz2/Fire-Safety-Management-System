import { useEffect, useState } from 'react';

/**
 * Hook lắng nghe trạng thái mô phỏng cháy qua SSE stream.
 * Trả về: { isSimulationActive, simulationFloor, simulationOrigin }
 */
export function useSimulationStatus() {
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationFloor, setSimulationFloor] = useState('');
  const [simulationOrigin, setSimulationOrigin] = useState('');

  useEffect(() => {
    let eventSource;
    let retryTimeout;

    function connect() {
      eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/api/incidents/simulation/stream`);

      eventSource.onmessage = (event) => {
        try {
          const state = JSON.parse(event.data);
          setIsSimulationActive(!!state.active);

          // Chuyển floorId thành tên tầng
          if (state.floorId) {
            if (state.floorId === 'floor_tret') {
              setSimulationFloor('Tầng trệt');
            } else {
              const num = state.floorId.replace('floor_', '');
              setSimulationFloor(`Tầng ${num}`);
            }
          }
          setSimulationOrigin(state.origin || '');
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Retry sau 5 giây nếu mất kết nối
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);

  return { isSimulationActive, simulationFloor, simulationOrigin };
}
