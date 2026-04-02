import managerAccounts from '../mocks/managerAccounts.json';

const MOCK_LATENCY_MS = 400;

const ROLE_LABEL = {
  resident: 'Cư dân',
  manager: 'Quản lý',
  firestaff: 'Nhân viên PCCC'
};

const STATUS_LABEL = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  locked: 'Đã khóa'
};

let accountsStore = (managerAccounts || []).map((item) => ({
  ...item,
  roleLabel: item.roleLabel || ROLE_LABEL[item.role] || 'Chưa phân quyền',
  statusLabel: item.statusLabel || STATUS_LABEL[item.status] || 'Không xác định'
}));

function resolveAfterDelay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getCurrentTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function getManagerAccounts() {
  return resolveAfterDelay(clone(accountsStore));
}

export function getManagerAccountById(accountId) {
  const account = accountsStore.find((item) => item.id === accountId);
  return resolveAfterDelay(account ? clone(account) : null);
}

export function filterManagerAccounts(filters = {}) {
  const { keyword, role, status } = filters;
  const normalizedKeyword = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';

  const filtered = accountsStore.filter((account) => {
    const matchKeyword =
      normalizedKeyword.length === 0 ||
      account.fullName.toLowerCase().includes(normalizedKeyword) ||
      account.username.toLowerCase().includes(normalizedKeyword) ||
      account.roleLabel.toLowerCase().includes(normalizedKeyword);

    const matchRole = role === 'all' || !role || account.role === role;
    const matchStatus = status === 'all' || !status || account.status === status;

    return matchKeyword && matchRole && matchStatus;
  });

  return resolveAfterDelay(clone(filtered));
}

export function createManagerAccount(payload) {
  const account = {
    id: `ACC-${String(Date.now()).slice(-6)}`,
    fullName: payload.fullName || '',
    username: payload.username || '',
    password: payload.password || '',
    email: payload.email || '',
    phone: payload.phone || '',
    role: payload.role || 'resident',
    roleLabel: ROLE_LABEL[payload.role] || 'Cư dân',
    status: payload.status || 'active',
    statusLabel: STATUS_LABEL[payload.status] || 'Đang hoạt động',
    lastActiveAt: getCurrentTimestamp()
  };

  accountsStore.unshift(account);
  return resolveAfterDelay(clone(account));
}

export function updateManagerAccount(accountId, updates) {
  const index = accountsStore.findIndex((item) => item.id === accountId);

  if (index === -1) {
    return resolveAfterDelay(null);
  }

  const updatedRole = updates.role ?? accountsStore[index].role;
  const updatedStatus = updates.status ?? accountsStore[index].status;

  const updated = {
    ...accountsStore[index],
    ...updates,
    role: updatedRole,
    roleLabel: ROLE_LABEL[updatedRole] || accountsStore[index].roleLabel,
    status: updatedStatus,
    statusLabel: STATUS_LABEL[updatedStatus] || accountsStore[index].statusLabel
  };

  accountsStore[index] = updated;
  return resolveAfterDelay(clone(updated));
}

export function assignManagerAccountRole(accountId, role) {
  return updateManagerAccount(accountId, { role });
}

export function setManagerAccountLock(accountId, shouldLock) {
  return updateManagerAccount(accountId, {
    status: shouldLock ? 'locked' : 'active'
  });
}

export function deleteManagerAccount(accountId) {
  const index = accountsStore.findIndex((item) => item.id === accountId);

  if (index === -1) {
    return resolveAfterDelay(false);
  }

  accountsStore.splice(index, 1);
  return resolveAfterDelay(true);
}

export function getManagerRoles() {
  const roles = Object.keys(ROLE_LABEL).map((role) => ({
    value: role,
    label: ROLE_LABEL[role]
  }));

  return resolveAfterDelay(roles);
}
