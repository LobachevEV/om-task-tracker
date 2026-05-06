import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../../../../../src/common/i18n/config';
import { GanttFeatureTrackBand } from '../../../../../src/pages/Gantt/components/GanttFeatureTrackBand/GanttFeatureTrackBand';
import type { MiniTeamMember } from '../../../../../src/common/types/feature';
import type { FeatureTrack } from '../../../../../src/common/types/featureTrack';
import { windowForZoom } from '../../../../../src/pages/Gantt/ganttMath';
import { FIXTURE_TODAY, MINI_TEAM_MEMBERS } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const { fe, be } = MINI_TEAM_MEMBERS;
const LOADED_RANGE = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

function makeTrack(overrides: Partial<FeatureTrack> = {}): FeatureTrack {
  return {
    id: 1,
    featureId: 101,
    kind: 'Frontend',
    trackOwnerUserId: fe.userId,
    version: 1,
    stages: [],
    ...overrides,
  };
}

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

describe('GanttFeatureTrackBand', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the track label for Frontend kind', () => {
    const track = makeTrack({ kind: 'Frontend' });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );
    expect(screen.getByText('Front')).toBeInTheDocument();
  });

  it('renders the track label for Backend kind', () => {
    const track = makeTrack({ kind: 'Backend' });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Backend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([be])}
      />,
    );
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders owner name when trackOwner is resolved', () => {
    const track = makeTrack({ trackOwnerUserId: fe.userId });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );
    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
  });

  it('renders unassigned label when owner cannot be resolved', () => {
    const track = makeTrack({ trackOwnerUserId: 9999 });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([])}
      />,
    );
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('renders a toggle button with aria-expanded=true by default', () => {
    const track = makeTrack();
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );
    const toggle = screen.getByRole('button', { name: /collapse/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses stage rows when toggle is clicked', async () => {
    const track = makeTrack({
      stages: [
        {
          stageKey: 'Development',
          plannedStart: '2026-04-15',
          plannedEnd: '2026-04-25',
          stageOwnerUserId: null,
          stageVersion: 1,
        },
      ],
    });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );

    const toggle = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`track-stage-row-101-Frontend-Development`)).toBeNull();
  });

  it('re-expands stage rows when toggle is clicked twice', async () => {
    const track = makeTrack({
      stages: [
        {
          stageKey: 'Development',
          plannedStart: '2026-04-15',
          plannedEnd: '2026-04-25',
          stageOwnerUserId: null,
          stageVersion: 1,
        },
      ],
    });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );

    const toggle = screen.getByRole('button', { name: /collapse/i });
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(screen.getByTestId(`track-stage-row-101-Frontend-Development`)).toBeInTheDocument();
  });

  it('renders a stage row for each stage in the track', () => {
    const track = makeTrack({
      stages: [
        {
          stageKey: 'SrApproving',
          plannedStart: '2026-04-10',
          plannedEnd: '2026-04-15',
          stageOwnerUserId: null,
          stageVersion: 1,
        },
        {
          stageKey: 'Development',
          plannedStart: '2026-04-15',
          plannedEnd: '2026-04-25',
          stageOwnerUserId: null,
          stageVersion: 1,
        },
      ],
    });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([fe])}
      />,
    );

    expect(screen.getByTestId('track-stage-row-101-Frontend-SrApproving')).toBeInTheDocument();
    expect(screen.getByTestId('track-stage-row-101-Frontend-Development')).toBeInTheDocument();
  });

  it('applies data-kind attribute based on kind prop', () => {
    const track = makeTrack({ kind: 'Backend', featureId: 202 });
    render(
      <GanttFeatureTrackBand
        track={track}
        kind="Backend"
        featureTitle="Some feature"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        resolveOwner={resolverFor([be])}
      />,
    );

    const band = screen.getByTestId('track-band-202-Backend');
    expect(band).toHaveAttribute('data-kind', 'backend');
  });

  it('does not crash with an empty stages array', () => {
    const track = makeTrack({ stages: [] });
    expect(() =>
      render(
        <GanttFeatureTrackBand
          track={track}
          kind="Frontend"
          featureTitle="Empty"
          today={FIXTURE_TODAY}
          loadedRange={LOADED_RANGE}
          dayPx={DAY_PX}
          resolveOwner={vi.fn().mockReturnValue(undefined)}
        />,
      ),
    ).not.toThrow();
  });
});
