import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../../../common/auth/AuthContext';

const renderPage = () =>
  render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>,
  );

beforeEach(() => {
  localStorage.clear();
});

describe('LoginPage', () => {
  it('renders the sign-in form with the shared language switcher', () => {
    renderPage();

    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /язык|language/i })).toBeInTheDocument();
  });
});
