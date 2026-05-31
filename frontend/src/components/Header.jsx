import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Bell, User, ShieldCheck, FireExtinguisher, HouseLine } from '@phosphor-icons/react';
import { getCurrentUser } from '../services/authApi';
import '../styles/Header.css';

function Header({ roleLabel = 'Cư dân', homePath = '/resident/home' }) {
  const navigate = useNavigate();
  const actor = homePath.startsWith('/manager')
    ? 'manager'
    : homePath.startsWith('/firestaff')
      ? 'firestaff'
      : 'resident';
  const profilePath = `/${actor}/profile`;
  const RoleIcon = actor === 'manager' ? ShieldCheck : actor === 'firestaff' ? FireExtinguisher : HouseLine;

  const currentUser = getCurrentUser();
  const displayName = currentUser?.fullName || 'Người dùng';

  function handleSearchSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const keyword = String(formData.get('headerSearch') || '').trim();
    if (!keyword) return;

    const normalized = keyword.toLowerCase();
    const wantsEscape = normalized.includes('thoát') || normalized.includes('loi thoat') || normalized.includes('exit');
    const targetPath = wantsEscape && actor === 'resident'
      ? '/resident/escape'
      : wantsEscape && actor === 'manager'
        ? '/manager/escape'
        : `/${actor}/devices`;

    navigate(`${targetPath}?search=${encodeURIComponent(keyword)}`);
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to={homePath} className="header-logo">
            <RoleIcon weight="fill" size={32} className="logo-icon" />
            <div className="logo-text-group">
              <h1 className="logo-title">PCCC 3D</h1>
              <p className="logo-subtitle">{roleLabel}</p>
            </div>
          </Link>
        </div>

        <div className="header-right">
          <form className="header-search" onSubmit={handleSearchSubmit}>
            <MagnifyingGlass size={20} color="#9ca3af" />
            <input
              name="headerSearch"
              type="text"
              placeholder="Tìm kiếm thiết bị, tầng..."
              className="search-input"
            />
          </form>

          <div className="header-actions">
            <button type="button" className="action-btn" aria-label="Thông báo mô phỏng và cảnh báo">
              <Bell size={24} />
              <span className="notification-badge"></span>
            </button>

            <Link to={profilePath} className="user-profile" aria-label="Mở trang hồ sơ người dùng">
              <div className="user-avatar">
                <User weight="fill" size={20} />
              </div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{roleLabel}</span>
              </div>
            </Link>
          </div>
        </div>
      </header>
      <div className="app-header-spacer" aria-hidden="true"></div>
    </>
  );
}

export default Header;
