import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';
import { ProtectedRoute } from '../ProtectedRoute';
import { setAuth, clearAuth, AUTH_KEY } from '../../../shared/auth/auth';

function renderWithRouter(element: React.ReactElement, initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries || ['/protected']}>
      <AuthProvider>{element}</AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    const authState = { token: 'test-token', userId: 42, email: 'user@example.com', role: 'Developer' as const };
    const storedAuth = {
      token: authState.token,
      userId: authState.userId,
      email: authState.email,
      role: authState.role,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth));

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    clearAuth();

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      ['/protected'],
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
