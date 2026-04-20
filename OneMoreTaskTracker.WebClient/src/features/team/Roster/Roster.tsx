import { useTranslation } from 'react-i18next';
import { RoleBadge } from '../RoleBadge';
import { StateBar } from '../StateBar';
import { RowMenu } from '../RowMenu';
import { formatLastActive } from '../time';
import { isUserRole, type UserRole } from '../../../shared/auth/roles';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
import './Roster.css';

const ROLE_AVATAR_CLASS: Record<UserRole, string> = {
  Manager: 'avatar--mgr',
  FrontendDeveloper: 'avatar--frontend',
  BackendDeveloper: 'avatar--backend',
  Qa: 'avatar--qa',
};

interface RosterProps {
  members: TeamRosterMember[];
  viewerRole: UserRole;
  onRemoveClick: (member: TeamRosterMember) => void;
}

function getAvatarClass(role: string): string {
  return isUserRole(role) ? ROLE_AVATAR_CLASS[role] : 'avatar';
}

function getAvatarInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (displayName[0] || '?').toUpperCase();
}

export function Roster({ members, viewerRole, onRemoveClick }: RosterProps) {
  const { t } = useTranslation('team');
  const isManager = viewerRole === 'Manager';

  return (
    <div className="roster-card">
      <table className="roster-table" aria-label={t('roster.ariaLabel')}>
        <thead>
          <tr>
            <th className="roster-table__header-member">{t('roster.member')}</th>
            <th className="roster-table__header-role">{t('roster.role')}</th>
            <th className="roster-table__header-active">{t('roster.active')}</th>
            <th className="roster-table__header-mix">{t('roster.stateMix')}</th>
            <th className="roster-table__header-last">{t('roster.lastActive')}</th>
            {isManager && <th className="roster-table__header-actions"><span className="sr-only">{t('roster.actions')}</span></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId} className={member.isSelf ? 'roster-table__row--self' : ''}>
              {/* Member column */}
              <td className="roster-table__name-cell">
                <div className="roster-table__name-stack">
                  <div className={`avatar avatar--sm ${getAvatarClass(member.role)}`} aria-hidden="true">
                    {getAvatarInitials(member.displayName)}
                  </div>
                  <div className="roster-table__name-info">
                    <div className="member-name">
                      {member.displayName}
                      {member.isSelf && <span className="chip-you">{t('you')}</span>}
                    </div>
                    <div className="member-handle">{member.email}</div>
                  </div>
                </div>
              </td>

              <td className="roster-table__role-cell">
                {isUserRole(member.role) ? (
                  <RoleBadge role={member.role} />
                ) : (
                  <span className="role-badge">{member.role}</span>
                )}
              </td>

              {/* Active count column */}
              <td className="roster-table__active">{member.status.active}</td>

              {/* State mix column */}
              <td className="roster-table__mix-cell">
                <StateBar mix={member.status.mix} />
              </td>

              {/* Last active column */}
              <td className="roster-table__last-active">
                {formatLastActive(member.status.lastActive)}
              </td>

              {/* Actions column */}
              {isManager && (
                <td className="roster-table__actions">
                  {!member.isSelf && (
                    <RowMenu onRemove={() => onRemoveClick(member)} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
