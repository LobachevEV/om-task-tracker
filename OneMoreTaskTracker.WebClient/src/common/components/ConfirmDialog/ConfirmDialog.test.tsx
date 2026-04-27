import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Confirm"
        message="Are you sure?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Yes' });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Confirm"
        message="Are you sure?"
        cancelLabel="No"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'No' });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders with custom button labels', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Custom"
        message="Message"
        confirmLabel="Accept"
        cancelLabel="Decline"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('renders with default button labels', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Default"
        message="Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={false}
        title="Hidden"
        message="Should not appear"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('renders with proper dialog attributes', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Test Dialog"
        message="Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });
});
