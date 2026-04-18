import type { TeamRosterMember } from '../../shared/api/teamApi';

/**
 * Sort a roster with the self row pinned first, others sorted by lastActive DESC (nulls last),
 * tie-broken by displayName ASC.
 */
export function sortRoster(
  roster: TeamRosterMember[],
  selfUserId: number
): TeamRosterMember[] {
  const self = roster.find((m) => m.userId === selfUserId);
  const others = roster.filter((m) => m.userId !== selfUserId);

  // Sort others by lastActive DESC, nulls last, tie-break by displayName ASC
  others.sort((a, b) => {
    const aTime = a.status.lastActive ? new Date(a.status.lastActive).getTime() : -1;
    const bTime = b.status.lastActive ? new Date(b.status.lastActive).getTime() : -1;

    // Both null: sort by displayName
    if (aTime === -1 && bTime === -1) {
      return a.displayName.localeCompare(b.displayName);
    }

    // One null: null sorts last
    if (aTime === -1) return 1;
    if (bTime === -1) return -1;

    // Neither null: sort by time DESC
    if (aTime !== bTime) return bTime - aTime;

    // Same time: sort by displayName ASC
    return a.displayName.localeCompare(b.displayName);
  });

  return self ? [self, ...others] : others;
}
