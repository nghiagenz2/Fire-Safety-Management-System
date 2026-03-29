import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Validation rules
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
    // Clear error for this field when user starts typing
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

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // TODO: Replace with actual API call to backend
      console.log('Login attempt:', formData);
      // For now, redirect to resident devices
      navigate('/resident/devices');
    }, 1500);
  };

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`);
    // TODO: Implement social login
  };

  return (
    <section className="login-page">
      <article className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="logo-icon">🔥</span>
        </div>

        <header className="login-header">
          <h1 className="login-title typo-h1 text-primary">Đăng Nhập</h1>
          <p className="login-subtitle typo-body-md text-secondary">
            Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.
          </p>
        </header>

        <div className="login-alert typo-label">
          CẢNH BÁO: Chỉ nhân sự được ủy quyền mới có quyền truy cập.
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Email Input */}
          <label className="input-group" htmlFor="email">
            <span className="input-label typo-label text-primary">Email / Tên đăng nhập</span>
            <input
              id="email"
              name="email"
              type="text"
              placeholder="nhanvien@pccc.vn"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <span className="error-message typo-label">{errors.email}</span>}
          </label>

          {/* Password Input */}
          <label className="input-group" htmlFor="password">
            <span className="input-label typo-label text-primary">Mật khẩu</span>
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
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="error-message typo-label">{errors.password}</span>}
          </label>

          {/* Remember & Forgot Password */}
          <div className="row-between">
            <label className="remember-row typo-label text-secondary" htmlFor="remember">
              <input id="remember" name="remember" type="checkbox" checked={formData.remember} onChange={handleChange} />
              Ghi nhớ đăng nhập
            </label>
            <button type="button" className="link-button typo-label" onClick={() => console.log('Forgot password')}>
              Quên mật khẩu?
            </button>
          </div>

          {/* Login Button */}
          <button type="submit" className="login-button typo-h2" disabled={isLoading}>
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
            <svg viewBox="0 0 24 24" width="20" height="20">
              <text x="12" y="18" textAnchor="middle" fontSize="16">
                G
              </text>
            </svg>
            Google
          </button>
          <button
            type="button"
            className="social-button facebook-button typo-label"
            onClick={() => handleSocialLogin('facebook')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <text x="12" y="18" textAnchor="middle" fontSize="16">
                f
              </text>
            </svg>
            Facebook
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="login-footer typo-body-md text-secondary">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => console.log('Redirect to signup')}
          >
            Đăng ký ngay
          </button>
        </p>
      </article>
    </section>
  );
}

export default LoginForm;
