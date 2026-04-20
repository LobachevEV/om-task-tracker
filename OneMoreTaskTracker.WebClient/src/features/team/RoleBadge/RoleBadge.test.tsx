import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from './RoleBadge';
import { ROLE_BADGE_CLASS, ROLE_LABEL_SHORT } from '../../../shared/auth/roles';
import type { UserRole } from '../../../shared/auth/roles';

const ROLE_LABEL_FULL_RU: Record<UserRole, string> = {
  Manager: 'Менеджер',
  FrontendDeveloper: 'Фронтенд',
  BackendDeveloper: 'Бэкенд',
  Qa: 'QA',
};

describe('RoleBadge', () => {
  const roles: UserRole[] = ['Manager', 'FrontendDeveloper', 'BackendDeveloper', 'Qa'];

  roles.forEach((role) => {
    it(`renders full variant for ${role}`, () => {
      render(<RoleBadge role={role} variant="full" />);

      const badge = screen.getByText(ROLE_LABEL_FULL_RU[role]);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('role-badge', ROLE_BADGE_CLASS[role]);
    });

    it(`renders short variant for ${role}`, () => {
      render(<RoleBadge role={role} variant="short" />);

      const badge = screen.getByText(ROLE_LABEL_SHORT[role]);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('role-badge', ROLE_BADGE_CLASS[role]);
    });
  });

  it('defaults to full variant', () => {
    render(<RoleBadge role="Manager" />);

    expect(screen.getByText(ROLE_LABEL_FULL_RU.Manager)).toBeInTheDocument();
  });
});
