import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../../../../src/common/i18n/config';
import { AddFeatureRow } from '../../../../../src/pages/Gantt/components/AddFeatureRow';
import type { FeatureSummary } from '../../../../../src/common/types/feature';
import { UNSCHEDULED_FEATURE } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

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
    taxonomy: UNSCHEDULED_FEATURE.taxonomy,
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

  it('activates the inline form when the ghost is clicked', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i);
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('submits the trimmed title on Enter and notifies the parent', async () => {
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

  it('does not submit when the title is empty', async () => {
    const createFeature = vi.fn();
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature }} />);

    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.submit(input.closest('form')!);
    await act(flush);

    expect(createFeature).not.toHaveBeenCalled();
  });

  it('shows a validation message when the title exceeds 200 chars', () => {
    render(<AddFeatureRow onCreated={vi.fn()} api={{ createFeature: vi.fn() }} />);
    fireEvent.click(screen.getByRole('button', { name: /new feature/i }));
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(201) } });
    expect(screen.getByText(/too long/i)).toBeInTheDocument();
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
});
