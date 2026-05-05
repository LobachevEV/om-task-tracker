import { isUserRole } from '../../../common/auth/roles';
import type { MiniTeamMember } from '../../../common/types/feature';
import type { TeamRosterMember } from '../../../common/api/teamApi';

const PLACEHOLDER_ROLE: MiniTeamMember['role'] = 'FrontendDeveloper';

export function toMiniMember(row: TeamRosterMember): MiniTeamMember {
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: isUserRole(row.role) ? row.role : PLACEHOLDER_ROLE,
  };
}

export function placeholderMember(userId: number): MiniTeamMember {
  return {
    userId,
    email: null,
    displayName: `#${userId}`,
    role: PLACEHOLDER_ROLE,
  };
}
