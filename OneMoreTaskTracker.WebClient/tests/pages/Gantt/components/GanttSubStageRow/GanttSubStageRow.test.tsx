import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttSubStageRow } from '../../../../../src/pages/Gantt/components/GanttSubStageRow';
import { SOLO_FEATURE, MINI_TEAM_MEMBERS } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import type { SubStageBarGeometry } from '../../../../../src/pages/Gantt/ganttStageGeometry';
import type {
  FeatureSubStage,
  PhaseKind,
  Track,
} from '../../../../../src/common/types/feature';

beforeEach(async () => {
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('en');
});

function makeSubStage(
  track: Track,
  phase: PhaseKind,
  ordinal: number,
  overrides: Partial<FeatureSubStage> = {},
): FeatureSubStage {
  return {
    id: 9000 + ordinal,
    track,
    phase,
    ordinal,
    ownerUserId: null,
    owner: null,
    plannedStart: '2026-04-15',
    plannedEnd: '2026-04-20',
    version: 3,
    ...overrides,
  };
}

function makeGeom(
  track: Track,
  phase: PhaseKind,
  ordinal: number,
  overrides: Partial<SubStageBarGeometry> = {},
): SubStageBarGeometry {
  return {
    subStage: makeSubStage(track, phase, ordinal),
    bar: { leftPx: 0, widthPx: 64 },
    ghost: null,
    isOverdue: false,
    ...overrides,
  };
}

const noopResolve = () => undefined;

describe('GanttSubStageRow — read-only', () => {
  it('renders dates as plain text when canEdit is false', () => {
    render(
      <GanttSubStageRow
        feature={SOLO_FEATURE}
        track="backend"
        phase="development"
        geom={makeGeom('backend', 'development', 0)}
        index={0}
        total={1}
        resolvePerformer={noopResolve}
        canEdit={false}
      />,
    );
    const row = screen.getByTestId(
      `substage-row-${SOLO_FEATURE.id}-backend-development-9000`,
    );
    expect(row.querySelectorAll('.gantt-substage-row__date')).toHaveLength(2);
    expect(
      row.querySelector('.gantt-substage-row__owner-text')?.textContent,
    ).toMatch(/unassigned/i);
  });

  it('shows owner display name when resolvePerformer returns a member', () => {
    render(
      <GanttSubStageRow
        feature={SOLO_FEATURE}
        track="frontend"
        phase="development"
        geom={makeGeom('frontend', 'development', 0, {
          subStage: makeSubStage('frontend', 'development', 0, {
            ownerUserId: MINI_TEAM_MEMBERS.fe.userId,
            owner: MINI_TEAM_MEMBERS.fe,
          }),
        })}
        index={0}
        total={1}
        resolvePerformer={() => MINI_TEAM_MEMBERS.fe}
        canEdit={false}
      />,
    );
    expect(
      screen.getByTestId(`substage-row-${SOLO_FEATURE.id}-frontend-development-9000`)
        .querySelector('.gantt-substage-row__owner-text')?.textContent,
    ).toBe(MINI_TEAM_MEMBERS.fe.displayName);
  });

  it('marks data-overdue=true when geom.isOverdue is true', () => {
    render(
      <GanttSubStageRow
        feature={SOLO_FEATURE}
        track="backend"
        phase="development"
        geom={makeGeom('backend', 'development', 0, { isOverdue: true })}
        index={0}
        total={1}
        resolvePerformer={noopResolve}
        canEdit={false}
      />,
    );
    expect(
      screen
        .getByTestId(`substage-row-${SOLO_FEATURE.id}-backend-development-9000`)
        .getAttribute('data-overdue'),
    ).toBe('true');
  });
});

describe('GanttSubStageRow — remove button gating', () => {
  function renderEditable(total: number) {
    const onRemove = vi.fn();
    render(
      <GanttSubStageRow
        feature={SOLO_FEATURE}
        track="backend"
        phase="development"
        geom={makeGeom('backend', 'development', 0)}
        index={0}
        total={total}
        resolvePerformer={noopResolve}
        canEdit
        mutations={{
          saveTitle: vi.fn(async () => {}),
          saveLead: vi.fn(async () => {}),
          saveGateStatus: vi.fn(async () => {}),
          saveSubStageOwner: vi.fn(async () => {}),
          saveSubStagePlannedStart: vi.fn(async () => {}),
          saveSubStagePlannedEnd: vi.fn(async () => {}),
          appendSubStage: vi.fn(async () => null),
          removeSubStage: vi.fn(async () => {}),
        }}
        roster={[]}
        onRemove={onRemove}
      />,
    );
    return onRemove;
  }

  it('hides Remove when total === 1 (cannot drop below 1 sub-stage)', () => {
    renderEditable(1);
    expect(
      screen.queryByTestId(`substage-remove-${SOLO_FEATURE.id}-9000`),
    ).toBeNull();
  });

  it('shows Remove when total > 1 and fires onRemove(subStageId, version)', () => {
    const onRemove = renderEditable(3);
    const btn = screen.getByTestId(`substage-remove-${SOLO_FEATURE.id}-9000`);
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(9000, 3);
  });

  it('hides Remove when canEdit=false even with total > 1', () => {
    render(
      <GanttSubStageRow
        feature={SOLO_FEATURE}
        track="backend"
        phase="development"
        geom={makeGeom('backend', 'development', 0)}
        index={0}
        total={3}
        resolvePerformer={noopResolve}
        canEdit={false}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId(`substage-remove-${SOLO_FEATURE.id}-9000`),
    ).toBeNull();
  });
});
