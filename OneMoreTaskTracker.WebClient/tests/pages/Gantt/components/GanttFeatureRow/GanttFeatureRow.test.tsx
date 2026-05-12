import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttFeatureRow } from '../../../../../src/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../../../../src/pages/Gantt/ganttMath';
import { computeStageBars } from '../../../../../src/pages/Gantt/ganttStageGeometry';

const { fe, be } = MINI_TEAM_MEMBERS;
const windowMonth = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

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

  it('renders five segment images inside the summary bar', () => {
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        stageBars={miniTeamStageBars}
        today={FIXTURE_TODAY}
        lead={be}
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
      />,
    );
    const active = screen.getByTestId(`segment-${MINI_TEAM_FEATURE.state}`);
    expect(active).toHaveAttribute('aria-current', 'step');
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
        variant="noPlan"
      />,
    );
    const row = screen.getByTestId(`feature-row-${UNSCHEDULED_FEATURE.id}`);
    expect(row).toHaveAttribute('data-variant', 'noPlan');
  });
});
