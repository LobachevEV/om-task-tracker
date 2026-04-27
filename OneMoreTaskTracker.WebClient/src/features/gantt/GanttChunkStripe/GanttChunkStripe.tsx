import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../common/ds';
import './GanttChunkStripe.css';

export type ChunkStripeMode = 'loading' | 'failed';

export interface GanttChunkStripeProps {
  side: 'leading' | 'trailing';
  mode: ChunkStripeMode;
  /** Width of the stripe in px (typically 1 viewport-width). */
  widthPx: number;
  /** Called when the user clicks the inline Retry text link in failed mode. */
  onRetry?: () => void;
}

export function GanttChunkStripe({
  side,
  mode,
  widthPx,
  onRetry,
}: GanttChunkStripeProps) {
  const { t } = useTranslation('gantt');
  return (
    <div
      className={`gantt-chunk-stripe gantt-chunk-stripe--${side} gantt-chunk-stripe--${mode}`}
      style={{ inlineSize: `${widthPx}px` }}
      role="status"
      aria-live="polite"
    >
      {mode === 'loading' ? (
        <Spinner label={t('chunk.loading', { defaultValue: 'Loading dates…' })} />
      ) : (
        <span className="gantt-chunk-stripe__error">
          <span>{t('chunk.failed', { defaultValue: "Couldn't load these dates." })}</span>
          {onRetry ? (
            <button
              type="button"
              className="gantt-chunk-stripe__retry"
              onClick={onRetry}
            >
              {t('chunk.retry', { defaultValue: 'Retry' })}
            </button>
          ) : null}
        </span>
      )}
    </div>
  );
}
