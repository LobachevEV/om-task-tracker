import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../../shared/api/authApi';
import { useAuth } from './AuthContext';

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [managerId, setManagerId] = useState('');
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
      const parsedManagerId = managerId.trim() ? Number(managerId.trim()) : undefined;
      const response = await apiRegister({
        email: email.trim(),
        password,
        managerId: parsedManagerId,
      });
      login(response.token, response.userId, response.email, response.role);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      if (message.includes('409')) {
        setError('Этот email уже зарегистрирован');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="login-main">
        <section className="card login-card">
          <h2 className="login-card__title">One More Task Tracker</h2>
          <p className="login-card__subtitle">Создайте аккаунт</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Email</span>
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
              <span className="field__label">Пароль</span>
              <input
                className="field__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
              />
              {passwordTooShort && (
                <span className="field__hint">Минимум {MIN_PASSWORD_LENGTH} символов</span>
              )}
            </label>
            <label className="field">
              <span className="field__label">Подтвердите пароль</span>
              <input
                className="field__input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordsMismatch && (
                <span className="field__hint">Пароли не совпадают</span>
              )}
            </label>
            <label className="field">
              <span className="field__label">ID менеджера (необязательно)</span>
              <input
                className="field__input"
                type="number"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="123"
                min={1}
              />
            </label>
            <button
              className="primary-button login-form__button"
              type="submit"
              disabled={!canSubmit}
            >
              Зарегистрироваться
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
          <p className="login-card__nav">
            Уже есть аккаунт? <Link to="/login" className="login-card__link">Войти</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
