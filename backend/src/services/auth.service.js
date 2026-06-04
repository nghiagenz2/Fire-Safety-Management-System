const authRepository = require('../repositories/auth.repository');

const ROLE_LABEL = {
  resident: 'Cư dân',
  firestaff: 'Nhân viên PCCC',
  manager: 'Quản lý'
};

function toPublicUser(user) {
  return {
    id: user.id,
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABEL[user.role] || 'Chưa phân quyền'
  };
}

async function login({ login, email, username, password } = {}) {
  const loginValue = String(login || email || username || '').trim();
  const passwordValue = String(password || '');

  if (!loginValue || !passwordValue) {
    const error = new Error('Vui lòng nhập tài khoản và mật khẩu.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findByLogin(loginValue);

  if (!user || user.password !== passwordValue) {
    const error = new Error('Tài khoản hoặc mật khẩu không đúng.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Tài khoản đã bị khóa hoặc ngưng hoạt động.');
    error.statusCode = 403;
    throw error;
  }

  return {
    user: toPublicUser(user)
  };
}

module.exports = {
  login
};
