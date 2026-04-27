import { describe, it, expect } from 'vitest';
import { sortRoster } from './sort';
import type { TeamRosterMember } from '../../common/api/teamApi';

const createMember = (
  userId: number,
  displayName: string,
  lastActive: string | null = null,
  isSelf = false
): TeamRosterMember => ({
  userId,
  email: `user${userId}@example.com`,
  displayName,
  role: 'FrontendDeveloper',
  managerId: 1,
  isSelf,
  status: {
    active: 1,
    lastActive,
    mix: {
      inDev: 1,
      mrToRelease: 0,
      inTest: 0,
      mrToMaster: 0,
      completed: 0,
    },
  },
});

describe('sortRoster', () => {
  it('pins self row first', () => {
    const roster = [
      createMember(2, 'Alice', '2026-04-18T12:00:00Z'),
      createMember(1, 'Bob', '2026-04-18T11:00:00Z', true),
    ];

    const sorted = sortRoster(roster, 1);
    expect(sorted[0].userId).toBe(1);
    expect(sorted[0].isSelf).toBe(true);
  });

  it('sorts others by lastActive DESC', () => {
    const roster = [
      createMember(2, 'Alice', '2026-04-18T10:00:00Z'),
      createMember(3, 'Charlie', '2026-04-18T12:00:00Z'),
      createMember(1, 'Bob', '2026-04-18T11:00:00Z', true),
    ];

    const sorted = sortRoster(roster, 1);
    expect(sorted[0].userId).toBe(1); // Self first
    expect(sorted[1].userId).toBe(3); // Charlie (12:00)
    expect(sorted[2].userId).toBe(2); // Alice (10:00)
  });

  it('breaks ties by displayName ASC', () => {
    const roster = [
      createMember(2, 'Zebra', '2026-04-18T12:00:00Z'),
      createMember(3, 'Alice', '2026-04-18T12:00:00Z'),
      createMember(1, 'Bob', '2026-04-18T11:00:00Z', true),
    ];

    const sorted = sortRoster(roster, 1);
    expect(sorted[0].userId).toBe(1); // Self first
    expect(sorted[1].userId).toBe(3); // Alice (same time, alphabetically first)
    expect(sorted[2].userId).toBe(2); // Zebra (same time, alphabetically second)
  });

  it('sorts null lastActive to the end', () => {
    const roster = [
      createMember(2, 'Alice', null),
      createMember(3, 'Charlie', '2026-04-18T12:00:00Z'),
      createMember(1, 'Bob', '2026-04-18T11:00:00Z', true),
    ];

    const sorted = sortRoster(roster, 1);
    expect(sorted[0].userId).toBe(1); // Self first
    expect(sorted[1].userId).toBe(3); // Charlie (has time)
    expect(sorted[2].userId).toBe(2); // Alice (null, sorted last)
  });

  it('ties null lastActive by displayName ASC', () => {
    const roster = [
      createMember(2, 'Zebra', null),
      createMember(3, 'Alice', null),
      createMember(1, 'Bob', '2026-04-18T11:00:00Z', true),
    ];

    const sorted = sortRoster(roster, 1);
    expect(sorted[0].userId).toBe(1); // Self first
    expect(sorted[1].userId).toBe(3); // Alice (null, alphabetically first)
    expect(sorted[2].userId).toBe(2); // Zebra (null, alphabetically second)
  });

  it('handles single member (self only)', () => {
    const roster = [createMember(1, 'Bob', '2026-04-18T11:00:00Z', true)];

    const sorted = sortRoster(roster, 1);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].userId).toBe(1);
  });
});
