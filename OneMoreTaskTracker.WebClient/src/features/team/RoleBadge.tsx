import { ROLE_BADGE_CLASS, ROLE_LABEL_FULL, ROLE_LABEL_SHORT } from '../../shared/auth/roles';
import type { UserRole } from '../../shared/auth/roles';

interface RoleBadgeProps {
  role: UserRole;
  variant?: 'full' | 'short';
}

export function RoleBadge({ role, variant = 'full' }: RoleBadgeProps) {
  const label = variant === 'short' ? ROLE_LABEL_SHORT[role] : ROLE_LABEL_FULL[role];
  const badgeClass = ROLE_BADGE_CLASS[role];

  return <span className={`role-badge ${badgeClass}`}>{label}</span>;
}
