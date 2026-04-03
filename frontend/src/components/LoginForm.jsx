import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fire, Envelope, Lock, Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react';
import './LoginForm.css';

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!email.includes('@')) {
      setError('Email không hợp lệ');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      console.log('Đăng nhập:', { email, password, rememberMe });
      alert('Đăng nhập thành công! (Demo)');
      navigate('/resident/devices');
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-mobile-wrapper">
        <div className="login-card">
          <div className="brand-box">
            <div className="brand-icon">
              <Fire size={26} />
            </div>
            <h1>Fire Safety</h1>
            <p>Management System</p>
          </div>

          <h2 className="card-title">Đăng Nhập</h2>
          <p className="card-subtitle">Chào mừng bạn trở lại</p>

          {error && (
            <div className="alert-box">
              <WarningCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-icon-wrap">
                <Envelope className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <div className="row-helpers">
              <label className="remember-section">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Ghi nhớ
              </label>
              <button type="button" className="forgot-btn" onClick={() => alert('Chức năng quên mật khẩu')}>
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" className="primary-btn" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="separator">
            <span>Hoặc đăng nhập với</span>
          </div>

          <div className="social-grid">
            <button type="button" className="social-btn google-btn" onClick={() => console.log('Google')}>
              Google
            </button>
            <button type="button" className="social-btn facebook-btn" onClick={() => console.log('Facebook')}>
              Facebook
            </button>
          </div>

          <p className="register-line">
            Chưa có tài khoản?{' '}
            <button type="button" className="link-btn" onClick={() => navigate('/register')}>
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
