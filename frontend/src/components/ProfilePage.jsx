import { ArrowLeft, SignOut, User, EnvelopeSimple, Phone, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logoutAccount } from '../services/authApi';
import './ProfilePage.css';

const PROFILE_CONFIG = {
  resident: {
    name: 'Người dùng cư dân',
    roleLabel: 'Cư dân',
    email: 'resident@example.com',
    phone: '0901234567',
    homePath: '/resident/home'
  },
  firestaff: {
    name: 'Nhân viên PCCC',
    roleLabel: 'Nhân viên PCCC',
    email: 'firestaff@example.com',
    phone: '0902345678',
    homePath: '/firestaff/home'
  },
  manager: {
    name: 'Ban quản lý',
    roleLabel: 'Ban quản lý',
    email: 'demo@example.com',
    phone: '0901234567',
    homePath: '/manager/home'
  }
};

function ProfilePage({ actor = 'resident' }) {
  const currentUser = getCurrentUser();
  const fallbackProfile = PROFILE_CONFIG[actor] || PROFILE_CONFIG.resident;
  const profile = currentUser
    ? {
        name: currentUser.fullName || fallbackProfile.name,
        roleLabel: currentUser.roleLabel || fallbackProfile.roleLabel,
        email: currentUser.email || fallbackProfile.email,
        phone: currentUser.phone || fallbackProfile.phone,
        homePath: fallbackProfile.homePath
      }
    : fallbackProfile;

  return (
    <main className="profile-screen">
      <section className="profile-shell">
        <Link to={profile.homePath} className="profile-back-link typo-body-lg" aria-label="Quay lại trang trước">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </Link>

        <section className="profile-card manager-panel" aria-label="Thông tin hồ sơ người dùng">
          <header className="profile-hero">
            <div className="profile-avatar" aria-hidden="true">
              <User size={34} weight="regular" />
            </div>
            <div>
              <h1 className="typo-h1 profile-name">{profile.name}</h1>
              <p className="typo-body-lg profile-role">{profile.roleLabel}</p>
            </div>
          </header>

          <div className="profile-info-wrap">
            <article className="profile-info-item">
              <div className="profile-info-icon">
                <EnvelopeSimple size={22} />
              </div>
              <div>
                <p className="typo-body-md text-secondary profile-info-label">Email</p>
                <p className="typo-body-lg profile-info-value">{profile.email}</p>
              </div>
            </article>

            <article className="profile-info-item">
              <div className="profile-info-icon">
                <Phone size={22} />
              </div>
              <div>
                <p className="typo-body-md text-secondary profile-info-label">Số điện thoại</p>
                <p className="typo-body-lg profile-info-value">{profile.phone}</p>
              </div>
            </article>

            <article className="profile-info-item">
              <div className="profile-info-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="typo-body-md text-secondary profile-info-label">Vai trò</p>
                <p className="typo-body-lg profile-info-value">{profile.roleLabel}</p>
              </div>
            </article>
          </div>

          <footer className="profile-actions">
            <Link to="/login" className="profile-logout-btn typo-body-lg" aria-label="Đăng xuất" onClick={logoutAccount}>
              <SignOut size={20} />
              <span>Đăng xuất</span>
            </Link>
          </footer>
        </section>
      </section>
    </main>
  );
}

export default ProfilePage;
