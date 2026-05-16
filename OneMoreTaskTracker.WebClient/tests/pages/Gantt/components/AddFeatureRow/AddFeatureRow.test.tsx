import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../../../../../src/common/i18n/config';
import { AddFeatureRow } from '../../../../../src/pages/Gantt/components/AddFeatureRow';
import type { FeatureSummary } from '../../../../../src/common/types/feature';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeSummary(overrides: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    id: 42,
    title: 'New feature',
    description: null,
    state: 'CsApproving',
    plannedStart: null,
    plannedEnd: null,
    leadUserId: 1,
    managerUserId: 1,
    taskCount: 0,
    taskIds: [],
    version: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  if (i18n.language !== 'en') {
    await i18n.changeLanguage('en');
  }
});

afterAll(async () => {
  await i18n.changeLanguage('ru');
});

describe('AddFeatureRow', () => {
  it('starts as a ghost button labelled "New feature"', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    expect(
      screen.getByRole('button', { name: /new feature/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('ghost trigger is present in the DOM (AC #1 — trigger visibility)', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    const trigger = screen.getByRole('button', { name: /new feature/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('add-feature-row__ghost');
  });

  it('activates the inline form when the ghost is clicked', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i);
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('input receives focus immediately after trigger click (AC #2)', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('shows an error message for empty-title submission (AC #3 — folds CR4)', async () => {
    const user = userEvent.setup();
    const createFeature = vi.fn();
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature }} />);

    await user.click(screen.getByRole('button', { name: /new feature/i }));
    await user.keyboard('{Enter}');
    await act(flush);

    expect(createFeature).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/title required/i);
  });

  it('shows a validation message when the title exceeds 200 chars (AC #4)', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(201) } });
    expect(screen.getByText(/too long/i)).toBeInTheDocument();
  });

  it('submits the trimmed title on Enter and notifies the parent (AC #5)', async () => {
    const created = makeSummary({ id: 7, title: 'Shiny' });
    const createFeature = vi.fn().mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<AddFeatureRow onCreated={onCreated} api={{ createFeature }} />);

    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Shiny  ' } });
    fireEvent.submit(input.closest('form')!);
    await act(flush);

    expect(createFeature).toHaveBeenCalledWith({ title: 'Shiny' });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('does not submit when the title is empty (guard)', async () => {
    const createFeature = vi.fn();
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature }} />);

    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.submit(input.closest('form')!);
    await act(flush);

    expect(createFeature).not.toHaveBeenCalled();
  });

  it('clears the draft on Escape but stays in editing mode', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Typing…' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(input).toBeInTheDocument();
  });

  it('collapses to the ghost on Escape with an empty draft', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: /new feature/i })).toBeInTheDocument();
  });

  it('surfaces an error message and keeps the draft when the API rejects', async () => {
    const createFeature = vi.fn().mockRejectedValue(new Error('boom'));
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature }} />);

    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Doomed' } });
    fireEvent.submit(input.closest('form')!);
    await act(flush);

    expect(screen.getByRole('alert').textContent).toContain('boom');
    expect(input.value).toBe('Doomed');
    expect(document.activeElement).toBe(input);
  });

  it('renders without listitem role in header variant', () => {
    const { container } = render(
      <AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} variant="header" />,
    );
    const root = container.querySelector('.add-feature-row');
    expect(root).toBeInTheDocument();
    expect(root?.getAttribute('role')).toBeNull();
  });

  it('header variant: empty-title submit shows inline error (AC #3 in header context)', async () => {
    const user = userEvent.setup();
    const createFeature = vi.fn();
    render(
      <AddFeatureRow onCreated={vi.fn()} api={{ createFeature }} variant="header" />,
    );

    await user.click(screen.getByRole('button', { name: /new feature/i }));
    await user.keyboard('{Enter}');
    await act(flush);

    expect(createFeature).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/title required/i);
    expect(document.activeElement).toBe(screen.getByLabelText(/title/i));
  });
});
