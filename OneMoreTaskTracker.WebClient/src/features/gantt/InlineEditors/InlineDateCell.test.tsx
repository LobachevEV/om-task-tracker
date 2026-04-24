import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineDateCell } from './InlineDateCell';

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
    expect(screen.getByTestId('inline-cell-error')).toHaveTextContent(
      /real release date/i,
    );
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
