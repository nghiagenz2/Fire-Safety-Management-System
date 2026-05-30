import { useEffect, useMemo, useState } from 'react';
import { LockKey, MagnifyingGlass, NotePencil, Plus, Trash } from '@phosphor-icons/react';
import Header from '../../components/Header';
import ManagerBottomNav from '../../components/manager/ManagerBottomNav';
import {
  createManagerAccount,
  deleteManagerAccount,
  getManagerAccounts,
  getManagerRoles,
  setManagerAccountLock,
  updateManagerAccount
} from '../../services/managerAccountsApi';
import '../../styles/manager-shell.css';

const statusFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngưng hoạt động' },
  { value: 'locked', label: 'Đã khóa' }
];

const initialFormState = {
  fullName: '',
  username: '',
  password: '',
  email: '',
  phone: '',
  role: 'resident',
  status: 'active'
};

function ManagerAccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [formState, setFormState] = useState(initialFormState);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [accountsData, roleData] = await Promise.all([
          getManagerAccounts(),
          getManagerRoles()
        ]);
        setAccounts(accountsData);
        setRoles(roleData);
      } catch (error) {
        console.error('Failed to load manager accounts:', error);
        setErrorMessage(error.message || 'Không tải được danh sách tài khoản.');
        setAccounts([]);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAccounts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        account.fullName.toLowerCase().includes(normalizedKeyword) ||
        account.username.toLowerCase().includes(normalizedKeyword) ||
        account.roleLabel.toLowerCase().includes(normalizedKeyword);
      const matchesRole = roleFilter === 'all' || account.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;

      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [accounts, keyword, roleFilter, statusFilter]);

  const openCreateForm = () => {
    setEditingAccountId(null);
    setFormState({ ...initialFormState, role: roles[0]?.value || 'resident' });
    setIsFormOpen(true);
  };

  const openEditForm = (account) => {
    setEditingAccountId(account.id);
    setFormState({
      fullName: account.fullName,
      username: account.username,
      password: account.password || '',
      email: account.email,
      phone: account.phone,
      role: account.role,
      status: account.status
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAccountId(null);
    setFormState(initialFormState);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();

    const payload = {
      ...formState,
      fullName: formState.fullName.trim(),
      username: formState.username.trim(),
      email: formState.email.trim(),
      phone: formState.phone.trim()
    };

    if (!payload.fullName || !payload.username || !payload.email || !payload.phone) {
      return;
    }

    try {
      setErrorMessage('');
      if (editingAccountId) {
        await updateManagerAccount(editingAccountId, payload);
      } else {
        await createManagerAccount(payload);
      }

      const nextAccounts = await getManagerAccounts();
      setAccounts(nextAccounts);
      closeForm();
    } catch (error) {
      console.error('Failed to save manager account:', error);
      setErrorMessage(error.message || 'Không lưu được tài khoản.');
    }
  };

  const handleToggleLock = async (account) => {
    const shouldLock = account.status !== 'locked';
    const message = shouldLock
      ? `Khóa tài khoản ${account.fullName}?`
      : `Mở khóa tài khoản ${account.fullName}?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      setErrorMessage('');
      const updated = await setManagerAccountLock(account.id, shouldLock);

      if (!updated) {
        return;
      }

      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? updated : item))
      );
    } catch (error) {
      console.error('Failed to toggle account lock:', error);
      setErrorMessage(error.message || 'Không cập nhật được trạng thái tài khoản.');
    }
  };

  const handleDeleteAccount = async (account) => {
    if (!window.confirm(`Xóa tài khoản ${account.fullName}?`)) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteManagerAccount(account.id);
      setAccounts((prev) => prev.filter((item) => item.id !== account.id));
    } catch (error) {
      console.error('Failed to delete account:', error);
      setErrorMessage(error.message || 'Không xóa được tài khoản.');
    }
  };

  return (
    <main className="manager-screen">
      <Header roleLabel="Ban quản lý" homePath="/manager/home" />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <section className="manager-device-shell">
        <header className="manager-device-head">
          <div>
            <p className="typo-label text-secondary manager-overline">Ban quản lý - Quản trị tài khoản</p>
            <h1 className="typo-h1 manager-device-title">Quản lý tài khoản</h1>
            <p className="typo-body-lg text-secondary manager-device-subtitle">
              Danh sách quản lý tài khoản nhân sự và phân quyền vận hành
            </p>
          </div>

          <button type="button" className="manager-device-add-btn typo-body-lg" onClick={openCreateForm}>
            <Plus size={18} weight="bold" />
            <span>Thêm tài khoản</span>
          </button>
        </header>

        <section className="manager-panel manager-device-filter" aria-label="Bộ lọc tài khoản">
          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-account-search">Tìm kiếm</label>
            <div className="manager-search-wrap">
              <MagnifyingGlass size={22} className="manager-search-icon" />
              <input
                id="manager-account-search"
                className="manager-search-input typo-body-lg"
                placeholder="Tên, username hoặc vai trò..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-account-role">Vai trò</label>
            <select
              id="manager-account-role"
              className="manager-filter-select typo-body-lg"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">Tất cả vai trò</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="manager-filter-item">
            <label className="typo-body-lg" htmlFor="manager-account-status">Trạng thái</label>
            <select
              id="manager-account-status"
              className="manager-filter-select typo-body-lg"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="manager-panel manager-device-table-panel" aria-label="Danh sách tài khoản">
          {errorMessage && (
            <div className="manager-inline-error typo-body-md" role="alert">
              {errorMessage}
            </div>
          )}
          <table className="manager-device-table manager-account-table">
            <thead>
              <tr>
                <th>HỌ TÊN</th>
                <th>TÊN ĐĂNG NHẬP</th>
                <th>VAI TRÒ</th>
                <th>TRẠNG THÁI</th>
                <th>SỐ ĐIỆN THOẠI / EMAIL</th>
                <th>LẦN HOẠT ĐỘNG GẦN NHẤT</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>

            <tbody>
              {!isLoading &&
                filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="manager-device-id">{account.fullName}</td>
                    <td>{account.username}</td>
                    <td>{account.roleLabel}</td>
                    <td>
                      <span className={`manager-device-status status-${account.status}`}>
                        {account.statusLabel}
                      </span>
                    </td>
                    <td>
                      <p className="manager-account-contact">{account.phone}</p>
                      <p className="manager-account-contact text-secondary">{account.email}</p>
                    </td>
                    <td>{account.lastActiveAt}</td>
                    <td>
                      <div className="manager-device-actions manager-account-actions">
                        <button
                          type="button"
                          className="manager-action-btn edit"
                          aria-label={`Chỉnh sửa tài khoản ${account.fullName}`}
                          onClick={() => openEditForm(account)}
                        >
                          <NotePencil size={17} weight="regular" />
                        </button>
                        <button
                          type="button"
                          className="manager-action-btn danger"
                          aria-label={`${account.status === 'locked' ? 'Mở khóa' : 'Khóa'} tài khoản ${account.fullName}`}
                          onClick={() => handleToggleLock(account)}
                        >
                          <LockKey size={17} weight="regular" />
                        </button>
                        <button
                          type="button"
                          className="manager-action-btn delete"
                          aria-label={`Xóa tài khoản ${account.fullName}`}
                          onClick={() => handleDeleteAccount(account)}
                        >
                          <Trash size={17} weight="regular" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredAccounts.length === 0 && (
                <tr>
                  <td className="manager-device-empty typo-body-lg" colSpan={7}>
                    Không tìm thấy tài khoản phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td className="manager-device-empty typo-body-lg" colSpan={7}>
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>

      {isFormOpen && (
        <div className="manager-modal-backdrop" role="presentation">
          <section className="manager-panel manager-account-modal" aria-label="Form tài khoản">
            <header className="manager-account-modal-head">
              <div>
                <h2 className="typo-h2 manager-device-title">
                  {editingAccountId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản'}
                </h2>
                <p className="typo-body-md text-secondary manager-device-subtitle">
                  Cập nhật thông tin đăng nhập và phân quyền người dùng
                </p>
              </div>
            </header>

            <form className="manager-account-form" onSubmit={handleSubmitForm}>
              <label className="manager-account-form-item" htmlFor="manager-account-fullname">
                <span className="typo-body-md">Họ tên</span>
                <input
                  id="manager-account-fullname"
                  className="manager-search-input typo-body-lg"
                  value={formState.fullName}
                  onChange={(event) => handleFormChange('fullName', event.target.value)}
                  required
                />
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-username">
                <span className="typo-body-md">Username</span>
                <input
                  id="manager-account-username"
                  className="manager-search-input typo-body-lg"
                  value={formState.username}
                  onChange={(event) => handleFormChange('username', event.target.value)}
                  required
                />
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-password">
                <span className="typo-body-md">Password</span>
                <input
                  id="manager-account-password"
                  type="password"
                  className="manager-search-input typo-body-lg"
                  value={formState.password}
                  onChange={(event) => handleFormChange('password', event.target.value)}
                  required={!editingAccountId}
                />
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-email">
                <span className="typo-body-md">Email</span>
                <input
                  id="manager-account-email"
                  type="email"
                  className="manager-search-input typo-body-lg"
                  value={formState.email}
                  onChange={(event) => handleFormChange('email', event.target.value)}
                  required
                />
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-phone">
                <span className="typo-body-md">Số điện thoại</span>
                <input
                  id="manager-account-phone"
                  className="manager-search-input typo-body-lg"
                  value={formState.phone}
                  onChange={(event) => handleFormChange('phone', event.target.value)}
                  required
                />
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-role-input">
                <span className="typo-body-md">Vai trò</span>
                <select
                  id="manager-account-role-input"
                  className="manager-filter-select typo-body-lg"
                  value={formState.role}
                  onChange={(event) => handleFormChange('role', event.target.value)}
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="manager-account-form-item" htmlFor="manager-account-status-input">
                <span className="typo-body-md">Trạng thái</span>
                <select
                  id="manager-account-status-input"
                  className="manager-filter-select typo-body-lg"
                  value={formState.status}
                  onChange={(event) => handleFormChange('status', event.target.value)}
                >
                  {statusFilters
                    .filter((status) => status.value !== 'all')
                    .map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                </select>
              </label>

              <div className="manager-account-form-actions">
                <button type="button" className="manager-account-cancel-btn typo-body-lg" onClick={closeForm}>
                  Hủy
                </button>
                <button type="submit" className="manager-device-add-btn typo-body-lg">
                  Lưu
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ManagerBottomNav />
    </main>
  );
}

export default ManagerAccountPage;
