import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/ds';
import { FEATURE_STATE_ENTRIES } from '../stateConfig';
import './GanttLegend.css';

const STATUS_KEYS = ['current', 'overdue', 'completed', 'upcoming', 'notPlanned'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

export function GanttLegend() {
  const { t } = useTranslation('gantt');
  const [open, setOpen] = useState(false);
  const trayId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="gantt-legend" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={trayId}
        onClick={() => setOpen((v) => !v)}
        data-testid="gantt-legend-toggle"
      >
        {t('legend.title', { defaultValue: 'Legend' })}
      </Button>
      {open ? (
        <div
          id={trayId}
          className="gantt-legend__tray"
          role="dialog"
          aria-label={t('legend.title', { defaultValue: 'Legend' })}
          data-testid="gantt-legend-tray"
        >
          <section className="gantt-legend__section" aria-labelledby={`${trayId}-status`}>
            <h4 id={`${trayId}-status`} className="gantt-legend__heading">
              {t('legend.status', { defaultValue: 'Status' })}
            </h4>
            <ul className="gantt-legend__list">
              {STATUS_KEYS.map((key: StatusKey) => (
                <li key={key} className="gantt-legend__item">
                  <span
                    className="gantt-legend__swatch"
                    data-swatch={key}
                    aria-hidden="true"
                  />
                  <span className="gantt-legend__label">
                    {t(`segmentedBar.status.${key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="gantt-legend__section" aria-labelledby={`${trayId}-stages`}>
            <h4 id={`${trayId}-stages`} className="gantt-legend__heading">
              {t('legend.states', { defaultValue: 'Lifecycle' })}
            </h4>
            <ul className="gantt-legend__list">
              {FEATURE_STATE_ENTRIES.map((entry) => (
                <li key={entry.state} className="gantt-legend__item">
                  <span
                    className="gantt-legend__swatch gantt-legend__swatch--solid"
                    style={{ background: `var(${entry.cssVar})` }}
                    aria-hidden="true"
                  />
                  <span className="gantt-legend__label">{t(entry.i18nKey)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
