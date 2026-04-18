import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { ROLE_BADGE_CLASS } from '../auth/roles';
import './AppHeader.css';

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const isTasksActive = location.pathname === '/' || location.pathname.startsWith('/tasks');
  const isTeamActive = location.pathname === '/team';

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          <div className="app-header__title">
            <h1>One More Task Tracker</h1>
            <p>Просмотр и создание задач по Jira ID</p>
          </div>
          <nav className="app-header__nav">
            <a
              href="/"
              className={`app-header__nav-item ${isTasksActive ? 'app-header__nav-item--active' : ''}`}
            >
              Задачи · Tasks
            </a>
            <a
              href="/team"
              className={`app-header__nav-item ${isTeamActive ? 'app-header__nav-item--active' : ''}`}
            >
              Команда · Team
            </a>
          </nav>
        </div>
        <div className="app-header__user">
          <span className="app-header__email">{user?.email}</span>
          {user && (
            <span className={`role-badge ${ROLE_BADGE_CLASS[user.role]}`}>
              {user.role}
            </span>
          )}
          <button className="primary-button" type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
