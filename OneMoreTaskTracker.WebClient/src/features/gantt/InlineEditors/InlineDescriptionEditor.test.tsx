import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InlineDescriptionEditor } from './InlineDescriptionEditor';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('InlineDescriptionEditor', () => {
  it('renders a collapsed preview when idle', () => {
    render(
      <InlineDescriptionEditor
        value="Short one-line preview"
        ariaLabel="Description"
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Short one-line preview')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders a placeholder preview when value is null', () => {
    render(
      <InlineDescriptionEditor
        value={null}
        ariaLabel="Description"
        onSave={vi.fn()}
        testId="desc"
      />,
    );
    // Locale-agnostic assertion: the collapsed button exists and is flagged
    // as empty via data-empty. Copy is i18n'd.
    expect(screen.getByTestId('desc')).toHaveAttribute('data-empty');
  });

  it('expands to a textarea on click', () => {
    render(
      <InlineDescriptionEditor
        value="Existing"
        ariaLabel="Description"
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Description'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('commits on Ctrl+Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineDescriptionEditor
        value={null}
        ariaLabel="Description"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByLabelText('Description'));
    const textarea = screen.getByLabelText('Description') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New description' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    await act(flush);
    expect(onSave).toHaveBeenCalledWith('New description');
  });

  it('renders as a disabled button when readOnly=true', () => {
    render(
      <InlineDescriptionEditor
        value="viewer"
        ariaLabel="Description"
        onSave={vi.fn()}
        readOnly
      />,
    );
    const button = screen.getByLabelText('Description');
    expect(button).toBeDisabled();
  });
});
