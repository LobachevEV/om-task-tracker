import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttTrackRow } from '../../../../../src/pages/Gantt/components/GanttTrackRow';
import { computeFeatureGeometry } from '../../../../../src/pages/Gantt/ganttStageGeometry';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  SOLO_FEATURE,
} from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import type { FeatureMutationCallbacks } from '../../../../../src/pages/Gantt/components/InlineEditors';
import type { PhaseKind } from '../../../../../src/common/types/feature';

const RANGE = { start: '2026-04-01', end: '2026-05-15' };
const DAY_PX = 16;

beforeEach(async () => {
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('en');
});

function makeMutations(): FeatureMutationCallbacks {
  return {
    saveTitle: vi.fn(async () => {}),
    saveLead: vi.fn(async () => {}),
    saveGateStatus: vi.fn(async () => {}),
    saveSubStageOwner: vi.fn(async () => {}),
    saveSubStagePlannedStart: vi.fn(async () => {}),
    saveSubStagePlannedEnd: vi.fn(async () => {}),
    appendSubStage: vi.fn(async () => 1),
    removeSubStage: vi.fn(async () => {}),
  };
}

const noopResolve = () => undefined;

describe('GanttTrackRow — header composition', () => {
  it('renders the prep gate chip and exactly 4 phase segments per track', () => {
    const geom = computeFeatureGeometry(RANGE, SOLO_FEATURE, FIXTURE_TODAY, DAY_PX);
    const trackGeom = geom.tracks.find((t) => t.track === 'backend')!;
    render(
      <GanttTrackRow
        feature={SOLO_FEATURE}
        trackGeom={trackGeom}
        expandedPhases={new Set<PhaseKind>()}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={vi.fn()}
      />,
    );
    expect(screen.getByTestId(`track-row-${SOLO_FEATURE.id}-backend`)).toBeTruthy();
    expect(screen.getByTestId('gate-chip-backend.prep-gate')).toBeTruthy();
    expect(screen.getByTestId('phase-segment-backend-development')).toBeTruthy();
    expect(screen.getByTestId('phase-segment-backend-stand-testing')).toBeTruthy();
    expect(screen.getByTestId('phase-segment-backend-ethalon-testing')).toBeTruthy();
    expect(screen.getByTestId('phase-segment-backend-live-release')).toBeTruthy();
  });

  it('mirrors data-track and data-dimmed on the row', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const fe = geom.tracks.find((t) => t.track === 'frontend')!;
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={fe}
        expandedPhases={new Set<PhaseKind>()}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={vi.fn()}
      />,
    );
    const row = screen.getByTestId(`track-row-${MINI_TEAM_FEATURE.id}-frontend`);
    expect(row.getAttribute('data-track')).toBe('frontend');
    expect(row.getAttribute('data-dimmed')).toBe('true');
  });
});

describe('GanttTrackRow — cascade gating', () => {
  it('does NOT mount sub-stage rows when no phase is expanded', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = geom.tracks.find((t) => t.track === 'backend')!;
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={be}
        expandedPhases={new Set<PhaseKind>()}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={vi.fn()}
      />,
    );
    expect(
      document.querySelectorAll('[data-testid^="substage-row-"]').length,
    ).toBe(0);
  });

  it('mounts sub-stage rows for the expanded phase only', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = geom.tracks.find((t) => t.track === 'backend')!;
    const devSubStageCount = be.phases.find((p) => p.phase === 'development')!.subStages.length;
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={be}
        expandedPhases={new Set<PhaseKind>(['development'])}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={vi.fn()}
      />,
    );
    expect(
      document.querySelectorAll(
        `[data-testid^="substage-row-${MINI_TEAM_FEATURE.id}-backend-development-"]`,
      ).length,
    ).toBe(devSubStageCount);
  });
});

describe('GanttTrackRow — AddSubStageButton gating', () => {
  it('renders AddSubStageButton only on multi-owner phases when expanded + editable', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = geom.tracks.find((t) => t.track === 'backend')!;
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={be}
        expandedPhases={new Set<PhaseKind>(['development', 'live-release'])}
        canEdit
        mutations={makeMutations()}
        roster={[]}
        resolvePerformer={() => MINI_TEAM_MEMBERS.be}
        onTogglePhase={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId(`add-substage-${MINI_TEAM_FEATURE.id}-backend-development`),
    ).toBeTruthy();
    expect(
      screen.queryByTestId(`add-substage-${MINI_TEAM_FEATURE.id}-backend-live-release`),
    ).toBeNull();
  });

  it('does NOT render AddSubStageButton when canEdit is false', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = geom.tracks.find((t) => t.track === 'backend')!;
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={be}
        expandedPhases={new Set<PhaseKind>(['development'])}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId(`add-substage-${MINI_TEAM_FEATURE.id}-backend-development`),
    ).toBeNull();
  });
});

describe('GanttTrackRow — gate change wiring', () => {
  it('approving the prep gate calls mutations.saveGateStatus with this track-key, approved, null, version', async () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const fe = geom.tracks.find((t) => t.track === 'frontend')!;
    const mutations = makeMutations();
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={fe}
        expandedPhases={new Set<PhaseKind>()}
        canEdit
        mutations={mutations}
        roster={[]}
        resolvePerformer={() => MINI_TEAM_MEMBERS.fe}
        onTogglePhase={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-frontend.prep-gate-approve'));
    expect(mutations.saveGateStatus).toHaveBeenCalledTimes(1);
    expect(mutations.saveGateStatus).toHaveBeenCalledWith(
      MINI_TEAM_FEATURE.id,
      'frontend.prep-gate',
      'approved',
      null,
      fe.prepGate.gate.version,
    );
  });

  it('clicking a multi-owner phase fires onTogglePhase(track, phase)', () => {
    const geom = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = geom.tracks.find((t) => t.track === 'backend')!;
    const onToggle = vi.fn();
    render(
      <GanttTrackRow
        feature={MINI_TEAM_FEATURE}
        trackGeom={be}
        expandedPhases={new Set<PhaseKind>()}
        canEdit={false}
        resolvePerformer={noopResolve}
        onTogglePhase={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('phase-segment-backend-development'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('backend', 'development');
  });
});
