import axios from "axios";

const API_BASE = "http://localhost:5000/api/manager/incidents";

export async function getManagerIncidentsData() {
  const response = await axios.get(`${API_BASE}`);
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error("Lỗi tải dữ liệu sự cố");
}
