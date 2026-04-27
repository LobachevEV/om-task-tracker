import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../features/auth/AuthContext';
import { ROLE_BADGE_CLASS } from '../../auth/roles';
import { LanguageSwitcher } from '../LanguageSwitcher';
import './AppHeader.css';

export function AppHeader() {
  const { t } = useTranslation('header');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  if (!user) return null;

  const isManager = user.role === 'Manager';
  const path = location.pathname;

  const isPlanActive = path === '/plan' || path.startsWith('/plan/');
  // Tasks link covers both `/tasks` and the bare `/` index (for developers/QA
  // whose Home redirects to `/tasks`, either path should highlight the Tasks tab).
  const isTasksActive = path === '/tasks' || path.startsWith('/tasks/') || path === '/';
  const isTeamActive = path === '/team';

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          <div className="app-header__title">
            <h1>One More Task Tracker</h1>
            <p>{t('subtitle')}</p>
          </div>
          <nav className="app-header__nav">
            <a
              href="/plan"
              className={`app-header__nav-item ${isPlanActive ? 'app-header__nav-item--active' : ''}`}
            >
              {t('nav.plan')}
            </a>
            {!isManager ? (
              <a
                href="/tasks"
                className={`app-header__nav-item ${isTasksActive ? 'app-header__nav-item--active' : ''}`}
              >
                {t('nav.tasks')}
              </a>
            ) : null}
            <a
              href="/team"
              className={`app-header__nav-item ${isTeamActive ? 'app-header__nav-item--active' : ''}`}
            >
              {t('nav.team')}
            </a>
          </nav>
        </div>
        <div className="app-header__user">
          <LanguageSwitcher />
          <span className="app-header__email">{user.email}</span>
          <span className={`role-badge ${ROLE_BADGE_CLASS[user.role]}`}>
            {user.role}
          </span>
          <button className="primary-button" type="button" onClick={handleLogout}>
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
