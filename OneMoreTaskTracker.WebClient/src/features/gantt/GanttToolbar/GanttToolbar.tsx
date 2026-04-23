import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Kbd } from '../../../shared/ds';
import type { FeatureScope, FeatureState } from '../../../shared/types/feature';
import type { UserRole } from '../../../shared/auth/auth';
import { ZOOM_DAYS, type ZoomLevel } from '../ganttMath';
import { FEATURE_STATE_ENTRIES } from '../stateConfig';
import './GanttToolbar.css';

const ZOOM_ORDER: readonly ZoomLevel[] = Object.keys(ZOOM_DAYS) as ZoomLevel[];

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'z' && e.key !== 'Z') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      cycleZoom(e.shiftKey ? -1 : 1);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [cycleZoom]);

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
        <span className="gantt-toolbar__eyebrow">{t('title')}</span>
        <h2 className="gantt-toolbar__title">{t('subtitle')}</h2>
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

        <div className="gantt-toolbar__group">
          <label className="gantt-toolbar__group-label" htmlFor="gantt-toolbar-state">
            {t('drawer.fields.state')}:
          </label>
          <select
            id="gantt-toolbar-state"
            className="gantt-toolbar__select"
            value={stateFilter}
            onChange={(e) => onStateFilterChange(e.target.value as FeatureState | 'all')}
          >
            <option value="all">{t('toolbar.scope.all')}</option>
            {FEATURE_STATE_ENTRIES.map((entry) => (
              <option key={entry.state} value={entry.state}>
                {t(entry.i18nKey)}
              </option>
            ))}
          </select>
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

        {isManager && onNewFeature ? (
          <Button type="button" variant="primary" size="sm" onClick={onNewFeature}>
            + {t('toolbar.newFeature')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
