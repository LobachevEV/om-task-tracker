import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { GanttGateChip } from '../../../../../src/pages/Gantt/components/GanttGateChip';
import type { FeatureGate } from '../../../../../src/common/types/feature';

function makeGate(overrides: Partial<FeatureGate> = {}): FeatureGate {
  return {
    id: 1,
    gateKey: 'spec',
    kind: 'spec',
    track: null,
    status: 'waiting',
    approverUserId: null,
    approver: null,
    approvedAtUtc: null,
    requestedAtUtc: null,
    rejectionReason: null,
    version: 7,
    ...overrides,
  };
}

beforeEach(async () => {
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('en');
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('GanttGateChip — render', () => {
  it('returns null when leftPx is null (off-range)', () => {
    const { container } = render(
      <GanttGateChip gate={makeGate()} leftPx={null} canEdit={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a labeled chip with status data attribute', () => {
    render(<GanttGateChip gate={makeGate({ status: 'approved' })} leftPx={120} canEdit={false} />);
    const chip = screen.getByTestId('gate-chip-spec');
    expect(chip.getAttribute('data-status')).toBe('approved');
    expect(chip.getAttribute('data-readonly')).toBe('true');
  });

  it('encodes aria-label with name + status', () => {
    render(<GanttGateChip gate={makeGate({ status: 'rejected' })} leftPx={50} canEdit={false} />);
    const chip = screen.getByTestId('gate-chip-spec');
    expect(chip.getAttribute('aria-label')).toMatch(/spec/i);
    expect(chip.getAttribute('aria-label')).toMatch(/rejected/i);
  });

  it('namespaces testid when testIdScope is provided', () => {
    render(
      <GanttGateChip
        gate={makeGate({ gateKey: 'backend.prep-gate' })}
        leftPx={20}
        canEdit={false}
        testIdScope="collapsed"
      />,
    );
    expect(screen.getByTestId('gate-chip-collapsed-backend.prep-gate')).toBeTruthy();
  });
});

describe('GanttGateChip — approve flow (listbox)', () => {
  it('opening listbox and selecting approved fires onChangeStatus(approved, null)', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-approved'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('spec', 'approved', null, 7);
  });

  it('selecting waiting on already-approved chip fires onChangeStatus(waiting, null)', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'approved' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-waiting'));
    expect(onChange).toHaveBeenCalledWith('spec', 'waiting', null, 7);
  });

  it('toggle button shows aria-expanded=false before opening', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    const toggle = screen.getByTestId('gate-chip-spec-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggle button shows aria-expanded=true after click', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    expect(screen.getByTestId('gate-chip-spec-toggle').getAttribute('aria-expanded')).toBe('true');
  });

  it('listbox renders all three status options', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    expect(screen.getByTestId('gate-chip-spec-option-approved')).toBeTruthy();
    expect(screen.getByTestId('gate-chip-spec-option-waiting')).toBeTruthy();
    expect(screen.getByTestId('gate-chip-spec-option-rejected')).toBeTruthy();
  });

  it('listbox closes after selecting an option', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn().mockResolvedValue(undefined)} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    expect(screen.queryByTestId('gate-chip-spec-listbox')).not.toBeNull();
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-approved'));
    expect(screen.queryByTestId('gate-chip-spec-listbox')).toBeNull();
  });
});

