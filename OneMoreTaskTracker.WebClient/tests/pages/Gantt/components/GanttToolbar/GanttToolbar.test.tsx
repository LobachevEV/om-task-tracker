import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../../src/common/i18n/config';
import { GanttToolbar } from '../../../../../src/pages/Gantt/components/GanttToolbar/GanttToolbar';

function renderToolbar(stateFilter: 'all' | 'Development' = 'all', onStateFilterChange = vi.fn()) {
  return render(
    <I18nextProvider i18n={i18n}>
      <GanttToolbar
        zoom="month"
        scope="all"
        stateFilter={stateFilter}
        onZoomChange={vi.fn()}
        onScopeChange={vi.fn()}
        onStateFilterChange={onStateFilterChange}
      />
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GanttToolbar state filter — segmented trigger', () => {
  it('renders a single trigger button, not an inline chip wall', () => {
    renderToolbar();

    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    expect(trigger).toBeTruthy();

    expect(screen.queryByTestId('gantt-state-chip-Development')).toBeNull();
    expect(screen.queryByTestId('gantt-state-chip-Testing')).toBeNull();
  });

  it('trigger shows "State" label when filter is all', () => {
    renderToolbar('all');
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    expect(trigger.textContent).toContain('State');
  });

  it('trigger shows active state label when filter is non-all', () => {
    renderToolbar('Development');
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    expect(trigger.textContent).toContain('Development');
  });

  it('trigger has aria-haspopup attribute', () => {
    renderToolbar();
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    expect(trigger.getAttribute('aria-haspopup')).toBeTruthy();
  });

  it('trigger has aria-expanded=false at rest', () => {
    renderToolbar();
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('GanttToolbar state filter — popover open/close', () => {
  it('opens popover on trigger click and shows all chip options', () => {
    renderToolbar();

    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('gantt-state-filter-popover')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-all')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-Development')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-Testing')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-CsApproving')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-EthalonTesting')).toBeTruthy();
    expect(screen.getByTestId('gantt-state-chip-LiveRelease')).toBeTruthy();
  });

  it('trigger aria-expanded becomes true when popover open', () => {
    renderToolbar();
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes popover on Escape key', () => {
    renderToolbar();
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('gantt-state-filter-popover')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('gantt-state-filter-popover')).toBeNull();
  });

  it('closes popover when clicking outside', () => {
    const { container } = renderToolbar();
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('gantt-state-filter-popover')).toBeTruthy();

    fireEvent.pointerDown(container.ownerDocument.body);

    expect(screen.queryByTestId('gantt-state-filter-popover')).toBeNull();
  });

  it('chips inside popover have aria-pressed', () => {
    renderToolbar('Development');
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);

    const devChip = screen.getByTestId('gantt-state-chip-Development');
    expect(devChip.getAttribute('aria-pressed')).toBe('true');

    const allChip = screen.getByTestId('gantt-state-chip-all');
    expect(allChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking a chip calls onStateFilterChange and closes the popover', () => {
    const onStateFilterChange = vi.fn();
    renderToolbar('all', onStateFilterChange);
    const trigger = screen.getByTestId('gantt-state-filter-trigger');
    fireEvent.click(trigger);

    const devChip = screen.getByTestId('gantt-state-chip-Development');
    fireEvent.click(devChip);

    expect(onStateFilterChange).toHaveBeenCalledWith('Development');
    expect(screen.queryByTestId('gantt-state-filter-popover')).toBeNull();
  });
});

describe('GanttToolbar state filter — S-key cycle path (no popover)', () => {
  it('S key cycles state without opening the popover', () => {
    const onStateFilterChange = vi.fn();
    renderToolbar('all', onStateFilterChange);

    fireEvent.keyDown(document, { key: 's' });

    expect(onStateFilterChange).toHaveBeenCalled();
    expect(screen.queryByTestId('gantt-state-filter-popover')).toBeNull();
  });
});
