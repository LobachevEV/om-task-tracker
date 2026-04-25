import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineDateCell } from './InlineDateCell';
import { ApiError } from '../../../shared/api/ApiError';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('InlineDateCell', () => {
  it('commits ISO dates on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineDateCell
        value={null}
        onSave={onSave}
        ariaLabel="Planned start"
        testId="cell"
      />,
    );
    const input = screen.getByLabelText('Planned start') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026-05-12' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith('2026-05-12');
  });

  it('ArrowUp nudges the date by one day when the draft is a valid ISO', () => {
    const onSave = vi.fn();
    render(
      <InlineDateCell
        value="2026-05-12"
        onSave={onSave}
        ariaLabel="Planned start"
      />,
    );
    const input = screen.getByLabelText('Planned start') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('2026-05-13');
  });

  it('shows an inline error for unparseable input and rolls back', async () => {
    const onSave = vi.fn();
    render(
      <InlineDateCell
        value="2026-05-12"
        onSave={onSave}
        ariaLabel="Planned start"
      />,
    );
    const input = screen.getByLabelText('Planned start') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026/05/12' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).not.toHaveBeenCalled();
    // The error renders through the i18n layer; the test setup may default to
    // any locale, so assert the validation kind + presence rather than copy.
    const errorEl = screen.getByTestId('inline-cell-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveAttribute('data-kind', 'validation');
    expect(errorEl.textContent?.length ?? 0).toBeGreaterThan(0);
    // Rolled back to committed.
    expect(input.value).toBe('2026-05-12');
  });

  it('renders the 422 overlap conflict envelope as a localized "Overlaps with X" message', async () => {
    const onSave = vi.fn().mockRejectedValue(
      new ApiError(422, 'Stage order violation', { kind: 'overlap', with: 'Development' }),
    );
    render(
      <InlineDateCell
        value="2026-05-12"
        onSave={onSave}
        ariaLabel="Planned start"
      />,
    );
    const input = screen.getByLabelText('Planned start') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026-05-15' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith('2026-05-15');
    const errorEl = screen.getByTestId('inline-cell-error');
    // The translation table contains "Development" as the interpolated
    // neighbour name regardless of the active locale (EN: "Overlaps with
    // Development", RU: "Пересекается с этапом «Development»").
    expect(errorEl).toHaveTextContent(/Development/);
    expect(errorEl).toHaveAttribute('data-kind', 'conflict');
    // Rolled back to committed.
    expect(input.value).toBe('2026-05-12');
  });

  it('commits null when the input is cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineDateCell
        value="2026-05-12"
        onSave={onSave}
        ariaLabel="Planned start"
      />,
    );
    const input = screen.getByLabelText('Planned start') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith(null);
  });
});