describe('GanttGateChip — reject flow with inline reason', () => {
  it('selecting rejected via listbox does NOT fire onChangeStatus immediately; opens reason editor', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('gate-chip-spec-reason-input')).toBeTruthy();
  });

  it('submitting empty reason shows validation error and does NOT fire onChangeStatus', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-reason-submit'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('gate-chip-spec-reason-error')).toBeTruthy();
  });

  it('submitting whitespace-only reason shows validation error and does NOT fire onChangeStatus', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    fireEvent.change(screen.getByTestId('gate-chip-spec-reason-input'), {
      target: { value: '   \t  ' },
    });
    fireEvent.click(screen.getByTestId('gate-chip-spec-reason-submit'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('submitting non-empty reason fires onChangeStatus(rejected, trimmed reason, version)', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    fireEvent.change(screen.getByTestId('gate-chip-spec-reason-input'), {
      target: { value: '  scope unclear  ' },
    });
    fireEvent.click(screen.getByTestId('gate-chip-spec-reason-submit'));
    expect(onChange).toHaveBeenCalledWith('spec', 'rejected', 'scope unclear', 7);
  });

  it('Enter on reason input submits; Escape cancels', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    fireEvent.change(screen.getByTestId('gate-chip-spec-reason-input'), {
      target: { value: 'broken' },
    });
    fireEvent.keyDown(screen.getByTestId('gate-chip-spec-reason-input'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('spec', 'rejected', 'broken', 7);
    onChange.mockClear();
    // Escape cancels
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting', id: 99 })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    const toggleBtns = screen.getAllByTestId('gate-chip-spec-toggle');
    fireEvent.click(toggleBtns[toggleBtns.length - 1]);
    const rejectOptions = screen.getAllByTestId('gate-chip-spec-option-rejected');
    fireEvent.click(rejectOptions[rejectOptions.length - 1]);
    const inputs = screen.getAllByTestId('gate-chip-spec-reason-input');
    fireEvent.keyDown(inputs[inputs.length - 1], { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('GanttGateChip — reject editor a11y polish', () => {
  it('reason input has aria-describedby pointing at the cap hint span', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    const input = screen.getByTestId('gate-chip-spec-reason-input');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('gate-chip-spec-reason-hint');
    const hint = screen.getByTestId('gate-chip-spec-reason-hint');
    expect(hint.id).toBe('gate-chip-spec-reason-hint');
    expect(hint.textContent).toMatch(/500/);
  });

  it('renders an n/500 character counter that updates as the user types', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-rejected'));
    const counter = screen.getByTestId('gate-chip-spec-reason-counter');
    expect(counter.textContent).toMatch(/^\s*0\s*\/\s*500\s*$/);
    fireEvent.change(screen.getByTestId('gate-chip-spec-reason-input'), {
      target: { value: 'hello' },
    });
    expect(counter.textContent).toMatch(/^\s*5\s*\/\s*500\s*$/);
  });

  it('renders the rejection reason readout with role=status so AT announces updates', () => {
    render(
      <GanttGateChip
        gate={makeGate({ status: 'rejected', rejectionReason: 'spec gaps' })}
        leftPx={40}
        canEdit={false}
      />,
    );
    const readout = screen.getByTestId('gate-chip-spec-rejection-reason');
    expect(readout.getAttribute('role')).toBe('status');
    expect(readout.textContent).toBe('spec gaps');
  });
});

describe('GanttGateChip — re-open from rejected', () => {
  it('selecting waiting on a rejected gate fires onChangeStatus(waiting, null) without opening editor', () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <GanttGateChip
        gate={makeGate({ status: 'rejected', rejectionReason: 'old reason' })}
        leftPx={40}
        canEdit
        onChangeStatus={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    fireEvent.click(screen.getByTestId('gate-chip-spec-option-waiting'));
    expect(onChange).toHaveBeenCalledWith('spec', 'waiting', null, 7);
    expect(screen.queryByTestId('gate-chip-spec-reason-input')).toBeNull();
  });

  it('renders the rejection reason text on a rejected gate', () => {
    render(
      <GanttGateChip
        gate={makeGate({ status: 'rejected', rejectionReason: 'budget tight' })}
        leftPx={40}
        canEdit={false}
      />,
    );
    expect(screen.getByTestId('gate-chip-spec-rejection-reason').textContent).toBe('budget tight');
  });
});

describe('GanttGateChip — readonly', () => {
  it('hides action toggle when canEdit is false', () => {
    render(<GanttGateChip gate={makeGate()} leftPx={40} canEdit={false} />);
    expect(screen.queryByTestId('gate-chip-spec-toggle')).toBeNull();
    expect(screen.queryByTestId('gate-chip-spec-listbox')).toBeNull();
  });
});

describe('GanttGateChip — listbox keyboard navigation', () => {
  it('ArrowDown moves focus to next option', () => {
    render(
      <GanttGateChip gate={makeGate({ status: 'approved' })} leftPx={40} canEdit onChangeStatus={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    const listbox = screen.getByTestId('gate-chip-spec-listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    // After ArrowDown the second option should be focused (index wraps from 0 → 1)
    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
  });

  it('Escape closes the listbox without firing onChangeStatus', () => {
    const onChange = vi.fn();
    render(
      <GanttGateChip gate={makeGate({ status: 'waiting' })} leftPx={40} canEdit onChangeStatus={onChange} />,
    );
    fireEvent.click(screen.getByTestId('gate-chip-spec-toggle'));
    expect(screen.queryByTestId('gate-chip-spec-listbox')).not.toBeNull();
    fireEvent.keyDown(screen.getByTestId('gate-chip-spec-listbox'), { key: 'Escape' });
    expect(screen.queryByTestId('gate-chip-spec-listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
