import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__title">
          <h1>One More Task Tracker</h1>
          <p>Просмотр и создание задач по Jira ID</p>
        </div>
        <div className="app-header__user">
          <span className="app-header__email">{user?.email}</span>
          {user && (
            <span className={`role-badge role-badge--${user.role.toLowerCase()}`}>
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
