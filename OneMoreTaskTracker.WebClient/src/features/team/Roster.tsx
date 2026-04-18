import { RoleBadge } from './RoleBadge';
import { StateBar } from './StateBar';
import { RowMenu } from './RowMenu';
import { formatLastActiveRu } from './time';
import { isUserRole, type UserRole } from '../../shared/auth/roles';
import type { TeamRosterMember } from '../../shared/api/teamApi';
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
  const isManager = viewerRole === 'Manager';

  return (
    <div className="roster-card">
      <table className="roster-table">
        <thead>
          <tr>
            <th className="roster-table__header-member">Участник · Member</th>
            <th className="roster-table__header-role">Роль · Role</th>
            <th className="roster-table__header-active">Активн.</th>
            <th className="roster-table__header-mix">Распределение · State mix</th>
            <th className="roster-table__header-last">Посл. активность · Last active</th>
            {isManager && <th className="roster-table__header-actions" />}
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
                      {member.isSelf && <span className="chip-you">ВЫ · YOU</span>}
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
                {formatLastActiveRu(member.status.lastActive)}
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
