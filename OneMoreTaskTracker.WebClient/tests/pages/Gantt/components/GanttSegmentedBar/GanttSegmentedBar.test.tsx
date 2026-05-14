import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttSegmentedBar } from '../../../../../src/pages/Gantt/components/GanttSegmentedBar/GanttSegmentedBar';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  OVERDUE_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../../../../src/pages/Gantt/ganttMath';
import { computeStageBars } from '../../../../../src/pages/Gantt/ganttStageGeometry';

const window = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

describe('GanttSegmentedBar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders exactly 5 segment images in canonical order', () => {
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
      />,
    );
    const segs = screen.getAllByRole('img');
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
      />,
    );
    const segs = screen.getAllByRole('img');
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
      />,
    );
    const bar = screen.getByTestId('segmented-bar');
    expect(bar).toHaveAttribute('data-variant', 'ghost');
    const allSegs = screen.getAllByRole('img');
    expect(allSegs.every((s) => s.getAttribute('data-variant') === 'ghost')).toBe(true);
  });

  it('renders a feature-level summary bar when stages are unplanned but feature has dates', () => {
    const stageBars = computeStageBars(window, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={UNSCHEDULED_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
        summaryBar={{ leftPx: 120, widthPx: 480, clampedLeft: false, clampedRight: false }}
      />,
    );
    const summary = screen.getByTestId('segmented-bar-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveStyle({ '--summary-left': '120px', '--summary-width': '480px' });
    expect(screen.queryByText(/not planned yet/i)).not.toBeInTheDocument();
  });

  it('keeps the empty label when there is no summary geometry', () => {
    const stageBars = computeStageBars(window, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={UNSCHEDULED_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
      />,
    );
    expect(screen.queryByTestId('segmented-bar-summary')).not.toBeInTheDocument();
    expect(screen.getByText(/not planned yet/i)).toBeInTheDocument();
  });

  it('attaches a non-empty aria-label to every segment', () => {
    const stageBars = computeStageBars(window, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    render(
      <GanttSegmentedBar
        feature={MINI_TEAM_FEATURE}
        stageBars={stageBars}
        today={FIXTURE_TODAY}
      />,
    );
    const segs = screen.getAllByRole('img');
    for (const s of segs) {
      const label = s.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(10);
    }
  });
});
