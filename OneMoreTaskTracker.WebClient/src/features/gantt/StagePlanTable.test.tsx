import { describe, expect, it } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { StagePlanTable } from './StagePlanTable';
import { useStagePlanForm } from './useStagePlanForm';
import { emptyStagePlans, buildStagePlans, MINI_TEAM_MEMBERS } from './__fixtures__/FeatureFixtures';
import type { TeamRosterMember } from '../../shared/api/teamApi';
import { __resetTeamRosterCache } from './useTeamRoster';

const ROSTER: TeamRosterMember[] = Object.values(MINI_TEAM_MEMBERS).map((m) => ({
  userId: m.userId,
  email: m.email,
  role: m.role,
  displayName: m.displayName,
  isSelf: false,
  managerId: null,
  status: {
    active: 0,
    lastActive: null,
    mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
  },
}));

function renderWithForm(initialPlans = emptyStagePlans(), activeState: 'CsApproving' | 'Development' | 'Testing' | 'EthalonTesting' | 'LiveRelease' = 'Development', readOnly = false) {
  __resetTeamRosterCache();
  const { result } = renderHook(() => useStagePlanForm(initialPlans));
  render(
    <StagePlanTable
      initial={initialPlans}
      activeState={activeState}
      submitting={false}
      readOnly={readOnly}
      form={result.current}
      roster={ROSTER}
    />,
  );
  return result;
}

describe('StagePlanTable', () => {
  it('renders exactly 5 data rows plus the header row', () => {
    renderWithForm();
    const { container } = { container: document.body };
    const dataRows = container.querySelectorAll('.stage-plan__row:not(.stage-plan__row--head)');
    expect(dataRows.length).toBe(5);
  });

  it('renders the active stage with data-active=true', () => {
    renderWithForm(emptyStagePlans(), 'Testing');
    const rows = document.querySelectorAll('.stage-plan__row:not(.stage-plan__row--head)');
    const active = Array.from(rows).filter((r) => r.getAttribute('data-active') === 'true');
    expect(active).toHaveLength(1);
  });

  it('emits an aligned continuity hint when adjacent stages share a date', () => {
    const plans = buildStagePlans({
      CsApproving: { plannedStart: '2026-05-01', plannedEnd: '2026-05-12' },
      Development: { plannedStart: '2026-05-12', plannedEnd: '2026-05-20' },
    });
    renderWithForm(plans);
    expect(screen.getByText(/aligned|стык/i)).toBeInTheDocument();
  });

  it('hides inputs in read-only mode', () => {
    renderWithForm(emptyStagePlans(), 'Development', true);
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
    expect(document.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  });

  it('renders column headers from the i18n namespace', () => {
    renderWithForm();
    expect(screen.getByText(/Stage|Этап/)).toBeInTheDocument();
    expect(screen.getByText(/Planned start|План\. начало/)).toBeInTheDocument();
    expect(screen.getByText(/Planned end|План\. окончание/)).toBeInTheDocument();
    expect(screen.getByText(/^Performer|Ответственный$/)).toBeInTheDocument();
  });
});
