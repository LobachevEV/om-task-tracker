import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttPhaseSegment } from '../../../../../src/pages/Gantt/components/GanttPhaseSegment';
import type {
  PhaseBarGeometry,
  SubStageBarGeometry,
} from '../../../../../src/pages/Gantt/ganttStageGeometry';
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

function makeSubStage(track: Track, phase: PhaseKind, ordinal: number): FeatureSubStage {
  return {
    id: 1000 + ordinal,
    track,
    phase,
    ordinal,
    ownerUserId: null,
    owner: null,
    plannedStart: '2026-04-15',
    plannedEnd: '2026-04-20',
    version: 0,
  };
}

function makeSubGeom(track: Track, phase: PhaseKind, ordinal: number): SubStageBarGeometry {
  return {
    subStage: makeSubStage(track, phase, ordinal),
    bar: { leftPx: 0, widthPx: 80 },
    ghost: null,
    isOverdue: false,
  };
}

function makePhaseGeom(overrides: Partial<PhaseBarGeometry> & {
  phase: PhaseKind;
  multiOwner: boolean;
  subStageCount: number;
}): PhaseBarGeometry {
  const subStages = Array.from({ length: overrides.subStageCount }, (_, i) =>
    makeSubGeom('backend', overrides.phase, i),
  );
  return {
    phase: overrides.phase,
    multiOwner: overrides.multiOwner,
    cap: overrides.multiOwner ? 6 : 1,
    derivedPlannedStart: '2026-04-15',
    derivedPlannedEnd: '2026-04-20',
    bar: 'bar' in overrides ? (overrides.bar as PhaseBarGeometry['bar']) : { leftPx: 100, widthPx: 240 },
    ghost: 'ghost' in overrides ? (overrides.ghost as PhaseBarGeometry['ghost']) : null,
    status: overrides.status ?? 'current',
    isOverdue: overrides.isOverdue ?? false,
    subStages,
  };
}

describe('GanttPhaseSegment — render mode', () => {
  it('single-owner phases render as <span role="img"> (no fake button affordance)', () => {
    const onToggle = vi.fn();
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'ethalon-testing', multiOwner: false, subStageCount: 1 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={onToggle}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-ethalon-testing');
    expect(seg.tagName.toLowerCase()).toBe('span');
    expect(seg.getAttribute('role')).toBe('img');
    expect(seg.getAttribute('aria-expanded')).toBeNull();
  });

  it('multi-owner phases render as <button aria-expanded>', () => {
    const onToggle = vi.fn();
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 2 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={onToggle}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.tagName.toLowerCase()).toBe('button');
    expect(seg.getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded mirrors expanded prop on multi-owner phases', () => {
    render(
      <GanttPhaseSegment
        track="frontend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 2 })}
        dimmed={false}
        expanded
        onToggleExpand={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('phase-segment-frontend-development').getAttribute('aria-expanded'),
    ).toBe('true');
  });
});

describe('GanttPhaseSegment — hairlines (multi-owner split rendering)', () => {
  it('renders zero hairlines for a single sub-stage', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 1 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.querySelectorAll('.gantt-phase-segment__hairline')).toHaveLength(0);
  });

  it('renders one hairline for two sub-stages', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 2 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.querySelectorAll('.gantt-phase-segment__hairline')).toHaveLength(1);
  });

  it('renders five hairlines for six sub-stages (the hard cap)', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 6 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.querySelectorAll('.gantt-phase-segment__hairline')).toHaveLength(5);
  });

  it('renders no hairlines when bar geometry is null even if multi-owner', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({
          phase: 'development',
          multiOwner: true,
          subStageCount: 3,
          bar: null,
          ghost: { leftPx: 0, widthPx: 48 },
        })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.querySelectorAll('.gantt-phase-segment__hairline')).toHaveLength(0);
    expect(seg.getAttribute('data-variant')).toBe('ghost');
  });

  it('renders no hairlines for single-owner phases regardless of subStages length', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'live-release', multiOwner: false, subStageCount: 1 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-live-release');
    expect(seg.querySelectorAll('.gantt-phase-segment__hairline')).toHaveLength(0);
  });
});

describe('GanttPhaseSegment — data attributes', () => {
  it('mirrors status, dimmed, overdue, multi-owner, expanded, variant', () => {
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({
          phase: 'development',
          multiOwner: true,
          subStageCount: 2,
          status: 'completed',
          isOverdue: true,
        })}
        dimmed
        expanded
        onToggleExpand={vi.fn()}
      />,
    );
    const seg = screen.getByTestId('phase-segment-backend-development');
    expect(seg.getAttribute('data-status')).toBe('completed');
    expect(seg.getAttribute('data-dimmed')).toBe('true');
    expect(seg.getAttribute('data-overdue')).toBe('true');
    expect(seg.getAttribute('data-multi-owner')).toBe('true');
    expect(seg.getAttribute('data-expanded')).toBe('true');
    expect(seg.getAttribute('data-variant')).toBe('planned');
  });

  it('renders variant=ghost when bar is null and ghost is set', () => {
    render(
      <GanttPhaseSegment
        track="frontend"
        phaseGeom={makePhaseGeom({
          phase: 'stand-testing',
          multiOwner: true,
          subStageCount: 1,
          bar: null,
          ghost: { leftPx: 10, widthPx: 32 },
          status: 'ghost',
        })}
        dimmed={false}
        expanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('phase-segment-frontend-stand-testing').getAttribute('data-variant'),
    ).toBe('ghost');
  });
});

describe('GanttPhaseSegment — toggle wiring', () => {
  it('clicking a multi-owner phase fires onToggleExpand(track, phase)', () => {
    const onToggle = vi.fn();
    render(
      <GanttPhaseSegment
        track="frontend"
        phaseGeom={makePhaseGeom({ phase: 'development', multiOwner: true, subStageCount: 3 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('phase-segment-frontend-development'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('frontend', 'development');
  });

  it('clicking a single-owner phase does NOT fire onToggleExpand', () => {
    const onToggle = vi.fn();
    render(
      <GanttPhaseSegment
        track="backend"
        phaseGeom={makePhaseGeom({ phase: 'live-release', multiOwner: false, subStageCount: 1 })}
        dimmed={false}
        expanded={false}
        onToggleExpand={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('phase-segment-backend-live-release'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
