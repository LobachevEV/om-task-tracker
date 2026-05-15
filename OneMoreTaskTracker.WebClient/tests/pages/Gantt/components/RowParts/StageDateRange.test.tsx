import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { StageDateRange } from '../../../../../src/pages/Gantt/components/RowParts/StageDateRange';
import { FIXTURE_TODAY } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const BASE_PROPS = {
  featureId: 101,
  kind: 'Frontend' as const,
  stageKey: 'Development' as const,
  stageVersion: 1,
  today: FIXTURE_TODAY,
  locale: 'en',
  featureTitle: 'Export to PDF',
  stageName: 'Development',
};

describe('StageDateRange — read-only', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders formatted start and end dates when both are set', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart="2026-04-15"
        plannedEnd="2026-04-25"
      />,
    );

    expect(screen.getByText(/Apr 15/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 25/)).toBeInTheDocument();
  });

  it('renders em-dashes when both dates are null', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart={null}
        plannedEnd={null}
      />,
    );

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders em-dash for missing start but formatted end', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart={null}
        plannedEnd="2026-04-25"
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Apr 25/)).toBeInTheDocument();
  });

  it('shows positive dtr when plannedEnd is in the future', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart="2026-04-20"
        plannedEnd="2026-04-30"
      />,
    );

    expect(screen.getByText(/^\d+d$/)).toBeInTheDocument();
  });

  it('marks dtr as overdue when plannedEnd is in the past', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart="2026-04-01"
        plannedEnd="2026-04-10"
      />,
    );

    const dtr = screen.getByText(/-\d+d/);
    expect(dtr).toHaveAttribute('data-overdue', 'true');
  });

  it('does not mark dtr as overdue when plannedEnd is today or future', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart="2026-04-20"
        plannedEnd="2026-04-30"
      />,
    );

    const dtr = screen.getByText(/\d+d/);
    expect(dtr).toHaveAttribute('data-overdue', 'false');
  });

  it('shows em-dash dtr when plannedEnd is null', () => {
    render(
      <StageDateRange
        {...BASE_PROPS}
        plannedStart={null}
        plannedEnd={null}
      />,
    );

    const dtrs = screen.getAllByText('—');
    expect(dtrs.length).toBeGreaterThanOrEqual(1);
  });
});
