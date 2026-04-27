import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../../../src/common/i18n/config';
import { LanguageSwitcher } from '../../../../src/common/components/LanguageSwitcher/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('marks the active language with aria-pressed', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('changes the i18n language when a different option is clicked', async () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('exposes an accessible group label', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('group')).toHaveAccessibleName();
  });
});
