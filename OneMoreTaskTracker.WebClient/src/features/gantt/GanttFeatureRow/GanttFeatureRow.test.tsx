import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../common/i18n/config';
import { GanttFeatureRow } from './GanttFeatureRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../__fixtures__/FeatureFixtures';
import { windowForZoom } from '../ganttMath';
import { computeStageBars } from '../ganttStageGeometry';
import type { MiniTeamMember } from '../../../common/types/feature';

const { fe, be, qa, mg } = MINI_TEAM_MEMBERS;
const windowMonth = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

const miniTeamStageBars = computeStageBars(
  windowMonth,
  MINI_TEAM_FEATURE,
  FIXTURE_TODAY,
  DAY_PX,
);

describe('GanttFeatureRow', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('calls onToggleExpand when the title button is clicked', () => {
    const onToggleExpand = vi.fn();
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be, fe, qa]}
        expanded={false}
        onToggleExpand={onToggleExpand}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const titleBtn = screen
      .getAllByRole('button', { name: new RegExp(MINI_TEAM_FEATURE.title, 'i') })
      .find((el) => el.classList.contains('gantt-row__title'))!;
    fireEvent.click(titleBtn);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('renders five segment buttons inside the summary bar', () => {
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be, fe, qa]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const segs = document.querySelectorAll('[data-testid^="segment-"]');
    expect(segs).toHaveLength(5);
  });

  it('marks the active stage segment with aria-current="step"', () => {
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const active = screen.getByTestId(`segment-${MINI_TEAM_FEATURE.state}`);
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('exposes aria-expanded on the caret', () => {
    const onToggleExpand = vi.fn();
    const { rerender } = render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={false}
        onToggleExpand={onToggleExpand}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const caret = screen.getByTestId('expand-caret');
    expect(caret).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(caret);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);

    rerender(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={true}
        onToggleExpand={onToggleExpand}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    expect(screen.getByTestId('expand-caret')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders five stage sub-rows when expanded', () => {
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={true}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const subRows = document.querySelectorAll(
      `[data-testid^="stage-subrow-${MINI_TEAM_FEATURE.id}-"]`,
    );
    expect(subRows).toHaveLength(5);
  });

  it('calls onOpenStage with the segment stage on click', () => {
    const onOpenStage = vi.fn();
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={onOpenStage}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    fireEvent.click(screen.getByTestId('segment-Testing'));
    expect(onOpenStage).toHaveBeenCalledWith(MINI_TEAM_FEATURE.id, 'Testing');
  });

  it('marks the DTR as overdue when the active stage is past its plannedEnd', () => {
    const overdueStageBars = computeStageBars(
      windowMonth,
      OVERDUE_FEATURE,
      FIXTURE_TODAY,
      DAY_PX,
    );
    render(
      <GanttFeatureRow
        feature={OVERDUE_FEATURE}
        stageBars={overdueStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    expect(screen.getByTestId('feature-dtr')).toHaveAttribute('data-overdue', 'true');
  });

  it('exposes a non-"5/5 planned" counter for partial plans', () => {
    const overdueStageBars = computeStageBars(
      windowMonth,
      OVERDUE_FEATURE,
      FIXTURE_TODAY,
      DAY_PX,
    );
    render(
      <GanttFeatureRow
        feature={OVERDUE_FEATURE}
        stageBars={overdueStageBars}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const counter = screen.getByTestId('feature-planned-counter');
    expect(counter.textContent).toMatch(/^2\/5\b/);
    expect(counter).toHaveAttribute('data-partial', 'true');
  });

  it('renders DTR as `—` for an entirely unscheduled feature', () => {
    render(
      <GanttFeatureRow
        feature={UNSCHEDULED_FEATURE}
        stageBars={computeStageBars(windowMonth, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX)}
        today={FIXTURE_TODAY}
        lead={fe}
        miniTeam={[fe]}
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    expect(screen.getByTestId('feature-dtr').textContent).toBe('—');
  });

  it('stamps data-variant="noPlan" on the row wrapper for ghost lanes', () => {
    render(
      <GanttFeatureRow
        feature={UNSCHEDULED_FEATURE}
        stageBars={computeStageBars(windowMonth, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX)}
        today={FIXTURE_TODAY}
        lead={fe}
        miniTeam={[fe]}
        variant="noPlan"
        expanded={false}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const row = screen.getByTestId(`feature-row-${UNSCHEDULED_FEATURE.id}`);
    expect(row).toHaveAttribute('data-variant', 'noPlan');
  });

  it('never renders the numeric id placeholder for a stale performer', () => {
    const fakeId = 9999;
    const feature = {
      ...MINI_TEAM_FEATURE,
      stagePlans: MINI_TEAM_FEATURE.stagePlans.map((p) =>
        p.stage === 'Development' ? { ...p, performerUserId: fakeId } : p,
      ),
    };
    render(
      <GanttFeatureRow
        feature={feature}
        stageBars={computeStageBars(windowMonth, feature, FIXTURE_TODAY, DAY_PX)}
        today={FIXTURE_TODAY}
        lead={fe}
        miniTeam={[fe]}
        expanded={true}
        onToggleExpand={vi.fn()}
        onOpenStage={vi.fn()}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
      />,
    );
    const devSub = screen.getByTestId(`stage-subrow-${feature.id}-Development`);
    const owner = devSub.querySelector('[data-testid="stage-owner"]')!;
    expect(owner.textContent).not.toContain(`#${fakeId}`);
    expect(owner.textContent?.toLowerCase()).toContain('removed');
  });
});
