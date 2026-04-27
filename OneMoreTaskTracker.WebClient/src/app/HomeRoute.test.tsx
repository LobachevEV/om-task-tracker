import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomeRoute } from './HomeRoute';
import { AuthProvider } from '../common/auth/AuthContext';
import { AUTH_KEY, type UserRole } from '../common/auth/auth';

function seedAuth(role: UserRole | null) {
  localStorage.clear();
  if (role) {
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        token: 't',
        userId: 1,
        email: `${role.toLowerCase()}@example.com`,
        role,
      }),
    );
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/plan" element={<div>PLAN_PAGE</div>} />
          <Route path="/tasks" element={<div>TASKS_PAGE</div>} />
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('HomeRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects Managers to /plan', () => {
    seedAuth('Manager');
    renderAt('/');
    expect(screen.getByText('PLAN_PAGE')).toBeInTheDocument();
  });

  it('redirects FrontendDeveloper to /tasks', () => {
    seedAuth('FrontendDeveloper');
    renderAt('/');
    expect(screen.getByText('TASKS_PAGE')).toBeInTheDocument();
  });

  it('redirects BackendDeveloper to /tasks', () => {
    seedAuth('BackendDeveloper');
    renderAt('/');
    expect(screen.getByText('TASKS_PAGE')).toBeInTheDocument();
  });

  it('redirects Qa to /tasks', () => {
    seedAuth('Qa');
    renderAt('/');
    expect(screen.getByText('TASKS_PAGE')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    seedAuth(null);
    renderAt('/');
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
  });
});
