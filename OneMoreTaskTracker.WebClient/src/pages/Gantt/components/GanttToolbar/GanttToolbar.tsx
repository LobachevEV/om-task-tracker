import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Kbd } from '../../../../common/ds';
import type { FeatureScope, FeatureState } from '../../../../common/types/feature';
import type { UserRole } from '../../../../common/auth/auth';
import { ZOOM_DAYS, type ZoomLevel } from '../../ganttMath';
import { FEATURE_STATE_ENTRIES } from '../../stateConfig';
import { GanttLegend } from '../GanttLegend';
import './GanttToolbar.css';

const ZOOM_ORDER: readonly ZoomLevel[] = Object.keys(ZOOM_DAYS) as ZoomLevel[];

const STATE_FILTER_ORDER: readonly (FeatureState | 'all')[] = [
  'all',
  ...FEATURE_STATE_ENTRIES.map((e) => e.state),
];

export interface GanttToolbarProps {
  role: UserRole;
  zoom: ZoomLevel;
  scope: FeatureScope;
  stateFilter: FeatureState | 'all';
  onZoomChange: (zoom: ZoomLevel) => void;
  onScopeChange: (scope: FeatureScope) => void;
  onStateFilterChange: (state: FeatureState | 'all') => void;
  onNewFeature?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function GanttToolbar({
  role,
  zoom,
  scope,
  stateFilter,
  onZoomChange,
  onScopeChange,
  onStateFilterChange,
  onNewFeature,
}: GanttToolbarProps) {
  const { t } = useTranslation('gantt');
  const isManager = role === 'Manager';

  const cycleZoom = useCallback(
    (direction: 1 | -1) => {
      const idx = ZOOM_ORDER.indexOf(zoom);
      const next = ZOOM_ORDER[(idx + direction + ZOOM_ORDER.length) % ZOOM_ORDER.length];
      onZoomChange(next);
    },
    [zoom, onZoomChange],
  );

  const cycleStateFilter = useCallback(
    (direction: 1 | -1) => {
      const idx = STATE_FILTER_ORDER.indexOf(stateFilter);
      const next =
        STATE_FILTER_ORDER[
          (idx + direction + STATE_FILTER_ORDER.length) % STATE_FILTER_ORDER.length
        ];
      onStateFilterChange(next);
    },
    [stateFilter, onStateFilterChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        cycleZoom(e.shiftKey ? -1 : 1);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        cycleStateFilter(e.shiftKey ? -1 : 1);
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [cycleZoom, cycleStateFilter]);

  const zoomButtons = useMemo(
    () =>
      ZOOM_ORDER.map((level) => {
        const active = zoom === level;
        return (
          <Button
            key={level}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={active}
            className={`gantt-toolbar__zoom-button${active ? ' gantt-toolbar__zoom-button--active' : ''}`}
            onClick={() => onZoomChange(level)}
          >
            {t(`toolbar.zoom.${level}`)}
          </Button>
        );
      }),
    [zoom, onZoomChange, t],
  );

  return (
    <div className="gantt-toolbar" role="toolbar" aria-label={t('title')}>
      <div className="gantt-toolbar__heading">
        <h2 className="gantt-toolbar__title">{t('title')}</h2>
      </div>

      <div className="gantt-toolbar__controls">
        <div className="gantt-toolbar__group" role="group" aria-label={t('toolbar.scopeLabel')}>
          <span className="gantt-toolbar__group-label">{t('toolbar.scopeLabel')}:</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={scope === 'all'}
            className={`gantt-toolbar__scope-button${scope === 'all' ? ' gantt-toolbar__scope-button--active' : ''}`}
            onClick={() => onScopeChange('all')}
          >
            {t('toolbar.scope.all')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={scope === 'mine'}
            className={`gantt-toolbar__scope-button${scope === 'mine' ? ' gantt-toolbar__scope-button--active' : ''}`}
            onClick={() => onScopeChange('mine')}
          >
            {t('toolbar.scope.mine')}
          </Button>
        </div>

        <div
          className="gantt-toolbar__group"
          role="group"
          aria-label={t('drawer.fields.state')}
        >
          <span className="gantt-toolbar__group-label">
            {t('drawer.fields.state')} <Kbd size="sm">S</Kbd>:
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={stateFilter === 'all'}
            className={`gantt-toolbar__state-button${stateFilter === 'all' ? ' gantt-toolbar__state-button--active' : ''}`}
            onClick={() => onStateFilterChange('all')}
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
                onClick={() => onStateFilterChange(entry.state)}
              >
                {t(entry.i18nKey)}
              </Button>
            );
          })}
        </div>

        <div
          className="gantt-toolbar__group"
          role="group"
          aria-label={t('toolbar.zoomLabel')}
          title={t('toolbar.zoomLabel')}
        >
          <span className="gantt-toolbar__group-label">
            {t('toolbar.zoomLabel')} <Kbd size="sm">Z</Kbd>:
          </span>
          {zoomButtons}
        </div>

        <GanttLegend />

        {isManager && onNewFeature ? (
          <Button type="button" variant="primary" size="sm" onClick={onNewFeature}>
            + {t('toolbar.newFeature')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
