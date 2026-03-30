import fireStaffIncidents from '../mocks/fireStaffIncidents.json';

const MOCK_LATENCY_MS = 450;

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

export function fetchFireStaffIncidents() {
  return resolveAfterDelay([...(fireStaffIncidents.incidents || [])]);
}

export function fetchFireStaffIncidentUpdates() {
  return resolveAfterDelay([...(fireStaffIncidents.updates || [])]);
}

export function fetchFireStaffIncidentUiMeta() {
  return resolveAfterDelay({ ...(fireStaffIncidents.uiMeta || {}) });
}

export function fetchFireStaffFallbackProcessingSteps() {
  return resolveAfterDelay([...(fireStaffIncidents.fallbackProcessingSteps || [])]);
}
