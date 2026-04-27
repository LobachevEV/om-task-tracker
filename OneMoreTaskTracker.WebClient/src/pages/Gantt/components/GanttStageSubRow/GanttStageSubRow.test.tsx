import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../common/i18n/config';
import { GanttStageSubRow } from './GanttStageSubRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../ganttMath';
import { computeStageBars } from '../../ganttStageGeometry';
import type { MiniTeamMember } from '../../../../common/types/feature';

const { fe, be, qa, mg } = MINI_TEAM_MEMBERS;
const win = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

describe('GanttStageSubRow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders owner name and a Side badge when the stage has a performer', () => {
    const bars = computeStageBars(win, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const testingSeg = bars.find((b) => b.stage === 'Testing')!;
    render(
      <GanttStageSubRow
        feature={MINI_TEAM_FEATURE}
        seg={testingSeg}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        index={2}
        onOpenStage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stage-owner')).toHaveTextContent(qa.displayName);
    expect(screen.getByTestId('stage-side')).toBeInTheDocument();
  });

  it('renders an "Unassigned" owner + no side badge when performer is null', () => {
    const bars = computeStageBars(win, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    const seg = bars[0];
    render(
      <GanttStageSubRow
        feature={UNSCHEDULED_FEATURE}
        seg={seg}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([])}
        index={0}
        onOpenStage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stage-owner')).toHaveTextContent(/unassigned/i);
    expect(screen.queryByTestId('stage-side')).toBeNull();
  });

  it('renders DTR as `—` for unplanned stages', () => {
    const bars = computeStageBars(win, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttStageSubRow
        feature={UNSCHEDULED_FEATURE}
        seg={bars[0]}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([])}
        index={0}
        onOpenStage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stage-dtr')).toHaveTextContent('—');
  });

  it('renders DTR with leading minus when the stage is overdue', () => {
    const bars = computeStageBars(win, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX);
    const dev = bars.find((b) => b.stage === 'Development')!;
    render(
      <GanttStageSubRow
        feature={OVERDUE_FEATURE}
        seg={dev}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([be, mg])}
        index={1}
        onOpenStage={vi.fn()}
      />,
    );
    const dtr = screen.getByTestId('stage-dtr');
    expect(dtr.textContent).toMatch(/^-\d+d$/);
    expect(dtr).toHaveAttribute('data-overdue', 'true');
  });

  it('does not stamp data-status="current" on a ghost stage even when isCurrent (no amber band on unplanned LiveRelease)', () => {
    // Regression: a feature in state=LiveRelease with 0/5 stages planned
    // (e.g. "Legacy API sunset") used to paint a yellow band across the
    // whole LiveRelease sub-row because the CSS keyed on data-active=true.
    // The active tint must only apply when the stage actually has a plan
    // (data-status='current'); ghost stages must read data-status='ghost'.
    const unplannedShipped = { ...UNSCHEDULED_FEATURE, state: 'LiveRelease' as const };
    const bars = computeStageBars(win, unplannedShipped, FIXTURE_TODAY, DAY_PX);
    const live = bars.find((b) => b.stage === 'LiveRelease')!;
    expect(live.isCurrent).toBe(true);
    expect(live.status).toBe('ghost');
    render(
      <GanttStageSubRow
        feature={unplannedShipped}
        seg={live}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([])}
        index={4}
        onOpenStage={vi.fn()}
      />,
    );
    const row = screen.getByTestId(`stage-subrow-${unplannedShipped.id}-LiveRelease`);
    expect(row.getAttribute('data-status')).toBe('ghost');
    expect(row.getAttribute('data-active')).toBe('true');
  });

  it('renders DTR as `✓` for the completed LiveRelease stage of a shipped feature', () => {
    const bars = computeStageBars(win, SHIPPED_FEATURE, FIXTURE_TODAY, DAY_PX);
    const live = bars.find((b) => b.stage === 'LiveRelease')!;
    render(
      <GanttStageSubRow
        feature={SHIPPED_FEATURE}
        seg={live}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, mg, qa])}
        index={4}
        onOpenStage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stage-dtr').textContent).toBe('✓');
  });

  it('renders "<name> · removed" without throwing when the performer id is stale', () => {
    const bars = computeStageBars(win, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const dev = bars.find((b) => b.stage === 'Development')!;
    render(
      <GanttStageSubRow
        feature={MINI_TEAM_FEATURE}
        seg={dev}
        today={FIXTURE_TODAY}
        removedPerformerName="Ex Dev"
        resolvePerformer={() => undefined}
        index={1}
        onOpenStage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('stage-owner').textContent).toMatch(/Ex Dev/);
    expect(screen.getByTestId('stage-owner').textContent).toMatch(/removed/);
  });
});
