import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagePerformerCombobox } from './StagePerformerCombobox';
import type { TeamRosterMember } from '../../shared/api/teamApi';

const roster: TeamRosterMember[] = [
  {
    userId: 1,
    email: 'mel@example.com',
    displayName: 'Mel PM',
    role: 'Manager',
    managerId: null,
    isSelf: true,
    status: {
      active: 0,
      lastActive: null,
      mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
    },
  },
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

describe('StagePerformerCombobox', () => {
  it('shows Unassigned placeholder when empty', () => {
    render(
      <StagePerformerCombobox
        value={null}
        roster={roster}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.placeholder).toMatch(/Unassigned|Не назначен/);
  });

  it('filters options by query', async () => {
    const user = userEvent.setup();
    render(
      <StagePerformerCombobox
        value={null}
        roster={roster}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'Fe');
    const options = await screen.findAllByRole('option');
    // Should match "Fe Wong" only.
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Fe Wong');
  });

  it('commits selection via click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StagePerformerCombobox
        value={null}
        roster={roster}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    const [first] = await screen.findAllByRole('option');
    await user.click(first);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('× clear button resets to null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StagePerformerCombobox
        value={1}
        roster={roster}
        onChange={onChange}
      />,
    );
    const clearBtn = screen.getByRole('button');
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('Escape reverts an in-progress edit without committing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StagePerformerCombobox
        value={2}
        roster={roster}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'XXX');
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('Fe Wong');
  });

  it('renders a plain-text representation when readOnly', () => {
    render(
      <StagePerformerCombobox
        value={2}
        roster={roster}
        onChange={vi.fn()}
        readOnly
      />,
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Fe Wong')).toBeInTheDocument();
  });
});
