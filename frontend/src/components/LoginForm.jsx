import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import './LoginForm.css';

function LoginForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email hoặc tên đăng nhập không được để trống';
    } else if (formData.email.length < 3) {
      newErrors.email = 'Email hoặc tên đăng nhập không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      console.log('Login attempt:', formData);
      navigate('/resident/devices');
    }, 1500);
  };

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`);
  };

  return (
    <div className="login-page">
      {/* Left Panel - Info Section */}
      <div className="login-left-panel">
        <div className="left-content">
          <div className="left-header">
            <div className="logo-section">
            </div>
            <h1 className="left-title typo-h1">
              An Toàn Là<br />Ưu Tiên Hàng Đầu
            </h1>
          </div>

          <p className="left-description typo-body-lg">
            Quản lý và giám sát hệ thống phòng chữa cháy một cách chuyên nghiệp, hiện đại và hiệu quả.
          </p>

          {/* Info Cards */}
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-label typo-label">24/7</div>
              <div className="info-card-text typo-body-md">Giám sát</div>
            </div>
            <div className="info-card">
              <div className="info-card-label typo-label">100%</div>
              <div className="info-card-text typo-body-md">An toàn</div>
            </div>
            <div className="info-card">
              <div className="info-card-label typo-label">Nhanh</div>
              <div className="info-card-text typo-body-md">Cảnh báo</div>
            </div>
          </div>

          <p className="left-footer typo-body-sm">
            © 2026 Fire Safety Management System. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right-panel">
        <div className="right-content">
          <div className="login-header">
            <h2 className="login-title typo-h2">Đăng Nhập</h2>
            <p className="login-subtitle typo-body-md">
              Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="input-group">
              <label className="input-label typo-label" htmlFor="email">
                Email / Tên đăng nhập
              </label>
              <input
                id="email"
                name="email"
                type="text"
                placeholder="nhanvien@pccc.vn"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="error-message typo-label">{errors.email}</span>
              )}
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label className="input-label typo-label" htmlFor="password">
                Mật khẩu
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeSlash size={18} weight="regular" />
                  ) : (
                    <Eye size={18} weight="regular" />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="error-message typo-label">{errors.password}</span>
              )}
            </div>

            {/* Remember & Forgot Password */}
            <div className="row-between">
              <label className="remember-row typo-label" htmlFor="remember">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={formData.remember}
                  onChange={handleChange}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                className="link-button typo-label"
                onClick={() => console.log('Forgot password')}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-button typo-body-md" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-section">
            <span className="divider-text typo-label">Hoặc đăng nhập với</span>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <button
              type="button"
              className="social-button google-button typo-label"
              onClick={() => handleSocialLogin('google')}
            >
              <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="social-button facebook-button typo-label"
              onClick={() => handleSocialLogin('facebook')}
            >
              <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="login-footer typo-body-md">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => console.log('Redirect to signup')}
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
