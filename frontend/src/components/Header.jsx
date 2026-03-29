import { Link } from 'react-router-dom';
import { Buildings, MagnifyingGlass, Bell, User } from '@phosphor-icons/react';
import '../styles/Header.css';

function Header() {
  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to="/resident/home" className="header-logo">
            <Buildings weight="fill" size={32} className="logo-icon" />
            <div className="logo-text-group">
              <h1 className="logo-title">PCCC 3D</h1>
              <p className="logo-subtitle">Cư dân</p>
            </div>
          </Link>
        </div>

        <div className="header-right">
          <div className="header-search">
            <MagnifyingGlass size={20} color="#9ca3af" />
            <input
              type="text"
              placeholder="Tìm kiếm thiết bị, tầng..."
              className="search-input"
            />
          </div>

          <div className="header-actions">
            <button type="button" className="action-btn" aria-label="Thông báo">
              <Bell size={24} />
              <span className="notification-badge"></span>
            </button>

            <div className="user-profile">
              <div className="user-avatar">
                <User weight="fill" size={20} />
              </div>
              <div className="user-info">
                <span className="user-name">Người dùng</span>
                <span className="user-role">Cư dân</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="app-header-spacer" aria-hidden="true"></div>
    </>
  );
}

export default Header;
