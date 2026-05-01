import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttFeatureRow } from '../../../../../src/pages/Gantt/components/GanttFeatureRow';
import { computeFeatureGeometry } from '../../../../../src/pages/Gantt/ganttStageGeometry';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
} from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import type { PhaseKind, Track } from '../../../../../src/common/types/feature';

const RANGE = { start: '2026-04-01', end: '2026-05-15' };
const DAY_PX = 16;

beforeEach(async () => {
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('en');
});

const noopResolve = () => undefined;
const EMPTY_EXPANDED: ReadonlyMap<Track, ReadonlySet<PhaseKind>> = new Map();

function renderRow(overrides: Partial<Parameters<typeof GanttFeatureRow>[0]> = {}) {
  const geometry = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
  return render(
    <GanttFeatureRow
      feature={MINI_TEAM_FEATURE}
      geometry={geometry}
      today={FIXTURE_TODAY}
      lead={MINI_TEAM_MEMBERS.be}
      expanded={false}
      expandedPhases={EMPTY_EXPANDED}
      onToggleExpand={vi.fn()}
      onTogglePhase={vi.fn()}
      resolvePerformer={noopResolve}
      {...overrides}
    />,
  );
}

describe('GanttFeatureRow — collapsed lane composition', () => {
  it('renders the row container and caret', () => {
    renderRow();
    expect(screen.getByTestId(`feature-row-${MINI_TEAM_FEATURE.id}`)).toBeTruthy();
    expect(screen.getByTestId('expand-caret')).toBeTruthy();
  });

  it('renders all 3 gate chips in the collapsed lane (UX-001-02)', () => {
    renderRow();
    expect(screen.getByTestId('gate-chip-spec')).toBeTruthy();
    expect(screen.getByTestId('gate-chip-collapsed-backend.prep-gate')).toBeTruthy();
    expect(screen.getByTestId('gate-chip-collapsed-frontend.prep-gate')).toBeTruthy();
  });

  it('renders per-track summary stripes with data-track', () => {
    renderRow();
    const beStripe = screen.getByTestId(`feature-track-summary-${MINI_TEAM_FEATURE.id}-backend`);
    const feStripe = screen.getByTestId(`feature-track-summary-${MINI_TEAM_FEATURE.id}-frontend`);
    expect(beStripe.getAttribute('data-track')).toBe('backend');
    expect(feStripe.getAttribute('data-track')).toBe('frontend');
  });

  it('marks the frontend track stripe as dimmed when its prep gate is waiting', () => {
    renderRow();
    expect(
      screen
        .getByTestId(`feature-track-summary-${MINI_TEAM_FEATURE.id}-frontend`)
        .getAttribute('data-dimmed'),
    ).toBe('true');
    expect(
      screen
        .getByTestId(`feature-track-summary-${MINI_TEAM_FEATURE.id}-backend`)
        .getAttribute('data-dimmed'),
    ).toBe('false');
  });
});

describe('GanttFeatureRow — expand wiring', () => {
  it('clicking the caret fires onToggleExpand(featureId)', () => {
    const onToggleExpand = vi.fn();
    renderRow({ onToggleExpand });
    fireEvent.click(screen.getByTestId('expand-caret'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onToggleExpand).toHaveBeenCalledWith(MINI_TEAM_FEATURE.id);
  });

  it('mounts the expanded track rows when expanded=true', () => {
    renderRow({ expanded: true });
    expect(screen.getByTestId(`track-row-${MINI_TEAM_FEATURE.id}-backend`)).toBeTruthy();
    expect(screen.getByTestId(`track-row-${MINI_TEAM_FEATURE.id}-frontend`)).toBeTruthy();
  });

  it('does NOT mount track rows when expanded=false', () => {
    renderRow({ expanded: false });
    expect(
      screen.queryByTestId(`track-row-${MINI_TEAM_FEATURE.id}-backend`),
    ).toBeNull();
  });
});
