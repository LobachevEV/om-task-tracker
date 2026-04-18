export type UserRole = 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  Manager:           'role-badge--manager',
  FrontendDeveloper: 'role-badge--frontend',
  BackendDeveloper:  'role-badge--backend',
  Qa:                'role-badge--qa',
};

export const ROLE_LABEL_FULL: Record<UserRole, string> = {
  Manager:           'Менеджер · Manager',
  FrontendDeveloper: 'Фронтенд · Frontend',
  BackendDeveloper:  'Бэкенд · Backend',
  Qa:                'QA · QA',
};

export const ROLE_LABEL_SHORT: Record<UserRole, string> = {
  Manager:           'Manager',
  FrontendDeveloper: 'FE',
  BackendDeveloper:  'BE',
  Qa:                'QA',
};

export const DEVELOPER_ROLES: readonly UserRole[] = [
  'FrontendDeveloper', 'BackendDeveloper', 'Qa',
] as const;

export function isDeveloperRole(r: UserRole): boolean {
  return (DEVELOPER_ROLES as readonly UserRole[]).includes(r);
}

export function isUserRole(r: string): r is UserRole {
  return r in ROLE_BADGE_CLASS;
}
