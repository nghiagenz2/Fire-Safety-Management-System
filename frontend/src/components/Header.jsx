import { Link } from 'react-router-dom';
import { Buildings, MagnifyingGlass, Bell, User } from '@phosphor-icons/react';
import { getCurrentUser } from '../services/authApi';
import '../styles/Header.css';

function Header({ roleLabel = 'Cư dân', homePath = '/resident/home' }) {
  const actor = homePath.startsWith('/manager')
    ? 'manager'
    : homePath.startsWith('/firestaff')
      ? 'firestaff'
      : 'resident';
  const profilePath = `/${actor}/profile`;

  const currentUser = getCurrentUser();
  const displayName = currentUser?.fullName || 'Người dùng';

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to={homePath} className="header-logo">
            <Buildings weight="fill" size={32} className="logo-icon" />
            <div className="logo-text-group">
              <h1 className="logo-title">PCCC 3D</h1>
              <p className="logo-subtitle">{roleLabel}</p>
            </div>
          </Link>
        </div>

        <div className="header-right">


          <div className="header-actions">
            <button type="button" className="action-btn" aria-label="Thông báo">
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
