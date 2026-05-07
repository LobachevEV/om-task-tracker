import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineOwnerPicker } from '../../../../../src/pages/Gantt/components/InlineEditors/InlineOwnerPicker';
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

afterEach(() => {
  vi.useRealTimers();
});

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

  it('clear button requires two clicks to commit null', async () => {
    vi.useFakeTimers();
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

    // First click: moves to pending state, does NOT commit yet.
    await act(async () => { fireEvent.click(clear!); });
    expect(onSave).not.toHaveBeenCalled();
    expect(clear!.getAttribute('aria-pressed')).toBe('true');
    expect(clear!.classList.contains('inline-cell__clear--pending')).toBe(true);

    // Second click: commits null.
    await act(async () => { fireEvent.click(clear!); });
    await act(async () => { await Promise.resolve(); });
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('clear button auto-reverts to idle after 2 s without second click', async () => {
    vi.useFakeTimers();
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

    await act(async () => { fireEvent.click(clear!); });
    expect(clear!.getAttribute('aria-pressed')).toBe('true');

    // Advance past the 2 s timeout.
    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(onSave).not.toHaveBeenCalled();
    expect(clear!.getAttribute('aria-pressed')).toBe('false');
    expect(clear!.classList.contains('inline-cell__clear--pending')).toBe(false);
  });

  it('clear button keyboard flow: Enter×2 commits null', async () => {
    vi.useFakeTimers();
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

    // First Enter → pending.
    await act(async () => { fireEvent.keyDown(clear!, { key: 'Enter' }); });
    expect(onSave).not.toHaveBeenCalled();
    expect(clear!.getAttribute('aria-pressed')).toBe('true');

    // Second Enter → commit.
    await act(async () => { fireEvent.keyDown(clear!, { key: 'Enter' }); });
    await act(async () => { await Promise.resolve(); });
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('clear button keyboard Escape cancels pending state', async () => {
    vi.useFakeTimers();
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

    await act(async () => { fireEvent.keyDown(clear!, { key: 'Enter' }); });
    expect(clear!.getAttribute('aria-pressed')).toBe('true');

    await act(async () => { fireEvent.keyDown(clear!, { key: 'Escape' }); });
    expect(onSave).not.toHaveBeenCalled();
    expect(clear!.getAttribute('aria-pressed')).toBe('false');
  });

  it('clear button aria-pressed is false initially and true when pending', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <InlineOwnerPicker
        value={11}
        roster={ROSTER}
        displayName="Fe Wong"
        ariaLabel="Owner"
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    const clear = container.querySelector<HTMLButtonElement>('.inline-cell__clear');
    expect(clear).not.toBeNull();
    expect(clear!.getAttribute('aria-pressed')).toBe('false');

    await act(async () => { fireEvent.click(clear!); });
    expect(clear!.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not render clear button when clearable=false', () => {
    const { container } = render(
      <InlineOwnerPicker
        value={11}
        roster={ROSTER}
        displayName="Fe Wong"
        ariaLabel="Owner"
        onSave={vi.fn()}
        clearable={false}
      />,
    );
    expect(container.querySelector('.inline-cell__clear')).toBeNull();
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
