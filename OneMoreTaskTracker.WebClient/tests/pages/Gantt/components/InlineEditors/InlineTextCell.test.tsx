import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineTextCell } from '../../../../../src/pages/Gantt/components/InlineEditors/InlineTextCell';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('InlineTextCell', () => {
  it('commits on Enter and calls onSave with the trimmed draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineTextCell
        value="Old title"
        ariaLabel="Title of feature"
        onSave={onSave}
        testId="cell"
      />,
    );
    const input = screen.getByLabelText('Title of feature') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith('New title');
  });

  it('reverts the draft to the committed value on Escape', () => {
    const onSave = vi.fn();
    render(
      <InlineTextCell
        value="Hello"
        ariaLabel="Title"
        onSave={onSave}
        testId="cell"
      />,
    );
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Typing…' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('Hello');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('surfaces an inline validation error for empty input and rolls back', async () => {
    const onSave = vi.fn();
    render(
      <InlineTextCell
        value="Hello"
        ariaLabel="Title"
        onSave={onSave}
        testId="cell"
        validate={(next) => (next.trim() === '' ? "Title can't be empty" : null)}
      />,
    );
    const input = screen.getByLabelText('Title') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await act(flush);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('inline-cell-error-text').textContent).toBe(
      "Title can't be empty",
    );
    expect(input.value).toBe('Hello');
  });

  it('renders a read-only span when readOnly=true', () => {
    render(
      <InlineTextCell
        value="Read only"
        ariaLabel="Title"
        onSave={vi.fn()}
        readOnly
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Read only')).toBeInTheDocument();
  });
});
