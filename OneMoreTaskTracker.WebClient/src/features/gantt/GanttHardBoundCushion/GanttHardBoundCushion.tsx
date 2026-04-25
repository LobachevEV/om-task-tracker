import { useTranslation } from 'react-i18next';
import './GanttHardBoundCushion.css';

export type CushionSide = 'leading' | 'trailing';

export interface GanttHardBoundCushionProps {
  side: CushionSide;
  /** Inclusive ISO of the bound (earliestPlannedStart for leading, latestPlannedEnd for trailing). */
  boundIso: string | null;
  /** Px width of the cushion strip (typically 1 viewport-width). */
  widthPx: number;
}

export function GanttHardBoundCushion({
  side,
  boundIso,
  widthPx,
}: GanttHardBoundCushionProps) {
  const { t, i18n } = useTranslation('gantt');
  const formatted =
    boundIso != null
      ? (() => {
          try {
            const [y, m, d] = boundIso.split('-').map(Number);
            return new Intl.DateTimeFormat(i18n.language, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).format(new Date(Date.UTC(y, m - 1, d)));
          } catch {
            return boundIso;
          }
        })()
      : null;

  const label =
    side === 'leading'
      ? t('bounds.earliest', {
          defaultValue: 'Earliest plan: {{date}}',
          date: formatted ?? '—',
        })
      : formatted
        ? t('bounds.end', {
            defaultValue: 'End of plan: {{date}}',
            date: formatted,
          })
        : t('bounds.endNoFuture', {
            defaultValue: 'No plans past today',
          });

  return (
    <div
      className={`gantt-hard-bound-cushion gantt-hard-bound-cushion--${side}`}
      style={{ inlineSize: `${widthPx}px` }}
      role="note"
      aria-label={label}
    >
      <span className="gantt-hard-bound-cushion__label">{label}</span>
    </div>
  );
}
