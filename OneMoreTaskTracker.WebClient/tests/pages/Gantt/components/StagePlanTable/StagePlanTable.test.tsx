import { describe, expect, it } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { StagePlanTable } from '../../../../../src/pages/Gantt/components/StagePlanTable/StagePlanTable';
import { useStagePlanForm } from '../../../../../src/pages/Gantt/useStagePlanForm';
import { emptyStagePlans, buildStagePlans, MINI_TEAM_MEMBERS } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import type { TeamRosterMember } from '../../../../../src/common/api/teamApi';
import { __resetTeamRosterCache } from '../../../../../src/pages/Gantt/useTeamRoster';

const ROSTER: TeamRosterMember[] = Object.values(MINI_TEAM_MEMBERS).map((m) => ({
  userId: m.userId,
  email: m.email ?? '',
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

  it('renders the range summary only when every row has both dates set', () => {
    // Partial plan: no summary.
    const partial = buildStagePlans({
      CsApproving: { plannedStart: '2026-05-01', plannedEnd: '2026-05-05' },
      Development: { plannedStart: '2026-05-05', plannedEnd: '2026-05-20' },
    });
    const { unmount } = render(
      <StagePlanTable
        initial={partial}
        activeState="Development"
        submitting={false}
        readOnly={false}
        form={renderHook(() => useStagePlanForm(partial)).result.current}
        roster={ROSTER}
      />,
    );
    expect(screen.queryByTestId('stage-plan-range-summary')).toBeNull();
    unmount();

    // Full plan: summary shows min→max · N days.
    const full = buildStagePlans({
      CsApproving:    { plannedStart: '2026-05-01', plannedEnd: '2026-05-05' },
      Development:    { plannedStart: '2026-05-05', plannedEnd: '2026-05-20' },
      Testing:        { plannedStart: '2026-05-20', plannedEnd: '2026-05-25' },
      EthalonTesting: { plannedStart: '2026-05-25', plannedEnd: '2026-05-28' },
      LiveRelease:    { plannedStart: '2026-05-29', plannedEnd: '2026-05-29' },
    });
    render(
      <StagePlanTable
        initial={full}
        activeState="LiveRelease"
        submitting={false}
        readOnly={false}
        form={renderHook(() => useStagePlanForm(full)).result.current}
        roster={ROSTER}
      />,
    );
    const summary = screen.getByTestId('stage-plan-range-summary');
    // 2026-05-01 → 2026-05-29 inclusive = 29 days.
    expect(summary).toHaveTextContent('2026-05-01');
    expect(summary).toHaveTextContent('2026-05-29');
    expect(summary).toHaveTextContent('29');
  });

  it('stale performer row (detail performer=null, performerUserId set) renders Reassign affordance', () => {
    const stalePlans = buildStagePlans({
      Development: { plannedStart: '2026-05-05', plannedEnd: '2026-05-20', performerUserId: 9999 },
    });
    // detailStagePlans mirrors the BE-resolved payload: performer=null because
    // the referenced user is no longer on the manager's roster.
    const detail = stalePlans.map((p) => ({ ...p, performer: null }));
    render(
      <StagePlanTable
        initial={stalePlans}
        detailStagePlans={detail}
        activeState="Development"
        submitting={false}
        readOnly={false}
        form={renderHook(() => useStagePlanForm(stalePlans)).result.current}
        roster={ROSTER}
      />,
    );
    expect(screen.getByTestId('stage-performer-stale')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reassign|переназначить/i }),
    ).toBeInTheDocument();
  });
});
