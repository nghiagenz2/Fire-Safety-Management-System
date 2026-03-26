import residentGuides from '../mocks/residentGuides.json';

const MOCK_LATENCY_MS = 450;

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

export function fetchResidentGuides() {
  return resolveAfterDelay([...residentGuides]);
}
