export async function fetchFireStaffTaskFilterOptions() {
  try {
    const response = await fetch('/api/tasks/filter-options');
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success) {
      return payload.data;
    }
  } catch (error) {
    console.error("Lỗi lấy tùy chọn lọc nhiệm vụ:", error);
  }

  // Tùy chọn mặc định khi gặp lỗi
  return {
    statuses: [
      { value: "pending", label: "Chờ thực hiện" },
      { value: "in_progress", label: "Đang thực hiện" },
      { value: "completed", label: "Hoàn thành" }
    ],
    priorities: [
      { value: "low", label: "Thấp" },
      { value: "medium", label: "Trung bình" },
      { value: "high", label: "Cao" },
      { value: "critical", label: "Khẩn cấp" }
    ],
    categories: [
      { value: "Kiểm tra", label: "Kiểm tra" },
      { value: "Bảo trì", label: "Bảo trì" }
    ]
  };
}

export async function fetchFireStaffTaskList(filters = {}) {
  try {
    const query = new URLSearchParams();
    if (filters.status && filters.status !== "all") {
      query.append("status", filters.status);
    }
    if (filters.keyword) {
      query.append("keyword", filters.keyword);
    }

    const response = await fetch(`/api/tasks?${query.toString()}`);
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success) {
      return payload.data;
    }
  } catch (error) {
    console.error("Lỗi lấy danh sách nhiệm vụ:", error);
  }

  return {
    total: 0,
    filtered: 0,
    items: []
  };
}

export async function updateFireStaffTaskStatus(taskId, nextStatus) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: nextStatus })
  });
  
  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error(payload.message || 'Lỗi cập nhật trạng thái nhiệm vụ');
}

export async function createTask(taskData) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });

  const payload = await response.json().catch(() => ({}));
  if (response.ok && payload.success) {
    return payload.data;
  }
  throw new Error(payload.message || 'Lỗi tạo nhiệm vụ');
}

export async function fetchFireStaffUsers() {
  try {
    const response = await fetch('/api/accounts?role=firestaff&status=active');
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success) {
      return payload.data || [];
    }
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên PCCC:', error);
  }
  return [];
}

