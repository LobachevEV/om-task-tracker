import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagePlanRow } from './StagePlanRow';
import type { TeamRosterMember } from '../../../common/api/teamApi';

const roster: TeamRosterMember[] = [
  {
    userId: 2,
    email: 'fe@example.com',
    displayName: 'Fe Wong',
    role: 'FrontendDeveloper',
    managerId: 1,
    isSelf: false,
    status: {
      active: 0,
      lastActive: null,
      mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
    },
  },
];

describe('StagePlanRow', () => {
  it('renders the 01…05 numeric prefix and stage name', () => {
    render(
      <StagePlanRow
        index={0}
        row={{ stage: 'CsApproving', plannedStart: '', plannedEnd: '', performerUserId: null }}
        validation={{ dateRangeInvalid: false, missingStart: false }}
        roster={roster}
        activeState="CsApproving"
        disabled={false}
        readOnly={false}
        onChangeDate={vi.fn()}
        onChangePerformer={vi.fn()}
      />,
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText(/CS approving|CS согласование/)).toBeInTheDocument();
  });

  it('marks the active stage row via data-active', () => {
    const { container } = render(
      <StagePlanRow
        index={1}
        row={{ stage: 'Development', plannedStart: '', plannedEnd: '', performerUserId: null }}
        validation={{ dateRangeInvalid: false, missingStart: false }}
        roster={roster}
        activeState="Development"
        disabled={false}
        readOnly={false}
        onChangeDate={vi.fn()}
        onChangePerformer={vi.fn()}
      />,
    );
    const row = container.querySelector('.stage-plan__row');
    expect(row?.getAttribute('data-active')).toBe('true');
  });

  it('calls onChangeDate when a date input changes', async () => {
    const user = userEvent.setup();
    const onChangeDate = vi.fn();
    render(
      <StagePlanRow
        index={0}
        row={{ stage: 'CsApproving', plannedStart: '', plannedEnd: '', performerUserId: null }}
        validation={{ dateRangeInvalid: false, missingStart: false }}
        roster={roster}
        activeState="Development"
        disabled={false}
        readOnly={false}
        onChangeDate={onChangeDate}
        onChangePerformer={vi.fn()}
      />,
    );
    const [startInput] = screen.getAllByDisplayValue('');
    await user.type(startInput, '2026-05-10');
    expect(onChangeDate).toHaveBeenCalledWith('plannedStart', '2026-05-10');
  });

  it('shows validation error copy and sets aria-invalid when end<start', () => {
    render(
      <StagePlanRow
        index={0}
        row={{
          stage: 'Development',
          plannedStart: '2026-05-20',
          plannedEnd: '2026-05-10',
          performerUserId: null,
        }}
        validation={{ dateRangeInvalid: true, missingStart: false }}
        roster={roster}
        activeState="Development"
        disabled={false}
        readOnly={false}
        onChangeDate={vi.fn()}
        onChangePerformer={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const inputs = screen.getAllByDisplayValue(/2026-05-(10|20)/);
    for (const input of inputs) {
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
  });

  it('renders plain text in read-only mode (no inputs)', () => {
    render(
      <StagePlanRow
        index={0}
        row={{
          stage: 'Development',
          plannedStart: '2026-05-10',
          plannedEnd: '2026-05-20',
          performerUserId: 2,
        }}
        validation={{ dateRangeInvalid: false, missingStart: false }}
        roster={roster}
        activeState="Development"
        disabled={false}
        readOnly
        onChangeDate={vi.fn()}
        onChangePerformer={vi.fn()}
      />,
    );
    expect(screen.queryByDisplayValue('2026-05-10')).toBeNull();
    expect(screen.getByText('2026-05-10')).toBeInTheDocument();
    expect(screen.getByText('2026-05-20')).toBeInTheDocument();
    expect(screen.getByText('Fe Wong')).toBeInTheDocument();
  });
});
