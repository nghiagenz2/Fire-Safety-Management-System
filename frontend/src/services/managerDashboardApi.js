import axios from "axios";

const API_BASE = "http://localhost:5000/api/manager/dashboard";

export async function getManagerDashboardFilterOptions() {
  const response = await axios.get(`${API_BASE}/filters`);
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error("Lỗi tải bộ lọc");
}

export async function getManagerDashboardData(filters, customRange) {
  const response = await axios.post(`${API_BASE}/data`, {
    ...filters,
    ...customRange,
  });
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error("Lỗi tải dữ liệu");
}
