import './LoginForm.css';

function LoginForm() {
  return (
    <section className="login-page">
      <article className="login-card">
        <header className="login-header">
          <h1 className="login-title typo-h1 text-primary">Đăng nhập hệ thống</h1>
          <p className="login-subtitle typo-body-md text-secondary">
            Fire Safety Management System
          </p>
        </header>

        <div className="login-alert typo-label">CẢNH BÁO: Chỉ nhân sự được ủy quyền mới có quyền truy cập.</div>

        <form className="login-form">
          <label className="input-group" htmlFor="email">
            <span className="input-label typo-label text-primary">Email / Tên đăng nhập</span>
            <input
              id="email"
              name="email"
              type="text"
              placeholder="nhanvien@pccc.vn"
              className="input-field"
            />
          </label>

          <label className="input-group" htmlFor="password">
            <span className="input-label typo-label text-primary">Mật khẩu</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="input-field"
            />
          </label>

          <div className="row-between">
            <label className="remember-row typo-label text-secondary" htmlFor="remember">
              <input id="remember" type="checkbox" />
              Ghi nhớ đăng nhập
            </label>
            <button type="button" className="link-button typo-label">
              Quên mật khẩu?
            </button>
          </div>

          <button type="submit" className="login-button typo-h2">
            ĐĂNG NHẬP
          </button>
        </form>

        <p className="login-footer typo-body-md text-secondary">Liên hệ quản trị nếu cần cấp lại quyền truy cập.</p>
      </article>
    </section>
  );
}

export default LoginForm;
