import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AuthProvider } from '../../../features/auth/AuthContext';
import { AUTH_KEY } from '../../auth/auth';

function renderHeader(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AppHeader />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('AppHeader', () => {
  it('renders nothing when the user is not authenticated', () => {
    const { container } = renderHeader(['/login']);

    expect(container.querySelector('header.app-header')).toBeNull();
  });

  describe('when the user is authenticated', () => {
    beforeEach(() => {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          token: 'test-token',
          userId: 1,
          email: 'manager@example.com',
          role: 'Manager',
        }),
      );
    });

    it('renders the app header with navigation and logout', () => {
      const { container } = renderHeader(['/']);

      expect(container.querySelector('header.app-header')).not.toBeNull();
      expect(screen.getByRole('link', { name: 'Задачи' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Команда' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
    });

    it('shows the authenticated user email and role badge', () => {
      renderHeader(['/']);

      expect(screen.getByText('manager@example.com')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });
  });
});
