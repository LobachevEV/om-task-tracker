import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../features/auth/AuthContext';
import { ROLE_BADGE_CLASS } from '../../auth/roles';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../i18n/config';
import './AppHeader.css';

export function AppHeader() {
  const { t, i18n } = useTranslation('header');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const isTasksActive = location.pathname === '/' || location.pathname.startsWith('/tasks');
  const isTeamActive = location.pathname === '/team';
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'ru') as SupportedLanguage;

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
              href="/"
              className={`app-header__nav-item ${isTasksActive ? 'app-header__nav-item--active' : ''}`}
            >
              {t('nav.tasks')}
            </a>
            <a
              href="/team"
              className={`app-header__nav-item ${isTeamActive ? 'app-header__nav-item--active' : ''}`}
            >
              {t('nav.team')}
            </a>
          </nav>
        </div>
        <div className="app-header__user">
          <div className="language-switcher" role="group" aria-label={t('language.switchTo')}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                className={`language-switcher__btn ${
                  currentLang === lang ? 'language-switcher__btn--active' : ''
                }`}
                aria-pressed={currentLang === lang}
                onClick={() => {
                  if (currentLang !== lang) {
                    void i18n.changeLanguage(lang);
                  }
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="app-header__email">{user?.email}</span>
          {user && (
            <span className={`role-badge ${ROLE_BADGE_CLASS[user.role]}`}>
              {user.role}
            </span>
          )}
          <button className="primary-button" type="button" onClick={handleLogout}>
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
