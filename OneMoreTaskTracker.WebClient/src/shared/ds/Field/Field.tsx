import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

/**
 * Single-input form field. Covers the 90% case — label + input + optional hint
 * or error, with id + `aria-describedby` wiring. For selects/textareas/custom
 * controls, duplicate this shell; promoting it to a render-prop generic only
 * pays off once a second variant exists.
 */
export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  compact?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, compact, className, ...inputProps },
  ref,
) {
  const inputId = useId();
  const messageId = useId();
  const describedBy = error || hint ? messageId : undefined;

  return (
    <div className={cx('field', compact && 'field--compact', className)}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx('field__input', compact && 'field__input--compact')}
        {...inputProps}
      />
      {error ? (
        <span id={messageId} role="alert" className="field__hint field__hint--error">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
