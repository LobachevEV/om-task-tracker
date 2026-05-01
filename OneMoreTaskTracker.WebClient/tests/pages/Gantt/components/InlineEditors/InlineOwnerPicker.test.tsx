import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineOwnerPicker } from '../../../../../src/pages/Gantt/components/InlineEditors/InlineOwnerPicker';
import { ApiError } from '../../../../../src/common/api/ApiError';
import type { TeamRosterMember } from '../../../../../src/common/api/teamApi';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const ROSTER: TeamRosterMember[] = [
  {
    userId: 11,
    email: 'fe@example.com',
    displayName: 'Fe Wong',
    role: 'FrontendDeveloper',
    managerId: 1,
    isSelf: false,
    status: { active: 0, lastActive: null, mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 } },
  },
  {
    userId: 12,
    email: 'be@example.com',
    displayName: 'Be Ivanov',
    role: 'BackendDeveloper',
    managerId: 1,
    isSelf: false,
    status: { active: 0, lastActive: null, mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 } },
  },
];

describe('InlineOwnerPicker', () => {
  it('opens on focus and lists roster members', () => {
    render(
      <InlineOwnerPicker
        value={null}
        roster={ROSTER}
        displayName={null}
        ariaLabel="Owner"
        onSave={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Owner');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Fe Wong')).toBeInTheDocument();
    expect(screen.getByText('Be Ivanov')).toBeInTheDocument();
  });

  it('typing filters the options', () => {
    render(
      <InlineOwnerPicker
        value={null}
        roster={ROSTER}
        displayName={null}
        ariaLabel="Owner"
        onSave={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Owner') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'be' } });
    expect(screen.queryByText('Fe Wong')).toBeNull();
    expect(screen.getByText('Be Ivanov')).toBeInTheDocument();
  });

  it('commits a selected user on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineOwnerPicker
        value={null}
        roster={ROSTER}
        displayName={null}
        ariaLabel="Owner"
        onSave={onSave}
      />,
    );
    const input = screen.getByLabelText('Owner') as HTMLInputElement;
    fireEvent.focus(input);
    // Focus opens the listbox with highlight=0 (first option — userId 11).
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith(11);
  });

  it('clear button commits null', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <InlineOwnerPicker
        value={11}
        roster={ROSTER}
        displayName="Fe Wong"
        ariaLabel="Owner"
        onSave={onSave}
      />,
    );
    const clear = container.querySelector<HTMLButtonElement>('.inline-cell__clear');
    expect(clear).not.toBeNull();
    fireEvent.mouseDown(clear!);
    await act(flush);
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('renders gateway 400 "Pick a teammate from the list" inline next to the picker', async () => {
    const onSave = vi.fn().mockRejectedValue(
      new ApiError(400, 'Request failed (400): Pick a teammate from the list'),
    );
    render(
      <InlineOwnerPicker
        value={null}
        roster={ROSTER}
        displayName={null}
        ariaLabel="Owner"
        onSave={onSave}
      />,
    );
    const input = screen.getByLabelText('Owner') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith(11);
    const alert = await screen.findByRole('alert');
    expect(alert.getAttribute('data-kind')).toBe('validation');
    expect(alert.textContent).toMatch(/Pick a teammate from the list/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders as read-only span when readOnly=true', () => {
    render(
      <InlineOwnerPicker
        value={11}
        roster={ROSTER}
        displayName="Fe Wong"
        ariaLabel="Owner"
        onSave={vi.fn()}
        readOnly
      />,
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Fe Wong')).toBeInTheDocument();
  });
});
