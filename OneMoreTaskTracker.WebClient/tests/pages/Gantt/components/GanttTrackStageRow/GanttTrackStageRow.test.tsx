import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttTrackStageRow } from '../../../../../src/pages/Gantt/components/GanttTrackStageRow/GanttTrackStageRow';
import type { MiniTeamMember } from '../../../../../src/common/types/feature';
import type { FeatureTrack, FeatureTrackStage } from '../../../../../src/common/types/featureTrack';
import { windowForZoom } from '../../../../../src/pages/Gantt/ganttMath';
import { FIXTURE_TODAY, MINI_TEAM_MEMBERS } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const { fe, be, qa } = MINI_TEAM_MEMBERS;
const LOADED_RANGE = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

function makeTrack(stages: FeatureTrackStage[], kind: 'Frontend' | 'Backend' = 'Frontend'): FeatureTrack {
  return {
    id: 1,
    featureId: 101,
    kind,
    trackOwnerUserId: fe.userId,
    version: 1,
    stages,
  };
}

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

describe('GanttTrackStageRow — read-only', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders stage start and end dates', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: '2026-04-15',
      plannedEnd: '2026-04-25',
      stageOwnerUserId: null,
      stageVersion: 1,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    expect(screen.getByText(/Apr 15/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 25/)).toBeInTheDocument();
  });

  it('renders a single no-signal dash when stage has no owner and no dates', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'StandTesting',
      plannedStart: null,
      plannedEnd: null,
      stageOwnerUserId: null,
      stageVersion: 0,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    const allDashes = screen.getAllByText('—');
    expect(allDashes).toHaveLength(1);
  });

  it('renders owner name when stage owner is resolved', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: '2026-04-15',
      plannedEnd: '2026-04-25',
      stageOwnerUserId: fe.userId,
      stageVersion: 1,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([fe])}
      />,
    );

    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
  });

  it('renders no-signal dash when stage has no owner, no track owner, and no dates', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: null,
      plannedEnd: null,
      stageOwnerUserId: null,
      stageVersion: 0,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders unassigned text when stage has no owner but has dates (not noSignal)', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: '2026-04-15',
      plannedEnd: '2026-04-25',
      stageOwnerUserId: null,
      stageVersion: 0,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('renders inherited affordance (↘ glyph and · via track suffix) when stage owner is null but track owner resolves', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: null,
      plannedEnd: null,
      stageOwnerUserId: null,
      stageVersion: 0,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([fe])}
      />,
    );

    expect(screen.getByText('↘')).toBeInTheDocument();
    expect(screen.getByText('· via track')).toBeInTheDocument();
    expect(screen.getByText(fe.displayName)).toBeInTheDocument();
  });

  it('renders stale owner indicator when owner id is set but cannot be resolved', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'Development',
      plannedStart: '2026-04-15',
      plannedEnd: '2026-04-25',
      stageOwnerUserId: 9999,
      stageVersion: 1,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([fe, be, qa])}
      />,
    );

    expect(screen.getByText(/removed/i)).toBeInTheDocument();
  });

  it('renders the data-testid attribute for the row', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'ReleaseToLive',
      plannedStart: '2026-04-28',
      plannedEnd: '2026-04-30',
      stageOwnerUserId: null,
      stageVersion: 1,
    };
    const track = makeTrack([stage], 'Backend');
    track.featureId = 202;

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Backend"
        featureTitle="Some feature"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    expect(screen.getByTestId('track-stage-row-202-Backend-ReleaseToLive')).toBeInTheDocument();
  });

  it('shows overdue marker when plannedEnd is in the past', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'SrApproving',
      plannedStart: '2026-04-01',
      plannedEnd: '2026-04-10',
      stageOwnerUserId: null,
      stageVersion: 1,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    const dtr = screen.getByText(/-\d+d/);
    expect(dtr).toHaveAttribute('data-overdue', 'true');
  });

  it('does not mark as overdue when plannedEnd is in the future', () => {
    const stage: FeatureTrackStage = {
      stageKey: 'ReleaseToLive',
      plannedStart: '2026-04-25',
      plannedEnd: '2026-04-30',
      stageOwnerUserId: null,
      stageVersion: 1,
    };
    const track = makeTrack([stage]);

    render(
      <GanttTrackStageRow
        track={track}
        stage={stage}
        kind="Frontend"
        featureTitle="Export to PDF"
        today={FIXTURE_TODAY}
        loadedRange={LOADED_RANGE}
        dayPx={DAY_PX}
        index={0}
        resolveOwner={resolverFor([])}
      />,
    );

    const dtr = screen.getByText(/\d+d/);
    expect(dtr).toHaveAttribute('data-overdue', 'false');
  });
});
