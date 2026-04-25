import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../i18n/config';
import { GanttSegmentedBar } from './GanttSegmentedBar';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../__fixtures__/FeatureFixtures';
import { windowForZoom } from '../ganttMath';
import { computeStageBars } from '../ganttStageGeometry';
import type { MiniTeamMember } from '../../../shared/types/feature';

const { fe, be, qa, mg } = MINI_TEAM_MEMBERS;
const window = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

function resolverFor(members: MiniTeamMember[]) {
  const byId = new Map(members.map((m) => [m.userId, m]));
  return (id: number | null | undefined) =>
    id == null ? undefined : byId.get(id);
}

describe('GanttSegmentedBar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders exactly 5 segment buttons in canonical order', () => {
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={vi.fn()}
      />,
    );
    const segs = screen.getAllByRole('button');
    expect(segs).toHaveLength(5);
    expect(segs[0]).toHaveAttribute('data-testid', 'segment-CsApproving');
    expect(segs[4]).toHaveAttribute('data-testid', 'segment-LiveRelease');
  });

  it('marks the active segment with aria-current="step"', () => {
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={vi.fn()}
      />,
    );
    const segs = screen.getAllByRole('button');
    const currents = segs.filter((s) => s.getAttribute('aria-current') === 'step');
    expect(currents).toHaveLength(1);
    expect(currents[0]).toHaveAttribute('data-testid', `segment-${MINI_TEAM_FEATURE.state}`);
  });

  it('flags overdue segments via data-overdue="true"', () => {
    const stageBars = computeStageBars(window, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={OVERDUE_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={vi.fn()}
      />,
    );
    const dev = screen.getByTestId('segment-Development');
    expect(dev).toHaveAttribute('data-overdue', 'true');
  });

  it('renders ghost variant when the feature has no plan at all', () => {
    const stageBars = computeStageBars(window, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={UNSCHEDULED_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={vi.fn()}
      />,
    );
    const bar = screen.getByTestId('segmented-bar');
    expect(bar).toHaveAttribute('data-variant', 'ghost');
    const allSegs = screen.getAllByRole('button');
    expect(allSegs.every((s) => s.getAttribute('data-variant') === 'ghost')).toBe(true);
  });

  it('calls onOpenStage with the clicked segment’s stage', () => {
    const onOpenStage = vi.fn();
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={onOpenStage}
      />,
    );
    fireEvent.click(screen.getByTestId('segment-Testing'));
    expect(onOpenStage).toHaveBeenCalledWith('Testing');
  });

  it('attaches a non-empty aria-label to every segment', () => {
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        resolvePerformer={resolverFor([fe, be, qa, mg])}
        onOpenStage={vi.fn()}
      />,
    );
    const segs = screen.getAllByRole('button');
    for (const s of segs) {
      const label = s.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(10);
    }
  });
});
