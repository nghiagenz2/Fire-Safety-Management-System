import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Splash.css';

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Tự động chuyển sang onboarding sau 2.5 giây
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        {/* Logo */}
        <div className="splash-logo">
          <div className="logo-circle">
            <span className="logo-icon">🔥</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="splash-title typo-h1">Fire Safety</h1>
        <p className="splash-subtitle typo-body-md">Management System</p>

        {/* Loading Animation */}
        <div className="splash-loader">
          <div className="loader-bar loader-bar-1"></div>
          <div className="loader-bar loader-bar-2"></div>
          <div className="loader-bar loader-bar-3"></div>
        </div>

        {/* Loading Text */}
        <p className="splash-loading-text typo-label">Đang tải...</p>
      </div>
    </div>
  );
}

export default Splash;
