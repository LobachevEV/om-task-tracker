import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteRow } from './InviteRow';

describe('InviteRow', () => {
  it('should render with default role as FrontendDeveloper', () => {
    const onInvite = vi.fn();
    render(<InviteRow onInvite={onInvite} />);

    const feButton = screen.getByRole('button', { name: /FE/i });
    expect(feButton).toHaveClass('invite-role-chip--on');
  });

  it('should disable submit button when email is empty', () => {
    const onInvite = vi.fn();
    render(<InviteRow onInvite={onInvite} />);

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when email is present', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteRow onInvite={onInvite} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should switch selected role when clicking role segment', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteRow onInvite={onInvite} />);

    const beButton = screen.getByRole('button', { name: /BE/i });
    await user.click(beButton);

    expect(beButton).toHaveClass('invite-role-chip--on');
    const feButton = screen.getByRole('button', { name: /FE/i });
    expect(feButton).not.toHaveClass('invite-role-chip--on');
  });

  it('should call onInvite with email and role on submit', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    render(<InviteRow onInvite={onInvite} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/);
    await user.type(emailInput, 'dev@example.com');

    const beButton = screen.getByRole('button', { name: /BE/i });
    await user.click(beButton);

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    await user.click(submitButton);

    expect(onInvite).toHaveBeenCalledWith({
      email: 'dev@example.com',
      role: 'BackendDeveloper',
    });
  });

  it('should disable inputs while onInvite is pending', async () => {
    const user = userEvent.setup();
    let resolveInvite: () => void;
    const invitePromise = new Promise<void>((resolve) => {
      resolveInvite = resolve;
    });
    const onInvite = vi.fn().mockReturnValue(invitePromise);
    render(<InviteRow onInvite={onInvite} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/) as HTMLInputElement;
    await user.type(emailInput, 'dev@example.com');

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    await user.click(submitButton);

    // While pending, button should show loading state and inputs should be disabled
    expect(emailInput).toBeDisabled();
    expect(submitButton).toHaveTextContent(/Добавление|Adding/);

    // Resolve the promise
    resolveInvite!();
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
    });
  });

  it('should reset form on successful invite', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    render(<InviteRow onInvite={onInvite} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/) as HTMLInputElement;
    await user.type(emailInput, 'dev@example.com');

    const qaButton = screen.getByRole('button', { name: /QA/i });
    await user.click(qaButton);

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(emailInput.value).toBe('');
      const feButton = screen.getByRole('button', { name: /FE/i });
      expect(feButton).toHaveClass('invite-role-chip--on');
    });
  });

  it('should preserve form state on failed invite', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<InviteRow onInvite={onInvite} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/) as HTMLInputElement;
    await user.type(emailInput, 'dev@example.com');

    const beButton = screen.getByRole('button', { name: /BE/i });
    await user.click(beButton);

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(emailInput.value).toBe('dev@example.com');
      expect(beButton).toHaveClass('invite-role-chip--on');
    });
  });

  it('should disable form when disabled prop is true', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteRow onInvite={onInvite} disabled={true} />);

    const emailInput = screen.getByPlaceholderText(/dev@onemore.dev/) as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /Добавить|Add/i });
    expect(submitButton).toBeDisabled();
  });
});
