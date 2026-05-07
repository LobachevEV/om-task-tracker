import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../common/ds';
import type { FeatureState } from '../../../../common/types/feature';
import { FEATURE_STATE_ENTRIES } from '../../stateConfig';

interface StateFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stateFilter: FeatureState | 'all';
  onStateFilterChange: (state: FeatureState | 'all') => void;
}

export function StateFilterPopover({
  open,
  onOpenChange,
  stateFilter,
  onStateFilterChange,
}: StateFilterPopoverProps) {
  const { t } = useTranslation('gantt');
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  const currentLabel =
    stateFilter === 'all'
      ? t('toolbar.stateFilter.triggerAll')
      : t(FEATURE_STATE_ENTRIES.find((e) => e.state === stateFilter)?.i18nKey ?? 'toolbar.stateFilter.triggerAll');

  const isFiltered = stateFilter !== 'all';

  return (
    <div className="gantt-state-popover" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        className={`gantt-state-popover__trigger${isFiltered ? ' gantt-state-popover__trigger--active' : ''}`}
        onClick={() => onOpenChange(!open)}
        data-testid="gantt-state-filter-trigger"
      >
        {isFiltered
          ? t('toolbar.stateFilter.triggerActive', { state: currentLabel })
          : t('toolbar.stateFilter.triggerAll')}
        {isFiltered ? <span className="gantt-state-popover__badge" aria-hidden="true">1</span> : null}
      </Button>

      {open ? (
        <div
          id={popoverId}
          className="gantt-state-popover__tray"
          role="dialog"
          aria-label={t('toolbar.stateFilter.popoverLabel')}
          data-testid="gantt-state-filter-popover"
        >
          <div
            className="gantt-state-popover__chips"
            role="group"
            aria-label={t('toolbar.stateFilter.popoverLabel')}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={stateFilter === 'all'}
              className={`gantt-toolbar__state-button${stateFilter === 'all' ? ' gantt-toolbar__state-button--active' : ''}`}
              onClick={() => { onStateFilterChange('all'); onOpenChange(false); }}
              data-testid="gantt-state-chip-all"
            >
              {t('toolbar.scope.all')}
            </Button>
            {FEATURE_STATE_ENTRIES.map((entry) => {
              const active = stateFilter === entry.state;
              return (
                <Button
                  key={entry.state}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  className={`gantt-toolbar__state-button${active ? ' gantt-toolbar__state-button--active' : ''}`}
                  onClick={() => { onStateFilterChange(entry.state); onOpenChange(false); }}
                  data-testid={`gantt-state-chip-${entry.state}`}
                >
                  {t(entry.i18nKey)}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
