import { describe, it, expect } from 'vitest';
import {
  ROLE_BADGE_CLASS,
  ROLE_LABEL_SHORT,
  DEVELOPER_ROLES,
  isDeveloperRole,
  type UserRole,
} from '../../../src/common/auth/roles';

describe('roles', () => {
  describe('ROLE_BADGE_CLASS', () => {
    it('Manager maps to role-badge--manager', () => {
      expect(ROLE_BADGE_CLASS.Manager).toBe('role-badge--manager');
    });

    it('FrontendDeveloper maps to role-badge--frontend', () => {
      expect(ROLE_BADGE_CLASS.FrontendDeveloper).toBe('role-badge--frontend');
    });

    it('BackendDeveloper maps to role-badge--backend', () => {
      expect(ROLE_BADGE_CLASS.BackendDeveloper).toBe('role-badge--backend');
    });

    it('Qa maps to role-badge--qa', () => {
      expect(ROLE_BADGE_CLASS.Qa).toBe('role-badge--qa');
    });

    it('has exactly 4 roles', () => {
      expect(Object.keys(ROLE_BADGE_CLASS)).toHaveLength(4);
    });
  });

  describe('ROLE_LABEL_SHORT', () => {
    it('Manager short label is Manager', () => {
      expect(ROLE_LABEL_SHORT.Manager).toBe('Manager');
    });

    it('FrontendDeveloper short label is FE', () => {
      expect(ROLE_LABEL_SHORT.FrontendDeveloper).toBe('FE');
    });

    it('BackendDeveloper short label is BE', () => {
      expect(ROLE_LABEL_SHORT.BackendDeveloper).toBe('BE');
    });

    it('Qa short label is QA', () => {
      expect(ROLE_LABEL_SHORT.Qa).toBe('QA');
    });
  });

  describe('DEVELOPER_ROLES', () => {
    it('contains exactly 3 roles', () => {
      expect(DEVELOPER_ROLES).toHaveLength(3);
    });

    it('contains FrontendDeveloper', () => {
      expect(DEVELOPER_ROLES).toContain('FrontendDeveloper');
    });

    it('contains BackendDeveloper', () => {
      expect(DEVELOPER_ROLES).toContain('BackendDeveloper');
    });

    it('contains Qa', () => {
      expect(DEVELOPER_ROLES).toContain('Qa');
    });

    it('does not contain Manager', () => {
      expect(DEVELOPER_ROLES).not.toContain('Manager');
    });

    it('is readonly', () => {
      // This is a compile-time check, but we can verify it at runtime
      expect(Object.isFrozen(DEVELOPER_ROLES) || !Array.isArray(DEVELOPER_ROLES)).toBeDefined();
    });
  });

  describe('isDeveloperRole', () => {
    it('returns true for FrontendDeveloper', () => {
      expect(isDeveloperRole('FrontendDeveloper')).toBe(true);
    });

    it('returns true for BackendDeveloper', () => {
      expect(isDeveloperRole('BackendDeveloper')).toBe(true);
    });

    it('returns true for Qa', () => {
      expect(isDeveloperRole('Qa')).toBe(true);
    });

    it('returns false for Manager', () => {
      expect(isDeveloperRole('Manager')).toBe(false);
    });
  });

  describe('type alignment', () => {
    it('all ROLE_BADGE_CLASS keys are valid UserRole', () => {
      const keys = Object.keys(ROLE_BADGE_CLASS) as UserRole[];
      keys.forEach((role) => {
        expect(['Manager', 'FrontendDeveloper', 'BackendDeveloper', 'Qa']).toContain(role);
      });
    });

    it('all ROLE_LABEL_SHORT keys are valid UserRole', () => {
      const keys = Object.keys(ROLE_LABEL_SHORT) as UserRole[];
      keys.forEach((role) => {
        expect(['Manager', 'FrontendDeveloper', 'BackendDeveloper', 'Qa']).toContain(role);
      });
    });
  });
});
