import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, ShieldCheck, FireExtinguisher, HouseLine, X, Fire, ClipboardText } from '@phosphor-icons/react';
import { getCurrentUser } from '../services/authApi';
import '../styles/Header.css';

function floorNameFromId(floorId = '') {
  if (floorId === 'floor_tret') return 'Tầng trệt';
  const match = String(floorId).match(/^floor_(\d+)$/);
  if (match) return `Tầng ${match[1]}`;
  return floorId || 'khu vực chưa xác định';
}

const TASK_STORAGE_KEY = 'firestaff_last_seen_task_total';

function Header({ roleLabel = 'Cư dân', homePath = '/resident/home' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const actor = homePath.startsWith('/manager')
    ? 'manager'
    : homePath.startsWith('/firestaff')
      ? 'firestaff'
      : 'resident';
  const profilePath = `/${actor}/profile`;
  const RoleIcon = actor === 'manager' ? ShieldCheck : actor === 'firestaff' ? FireExtinguisher : HouseLine;

  const currentUser = getCurrentUser();
  const displayName = currentUser?.fullName || 'Người dùng';

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Track fire simulation state
  const simActiveRef = useRef(false);

  // Add a notification (deduplicate by id)
  function addNotification(notif) {
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 20);
    });
  }

  // Remove one notification
  function removeNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  // Clear all
  function clearAll() {
    setNotifications([]);
  }

  // SSE: listen to fire simulation for ALL actors
  useEffect(() => {
    let eventSource = null;
    let reconnectTimer = null;

    const connect = () => {
      eventSource = new EventSource('/api/incidents/simulation/stream');

      eventSource.onmessage = (event) => {
        try {
          const state = JSON.parse(event.data);
          if (state.active && !simActiveRef.current) {
            // Fire just started
            simActiveRef.current = true;
            const floor = floorNameFromId(state.floorId);
            addNotification({
              id: `fire-sim-${state.startTime || Date.now()}`,
              type: 'fire',
              title: 'CẢNH BÁO: Phát hiện cháy!',
              body: `Mô phỏng cháy đang hoạt động tại ${floor}.`,
              time: new Date(),
              link: actor === 'resident' ? '/resident/escape'
                  : actor === 'firestaff' ? '/firestaff/incidents'
                  : '/manager/incidents'
            });
          } else if (!state.active && simActiveRef.current) {
            // Fire ended
            simActiveRef.current = false;
            addNotification({
              id: `fire-end-${Date.now()}`,
              type: 'info',
              title: 'Mô phỏng cháy đã kết thúc',
              body: 'Tình huống mô phỏng cháy đã được giải quyết.',
              time: new Date(),
              link: null
            });
          }
        } catch (err) {
          console.error('Header SSE parse error:', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        reconnectTimer = window.setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, [actor]);

  // Polling: check for new tasks for firestaff only
  useEffect(() => {
    if (actor !== 'firestaff') return;

    let isMounted = true;

    async function checkNewTasks() {
      try {
        const res = await fetch('/api/tasks');
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload.success) return;

        const currentTotal = payload.data?.total ?? 0;
        const lastSeen = parseInt(localStorage.getItem(TASK_STORAGE_KEY) || '0', 10);

        if (currentTotal > lastSeen) {
          const diff = currentTotal - lastSeen;
          if (isMounted) {
            addNotification({
              id: `task-new-${currentTotal}-${Date.now()}`,
              type: 'task',
              title: 'Nhiệm vụ mới được giao',
              body: `Ban quản lý vừa giao ${diff} nhiệm vụ mới. Hãy kiểm tra danh sách nhiệm vụ.`,
              time: new Date(),
              link: '/firestaff/tasks'
            });
          }
          localStorage.setItem(TASK_STORAGE_KEY, String(currentTotal));
        } else if (lastSeen === 0 && currentTotal === 0) {
          // Initialize baseline
          localStorage.setItem(TASK_STORAGE_KEY, '0');
        } else if (currentTotal < lastSeen) {
          // Tasks removed, reset baseline silently
          localStorage.setItem(TASK_STORAGE_KEY, String(currentTotal));
        }
      } catch (err) {
        console.error('Task polling error:', err);
      }
    }

    // Initial check after short delay
    const initTimer = window.setTimeout(checkNewTasks, 2000);
    // Poll every 30s
    const interval = window.setInterval(checkNewTasks, 30000);

    return () => {
      isMounted = false;
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, [actor]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.length;
  const hasUnread = unreadCount > 0;

  function handleNotifClick(notif) {
    setIsOpen(false);
    if (notif.link) navigate(notif.link);
  }

  function formatTime(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  }

  const NotifIcon = ({ type }) => {
    if (type === 'fire') return <Fire size={18} weight="fill" className="notif-icon notif-icon--fire" />;
    if (type === 'task') return <ClipboardText size={18} weight="fill" className="notif-icon notif-icon--task" />;
    return <Bell size={18} weight="fill" className="notif-icon notif-icon--info" />;
  };

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
          <div className="header-actions">
            {/* Bell notification button */}
            <div className="notif-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`action-btn ${hasUnread ? 'action-btn--has-notif' : ''}`}
                aria-label={`Thông báo${hasUnread ? ` (${unreadCount} chưa đọc)` : ''}`}
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
              >
                <Bell size={24} />
                {hasUnread && (
                  <span className="notification-badge" aria-hidden="true">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Danh sách thông báo">
                  <div className="notif-dropdown-header">
                    <span className="notif-dropdown-title">Thông báo</span>
                    {notifications.length > 0 && (
                      <button type="button" className="notif-clear-btn" onClick={clearAll}>
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  <ul className="notif-list" role="list">
                    {notifications.length === 0 ? (
                      <li className="notif-empty">
                        <Bell size={32} className="notif-empty-icon" />
                        <p>Chưa có thông báo nào</p>
                      </li>
                    ) : (
                      notifications.map(notif => (
                        <li key={notif.id} className={`notif-item notif-item--${notif.type}`}>
                          <button
                            type="button"
                            className="notif-item-body"
                            onClick={() => handleNotifClick(notif)}
                          >
                            <NotifIcon type={notif.type} />
                            <div className="notif-item-content">
                              <p className="notif-item-title">{notif.title}</p>
                              <p className="notif-item-body-text">{notif.body}</p>
                              <span className="notif-item-time">{formatTime(notif.time)}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="notif-item-dismiss"
                            aria-label="Xóa thông báo"
                            onClick={() => removeNotification(notif.id)}
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

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
