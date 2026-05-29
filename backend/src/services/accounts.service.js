const accountsRepository = require('../repositories/accounts.repository');

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

function resolveStatus(account, preferredStatus) {
  if (preferredStatus === 'locked') return 'locked';
  return account.isActive ? 'active' : 'inactive';
}

function decorateAccount(account, preferredStatus) {
  if (!account) return null;

  const status = resolveStatus(account, preferredStatus);

  return {
    ...account,
    roleLabel: ROLE_LABEL[account.role] || 'Chưa phân quyền',
    status,
    statusLabel: STATUS_LABEL[status] || 'Không xác định'
  };
}

function normalizeAccountInput(input = {}) {
  const status = input.status || 'active';

  return {
    fullName: input.fullName || '',
    username: input.username || '',
    password: input.password || '',
    email: input.email || '',
    phone: input.phone || '',
    role: input.role || 'resident',
    isActive: status === 'active'
  };
}

async function getAccounts(filters) {
  const accounts = await accountsRepository.findAll(filters);
  return accounts.map((account) => decorateAccount(account));
}

async function getAccountById(id) {
  return decorateAccount(await accountsRepository.findById(id));
}

async function createAccount(payload) {
  const account = await accountsRepository.create(normalizeAccountInput(payload));
  return decorateAccount(account, payload.status);
}

async function updateAccount(id, payload) {
  const updates = { ...payload };

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    updates.isActive = updates.status === 'active';
    delete updates.status;
  }

  if (!updates.password) {
    delete updates.password;
  }

  const account = await accountsRepository.update(id, updates);
  return decorateAccount(account, payload.status);
}

async function assignRole(id, role) {
  const account = await accountsRepository.update(id, { role });
  return decorateAccount(account);
}

async function setLock(id, shouldLock) {
  const account = await accountsRepository.update(id, { isActive: !shouldLock });
  return decorateAccount(account, shouldLock ? 'locked' : 'active');
}

async function deleteAccount(id) {
  return accountsRepository.remove(id);
}

function getRoles() {
  return Object.keys(ROLE_LABEL).map((role) => ({
    value: role,
    label: ROLE_LABEL[role]
  }));
}

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  assignRole,
  setLock,
  deleteAccount,
  getRoles
};
