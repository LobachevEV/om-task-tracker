import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagePerformerCombobox } from './StagePerformerCombobox';
import type { TeamRosterMember } from '../../../../common/api/teamApi';

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

  describe('stale performer (value set, neither roster nor detail resolves it)', () => {
    it('renders "name · removed" + Reassign affordance when performer is null but value is set', () => {
      render(
        <StagePerformerCombobox
          value={9999}
          roster={roster}
          onChange={vi.fn()}
          performer={null}
        />,
      );
      // Combobox input collapses into the stale display — no live combobox.
      expect(screen.queryByRole('combobox')).toBeNull();
      // Fallback "removed" copy is present (no previous name known here).
      expect(screen.getByTestId('stage-performer-stale')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Reassign|Переназначить/ }),
      ).toBeInTheDocument();
    });

    it('uses the stored displayName from the detail performer when the id resolves server-side but not locally', () => {
      render(
        <StagePerformerCombobox
          value={9999}
          roster={roster}
          onChange={vi.fn()}
          performer={{
            userId: 9999,
            email: 'eve@example.com',
            displayName: 'Eve Qa',
            role: 'Qa',
          }}
        />,
      );
      // The stale copy mentions the historic name so audit context survives.
      expect(screen.getByText(/Eve Qa/)).toBeInTheDocument();
      expect(screen.getByText(/removed|удалён/)).toBeInTheDocument();
    });

    it('Reassign clears the performer id', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <StagePerformerCombobox
          value={9999}
          roster={roster}
          onChange={onChange}
          performer={null}
        />,
      );
      const reassign = screen.getByRole('button', { name: /Reassign|Переназначить/ });
      await user.click(reassign);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('readOnly + stale renders muted "name · removed" without a Reassign button', () => {
      render(
        <StagePerformerCombobox
          value={9999}
          roster={roster}
          onChange={vi.fn()}
          performer={{
            userId: 9999,
            email: 'eve@example.com',
            displayName: 'Eve Qa',
            role: 'Qa',
          }}
          readOnly
        />,
      );
      expect(screen.getByText(/Eve Qa/)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Reassign|Переназначить/ }),
      ).toBeNull();
    });
  });
});
