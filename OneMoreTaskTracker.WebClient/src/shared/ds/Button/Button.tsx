import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a leading visual (icon component or element). */
  leading?: ReactNode;
  /** Renders a trailing visual — commonly a Kbd shortcut hint. */
  trailing?: ReactNode;
  /** Renders the button in a loading state with a spinner and disables interaction. */
  loading?: boolean;
  /** Full-width block button. */
  block?: boolean;
}

// All variants share the `ds-button` base (inline-flex layout, gap, size rules).
// primary/secondary additionally pin the legacy pill/outline surface classes.
const variantClass: Record<ButtonVariant, string> = {
  primary: 'ds-button ds-button--primary primary-button',
  secondary: 'ds-button ds-button--secondary secondary-button',
  ghost: 'ds-button ds-button--ghost',
  danger: 'ds-button ds-button--danger',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leading,
    trailing,
    loading = false,
    block = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        variantClass[variant],
        `ds-button--${size}`,
        block && 'ds-button--block',
        loading && 'ds-button--loading',
        className,
      )}
      {...rest}
    >
      {leading ? <span className="ds-button__leading" aria-hidden="true">{leading}</span> : null}
      <span className="ds-button__label">{children}</span>
      {trailing ? <span className="ds-button__trailing" aria-hidden="true">{trailing}</span> : null}
    </button>
  );
});
