import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { AddSubStageButton } from '../../../../../src/pages/Gantt/components/AddSubStageButton';

beforeEach(async () => {
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('en');
});

describe('AddSubStageButton', () => {
  it('renders enabled with the add label and fires onAppend on click', () => {
    const onAppend = vi.fn();
    render(<AddSubStageButton atCap={false} cap={6} onAppend={onAppend} testId="add-x" />);
    const btn = screen.getByTestId('add-x') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toMatch(/add sub-stage/i);
    fireEvent.click(btn);
    expect(onAppend).toHaveBeenCalledTimes(1);
  });

  it('is disabled when atCap is true and does not fire onAppend on click', () => {
    const onAppend = vi.fn();
    render(<AddSubStageButton atCap cap={6} onAppend={onAppend} testId="add-x" />);
    const btn = screen.getByTestId('add-x') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAppend).not.toHaveBeenCalled();
  });

  it('surfaces the cap value in the title tooltip when at cap', () => {
    render(<AddSubStageButton atCap cap={6} onAppend={vi.fn()} testId="add-x" />);
    const btn = screen.getByTestId('add-x');
    const title = btn.getAttribute('title') ?? '';
    expect(title).toMatch(/6/);
    expect(title.toLowerCase()).toContain('cap');
  });

  it('uses the default label as title when not at cap', () => {
    render(<AddSubStageButton atCap={false} cap={6} onAppend={vi.fn()} testId="add-x" />);
    const btn = screen.getByTestId('add-x');
    expect(btn.getAttribute('title')).toMatch(/add sub-stage/i);
  });
});
