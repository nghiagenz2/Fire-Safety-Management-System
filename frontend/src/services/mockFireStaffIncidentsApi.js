import fireStaffIncidents from '../mocks/fireStaffIncidents.json';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/incidents`;

export async function fetchFireStaffIncidents() {
  try {
    const response = await axios.get(API_BASE);
    if (response.data && response.data.success) {
      return response.data.data;
    }
  } catch (error) {
    console.error("Failed to fetch incidents from DB, falling back to mock:", error);
  }
  return [...(fireStaffIncidents.incidents || [])];
}

export function fetchFireStaffIncidentUpdates() {
  return [...(fireStaffIncidents.updates || [])];
}

export function fetchFireStaffIncidentUiMeta() {
  return { ...(fireStaffIncidents.uiMeta || {}) };
}

export function fetchFireStaffFallbackProcessingSteps() {
  return [...(fireStaffIncidents.fallbackProcessingSteps || [])];
}
