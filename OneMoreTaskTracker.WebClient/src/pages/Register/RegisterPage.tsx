import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register as apiRegister } from '../../common/api/authApi';
import { LanguageSwitcher } from '../../common/components/LanguageSwitcher';
import { useAuth } from '../../common/auth/AuthContext';
import '../../common/styles/auth-pages.css';

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword &&
    !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setError(null);
      setSubmitting(true);
      const response = await apiRegister({
        email: email.trim(),
        password,
      });
      login(response.token, response.userId, response.email, response.role);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('register.failed');
      if (message.includes('409')) {
        setError(t('register.emailTaken'));
      } else {
        setError(message);
      }
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
          <p className="login-card__subtitle">{t('register.subtitle')}</p>
          <p className="login-card__helper">{t('register.helper')}</p>
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
                placeholder={t('register.passwordPlaceholder', { count: MIN_PASSWORD_LENGTH })}
                autoComplete="new-password"
              />
              {passwordTooShort && (
                <span className="field__hint field__hint--error">{t('register.minLengthHint', { count: MIN_PASSWORD_LENGTH })}</span>
              )}
            </label>
            <label className="field">
              <span className="field__label">{t('field.passwordConfirm')}</span>
              <input
                className="field__input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordsMismatch && (
                <span className="field__hint field__hint--error">{t('register.passwordsMismatch')}</span>
              )}
            </label>
            <button
              className="primary-button login-form__button"
              type="submit"
              disabled={!canSubmit}
            >
              {t('register.submit')}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
          <p className="login-card__nav">
            {t('register.haveAccount')} <Link to="/login" className="login-card__link">{t('register.loginLink')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
