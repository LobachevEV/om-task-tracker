import { useTranslation } from 'react-i18next';
import type { InlineEditorError } from './InlineEditorError';

export interface InlineCellErrorProps {
  error: InlineEditorError | null;
  /** Re-attempt the rejected commit. Hidden for validation errors. */
  onRetry?: () => void;
  /** Drop the error and restore the committed value. */
  onRevert?: () => void;
  /**
   * Optional override for the user-facing message — lets a cell translate a
   * server kind into domain copy (e.g. date overlap → "Overlaps with X").
   */
  resolveMessage?: (error: InlineEditorError) => string;
  /**
   * The value the user tried to save, if any. Surfaced as a tooltip on the
   * Retry button so a single mis-click doesn't lose the typed text.
   */
  rejectedValueLabel?: string | null;
  /** Test id seam — defaults to `inline-cell-error`. */
  testId?: string;
}

export function InlineCellError({
  error,
  onRetry,
  onRevert,
  resolveMessage,
  rejectedValueLabel,
  testId = 'inline-cell-error',
}: InlineCellErrorProps) {
  const { t } = useTranslation('gantt');
  if (!error) return null;
  const message = resolveMessage ? resolveMessage(error) : error.message;
  const showRetry = error.kind !== 'validation' && onRetry != null;
  const showRevert = onRevert != null;
  return (
    <span
      className="inline-cell__error"
      role="alert"
      data-kind={error.kind}
      data-testid={testId}
    >
      <span className="inline-cell__error-text" data-testid={`${testId}-text`}>
        {message}
      </span>
      {(showRetry || showRevert) && (
        <span className="inline-cell__error-actions">
          {showRetry && (
            <button
              type="button"
              className="inline-cell__error-action"
              onClick={onRetry}
              onMouseDown={(e) => e.preventDefault()}
              title={
                rejectedValueLabel
                  ? t('inlineEdit.recovery.retryWithValue', {
                      defaultValue: 'Retry: {{value}}',
                      value: rejectedValueLabel,
                    })
                  : undefined
              }
              data-testid={`${testId}-retry`}
            >
              {t('inlineEdit.recovery.retry', { defaultValue: 'Retry' })}
            </button>
          )}
          {showRevert && (
            <button
              type="button"
              className="inline-cell__error-action inline-cell__error-action--ghost"
              onClick={onRevert}
              onMouseDown={(e) => e.preventDefault()}
              data-testid={`${testId}-revert`}
            >
              {t('inlineEdit.recovery.revert', { defaultValue: 'Dismiss' })}
            </button>
          )}
        </span>
      )}
    </span>
  );
}
