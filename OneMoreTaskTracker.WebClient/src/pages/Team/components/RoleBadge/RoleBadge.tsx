import { useTranslation } from 'react-i18next';
import { ROLE_BADGE_CLASS, ROLE_LABEL_SHORT } from '../../../../common/auth/roles';
import type { UserRole } from '../../../../common/auth/roles';

interface RoleBadgeProps {
  role: UserRole;
  variant?: 'full' | 'short';
}

export function RoleBadge({ role, variant = 'full' }: RoleBadgeProps) {
  const { t } = useTranslation('common');
  const label = variant === 'short' ? ROLE_LABEL_SHORT[role] : t(`role.full.${role}`);
  const badgeClass = ROLE_BADGE_CLASS[role];

  return <span className={`role-badge ${badgeClass}`}>{label}</span>;
}
