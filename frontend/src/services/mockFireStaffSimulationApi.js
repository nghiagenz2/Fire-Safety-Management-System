import fireStaffSimulationConfig from '../mocks/fireStaffSimulationConfig.json';

const MOCK_LATENCY_MS = 450;

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

export function fetchFireStaffSimulationConfig() {
  return resolveAfterDelay({ ...fireStaffSimulationConfig });
}
