const API_BASE = `${import.meta.env.VITE_API_URL}/api/dashboard`;

export async function getManagerDashboardFilterOptions() {
  const response = await fetch(`${API_BASE}/filters`);
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error("Lỗi tải bộ lọc");
}

export async function getManagerDashboardData(filters, customRange) {
  const response = await fetch(`${API_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...filters,
      ...customRange,
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error("Lỗi tải dữ liệu");
}
