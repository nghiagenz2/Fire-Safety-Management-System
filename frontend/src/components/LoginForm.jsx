import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fire, Envelope } from '@phosphor-icons/react';
import { getHomePathForRole, loginAccount } from '../services/authApi';
import './LoginForm.css';

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const getErrorMessage = (field, value) => {
    if (field === 'email') {
      if (!value.trim()) return 'Vui lòng nhập email hoặc username';
    }
    if (field === 'password') {
      if (!value.trim()) return 'Vui lòng nhập mật khẩu';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = { email: '', password: '' };

    const emailError = getErrorMessage('email', email);
    const passwordError = getErrorMessage('password', password);

    if (emailError || passwordError) {
      setFieldErrors({ email: emailError, password: passwordError });
      return;
    }

    try {
      setFieldErrors({ email: '', password: '' });
      setFormError('');
      setIsLoading(true);

      const user = await loginAccount({
        login: email,
        password,
        rememberMe
      });

      navigate(getHomePathForRole(user.role), { replace: true });
    } catch (error) {
      setFormError(error.message || 'Đăng nhập thất bại.');
    } finally {
      setIsLoading(false);
    }
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

          <form className="login-form" onSubmit={handleSubmit}>
            {formError && <span className="error-text">{formError}</span>}

            <div className="form-group">
              <label htmlFor="email">Email hoặc username</label>
              <div className="input-icon-wrap">
                <Envelope className="input-icon" />
                <input
                  id="email"
                  type="text"
                  placeholder="Nhập email hoặc username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  className={`has-leading-icon ${fieldErrors.email ? 'error' : ''}`}
                />
              </div>
              {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-icon-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setPassword(newVal);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  className={`has-trailing-action ${fieldErrors.password ? 'error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
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
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button type="button" className="social-btn facebook-btn" onClick={() => console.log('Facebook')}>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
