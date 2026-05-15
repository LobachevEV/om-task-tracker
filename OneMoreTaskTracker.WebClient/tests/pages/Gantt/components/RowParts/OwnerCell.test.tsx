import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { OwnerCell } from '../../../../../src/pages/Gantt/components/RowParts/OwnerCell';
import type { MiniTeamMember } from '../../../../../src/common/types/feature';
import { MINI_TEAM_MEMBERS } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const { fe, be, qa } = MINI_TEAM_MEMBERS;

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

const noop = () => '';

describe('OwnerCell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders em-dash signal when noSignal=true', () => {
    render(
      <OwnerCell
        stageOwnerUserId={null}
        resolveOwner={resolverFor([])}
        noSignal
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders unassigned label when stageOwnerUserId is null and no inherited owner', () => {
    render(
      <OwnerCell
        stageOwnerUserId={null}
        inheritedOwnerUserId={null}
        resolveOwner={resolverFor([])}
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders removed label when stageOwnerUserId is set but cannot be resolved', () => {
    render(
      <OwnerCell
        stageOwnerUserId={9999}
        resolveOwner={resolverFor([fe, be, qa])}
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText('Removed')).toBeInTheDocument();
  });

  it('renders owner display name when stageOwnerUserId resolves', () => {
    render(
      <OwnerCell
        stageOwnerUserId={fe.userId}
        resolveOwner={resolverFor([fe])}
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
  });

  it('renders inherited owner with glyph and suffix when no stage owner but inherited owner resolves', () => {
    render(
      <OwnerCell
        stageOwnerUserId={null}
        inheritedOwnerUserId={fe.userId}
        resolveOwner={resolverFor([fe])}
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
    expect(screen.getByText('↘')).toBeInTheDocument();
    expect(screen.getByText('· via track')).toBeInTheDocument();
  });

  it('renders inline editor when canEdit=true and roster is provided', () => {
    const roster = [
      {
        userId: fe.userId,
        displayName: fe.displayName,
        role: fe.role,
        email: fe.email ?? '',
        managerId: null,
        isSelf: false,
        status: { active: 1, lastActive: null, mix: { inDev: 0, inTest: 0, mrToRelease: 0, mrToMaster: 0, completed: 0 } },
      },
    ];

    render(
      <OwnerCell
        stageOwnerUserId={fe.userId}
        resolveOwner={resolverFor([fe])}
        canEdit
        mutations={{ saveOwner: vi.fn().mockResolvedValue(undefined) }}
        roster={roster}
        testId="owner-picker-test"
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
        ariaLabel="Owner picker"
      />,
    );

    expect(screen.getByTestId('owner-picker-test')).toBeInTheDocument();
  });

  it('falls back to read-only avatar when canEdit=true but roster is not provided', () => {
    render(
      <OwnerCell
        stageOwnerUserId={fe.userId}
        resolveOwner={resolverFor([fe])}
        canEdit
        mutations={{ saveOwner: vi.fn().mockResolvedValue(undefined) }}
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel="· via track"
        buildAnnouncement={noop}
      />,
    );

    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /owner/i })).toBeNull();
  });

  it('applies cssPrefix to generated class names', () => {
    const { container } = render(
      <OwnerCell
        stageOwnerUserId={null}
        resolveOwner={resolverFor([])}
        cssPrefix="my-prefix"
        unassignedLabel="Unassigned"
        removedLabel="Removed"
        inheritedSuffixLabel=""
        buildAnnouncement={noop}
      />,
    );

    expect(container.querySelector('.my-prefix__unassigned')).toBeInTheDocument();
  });
});
