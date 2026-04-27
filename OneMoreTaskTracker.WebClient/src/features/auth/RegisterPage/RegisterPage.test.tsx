import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../../../common/auth/AuthContext';
import * as authApi from '../../../common/api/authApi';

vi.mock('../../../common/api/authApi');

const renderPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </BrowserRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('RegisterPage', () => {
  it('renders form with email, password, and confirm password fields', () => {
    renderPage();

    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Подтвердите пароль/)).toBeInTheDocument();
  });

  it('does not render manager ID field', () => {
    renderPage();

    const managerIdInput = screen.queryByPlaceholderText('123');
    expect(managerIdInput).not.toBeInTheDocument();

    const managerIdLabel = screen.queryByText(/ID менеджера/);
    expect(managerIdLabel).not.toBeInTheDocument();
  });

  it('renders helper text under subtitle', () => {
    renderPage();

    expect(screen.getByText('Создайте аккаунт')).toBeInTheDocument();
    expect(screen.getByText('Вы станете менеджером новой команды')).toBeInTheDocument();
  });

  it('shows password too short error when password is less than 8 chars', async () => {
    const user = userEvent.setup();
    renderPage();

    const passwordInput = screen.getByLabelText(/Пароль/);
    await user.type(passwordInput, 'short12');

    await waitFor(() => {
      expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument();
    });
  });

  it('shows password mismatch error when confirm password does not match', async () => {
    const user = userEvent.setup();
    renderPage();

    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);

    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'different123');

    await waitFor(() => {
      expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
    });
  });

  it('submit button is disabled until valid form data is entered', async () => {
    const user = userEvent.setup();
    renderPage();

    const submitButton = screen.getByText(/Зарегистрироваться/);
    expect(submitButton).toBeDisabled();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls register API with only email and password, no managerId', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.mocked(authApi.register);
    mockRegister.mockResolvedValueOnce({
      token: 'jwt.token',
      userId: 1,
      email: 'user@example.com',
      role: 'Manager',
    });

    renderPage();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);
    const submitButton = screen.getByText(/Зарегистрироваться/);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    const callArg = mockRegister.mock.calls[0][0];
    expect('managerId' in callArg).toBe(false);
  });

  it('trims email before sending', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.mocked(authApi.register);
    mockRegister.mockResolvedValueOnce({
      token: 'jwt.token',
      userId: 1,
      email: 'user@example.com',
      role: 'Manager',
    });

    renderPage();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);
    const submitButton = screen.getByText(/Зарегистрироваться/);

    await user.type(emailInput, '  user@example.com  ');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('shows duplicate email error on 409 response', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.mocked(authApi.register);
    mockRegister.mockRejectedValueOnce(new Error('Request failed (409)'));

    renderPage();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);
    const submitButton = screen.getByText(/Зарегистрироваться/);

    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Этот email уже зарегистрирован')).toBeInTheDocument();
    });
  });

  it('shows generic error message on other errors', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.mocked(authApi.register);
    mockRegister.mockRejectedValueOnce(new Error('Some other error'));

    renderPage();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);
    const submitButton = screen.getByText(/Зарегистрироваться/);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Some other error')).toBeInTheDocument();
    });
  });

  it('redirects to home after successful registration', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.mocked(authApi.register);
    mockRegister.mockResolvedValueOnce({
      token: 'jwt.token',
      userId: 1,
      email: 'user@example.com',
      role: 'Manager',
    });

    renderPage();

    const emailInput = screen.getByLabelText(/Email/);
    const passwordInput = screen.getByLabelText(/Пароль/);
    const confirmInput = screen.getByLabelText(/Подтвердите пароль/);
    const submitButton = screen.getByText(/Зарегистрироваться/);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  it('shows login link at bottom of form', () => {
    renderPage();

    const loginLink = screen.getByText('Войти');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('mounts the shared language switcher for unauthenticated users', () => {
    renderPage();

    expect(screen.getByRole('group', { name: /язык|language/i })).toBeInTheDocument();
  });
});
