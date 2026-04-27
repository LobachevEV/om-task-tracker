import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login as apiLogin } from '../../common/api/authApi';
import { LanguageSwitcher } from '../../common/components/LanguageSwitcher';
import { useAuth } from '../../common/auth/AuthContext';
import '../../common/styles/auth-pages.css';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setError(null);
      setSubmitting(true);
      const response = await apiLogin({ email: email.trim(), password });
      login(response.token, response.userId, response.email, response.role);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <main className="login-main">
        <section className="card login-card">
          <h2 className="login-card__title">One More Task Tracker</h2>
          <p className="login-card__subtitle">{t('login.subtitle')}</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">{t('field.email')}</span>
              <input
                className="field__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span className="field__label">{t('field.password')}</span>
              <input
                className="field__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <button
              className="primary-button login-form__button"
              type="submit"
              disabled={!email.trim() || !password || submitting}
            >
              {t('login.submit')}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
          <p className="login-card__nav">
            {t('login.noAccount')} <Link to="/register" className="login-card__link">{t('login.registerLink')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
